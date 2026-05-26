"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuth, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, KeyRound, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

function AuthActionHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const auth = getAuth();

  const [mode, setMode] = useState<string | null>(null);
  const [actionCode, setActionCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const currentMode = searchParams.get('mode');
    const currentActionCode = searchParams.get('oobCode');

    setMode(currentMode);
    setActionCode(currentActionCode);

    if (currentMode === 'resetPassword') {
      if (!currentActionCode) {
        setError("Link reset password tidak valid atau tidak lengkap.");
        setLoading(false);
        return;
      }
      // Verifikasi kode sebelum menampilkan form
      verifyPasswordResetCode(auth, currentActionCode)
        .then((email) => {
          console.log(`Kode valid untuk email: ${email}`);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError("Link reset password tidak valid atau sudah kedaluwarsa. Silakan coba minta link baru.");
          setLoading(false);
        });
    } else {
        // Mode lain bisa ditambahkan di sini (contoh: verifyEmail)
        setError("Aksi tidak didukung atau tidak diketahui.");
        setLoading(false);
    }
  }, [searchParams, auth]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Password tidak cocok' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Password terlalu lemah', description: 'Gunakan minimal 6 karakter.' });
      return;
    }
    if (!actionCode) return;

    setLoading(true);
    try {
      await confirmPasswordReset(auth, actionCode, newPassword);
      setSuccess(true);
      toast({ title: 'Password Berhasil Diubah', description: 'Silakan login dengan password baru Anda.' });
    } catch (err) {
      console.error(err);
      setError("Gagal mereset password. Link mungkin sudah tidak valid.");
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center text-center p-8">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Memverifikasi link Anda...</p>
        </div>
      );
    }
    
    if (error) {
         return (
             <div className="flex flex-col items-center justify-center text-center p-8">
                <AlertTriangle className="h-10 w-10 text-destructive mb-4"/>
                <p className="font-semibold">Terjadi Kesalahan</p>
                <p className="text-muted-foreground text-sm mb-6">{error}</p>
                <Button asChild>
                    <Link href="/">Kembali ke Halaman Login</Link>
                </Button>
            </div>
         )
    }
    
    if (success) {
         return (
             <div className="flex flex-col items-center justify-center text-center p-8">
                <CheckCircle className="h-10 w-10 text-green-500 mb-4"/>
                <p className="font-semibold">Berhasil!</p>
                <p className="text-muted-foreground text-sm mb-6">Password Anda telah berhasil diubah.</p>
                <Button asChild>
                    <Link href="/">Lanjutkan ke Halaman Login</Link>
                </Button>
            </div>
         )
    }

    if (mode === 'resetPassword') {
      return (
         <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="newPassword">Password Baru</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Password Baru
            </Button>
        </form>
      );
    }

    return null;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <KeyRound className="mx-auto h-12 w-12 text-primary mb-4"/>
            <CardTitle className="text-2xl">Reset Password Anda</CardTitle>
            <CardDescription>
                {loading ? '...' : (error ? 'Verifikasi Gagal' : 'Masukkan password baru Anda di bawah ini.')}
            </CardDescription>
        </CardHeader>
        <CardContent>
            {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}


export default function AuthActionPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
            <AuthActionHandler />
        </Suspense>
    )
}
