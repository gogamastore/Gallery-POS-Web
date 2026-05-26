
"use client";

import { useState, useTransition, useEffect } from "react";
import { Bot, Loader2, Search, BarChart2, PackageCheck, AlertTriangle, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getStockSuggestion } from "./actions";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { subDays, format, startOfDay, endOfDay } from "date-fns";
import type { SuggestOptimalStockLevelsOutput } from "@/ai/schemas/stock-suggestion-schemas";
import type { DateRange } from "react-day-picker";

interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  image: string;
}

/**
 * Fetches sales data for a specific product within a date range from Firestore.
 * This query is optimized to only fetch orders containing the specific product.
 * @param productId The ID of the product to fetch sales data for.
 * @param startDate The start date of the period.
 * @param endDate The end date of the period.
 * @returns A promise that resolves to an array of sales data.
 */
async function getSalesDataForProduct(productId: string, startDate: Date, endDate: Date) {
    const salesData: { orderDate: string; quantity: number }[] = [];
    
    // Query is now based on 'validatedAt' to align with sales reports
    const ordersQuery = query(
        collection(db, "orders"),
        where("productIds", "array-contains", productId),
        where("status", "in", ["Processing", "processing", "Shipped", "shipped", "Delivered", "delivered"]),
        where("validatedAt", ">=", startDate),
        where("validatedAt", "<=", endDate)
    );

    const querySnapshot = await getDocs(ordersQuery);
    querySnapshot.forEach(doc => {
        const order = doc.data();
        order.products?.forEach((item: { productId: string; quantity: number; }) => {
            if (item.productId === productId) {
                // We use validatedAt for the date grouping
                const validationDate = order.validatedAt ? order.validatedAt.toDate() : order.date.toDate();
                salesData.push({
                    orderDate: format(validationDate, 'yyyy-MM-dd'),
                    quantity: item.quantity
                });
            }
        });
    });

    return salesData;
}


export default function StockSuggestionPage() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
      from: subDays(new Date(), 30),
      to: new Date()
  });

  const [result, setResult] = useState<SuggestOptimalStockLevelsOutput | null>(null);
  

  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setAllProducts(productsData);
        setFilteredProducts(productsData);
      } catch (error) {
        toast({ variant: "destructive", title: "Gagal memuat produk" });
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [toast]);
  
  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const results = allProducts.filter(product => {
      const nameMatch = product.name.toLowerCase().includes(lowercasedFilter);
      const skuMatch = String(product.sku || '').toLowerCase().includes(lowercasedFilter);
      return nameMatch || skuMatch;
    });
    setFilteredProducts(results);
  }, [searchTerm, allProducts]);


  const handleSubmit = async () => {
    if (!selectedProduct) {
      toast({ variant: "destructive", title: "Pilih produk terlebih dahulu" });
      return;
    }
    if (!dateRange?.from || !dateRange?.to) {
        toast({ variant: "destructive", title: "Pilih rentang tanggal terlebih dahulu" });
        return;
    }

    startTransition(async () => {
      setResult(null);
      try {
        const startDate = startOfDay(dateRange.from!);
        const endDate = endOfDay(dateRange.to!);
        
        const analysisPeriodInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
        
        const salesData = await getSalesDataForProduct(selectedProduct.id, startDate, endDate);

        if (salesData.length === 0) {
            toast({
                variant: "destructive",
                title: "Tidak Ada Data Penjualan",
                description: `Tidak ditemukan data penjualan untuk ${selectedProduct.name} dalam periode yang dipilih.`
            });
            return;
        }

        const suggestionResult = await getStockSuggestion({
          productName: selectedProduct.name,
          currentStock: selectedProduct.stock,
          salesData: salesData,
          analysisPeriod: `${analysisPeriodInDays} days`,
        });
        
        setResult(suggestionResult);
        toast({
          title: "Analisis Selesai!",
          description: `Saran stok untuk ${selectedProduct.name} telah dibuat.`,
        });

      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Gagal membuat saran stok. Coba lagi.",
        });
        console.error(error);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-3">
        <Card>
            <CardHeader>
            <div className="flex items-center gap-2">
                <Bot className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl font-headline">Saran Stok Cerdas</CardTitle>
            </div>
            <CardDescription>
                Pilih produk dan periode analisis untuk mendapatkan saran stok optimal berdasarkan data penjualan historis.
            </CardDescription>
            </CardHeader>
        </Card>
      </div>

      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Parameter Analisis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
                <Label>Pilih Produk</Label>
                <Card className="p-4">
                    {selectedProduct ? (
                        <div className="flex items-center gap-3">
                            <Image src={selectedProduct.image} alt={selectedProduct.name} width={48} height={48} className="rounded-md"/>
                            <div>
                                <p className="font-semibold">{selectedProduct.name}</p>
                                <p className="text-sm text-muted-foreground">Stok Saat Ini: {selectedProduct.stock}</p>
                            </div>
                        </div>
                    ): (
                        <p className="text-sm text-muted-foreground">Belum ada produk dipilih</p>
                    )}
                </Card>
             </div>
             <div className="space-y-2">
                <Label htmlFor="analysis-period">Periode Analisis</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button id="date" variant={"outline"} className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : (<span>Pilih rentang tanggal</span>)}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                    </PopoverContent>
                </Popover>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSubmit} disabled={isPending || !selectedProduct}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Suggestion
            </Button>
          </CardFooter>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Daftar Produk</CardTitle>
                <div className="relative pt-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Cari produk..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                </div>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
                {loadingProducts ? <p>Memuat...</p> : (
                    <Table>
                        <TableBody>
                            {filteredProducts.map(p => (
                                <TableRow key={p.id} onClick={() => setSelectedProduct(p)} className="cursor-pointer" data-state={selectedProduct?.id === p.id ? 'selected' : ''}>
                                    <TableCell className="font-medium">{p.name}</TableCell>
                                    <TableCell className="text-right">{p.stock}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <Card className="min-h-[500px]">
          <CardHeader>
            <CardTitle>2. Hasil Analisis & Rekomendasi</CardTitle>
            <CardDescription>
              AI akan memberikan saran jumlah stok dan alasan di baliknya di sini.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isPending ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">AI sedang menganalisis data penjualan...</p>
                </div>
            ) : result ? (
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base text-muted-foreground">Saran Stok Bulan Depan</CardTitle>
                                <PackageCheck className="mx-auto h-6 w-6 text-primary"/>
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-bold">{result.suggestion.nextPeriodStock}</p>
                                <p className="text-sm text-muted-foreground">unit</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base text-muted-foreground">Stok Pengaman</CardTitle>
                                 <AlertTriangle className="mx-auto h-6 w-6 text-yellow-500"/>
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-bold">{result.suggestion.safetyStock}</p>
                                <p className="text-sm text-muted-foreground">unit</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <BarChart2 className="h-5 w-5"/>
                                <CardTitle>Ringkasan Analisis</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                                <li><strong>Total Terjual:</strong> {result.analysis.totalSold} unit dalam periode yang dipilih.</li>
                                <li><strong>Tren Penjualan:</strong> {result.analysis.salesTrend}</li>
                                {result.analysis.peakDays.length > 0 && (
                                     <li><strong>Periode Puncak:</strong> {result.analysis.peakDays.join(', ')}</li>
                                )}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                           <div className="flex items-center gap-2">
                                <Bot className="h-5 w-5"/>
                                <CardTitle>Alasan AI</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{result.reasoning}</p>
                        </CardContent>
                    </Card>
                 </div>
            ) : (
                <div className="text-center text-muted-foreground p-8 flex flex-col items-center justify-center min-h-[300px]">
                    <Bot className="h-12 w-12 mb-4"/>
                    <p>Hasil akan muncul di sini setelah Anda memilih produk dan menekan tombol "Generate Suggestion".</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
