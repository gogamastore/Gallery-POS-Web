

"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from '@/hooks/use-toast';
import { Percent, PlusCircle, Trash2, Loader2, ArrowLeft, Tags, CalendarIcon, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { addDays, format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from '@/components/ui/table';
import { Badge } from "@/components/ui/badge";


interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  stock: number;
  sku: string;
}

interface Promotion extends Product {
    promoId: string;
    discountPrice: number;
    startDate: Date;
    endDate: Date;
}

const formatCurrency = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9]/g, '')) : amount;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);
};


function ProductSelectionDialog({ onProductSelect }: { onProductSelect: (product: Product) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const productsSnapshot = await getDocs(collection(db, "products"));
            const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setAllProducts(productsData);
            setFilteredProducts(productsData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if(isOpen) fetchProducts();
    }, [isOpen]);

    useEffect(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        const results = allProducts.filter(p => {
          const nameMatch = p.name.toLowerCase().includes(lowercasedFilter);
          const skuMatch = String(p.sku || '').toLowerCase().includes(lowercasedFilter);
          return nameMatch || skuMatch;
        });
        setFilteredProducts(results);
    }, [searchTerm, allProducts]);

    const handleSelect = (product: Product) => {
        onProductSelect(product);
        setIsOpen(false);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">Pilih Produk</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                 <DialogHeader>
                    <DialogTitle>Pilih Produk untuk Dipromosikan</DialogTitle>
                    <div className="relative pt-2">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari produk berdasarkan nama atau SKU..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </DialogHeader>
                 <div className="flex-1 overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Produk</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead className="text-right">Harga</TableHead>
                                <TableHead className="w-[100px] text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="text-center h-24">Memuat produk...</TableCell></TableRow>
                            ) : filteredProducts.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <Image src={p.image} alt={p.name} width={40} height={40} className="rounded-md object-cover"/>
                                        {p.name}
                                    </TableCell>
                                    <TableCell>{p.sku}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(p.price)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" onClick={() => handleSelect(p)}>Pilih</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    )

}


export default function PromoSettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [discountPrice, setDiscountPrice] = useState<number>(0);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7),
  });
  
  const resetForm = () => {
    setSelectedProduct(null);
    setDiscountPrice(0);
    setDateRange({ from: new Date(), to: addDays(new Date(), 7) });
  };


  const fetchPromotionsAndProductsCallback = useCallback(async () => {
    setLoading(true);
    try {
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        const productsMap = new Map<string, Product>();
        productsData.forEach(p => productsMap.set(p.id, p));

        const promoSnapshot = await getDocs(query(collection(db, 'promotions'), orderBy('endDate', 'desc')));
        const promoData = promoSnapshot.docs.map(doc => {
            const data = doc.data();
            const product = productsMap.get(data.productId);
            if (!product) return null;
            
            return {
                ...product,
                promoId: doc.id,
                discountPrice: data.discountPrice,
                startDate: data.startDate.toDate(),
                endDate: data.endDate.toDate()
            } as Promotion;
        }).filter(p => p !== null) as Promotion[];
        
        setPromotions(promoData);

    } catch (error) {
        console.error('Error fetching data: ', error);
        toast({ variant: 'destructive', title: 'Gagal Memuat Data' });
    } finally {
        setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPromotionsAndProductsCallback();
  }, [fetchPromotionsAndProductsCallback]);

  const handleAddPromo = async () => {
    if (!selectedProduct || !discountPrice || !dateRange?.from || !dateRange?.to) {
        toast({ variant: 'destructive', title: 'Data tidak lengkap' });
        return;
    }
    setIsSubmitting(true);
    try {
        await addDoc(collection(db, 'promotions'), {
            productId: selectedProduct.id,
            discountPrice: discountPrice,
            startDate: dateRange.from,
            endDate: dateRange.to,
            createdAt: serverTimestamp()
        });
        toast({ title: "Promo berhasil ditambahkan" });
        setIsDialogOpen(false);
        fetchPromotionsAndProductsCallback();
        resetForm();
    } catch (error) {
        console.error("Error adding promotion:", error);
        toast({ variant: 'destructive', title: 'Gagal menambahkan promo' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleDeletePromo = async (promoId: string) => {
    try {
        await deleteDoc(doc(db, 'promotions', promoId));
        toast({ title: 'Promo berhasil dihapus' });
        fetchPromotionsAndProductsCallback();
    } catch (error) {
        console.error("Error deleting promo:", error);
        toast({ variant: 'destructive', title: 'Gagal menghapus promo' });
    }
  }


  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/settings')}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Kembali ke Pengaturan</span>
            </Button>
            <h1 className="text-xl md:text-2xl font-bold">Pengaturan Promo</h1>
        </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Daftar Produk Promo</CardTitle>
            <CardDescription>
              Tambah, edit, atau hapus promo untuk produk tertentu.
            </CardDescription>
          </div>
           <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tambah Promo
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Tambah Promo Baru</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                 <div className="space-y-2">
                    <Label>Pilih Produk</Label>
                    <div className="flex items-center gap-4 rounded-md border p-2">
                        {selectedProduct ? (
                            <div className='flex items-center gap-3 flex-1'>
                                <Image src={selectedProduct.image} alt={selectedProduct.name} width={40} height={40} className="rounded-sm"/>
                                <div>
                                    <p className="font-semibold">{selectedProduct.name}</p>
                                    <p className="text-xs text-muted-foreground">{formatCurrency(selectedProduct.price)}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground flex-1">Belum ada produk dipilih</div>
                        )}
                        <ProductSelectionDialog onProductSelect={setSelectedProduct} />
                    </div>
                 </div>
                 <div className="space-y-2">
                  <Label htmlFor="discountPrice">Harga Diskon (Rp)</Label>
                  <Input id="discountPrice" type="number" value={discountPrice} onChange={(e) => setDiscountPrice(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                     <Label>Periode Promo</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className="w-full justify-start text-left font-normal"
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                            dateRange.to ? (
                                <>
                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                {format(dateRange.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(dateRange.from, "LLL dd, y")
                            )
                            ) : (
                            <span>Pilih rentang tanggal</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                        />
                        </PopoverContent>
                    </Popover>
                </div>
              </div>
              <DialogFooter>
                 <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Batal</Button>
                <Button onClick={handleAddPromo} disabled={isSubmitting}>
                   {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Promo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="text-center p-8 text-muted-foreground">Memuat data promo...</div>
          ) : promotions.length > 0 ? (
            <div className="space-y-4">
              {promotions.map((promo) => (
                <div key={promo.promoId} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <Image src={promo.image} alt={promo.name} width={64} height={64} className="rounded-md object-cover"/>
                    <div>
                      <p className="font-bold">{promo.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground line-through">{formatCurrency(promo.price)}</p>
                        <p className="text-sm font-semibold text-primary">{formatCurrency(promo.discountPrice)}</p>
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        Berlaku hingga: {format(new Date(promo.endDate), 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <Badge variant={new Date() > new Date(promo.endDate) ? "secondary" : "default"}>
                        {new Date() > new Date(promo.endDate) ? "Berakhir" : "Aktif"}
                     </Badge>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
                                <AlertDialogDescription>
                                Tindakan ini akan menghapus promo untuk produk <span className="font-bold">{promo.name}</span>.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeletePromo(promo.promoId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Ya, Hapus</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                     </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <Tags className="mx-auto h-12 w-12 text-muted-foreground"/>
              <p className="mt-2">Belum ada promo yang ditambahkan.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
