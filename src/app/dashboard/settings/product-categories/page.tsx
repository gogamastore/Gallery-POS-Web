
"use client";

import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  orderBy,
  query
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Loader2, ArrowLeft, Edit, MoreHorizontal, LayoutGrid, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";

interface ProductCategory {
  id: string;
  name: string;
}

function CategoryFormDialog({ category, onSave }: { category?: ProductCategory, onSave: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [name, setName] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        if (category) {
            setName(category.name);
        } else {
            setName('');
        }
    }, [category]);
    
    const handleSubmit = async () => {
        if (!name.trim()) {
            toast({ variant: 'destructive', title: 'Nama kategori tidak boleh kosong.' });
            return;
        }
        setIsSubmitting(true);
        try {
            if (category) {
                const docRef = doc(db, 'product_categories', category.id);
                await updateDoc(docRef, { name: name.trim() });
                toast({ title: "Kategori berhasil diperbarui." });
            } else {
                await addDoc(collection(db, 'product_categories'), { 
                    name: name.trim(),
                    createdAt: serverTimestamp(),
                });
                toast({ title: "Kategori berhasil ditambahkan." });
            }
            onSave();
            setIsOpen(false);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: `Gagal ${category ? 'memperbarui' : 'menambah'} kategori.` });
        } finally {
            setIsSubmitting(false);
        }
    }

    const triggerButton = category ? (
        <button className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
            <Edit className="mr-2 h-4 w-4" />
            <span>Edit</span>
        </button>
    ) : (
        <Button><PlusCircle className="mr-2 h-4 w-4" />Tambah Kategori</Button>
    );

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{triggerButton}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{category ? 'Edit Kategori' : 'Tambah Kategori Baru'}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="category-name">Nama Kategori</Label>
                    <Input id="category-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function ProductCategoriesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'product_categories'), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      const fetchedCategories = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, name: doc.data().name } as ProductCategory)
      );
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('Error fetching categories: ', error);
      toast({ variant: 'destructive', title: 'Gagal Memuat Kategori' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDeleteCategory = async (id: string, name: string) => {
    try {
      await deleteDoc(doc(db, 'product_categories', id));
      toast({
        title: 'Kategori Dihapus',
        description: `Kategori "${name}" telah dihapus.`,
      });
      fetchCategories(); 
    } catch (error) {
      console.error('Error deleting category: ', error);
      toast({ variant: 'destructive', title: 'Gagal Menghapus Kategori' });
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/settings')}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Kembali ke Pengaturan</span>
            </Button>
            <h1 className="text-xl md:text-2xl font-bold">Pengaturan Kategori Produk</h1>
        </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Daftar Kategori</CardTitle>
            <CardDescription>
              Tambah, edit, atau hapus kategori untuk produk Anda.
            </CardDescription>
          </div>
          <CategoryFormDialog onSave={fetchCategories} />
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="text-center p-8 text-muted-foreground">Memuat data...</div>
          ) : categories.length > 0 ? (
            <div className="space-y-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                    <p className="font-medium">{category.name}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Menu aksi</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                         <CategoryFormDialog category={category} onSave={fetchCategories}/>
                       </DropdownMenuItem>
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-destructive hover:text-destructive-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Hapus</span>
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Menghapus kategori <span className="font-bold">{category.name}</span> tidak akan menghapus produk di dalamnya, tetapi produk tersebut akan menjadi tidak terkategori. Aksi ini tidak dapat diurungkan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteCategory(category.id, category.name)} className="bg-destructive hover:bg-destructive/90">Ya, Hapus</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <AlertCircle className="h-10 w-10 mx-auto mb-2" />
              <p>Belum ada kategori yang ditambahkan.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
