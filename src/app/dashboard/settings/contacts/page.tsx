
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
import { Contact, PlusCircle, Trash2, Loader2, ArrowLeft, MessageSquare, Edit, MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AdminContact {
  id: string;
  name: string;
  whatsapp: string;
}


function EditContactDialog({ contact, onContactUpdated }: { contact: AdminContact, onContactUpdated: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        whatsapp: '',
    });
    const { toast } = useToast();

    useEffect(() => {
        if (contact) {
            setFormData({
                name: contact.name,
                whatsapp: contact.whatsapp,
            });
        }
    }, [contact]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData((prev) => ({ ...prev, [id]: value }));
    };

    const handleUpdateDetails = async () => {
        if (!formData.name || !formData.whatsapp) {
            toast({ variant: 'destructive', title: 'Data tidak lengkap' });
            return;
        }
        setIsSubmitting(true);
        try {
            const contactDocRef = doc(db, 'whatsapp_contacts', contact.id);
            await updateDoc(contactDocRef, {
                name: formData.name,
                whatsapp: formData.whatsapp,
            });
            toast({ title: 'Kontak Berhasil Diperbarui' });
            onContactUpdated();
            setIsOpen(false);
        } catch (error) {
            console.error('Error updating contact:', error);
            toast({ variant: 'destructive', title: 'Gagal Memperbarui Kontak' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <button className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                    <Edit className="mr-2 h-4 w-4"/>
                    <span>Edit Kontak</span>
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Kontak: {contact.name}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nama/Label</Label>
                        <Input id="name" value={formData.name} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="whatsapp">Nomor WhatsApp</Label>
                        <Input id="whatsapp" value={formData.whatsapp} onChange={handleInputChange} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                    <Button onClick={handleUpdateDetails} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Simpan Perubahan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export default function ContactsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [contacts, setContacts] = useState<AdminContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    whatsapp: '',
  });

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'whatsapp_contacts'));
      const fetchedContacts = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as AdminContact)
      );
      setContacts(fetchedContacts);
    } catch (error) {
      console.error('Error fetching contacts: ', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Memuat Kontak',
        description: 'Terjadi kesalahan saat mengambil data dari server.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewContact((prev) => ({ ...prev, [id]: value }));
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.whatsapp) {
      toast({
        variant: 'destructive',
        title: 'Data Tidak Lengkap',
        description: 'Nama/Label dan Nomor WhatsApp harus diisi.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'whatsapp_contacts'), {
        ...newContact,
        createdAt: serverTimestamp(),
      });
      toast({
        title: 'Kontak Berhasil Ditambahkan',
      });
      setIsDialogOpen(false);
      setNewContact({ name: '', whatsapp: '' });
      fetchContacts(); // Refresh list
    } catch (error) {
      console.error('Error adding contact: ', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Menambahkan Kontak',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'whatsapp_contacts', id));
      toast({
        title: 'Kontak Berhasil Dihapus',
      });
      fetchContacts(); // Refresh list
    } catch (error) {
      console.error('Error deleting contact: ', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Menghapus Kontak',
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
            <h1 className="text-xl md:text-2xl font-bold">Pengaturan Daftar Kontak</h1>
        </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Daftar Kontak Admin</CardTitle>
            <CardDescription>
              Tambah, edit, atau hapus daftar kontak WhatsApp yang akan ditampilkan untuk reseller.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Tambah Kontak
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Tambah Kontak Admin Baru</DialogTitle>
                <DialogDescription>
                  Masukkan detail kontak yang dapat dihubungi oleh reseller.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nama/Label
                  </Label>
                  <Input
                    id="name"
                    value={newContact.name}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="Contoh: Admin CS, Budi"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="whatsapp" className="text-right">
                    Nomor WhatsApp
                  </Label>
                  <Input
                    id="whatsapp"
                    value={newContact.whatsapp}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="628123456789 (tanpa + atau 0 di depan)"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddContact} disabled={isSubmitting}>
                   {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Kontak
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="text-center p-8 text-muted-foreground">Memuat data kontak...</div>
          ) : contacts.length > 0 ? (
            <div className="space-y-4">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <MessageSquare className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-bold">{contact.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {contact.whatsapp}
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
                            <EditContactDialog contact={contact} onContactUpdated={fetchContacts} />
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
                                Tindakan ini akan menghapus kontak <span className='font-bold'>{contact.name}</span> secara permanen.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteContact(contact.id)} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
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
              <p>Belum ada kontak admin yang ditambahkan.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
