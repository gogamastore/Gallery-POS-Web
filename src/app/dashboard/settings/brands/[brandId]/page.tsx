
"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, getDoc, collection, getDocs, query, where, writeBatch, updateDoc, addDoc } from 'firebase/firestore';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { ArrowLeft, PlusCircle, Search, Trash2, Loader2, Package } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';

interface Brand {
  id: string;
  name: string;
  logoUrl: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  image: string;
  price: string;
  brandId?: string;
}

const formatCurrency = (value: string | number): string => {
    const num = typeof value === 'string' ? Number(value.replace(/[^0-9]/g, '')) : value;
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(num);
}


function AddProductDialog({ brand, onProductsAdded, currentProductIds }: { brand: Brand, onProductsAdded: () => void, currentProductIds: Set<string> }) {
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
        } catch (error) {
            console.error(error);
             toast({ variant: 'destructive', title: 'Gagal Memuat Produk' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if(isOpen) fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    useEffect(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        const results = allProducts.filter(p => 
            p.name.toLowerCase().includes(lowercasedFilter) || 
            (p.sku && String(p.sku).toLowerCase().includes(lowercasedFilter))
        );
        setFilteredProducts(results);
    }, [searchTerm, allProducts]);

    const handleAddProduct = async (product: Product) => {
        setIsSubmitting(true);
        try {
            if (currentProductIds.has(product.id)) {
                 toast({ variant: 'destructive', title: 'Produk sudah ada di brand ini.' });
                 setIsSubmitting(false); // Make sure to stop submission
                 return;
            }
            const productRef = doc(db, 'products', product.id);
            await updateDoc(productRef, { brandId: brand.id });
            toast({ title: `Produk "${product.name}" ditambahkan.` });
            onProductsAdded(); // Refresh the list
        } catch(error) {
            console.error(error);
            toast({ variant: "destructive", title: "Gagal menambahkan produk" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4"/>Tambah Produk</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Tambah Produk ke Brand: {brand.name}</DialogTitle>
                    <DialogDescription>Pilih produk untuk dimasukkan ke dalam brand ini.</DialogDescription>
                    <div className="relative pt-2">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Cari produk..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                            {loading ? <TableRow><TableCell colSpan={4} className="h-24 text-center">Memuat produk...</TableCell></TableRow> : 
                            filteredProducts.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <Image src={p.image} alt={p.name} width={40} height={40} className="rounded-md object-cover"/>
                                        {p.name}
                                    </TableCell>
                                    <TableCell>{p.sku}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(p.price)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button 
                                            size="sm" 
                                            onClick={() => handleAddProduct(p)} 
                                            disabled={isSubmitting || currentProductIds.has(p.id)}
                                        >
                                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : (currentProductIds.has(p.id) ? 'Ditambahkan' : 'Tambah')}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function ManageBrandProductsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const brandId = params.brandId as string;

  const fetchBrandAndProducts = useCallback(async () => {
    if (!brandId) return;
    setLoading(true);
    try {
        const brandDocRef = doc(db, 'brands', brandId);
        const brandDoc = await getDoc(brandDocRef);
        if (!brandDoc.exists()) {
            toast({ variant: 'destructive', title: 'Brand tidak ditemukan.' });
            router.push('/dashboard/settings/brands');
            return;
        }
        setBrand({ id: brandDoc.id, ...brandDoc.data() } as Brand);
        
        const productsQuery = query(collection(db, 'products'), where('brandId', '==', brandId));
        const productsSnapshot = await getDocs(productsQuery);
        const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(productsData);

    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Gagal memuat data.' });
    } finally {
        setLoading(false);
    }
  }, [brandId, router, toast]);

  useEffect(() => {
    fetchBrandAndProducts();
  }, [fetchBrandAndProducts]);

  const currentProductIds = useMemo(() => new Set(products.map(p => p.id)), [products]);

  const handleRemoveProductFromBrand = async (productId: string) => {
    try {
        const productRef = doc(db, 'products', productId);
        await updateDoc(productRef, { brandId: null });
        toast({ title: 'Produk berhasil dihapus dari brand.' });
        fetchBrandAndProducts(); // Refresh list
    } catch(error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Gagal menghapus produk.' });
    }
  }

  if (loading || !brand) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/settings/brands')}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
                <CardTitle>Kelola Produk Brand: {brand.name}</CardTitle>
                <CardDescription>
                  Tambahkan atau hapus produk yang masuk dalam brand ini.
                </CardDescription>
            </div>
        </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Daftar Produk dalam Brand</CardTitle>
            <AddProductDialog brand={brand} onProductsAdded={fetchBrandAndProducts} currentProductIds={currentProductIds} />
        </CardHeader>
        <CardContent>
             <div className="overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Produk</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? <TableRow><TableCell colSpan={3} className="h-24 text-center">Memuat...</TableCell></TableRow> : 
                        products.length > 0 ? products.map(p => (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium flex items-center gap-2">
                                    <Image src={p.image} alt={p.name} width={40} height={40} className="rounded-md object-cover"/>
                                    {p.name}
                                </TableCell>
                                <TableCell>{p.sku}</TableCell>
                                <TableCell className="text-right">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4"/>Hapus</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Tindakan ini akan menghapus produk <span className="font-bold">{p.name}</span> dari brand <span className="font-bold">{brand.name}</span>.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleRemoveProductFromBrand(p.id)} className="bg-destructive hover:bg-destructive/90">Ya, Hapus</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        )) : 
                        <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground"><Package className="mx-auto h-8 w-8 mb-2"/>Belum ada produk di brand ini.</TableCell></TableRow>}
                    </TableBody>
                </Table>
             </div>
        </CardContent>
      </Card>
    </div>
  );
}
