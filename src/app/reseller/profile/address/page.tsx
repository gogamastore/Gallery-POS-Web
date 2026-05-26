
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, ArrowLeft, Home, User, Phone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';


interface UserAddress {
    id: string;
    label: string;
    name: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
    phone: string; // Changed from whatsapp
    isDefault: boolean;
}

export default function AddressPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isAddressLoading, setIsAddressLoading] = useState(true);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [newAddress, setNewAddress] = useState({
      label: '',
      name: '',
      address: '',
      phone: '',
      city: '',
      province: '',
      postalCode: '',
      isDefault: false
  });

  const fetchAddresses = async () => {
    if (!user) return;
    setIsAddressLoading(true);
    const addressesQuery = query(collection(db, `user/${user.uid}/addresses`), orderBy("created_at", "desc"));
    const querySnapshot = await getDocs(addressesQuery);
    const userAddresses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserAddress));
    setAddresses(userAddresses);
    setIsAddressLoading(false);
  };
  
  useEffect(() => {
    if (!authLoading && user) {
      fetchAddresses();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);


  const handleAddressDialogInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setNewAddress(prev => ({ ...prev, [id]: value }));
  };
  
  const handleCheckboxChange = (checked: boolean) => {
    setNewAddress(prev => ({ ...prev, isDefault: checked }));
  }

  const handleSaveAddress = async () => {
      if (!user) return;
      if (!newAddress.label || !newAddress.name || !newAddress.address || !newAddress.phone || !newAddress.city) {
          toast({ variant: 'destructive', title: 'Data alamat tidak lengkap', description: 'Harap isi semua field yang wajib.' });
          return;
      }
      setIsSubmitting(true);
      try {
          await addDoc(collection(db, `user/${user.uid}/addresses`), {
              ...newAddress,
              created_at: serverTimestamp(),
              updated_at: serverTimestamp()
          });
          toast({ title: 'Alamat baru berhasil disimpan' });
          setIsAddressDialogOpen(false);
          setNewAddress({ label: '', name: '', address: '', phone: '', city: '', province: '', postalCode: '', isDefault: false });
          fetchAddresses();
      } catch (error) {
          console.error(error);
          toast({ variant: 'destructive', title: 'Gagal menyimpan alamat' });
      } finally {
          setIsSubmitting(false);
      }
  }

  const handleDeleteAddress = async (addressId: string) => {
      if (!user) return;
      
      try {
          await deleteDoc(doc(db, `user/${user.uid}/addresses`, addressId));
          toast({ title: 'Alamat berhasil dihapus' });
          fetchAddresses();
      } catch (error) {
          console.error(error);
          toast({ variant: 'destructive', title: 'Gagal menghapus alamat' });
      }
  }

  if (authLoading) {
    return <div className="text-center p-8"><Loader2 className="mx-auto h-8 w-8 animate-spin"/></div>;
  }
  if (!user) {
    router.replace('/login');
    return <div className="text-center p-8"><Loader2 className="mx-auto h-8 w-8 animate-spin"/></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-screen-lg">
       <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Kembali</span>
            </Button>
            <h1 className="text-3xl font-bold font-headline">Alamat Saya</h1>
       </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
             <div>
                <CardTitle>Buku Alamat</CardTitle>
                 <CardDescription>
                    Kelola alamat pengiriman Anda untuk proses checkout yang lebih cepat.
                </CardDescription>
             </div>
             <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4"/>Tambah Alamat</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Tambah Alamat Baru</DialogTitle>
                        <DialogDescription>Simpan alamat untuk mempermudah proses checkout nanti.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2 max-h-[70vh] overflow-y-auto px-2">
                        <div className="space-y-1">
                            <Label htmlFor="label">Label Alamat</Label>
                            <Input id="label" value={newAddress.label} onChange={handleAddressDialogInputChange} placeholder="Contoh: Rumah, Kantor, Toko"/>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="name">Nama Penerima</Label>
                            <Input id="name" value={newAddress.name} onChange={handleAddressDialogInputChange} placeholder="Nama lengkap penerima"/>
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="phone">Nomor Telepon Penerima</Label>
                            <Input id="phone" value={newAddress.phone} onChange={handleAddressDialogInputChange} placeholder="Contoh: 6281234567890"/>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="address">Alamat Lengkap</Label>
                            <Textarea id="address" value={newAddress.address} onChange={handleAddressDialogInputChange} placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan"/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="city">Kota/Kabupaten</Label>
                                <Input id="city" value={newAddress.city} onChange={handleAddressDialogInputChange} placeholder="Contoh: Makassar"/>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="province">Provinsi</Label>
                                <Input id="province" value={newAddress.province} onChange={handleAddressDialogInputChange} placeholder="Contoh: Sulawesi Selatan"/>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="postalCode">Kode Pos</Label>
                            <Input id="postalCode" value={newAddress.postalCode} onChange={handleAddressDialogInputChange} placeholder="Contoh: 90234"/>
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox id="isDefault" checked={newAddress.isDefault} onCheckedChange={handleCheckboxChange} />
                            <Label htmlFor="isDefault">Jadikan alamat utama</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAddressDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleSaveAddress} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
             </Dialog>
        </CardHeader>
        <CardContent>
            {isAddressLoading ? (
                 <p>Memuat alamat...</p>
            ) : addresses.length > 0 ? (
                <div className="space-y-4">
                    {addresses.map(addr => (
                         <div key={addr.id} className="flex items-start justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-4">
                               <Home className="h-5 w-5 mt-1 text-muted-foreground"/>
                               <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-bold">{addr.label}</p>
                                        {addr.isDefault && <div className="text-xs font-medium text-primary-foreground bg-primary rounded-full px-2 py-0.5">Utama</div>}
                                    </div>
                                    <div className="text-sm text-muted-foreground space-y-1">
                                        <p className="flex items-center gap-2"><User className="h-4 w-4"/> {addr.name}</p>
                                        <p className="flex items-center gap-2"><Phone className="h-4 w-4"/> {addr.phone}</p>
                                        <p>{addr.address}, {addr.city}, {addr.province} {addr.postalCode}</p>
                                    </div>
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
                                        Tindakan ini akan menghapus alamat <span className='font-bold'>{addr.label}</span> secara permanen.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteAddress(addr.id)} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p>Anda belum menambahkan alamat tersimpan.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
