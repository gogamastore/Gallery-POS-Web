
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
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Image from 'next/image';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Loader2, ArrowLeft, Edit, MoreHorizontal, LayoutGrid, AlertCircle, Layers } from 'lucide-react';
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
  imageUrl?: string;
}

function CategoryFormDialog({ category, onSave }: { category?: ProductCategory, onSave: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [name, setName] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (category) {
            setName(category.name);
            setImagePreview(category.imageUrl || null);
        } else {
            setName('');
            setImagePreview(null);
        }
        setImageFile(null);
    }, [category, isOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            toast({ variant: 'destructive', title: 'Nama kategori tidak boleh kosong.' });
            return;
        }
        setIsSubmitting(true);
        try {
            let imageUrl = category?.imageUrl || '';
            if (imageFile) {
                const storageRef = ref(storage, `category_icons/${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
                await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(storageRef);
            }

            if (category) {
                const docRef = doc(db, 'product_categories', category.id);
                await updateDoc(docRef, { name: name.trim(), imageUrl });
                toast({ title: "Kategori berhasil diperbarui." });
            } else {
                await addDoc(collection(db, 'product_categories'), {
                    name: name.trim(),
                    imageUrl,
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
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="category-name">Nama Kategori</Label>
                        <Input id="category-name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category-icon">Ikon / Gambar Kategori (opsional)</Label>
                        {imagePreview && (
                            <Image src={imagePreview} alt="Preview Ikon" width={80} height={80} className="rounded-md object-contain border bg-muted p-1" />
                        )}
                        <Input id="category-icon" type="file" accept="image/*" onChange={handleFileChange} />
                        <p className="text-xs text-muted-foreground">Disarankan PNG transparan. Dipakai sebagai ikon kategori di halaman &quot;Lihat Semua&quot;.</p>
                    </div>
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

interface ParentCategory {
  id: string;
  name: string;
  imageUrl?: string;
  children: string[]; // nama sub-kategori (product_categories.name)
}

/**
 * Dialog tambah/edit Induk Kategori. Induk disimpan di koleksi TERPISAH
 * `category_parents` {name, imageUrl, children:[nama kategori]} — produk &
 * `product_categories` TIDAK berubah (hanya lapisan pengelompokan/navigasi).
 */
function ParentFormDialog({
  parent,
  categories,
  onSave,
}: {
  parent?: ParentCategory;
  categories: ProductCategory[];
  onSave: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [children, setChildren] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (parent) {
      setName(parent.name);
      setChildren(parent.children ?? []);
      setImagePreview(parent.imageUrl || null);
    } else {
      setName('');
      setChildren([]);
      setImagePreview(null);
    }
    setImageFile(null);
  }, [parent, isOpen]);

  const toggleChild = (catName: string, checked: boolean) =>
    setChildren((prev) =>
      checked ? [...new Set([...prev, catName])] : prev.filter((c) => c !== catName));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Nama induk kategori tidak boleh kosong.' });
      return;
    }
    setIsSubmitting(true);
    try {
      let imageUrl = parent?.imageUrl || '';
      if (imageFile) {
        const storageRef = ref(storage, `category_icons/${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }
      const payload = { name: name.trim(), imageUrl, children, updatedAt: serverTimestamp() };
      if (parent) {
        await updateDoc(doc(db, 'category_parents', parent.id), payload);
        toast({ title: 'Induk kategori diperbarui.' });
      } else {
        await addDoc(collection(db, 'category_parents'), { ...payload, createdAt: serverTimestamp() });
        toast({ title: 'Induk kategori ditambahkan.' });
      }
      onSave();
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: `Gagal ${parent ? 'memperbarui' : 'menambah'} induk kategori.` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerButton = parent ? (
    <button className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:text-accent-foreground w-full">
      <Edit className="mr-2 h-4 w-4" />
      <span>Edit</span>
    </button>
  ) : (
    <Button><PlusCircle className="mr-2 h-4 w-4" />Tambah Induk Kategori</Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{parent ? 'Edit Induk Kategori' : 'Tambah Induk Kategori'}</DialogTitle>
          <DialogDescription>Kelompokkan sub-kategori ke dalam satu induk (mis. Skincare).</DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="parent-name">Nama Induk Kategori</Label>
            <Input id="parent-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Skincare" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parent-icon">Ikon / Gambar (opsional)</Label>
            {imagePreview && (
              <Image src={imagePreview} alt="Preview" width={64} height={64} className="rounded-md object-contain border bg-muted p-1" />
            )}
            <Input id="parent-icon" type="file" accept="image/*" onChange={handleFileChange} />
          </div>
          <div className="space-y-2">
            <Label>Sub-kategori yang termasuk</Label>
            {categories.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada kategori. Tambahkan kategori terlebih dahulu.</p>
            ) : (
              <ScrollArea className="h-48 rounded-md border p-2">
                <div className="space-y-1.5">
                  {categories.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted cursor-pointer">
                      <Checkbox
                        checked={children.includes(c.name)}
                        onCheckedChange={(v) => toggleChild(c.name, v === true)}
                      />
                      <span>{c.name}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            )}
            <p className="text-xs text-muted-foreground">{children.length} sub-kategori dipilih.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ProductCategoriesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [parents, setParents] = useState<ParentCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'product_categories'), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      const fetchedCategories = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as ProductCategory)
      );
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('Error fetching categories: ', error);
      toast({ variant: 'destructive', title: 'Gagal Memuat Kategori' });
    } finally {
      setLoading(false);
    }
  };

  const fetchParents = async () => {
    try {
      const q = query(collection(db, 'category_parents'), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      setParents(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name,
            imageUrl: data.imageUrl,
            children: Array.isArray(data.children) ? (data.children as string[]) : [],
          } as ParentCategory;
        }),
      );
    } catch (error) {
      console.error('Error fetching parent categories: ', error);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchParents();
  }, []);

  const handleDeleteParent = async (id: string, name: string) => {
    try {
      await deleteDoc(doc(db, 'category_parents', id));
      toast({ title: 'Induk Kategori Dihapus', description: `"${name}" telah dihapus.` });
      fetchParents();
    } catch (error) {
      console.error('Error deleting parent: ', error);
      toast({ variant: 'destructive', title: 'Gagal Menghapus Induk Kategori' });
    }
  };

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

      {/* Induk Kategori — pengelompokan sub-kategori (tidak mengubah produk) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Induk Kategori</CardTitle>
            <CardDescription>
              Kelompokkan beberapa kategori ke dalam satu induk (mis. Skincare → Face Wash, Cream, …).
            </CardDescription>
          </div>
          <ParentFormDialog categories={categories} onSave={fetchParents} />
        </CardHeader>
        <CardContent>
          {parents.length > 0 ? (
            <div className="space-y-4">
              {parents.map((parent) => (
                <div key={parent.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4 min-w-0">
                    {parent.imageUrl ? (
                      <Image src={parent.imageUrl} alt={parent.name} width={36} height={36} className="h-9 w-9 rounded-md object-contain bg-muted p-1" />
                    ) : (
                      <Layers className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium">{parent.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {parent.children.length > 0 ? parent.children.join(', ') : 'Belum ada sub-kategori'}
                      </p>
                    </div>
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
                        <ParentFormDialog parent={parent} categories={categories} onSave={fetchParents} />
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-destructive hover:text-destructive-foreground w-full text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Hapus</span>
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Menghapus induk kategori <span className="font-bold">{parent.name}</span> tidak menghapus sub-kategori atau produknya — hanya pengelompokannya. Aksi ini tidak dapat diurungkan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteParent(parent.id, parent.name)} className="bg-destructive hover:bg-destructive/90">Ya, Hapus</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-6 text-muted-foreground border-2 border-dashed rounded-lg">
              <Layers className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Belum ada induk kategori.</p>
            </div>
          )}
        </CardContent>
      </Card>

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
                    {category.imageUrl ? (
                      <Image src={category.imageUrl} alt={category.name} width={36} height={36} className="h-9 w-9 rounded-md object-contain bg-muted p-1" />
                    ) : (
                      <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                    )}
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
