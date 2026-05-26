
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Banknote, PlusCircle, Trash2, Loader2, ArrowLeft, Edit, MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BankAccount {
  id: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
}

function EditAccountDialog({ account, onAccountUpdated }: { account: BankAccount, onAccountUpdated: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        bankName: '',
        accountHolder: '',
        accountNumber: '',
    });
    const { toast } = useToast();

    useEffect(() => {
        if (account) {
            setFormData({
                bankName: account.bankName,
                accountHolder: account.accountHolder,
                accountNumber: account.accountNumber,
            });
        }
    }, [account]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData((prev) => ({ ...prev, [id]: value }));
    };

    const handleUpdate = async () => {
        if (!formData.bankName || !formData.accountHolder || !formData.accountNumber) {
            toast({ variant: 'destructive', title: 'Data tidak lengkap' });
            return;
        }
        setIsSubmitting(true);
        try {
            const accountDocRef = doc(db, 'bank_accounts', account.id);
            await updateDoc(accountDocRef, formData);
            toast({ title: 'Rekening Berhasil Diperbarui' });
            onAccountUpdated();
            setIsOpen(false);
        } catch (error) {
            console.error('Error updating account:', error);
            toast({ variant: 'destructive', title: 'Gagal Memperbarui Rekening' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <button className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                    <Edit className="mr-2 h-4 w-4"/>
                    <span>Edit Rekening</span>
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Rekening: {account.bankName}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="bankName" className="text-right">Nama Bank</Label>
                        <Input id="bankName" value={formData.bankName} onChange={handleInputChange} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="accountHolder" className="text-right">Nama Pemilik</Label>
                        <Input id="accountHolder" value={formData.accountHolder} onChange={handleInputChange} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="accountNumber" className="text-right">Nomor Rekening</Label>
                        <Input id="accountNumber" value={formData.accountNumber} onChange={handleInputChange} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                    <Button onClick={handleUpdate} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Simpan Perubahan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export default function BankAccountsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAccount, setNewAccount] = useState({
    bankName: '',
    accountHolder: '',
    accountNumber: '',
  });

  const fetchBankAccounts = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'bank_accounts'));
      const accounts = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as BankAccount)
      );
      setBankAccounts(accounts);
    } catch (error) {
      console.error('Error fetching bank accounts: ', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Memuat Rekening',
        description: 'Terjadi kesalahan saat mengambil data dari server.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBankAccounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewAccount((prev) => ({ ...prev, [id]: value }));
  };

  const handleAddAccount = async () => {
    if (
      !newAccount.bankName ||
      !newAccount.accountHolder ||
      !newAccount.accountNumber
    ) {
      toast({
        variant: 'destructive',
        title: 'Data Tidak Lengkap',
        description: 'Harap isi semua field yang tersedia.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'bank_accounts'), {
        ...newAccount,
        createdAt: serverTimestamp(),
      });
      toast({
        title: 'Rekening Berhasil Ditambahkan',
      });
      setIsDialogOpen(false);
      setNewAccount({ bankName: '', accountHolder: '', accountNumber: '' });
      fetchBankAccounts(); // Refresh list
    } catch (error) {
      console.error('Error adding bank account: ', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Menambahkan Rekening',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'bank_accounts', id));
      toast({
        title: 'Rekening Berhasil Dihapus',
      });
      fetchBankAccounts(); // Refresh list
    } catch (error) {
      console.error('Error deleting bank account: ', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Menghapus Rekening',
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
            <h1 className="text-xl md:text-2xl font-bold">Pengaturan Rekening Bank</h1>
        </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Daftar Rekening</CardTitle>
            <CardDescription>
              Tambah atau hapus rekening bank untuk metode pembayaran transfer.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Tambah Rekening
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Tambah Rekening Bank Baru</DialogTitle>
                <DialogDescription>
                  Masukkan detail rekening bank yang akan digunakan untuk
                  menerima pembayaran.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="bankName" className="text-right">
                    Nama Bank
                  </Label>
                  <Input
                    id="bankName"
                    value={newAccount.bankName}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="Contoh: BCA, Mandiri"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="accountHolder" className="text-right">
                    Nama Pemilik
                  </Label>
                  <Input
                    id="accountHolder"
                    value={newAccount.accountHolder}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="accountNumber" className="text-right">
                    Nomor Rekening
                  </Label>
                  <Input
                    id="accountNumber"
                    value={newAccount.accountNumber}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddAccount} disabled={isSubmitting}>
                   {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Rekening
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="text-center p-8 text-muted-foreground">Memuat data rekening...</div>
          ) : bankAccounts.length > 0 ? (
            <div className="space-y-4">
              {bankAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <Banknote className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-bold">{account.bankName.toUpperCase()}</p>
                      <p className="text-sm text-muted-foreground">
                        {account.accountNumber} a/n {account.accountHolder}
                      </p>
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
                            <EditAccountDialog account={account} onAccountUpdated={fetchBankAccounts} />
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
                                Tindakan ini akan menghapus rekening <span className='font-bold'>{account.bankName} - {account.accountNumber}</span> secara permanen.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteAccount(account.id)} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
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
              <p>Belum ada rekening bank yang ditambahkan.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
