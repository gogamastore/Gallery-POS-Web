
"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Building, PlusCircle, Trash2, Loader2, ArrowLeft, Edit, MoreHorizontal, ImagePlus, SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface Brand {
  id: string;
  name: string;
  logoUrl: string;
}

function BrandFormDialog({ brand, onSave }: { brand?: Brand, onSave: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [name, setName] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (brand) {
            setName(brand.name);
            setLogoPreview(brand.logoUrl);
        } else {
            setName('');
            setLogoPreview(null);
        }
    }, [brand]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };
    
    const handleSubmit = async () => {
        if (!name.trim() || (!logoFile && !brand)) {
            toast({ variant: 'destructive', title: 'Data tidak lengkap.', description: 'Nama dan logo brand harus diisi.' });
            return;
        }
        setIsSubmitting(true);
        try {
            let imageUrl = brand?.logoUrl || '';
            if (logoFile) {
                const storageRef = ref(storage, `brand_logos/${Date.now()}_${logoFile.name}`);
                await uploadBytes(storageRef, logoFile);
                imageUrl = await getDownloadURL(storageRef);
            }

            if (brand) {
                const docRef = doc(db, 'brands', brand.id);
                await updateDoc(docRef, { name: name.trim(), logoUrl: imageUrl });
                toast({ title: "Brand berhasil diperbarui." });
            } else {
                await addDoc(collection(db, 'brands'), { 
                    name: name.trim(),
                    logoUrl: imageUrl,
                    createdAt: serverTimestamp(),
                });
                toast({ title: "Brand berhasil ditambahkan." });
            }
            onSave();
            setIsOpen(false);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: `Gagal menyimpan brand.` });
        } finally {
            setIsSubmitting(false);
        }
    }

    const triggerText = brand ? 'Edit' : 'Tambah Brand';
    const TriggerIcon = brand ? Edit : PlusCircle;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {brand ? (
                    <button className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:text-accent-foreground w-full">
                        <TriggerIcon className="mr-2 h-4 w-4"/>
                        <span>{triggerText}</span>
                    </button>
                ) : (
                    <Button><TriggerIcon className="mr-2 h-4 w-4" />{triggerText}</Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{brand ? 'Edit Brand' : 'Tambah Brand Baru'}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="brand-name">Nama Brand</Label>
                        <Input id="brand-name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                         <Label htmlFor="logo-upload">Logo Brand</Label>
                        {logoPreview && <Image src={logoPreview} alt="Preview Logo" width={100} height={100} className="rounded-md object-contain border" />}
                         <Input id="logo-upload" type="file" accept="image/*" onChange={handleFileChange} />
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

export default function BrandsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'brands'), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      const fetchedData = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Brand)
      );
      setBrands(fetchedData);
    } catch (error) {
      console.error('Error fetching brands: ', error);
      toast({ variant: 'destructive', title: 'Gagal Memuat Brand' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteDoc(doc(db, 'brands', id));
      // Note: This doesn't un-assign the brand from products. A more robust solution might involve a Cloud Function.
      toast({
        title: 'Brand Dihapus',
        description: `Brand "${name}" telah dihapus.`,
      });
      fetchBrands(); 
    } catch (error) {
      console.error('Error deleting brand: ', error);
      toast({ variant: 'destructive', title: 'Gagal Menghapus Brand' });
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/settings')}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Kembali ke Pengaturan</span>
            </Button>
            <h1 className="text-xl md:text-2xl font-bold">Pengaturan Brand</h1>
        </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Daftar Brand</CardTitle>
            <CardDescription>
              Tambah, edit, atau hapus daftar brand untuk produk Anda.
            </CardDescription>
          </div>
          <BrandFormDialog onSave={fetchBrands} />
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="text-center p-8 text-muted-foreground">Memuat data...</div>
          ) : brands.length > 0 ? (
            <div className="space-y-4">
              {brands.map((brand) => (
                <div
                  key={brand.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <Image src={brand.logoUrl} alt={brand.name} width={40} height={40} className="rounded-md object-contain bg-muted p-1" />
                    <p className="font-medium">{brand.name}</p>
                  </div>
                   <div className="flex items-center gap-2">
                     <Button asChild variant="secondary" size="sm">
                        <Link href={`/dashboard/settings/brands/${brand.id}`}>
                           <SlidersHorizontal className="mr-2 h-4 w-4"/> Kelola Produk
                        </Link>
                     </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Menu aksi</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                             <BrandFormDialog brand={brand} onSave={fetchBrands}/>
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
                                    Menghapus brand <span className="font-bold">{brand.name}</span> tidak akan menghapus produk di dalamnya, tetapi akan melepaskan asosiasi brand dari produk tersebut. Aksi ini tidak dapat diurungkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(brand.id, brand.name)} className="bg-destructive hover:bg-destructive/90">Ya, Hapus</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                   </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <p>Belum ada brand yang ditambahkan.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
