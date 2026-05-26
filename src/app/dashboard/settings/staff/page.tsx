
"use client";

import { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  where,
  setDoc,
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Loader2, User, ArrowLeft, Edit, KeyRound, MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";


interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  role: string;
}

function EditStaffDialog({ staff, onStaffUpdated }: { staff: Staff, onStaffUpdated: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSendingReset, setIsSendingReset] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        position: '',
    });
    const { toast } = useToast();
    const { sendPasswordReset } = useAuth();

    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: staff.name ?? '',
                position: staff.position ?? '',
            });
        }
    }, [isOpen, staff]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData((prev) => ({ ...prev, [id]: value }));
    };

    const handleUpdateDetails = async () => {
        if (!formData.name || !formData.position) {
            toast({ variant: 'destructive', title: 'Data tidak lengkap', description: 'Nama dan jabatan harus diisi.' });
            return;
        }
        setIsSubmitting(true);
        try {
            const staffDocRef = doc(db, 'user', staff.id);
            await updateDoc(staffDocRef, {
                name: formData.name,
                position: formData.position,
            });
            toast({ title: 'Data Staf Berhasil Diperbarui' });
            onStaffUpdated();
            setIsOpen(false);
        } catch (error) {
            console.error('Error updating staff details:', error);
            toast({ variant: 'destructive', title: 'Gagal Memperbarui Data' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePasswordReset = async () => {
        setIsSendingReset(true);
        try {
            await sendPasswordReset(staff.email);
            toast({
                title: 'Email Reset Password Terkirim',
                description: `Email telah dikirim ke ${staff.email}.`,
            });
        } catch (error) {
            console.error('Error sending password reset:', error);
            toast({ variant: 'destructive', title: 'Gagal Mengirim Email' });
        } finally {
            setIsSendingReset(false);
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                    <Edit className="mr-2 h-4 w-4"/>
                    <span>Edit Staf</span>
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Staf: {staff.name}</DialogTitle>
                    <DialogDescription>
                        Perbarui detail informasi atau kirim email reset password untuk staf ini.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nama Lengkap</Label>
                        <Input id="name" value={formData.name} onChange={handleInputChange} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">Alamat Email</Label>
                        <Input id="email" type="email" value={staff.email} disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="position">Jabatan</Label>
                        <Input id="position" value={formData.position} onChange={handleInputChange} />
                    </div>
                </div>
                <DialogFooter className="sm:justify-between flex-col-reverse sm:flex-row gap-2">
                    <Button onClick={handlePasswordReset} variant="secondary" disabled={isSendingReset}>
                        {isSendingReset ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <KeyRound className="mr-2 h-4 w-4"/>}
                        Reset Password
                    </Button>
                    <Button onClick={handleUpdateDetails} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Simpan Perubahan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function StaffManagementPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user: currentUser, createUser } = useAuth();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    password: '',
  });

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'user'), where('role', '==', 'admin'));
      const querySnapshot = await getDocs(q);
      const staffData = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Staff)
      ).filter(staff => staff.id !== currentUser?.uid); // Filter out current user
      setStaffList(staffData);
    } catch (error: any) {
      console.error('Error fetching staff: ', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Memuat Staf',
        description: 'Anda tidak memiliki izin untuk melihat daftar ini. Pastikan aturan keamanan Firestore sudah benar.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
        fetchStaff();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewStaff((prev) => ({ ...prev, [id]: value }));
  };

  const handleAddStaff = async () => {
    if (
      !newStaff.name ||
      !newStaff.email ||
      !newStaff.password ||
      !newStaff.position
    ) {
      toast({
        variant: 'destructive',
        title: 'Data Tidak Lengkap',
        description: 'Nama, email, password, dan jabatan harus diisi.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      // 1. Create user in Firebase Authentication
      const userCredential = await createUser(newStaff.email, newStaff.password);
      const user = userCredential.user;

      // 2. Add staff details to Firestore
      await setDoc(doc(db, "user", user.uid), {
          name: newStaff.name,
          email: newStaff.email,
          phone: newStaff.phone,
          position: newStaff.position,
          role: 'admin' // Explicitly set role to 'admin'
      });

      toast({
        title: 'Staf Berhasil Ditambahkan',
        description: `${newStaff.name} telah ditambahkan sebagai admin.`,
      });
      setIsDialogOpen(false);
      setNewStaff({ name: '', email: '', phone: '', position: '', password: '' });
      fetchStaff(); // Refresh list
    } catch (error: any) {
      console.error('Error adding staff: ', error);
      let errorMessage = 'Pastikan email belum terdaftar dan password valid.';
      if (error.code === 'auth/email-already-in-use') {
          errorMessage = 'Alamat email ini sudah digunakan oleh akun lain.';
      } else if (error.code === 'auth/weak-password') {
          errorMessage = 'Password terlalu lemah. Harap gunakan minimal 6 karakter.';
      } else if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
          errorMessage = 'Izin ditolak. Pastikan aturan keamanan Firestore sudah benar.'
      }

      toast({
        variant: 'destructive',
        title: 'Gagal Menambahkan Staf',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    try {
      // Delete from Firestore only. Auth deletion requires Admin SDK on a backend.
      await deleteDoc(doc(db, "user", id));
      
      toast({
        title: 'Staf Berhasil Dihapus dari Daftar',
        description: `Data staf ${name} telah dihapus. Jangan lupa untuk menonaktifkan login mereka dari Firebase Console.`,
        duration: 10000
      });
      fetchStaff(); // Refresh list
    } catch (error: any) {
      console.error('Error deleting staff document: ', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Menghapus Staf',
        description: error.message || "Terjadi kesalahan saat menghapus data.",
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
            <h1 className="text-xl md:text-2xl font-bold">Manajemen Staf</h1>
        </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Daftar Staf Admin</CardTitle>
            <CardDescription>
              Tambah, lihat, atau hapus staf yang memiliki akses ke dasbor admin.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Tambah Staf
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Staf Admin Baru</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Lengkap</Label>
                  <Input id="name" value={newStaff.name} onChange={handleInputChange} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="email">Alamat Email</Label>
                  <Input id="email" type="email" value={newStaff.email} onChange={handleInputChange} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="phone">Nomor Telepon</Label>
                  <Input id="phone" type="tel" value={newStaff.phone} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Jabatan</Label>
                  <Input id="position" value={newStaff.position} onChange={handleInputChange} placeholder="Contoh: Admin Gudang"/>
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={newStaff.password} onChange={handleInputChange} placeholder="Minimal 6 karakter" />
                </div>
              </div>
              <DialogFooter>
                 <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                <Button onClick={handleAddStaff} disabled={isSubmitting}>
                   {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Staf
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kontak</TableHead>
                    <TableHead>Jabatan</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                        Memuat data staf...
                        </TableCell>
                    </TableRow>
                    ) : staffList.length > 0 ? (
                    staffList.map((staff) => (
                        <TableRow key={staff.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground"/>
                            {staff.name}
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col">
                                <span>{staff.email}</span>
                                <span className="text-xs text-muted-foreground">{staff.phone}</span>
                            </div>
                        </TableCell>
                        <TableCell>{staff.position}</TableCell>
                         <TableCell>
                            <Badge variant="secondary">{staff.role}</Badge>
                         </TableCell>
                        <TableCell className="text-right">
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
                                        <EditStaffDialog staff={staff} onStaffUpdated={fetchStaff} />
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
                                                    Tindakan ini akan menghapus data staf <span className='font-bold'>{staff.name}</span> dari daftar, tapi tidak akan menghapus akun login mereka. Anda harus menghapusnya secara manual dari Firebase Console.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteStaff(staff.id, staff.name)} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>

                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                        Belum ada staf lain yang ditambahkan.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
