

"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  getDoc
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
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, PlusCircle, Trash2, Loader2, ArrowLeft, Search, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from '@/components/ui/table';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: string;
  image: string;
}

interface TrendingProduct extends Product {
    trendingId: string;
}

const formatCurrency = (value: string | number): string => {
    const num = typeof value === 'string' ? Number(value.replace(/[^0-9]/g, '')) : value;
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(num);
}


function AddTrendingProductDialog({ onProductAdded }: { onProductAdded: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

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

    const handleAddProduct = async (product: Product) => {
        setIsSubmitting(true);
        try {
            // Check if already trending
            const q = query(collection(db, "trending_products"), where("productId", "==", product.id));
            const existing = await getDocs(q);
            if (!existing.empty) {
                toast({ variant: 'destructive', title: 'Produk sudah ada di daftar trending.' });
                return;
            }

            await addDoc(collection(db, 'trending_products'), {
                productId: product.id,
            });
            toast({ title: 'Produk ditambahkan ke daftar trending' });
            onProductAdded();
            
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Gagal menambahkan produk' });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tambah Produk
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Tambah Produk Trending</DialogTitle>
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
                                        <Button size="sm" onClick={() => handleAddProduct(p)} disabled={isSubmitting}>Tambah</Button>
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

export default function TrendingProductsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [trendingProducts, setTrendingProducts] = useState<TrendingProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrendingProducts = useCallback(async () => {
    setLoading(true);
    try {
        const trendingSnapshot = await getDocs(collection(db, 'trending_products'));
        const trendingRefs = trendingSnapshot.docs.map(doc => ({
            trendingId: doc.id,
            productId: doc.data().productId
        }));

        if (trendingRefs.length === 0) {
            setTrendingProducts([]);
            setLoading(false);
            return;
        }

        // Fetch each product document individually to avoid 'in' query limit.
        const productPromises = trendingRefs.map(async (ref) => {
            const productDoc = await getDoc(doc(db, "products", ref.productId));
            if (productDoc.exists()) {
                return {
                    ...(productDoc.data() as Product),
                    id: productDoc.id,
                    trendingId: ref.trendingId,
                };
            }
            return null;
        });

        const resolvedProducts = (await Promise.all(productPromises)).filter(p => p !== null) as TrendingProduct[];
        
        setTrendingProducts(resolvedProducts);

    } catch (error) {
      console.error('Error fetching trending products: ', error);
      toast({ variant: 'destructive', title: 'Gagal Memuat Produk Trending' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTrendingProducts();
  }, [fetchTrendingProducts]);


  const handleDelete = async (trendingId: string, name: string) => {
    try {
      await deleteDoc(doc(db, 'trending_products', trendingId));
      toast({ title: 'Produk berhasil dihapus dari daftar trending' });
      fetchTrendingProducts();
    } catch (error) {
      console.error('Error deleting trending product: ', error);
      toast({ variant: 'destructive', title: 'Gagal menghapus produk' });
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/settings')}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Kembali ke Pengaturan</span>
            </Button>
            <h1 className="text-xl md:text-2xl font-bold">Pengaturan Produk Trending</h1>
        </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Daftar Produk Trending</CardTitle>
            <CardDescription>
              Tambah atau hapus produk yang akan ditampilkan di halaman reseller.
            </CardDescription>
          </div>
          <AddTrendingProductDialog onProductAdded={fetchTrendingProducts} />
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="text-center p-8 text-muted-foreground">Memuat data...</div>
          ) : trendingProducts.length > 0 ? (
            <div className="space-y-4">
              {trendingProducts.map((product) => (
                <div key={product.trendingId} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <Image src={product.image} alt={product.name} width={64} height={64} className="rounded-md object-cover"/>
                    <div>
                      <p className="font-bold">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.sku}</p>
                    </div>
                  </div>
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
                          Tindakan ini akan menghapus produk <span className="font-bold">{product.name}</span> dari daftar trending.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleDelete(product.trendingId, product.name)}
                        >
                          Ya, Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <Package className="mx-auto h-12 w-12 text-muted-foreground"/>
                <p className="mt-2">Belum ada produk yang ditandai sebagai trending.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
