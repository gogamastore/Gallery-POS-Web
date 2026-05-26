
"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, Search, Warehouse, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";


interface ProductValuation {
  id: string;
  name: string;
  sku: string;
  stock: number;
  purchasePrice: number;
  totalValue: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function InventoryValuationPage() {
  const [loading, setLoading] = useState(true);
  const [allProducts, setAllProducts] = useState<ProductValuation[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductValuation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();


  useEffect(() => {
    const fetchInventoryData = async () => {
      setLoading(true);
      try {
        const productsSnapshot = await getDocs(collection(db, "products"));
        
        const productValuations: ProductValuation[] = productsSnapshot.docs.map(doc => {
            const productData = doc.data();
            const stock = productData.stock || 0;
            const purchasePrice = productData.purchasePrice || 0; 
            return {
                id: doc.id,
                name: productData.name || "Unknown Product",
                sku: productData.sku || "N/A",
                stock,
                purchasePrice,
                totalValue: stock * purchasePrice,
            };
        });

        setAllProducts(productValuations);
        setFilteredProducts(productValuations);

      } catch (error) {
        console.error("Error fetching inventory valuation data: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventoryData();
  }, []);

  useEffect(() => {
    const results = allProducts.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(results);
  }, [searchTerm, allProducts]);

  const totalInventoryValue = useMemo(() => {
    return allProducts.reduce((sum, product) => sum + product.totalValue, 0);
  }, [allProducts]);

  if (loading) {
      return <div className="text-center p-8">Memuat data valuasi inventaris...</div>
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/reports')}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Kembali ke Laporan</span>
            </Button>
            <div>
                <CardTitle>Laporan Modal Produk (Valuasi Inventaris)</CardTitle>
                <CardDescription>
                    Lihat total nilai modal dari semua stok produk Anda berdasarkan harga beli terakhir.
                </CardDescription>
            </div>
        </div>

       <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nilai Inventaris</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInventoryValue)}</div>
            <p className="text-xs text-muted-foreground">Total modal yang tersimpan dalam bentuk produk.</p>
          </CardContent>
        </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Rincian Modal per Produk</CardTitle>
           <div className="relative pt-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari produk berdasarkan nama atau SKU..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Nama Produk</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Stok Saat Ini</TableHead>
                    <TableHead className="text-right">Harga Modal (Beli)</TableHead>
                    <TableHead className="text-right">Total Nilai Modal</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell className="text-right">{product.stock}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.purchasePrice)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(product.totalValue)}</TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        Tidak ada produk yang ditemukan.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
