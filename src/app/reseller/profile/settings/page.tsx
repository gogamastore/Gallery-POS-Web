
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db, storage } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { UserCircle, Loader2, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function ProfileSettingsPage() {
  const { user, loading: authLoading, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: '',
    whatsapp: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      setImagePreview(user.photoURL);
      const userDocRef = doc(db, 'user', user.uid);
      getDoc(userDocRef).then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfileData({
            name: data.name || user.displayName || '',
            whatsapp: data.whatsapp || '62',
          });
        } else {
            setProfileData({ name: user.displayName || '', whatsapp: '62' });
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setProfileData((prev) => ({ ...prev, [id]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setImageFile(file);
          setImagePreview(URL.createObjectURL(file));
      }
  }

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
        let photoURL = user.photoURL; // Keep current photo if no new one is uploaded
        
        // 1. Upload image to Storage if a new one is selected
        if (imageFile) {
            const storageRef = ref(storage, `profile_pictures/${user.uid}/${imageFile.name}`);
            await uploadBytes(storageRef, imageFile);
            photoURL = await getDownloadURL(storageRef);
        }

        // 2. Update Firebase Auth profile
        await updateUserProfile(profileData.name, photoURL || '');

        // 3. Update Firestore document
        const userDocRef = doc(db, 'user', user.uid);
        await updateDoc(userDocRef, {
            name: profileData.name,
            whatsapp: profileData.whatsapp,
            photoURL: photoURL
        });

      toast({ title: 'Profil Berhasil Diperbarui' });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Gagal Memperbarui Profil',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
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
            <h1 className="text-3xl font-bold font-headline">Pengaturan Profil</h1>
       </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <UserCircle className="h-6 w-6" />
            <CardTitle>Informasi Akun</CardTitle>
          </div>
          <CardDescription>
            Perbarui informasi kontak dan nama Anda di sini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label>Foto Profil</Label>
                <div className="flex items-center gap-4">
                    <Image 
                        src={imagePreview || 'https://placehold.co/100x100.png'} 
                        alt="Foto Profil" 
                        width={100} 
                        height={100} 
                        className="rounded-full object-cover w-24 h-24 border"
                    />
                    <Input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} />
                </div>
            </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nama Lengkap</Label>
            <Input
              id="name"
              value={profileData.name}
              onChange={handleProfileChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">Nomor WhatsApp</Label>
            <Input
              id="whatsapp"
              value={profileData.whatsapp}
              onChange={handleProfileChange}
              placeholder="Contoh: 628123456789"
            />
          </div>
           <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email || ''} disabled />
          </div>
        </CardContent>
        <div className="p-6 pt-0">
          <Button onClick={handleUpdateProfile} disabled={isSubmitting}>
             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Perubahan Profil
          </Button>
        </div>
      </Card>
    </div>
  );
}
