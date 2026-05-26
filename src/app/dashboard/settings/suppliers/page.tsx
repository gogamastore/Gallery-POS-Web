
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Building, PlusCircle, Trash2, Loader2, ArrowLeft, Edit, MoreHorizontal, Phone, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Supplier {
  id: string;
  name: string;
  address: string;
  whatsapp: string;
}

function SupplierFormDialog({ supplier, onSave }: { supplier?: Supplier | null, onSave: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        whatsapp: '',
    });
    const { toast } = useToast();

    useEffect(() => {
        if (supplier) {
            setFormData({
                name: supplier.name,
                address: supplier.address,
                whatsapp: supplier.whatsapp,
            });
        } else {
            setFormData({ name: '', address: '', whatsapp: '' });
        }
    }, [supplier]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData((prev) => ({ ...prev, [id]: value }));
    };

    const handleSave = async () => {
        if (!formData.name) {
            toast({ variant: 'destructive', title: 'Nama supplier harus diisi' });
            return;
        }
        setIsSubmitting(true);
        try {
            if (supplier) {
                // Update
                const docRef = doc(db, 'suppliers', supplier.id);
                await updateDoc(docRef, formData);
                toast({ title: 'Supplier Berhasil Diperbarui' });
            } else {
                // Create
                await addDoc(collection(db, 'suppliers'), {
                    ...formData,
                    createdAt: serverTimestamp(),
                });
                toast({ title: 'Supplier Berhasil Ditambahkan' });
            }
            onSave();
            setIsOpen(false);
        } catch (error) {
            console.error('Error saving supplier:', error);
            toast({ variant: 'destructive', title: 'Gagal Menyimpan Data' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {supplier ? (
                    <button className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:text-accent-foreground w-full">
                        <Edit className="mr-2 h-4 w-4"/>
                        <span>Edit Supplier</span>
                    </button>
                ) : (
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Tambah Supplier
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{supplier ? 'Edit Supplier' : 'Tambah Supplier Baru'}</DialogTitle>
                    <DialogDescription>
                        {supplier ? 'Edit detail supplier yang sudah ada.' : 'Masukkan detail supplier baru.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                     <div className="space-y-2">
                        <Label htmlFor="name">Nama Supplier</Label>
                        <Input id="name" value={formData.name} onChange={handleInputChange} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="whatsapp">Nomor WhatsApp</Label>
                        <Input id="whatsapp" value={formData.whatsapp} onChange={handleInputChange} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="address">Alamat</Label>
                        <Textarea id="address" value={formData.address} onChange={handleInputChange} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                    <Button onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export default function SuppliersPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'suppliers'));
      const fetchedData = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Supplier)
      );
      setSuppliers(fetchedData);
    } catch (error) {
      console.error('Error fetching suppliers: ', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Memuat Data Supplier',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'suppliers', id));
      toast({ title: 'Supplier Berhasil Dihapus' });
      fetchSuppliers(); // Refresh list
    } catch (error) {
      console.error('Error deleting supplier: ', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Menghapus Supplier',
      });
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/settings')}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Kembali ke Pengaturan</span>
            </Button>
            <h1 className="text-xl md:text-2xl font-bold">Pengaturan Supplier</h1>
        </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Daftar Supplier</CardTitle>
            <CardDescription>
              Tambah, edit, atau hapus daftar supplier untuk transaksi pembelian.
            </CardDescription>
          </div>
          <SupplierFormDialog onSave={fetchSuppliers} />
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="text-center p-8 text-muted-foreground">Memuat data...</div>
          ) : suppliers.length > 0 ? (
            <div className="space-y-4">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <Building className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-bold">{supplier.name}</p>
                      <div className="text-sm text-muted-foreground flex flex-col sm:flex-row sm:gap-4">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3"/>{supplier.whatsapp || 'N/A'}</span>
                        <span className="flex items-center gap-1"><Home className="h-3 w-3"/>{supplier.address || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Buka menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                        <DropdownMenuSeparator/>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <SupplierFormDialog supplier={supplier} onSave={fetchSuppliers} />
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <button className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-destructive hover:text-destructive-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-destructive">
                                <Trash2 className="mr-2 h-4 w-4"/>
                                <span>Hapus</span>
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tindakan ini akan menghapus supplier <span className='font-bold'>{supplier.name}</span> secara permanen.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(supplier.id)} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
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
              <p>Belum ada supplier yang ditambahkan.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
