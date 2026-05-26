
"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
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
import { Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SecurityPage() {
  const { user, loading: authLoading, reauthenticate, changePassword } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [passwordData, setPasswordData] = useState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
  });
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [id]: value }));
  };
  
  const handleUpdatePassword = async () => {
      if (!passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword) {
          toast({ variant: 'destructive', title: 'Password Tidak Cocok', description: 'Pastikan password baru dan konfirmasi password sama.'});
          return;
      }
       if (passwordData.newPassword.length < 6) {
          toast({ variant: 'destructive', title: 'Password Terlalu Pendek', description: 'Password baru minimal harus 6 karakter.'});
          return;
      }
      setIsPasswordSubmitting(true);
      try {
        await reauthenticate(passwordData.currentPassword);
        await changePassword(passwordData.newPassword);
        toast({ title: 'Password Berhasil Diperbarui' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } catch (error) {
          console.error(error);
          toast({ variant: 'destructive', title: 'Gagal Memperbarui Password', description: 'Pastikan password lama Anda benar.' });
      } finally {
          setIsPasswordSubmitting(false);
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
            <h1 className="text-3xl font-bold font-headline">Keamanan Akun</h1>
       </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6" />
            <CardTitle>Ubah Password</CardTitle>
          </div>
          <CardDescription>
            Ubah password Anda secara berkala untuk menjaga keamanan akun.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Password Lama</Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Password Baru</Label>
            <Input
              id="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
            />
          </div>
        </CardContent>
        <div className="p-6 pt-0">
          <Button onClick={handleUpdatePassword} disabled={isPasswordSubmitting}>
             {isPasswordSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ubah Password
          </Button>
        </div>
      </Card>
    </div>
  );
}
