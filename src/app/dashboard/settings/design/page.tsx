

"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  getDocs,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ImagePlus, PlusCircle, Trash2, Loader2, ArrowLeft, Edit, GripVertical, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';


interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  buttonText: string;
  buttonLink: string;
  isActive: boolean;
  order: number;
  createdAt: any;
}

// Helper component to bypass react-beautiful-dnd strict mode issue
const StrictDroppable = ({ children, ...props }: any) => {
    const [enabled, setEnabled] = useState(false);
    useEffect(() => {
        const animation = requestAnimationFrame(() => setEnabled(true));
        return () => {
            cancelAnimationFrame(animation);
            setEnabled(false);
        };
    }, []);
    if (!enabled) {
        return null;
    }
    return <Droppable {...props}>{children}</Droppable>;
};


export default function DesignSettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    buttonText: '',
    buttonLink: '',
    isActive: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'banners'), orderBy('order', 'asc'));
      const querySnapshot = await getDocs(q);
      const fetchedBanners = querySnapshot.docs.map(doc => {
          return {
              id: doc.id,
              ...doc.data(),
          } as Banner
      });
      setBanners(fetchedBanners);
    } catch (error) {
      console.error('Error fetching banners: ', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Memuat Banner',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);
  
  const resetForm = () => {
      setFormData({
        title: '',
        description: '',
        buttonText: '',
        buttonLink: '',
        isActive: true,
      });
      setImageFile(null);
      setImagePreview(null);
      setEditingBanner(null);
  }

  const handleOpenDialog = (banner: Banner | null = null) => {
      if (banner) {
          setEditingBanner(banner);
          setFormData({
              title: banner.title,
              description: banner.description,
              buttonText: banner.buttonText,
              buttonLink: banner.buttonLink,
              isActive: banner.isActive
          });
          setImagePreview(banner.imageUrl);
      } else {
          resetForm();
      }
      setIsDialogOpen(true);
  }


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };
  
  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({...prev, isActive: checked }));
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setImageFile(file);
          setImagePreview(URL.createObjectURL(file));
      }
  }

  const handleSubmit = async () => {
    if (!formData.title || (!imageFile && !editingBanner)) {
      toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Judul dan gambar banner harus diisi.' });
      return;
    }
    setIsSubmitting(true);
    try {
        let imageUrl = editingBanner?.imageUrl || '';
        if (imageFile) {
            const storageRef = ref(storage, `banners/${Date.now()}_${imageFile.name}`);
            await uploadBytes(storageRef, imageFile);
            imageUrl = await getDownloadURL(storageRef);
        }

        if (editingBanner) {
            // Update
            const bannerRef = doc(db, 'banners', editingBanner.id);
            await updateDoc(bannerRef, {
                ...formData,
                imageUrl
            });
            toast({ title: 'Banner Berhasil Diperbarui' });
        } else {
            // Create
            const newOrder = banners.length > 0 ? Math.max(...banners.map(b => b.order)) + 1 : 1;
            await addDoc(collection(db, 'banners'), {
                ...formData,
                imageUrl,
                order: newOrder,
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Banner Berhasil Ditambahkan' });
        }
      
      setIsDialogOpen(false);
      fetchBanners(); // Refresh list
    } catch (error) {
      console.error('Error saving banner: ', error);
      toast({ variant: 'destructive', title: 'Gagal Menyimpan Banner' });
    } finally {
      setIsSubmitting(false);
      resetForm();
    }
  };

  const handleDeleteBanner = async (id: string) => {
     if (!confirm('Apakah Anda yakin ingin menghapus banner ini?')) return;
    try {
      await deleteDoc(doc(db, 'banners', id));
      toast({ title: 'Banner Berhasil Dihapus' });
      fetchBanners(); // Refresh list
    } catch (error) {
      console.error('Error deleting banner: ', error);
      toast({ variant: 'destructive', title: 'Gagal Menghapus Banner' });
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const newBanners = Array.from(banners);
    const [reorderedItem] = newBanners.splice(source.index, 1);
    newBanners.splice(destination.index, 0, reorderedItem);

    setBanners(newBanners); // Optimistic UI update

    try {
        const batch = writeBatch(db);
        newBanners.forEach((banner, index) => {
            const bannerRef = doc(db, 'banners', banner.id);
            batch.update(bannerRef, { order: index });
        });
        await batch.commit();
        toast({ title: "Urutan banner berhasil diperbarui" });
    } catch (error) {
        console.error("Error updating banner order:", error);
        toast({ variant: 'destructive', title: "Gagal memperbarui urutan" });
        setBanners(banners); // Revert on failure
    }
  };


  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/settings')}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Kembali ke Pengaturan</span>
            </Button>
            <h1 className="text-xl md:text-2xl font-bold">Pengaturan Desain & Banner</h1>
        </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Daftar Banner</CardTitle>
            <CardDescription>
              Tambah, edit, atau hapus banner yang tampil di halaman reseller.
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Banner
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="text-center p-8 text-muted-foreground">Memuat data banner...</div>
          ) : banners.length > 0 ? (
            <DragDropContext onDragEnd={onDragEnd}>
              <StrictDroppable droppableId="banners">
                {(provided: any) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                    {banners.map((banner, index) => (
                       <Draggable key={banner.id} draggableId={banner.id} index={index}>
                         {(provided: any) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className='flex items-center justify-between rounded-lg border p-4 bg-card'
                            >
                                <div className="flex items-center gap-4">
                                  <div {...provided.dragHandleProps} className="cursor-grab p-2">
                                      <GripVertical className="h-5 w-5 text-muted-foreground"/>
                                  </div>
                                  <Image src={banner.imageUrl} alt={banner.title} width={120} height={50} className="rounded-md object-cover aspect-video"/>
                                  <div>
                                    <p className="font-bold">{banner.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {banner.description}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={banner.isActive ? "default" : "secondary"}>
                                      {banner.isActive ? "Aktif" : "Nonaktif"}
                                  </Badge>
                                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(banner)}>
                                      <Edit className="h-4 w-4"/>
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteBanner(banner.id)}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                            </div>
                         )}
                       </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </StrictDroppable>
            </DragDropContext>
          ) : (
            <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground"/>
              <p className="mt-2">Belum ada banner yang ditambahkan.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>{editingBanner ? 'Edit Banner' : 'Tambah Banner Baru'}</DialogTitle>
                <DialogDescription>
                  Isi detail banner yang akan ditampilkan di halaman utama reseller.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 space-y-4 py-4 overflow-y-auto px-2">
                <div className="space-y-2">
                    <Label>Gambar Banner</Label>
                    <div className="flex items-center gap-4">
                       {imagePreview ? (
                            <Image src={imagePreview} alt="Preview" width={150} height={75} className="rounded-md object-cover aspect-video" />
                       ) : (
                           <div className="w-[150px] aspect-video bg-muted rounded-md flex items-center justify-center">
                                <ImagePlus className="h-8 w-8 text-muted-foreground"/>
                           </div>
                       )}
                       <Input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} />
                    </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Judul</Label>
                  <Input id="title" value={formData.title} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi Singkat</Label>
                  <Textarea id="description" value={formData.description} onChange={handleInputChange} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="buttonText">Teks Tombol</Label>
                  <Input id="buttonText" value={formData.buttonText} onChange={handleInputChange} placeholder="Contoh: Belanja Sekarang"/>
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="buttonLink">Link Tombol</Label>
                  <Input id="buttonLink" value={formData.buttonLink} onChange={handleInputChange} placeholder="Contoh: /reseller/products"/>
                </div>
                 <div className="flex items-center space-x-2">
                    <Switch id="isActive" checked={formData.isActive} onCheckedChange={handleSwitchChange} />
                    <Label htmlFor="isActive">Aktifkan banner ini</Label>
                </div>
              </div>
              <DialogFooter>
                 <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                   {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Banner
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

    </div>
  );
}
