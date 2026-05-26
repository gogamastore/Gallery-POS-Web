
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import Image from "next/image";

function Logo() {
  return (
    <Image src="https://firebasestorage.googleapis.com/v0/b/orderflow-r7jsk.firebasestorage.app/o/ic_gogama_logo.png?alt=media&token=c7caf8ae-553a-4cf8-a4ae-bce1446b599c" alt="Gogama Store Logo" width={75} height={75} priority />
  );
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
      name: '',
      email: '',
      whatsapp: '62',
      password: ''
  });
  const { user, loading: authLoading, createUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/reseller');
    }
  }, [user, authLoading, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({...prev, [id]: value}));
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // --- Validation Logic ---
    if (!formData.name || !formData.email || !formData.password || !formData.whatsapp) {
        toast({ variant: "destructive", title: "Data Tidak Lengkap", description: "Semua kolom wajib diisi." });
        return;
    }
    if (!/^[a-zA-Z\s]+$/.test(formData.name) || formData.name.trim().length < 4) {
        toast({ variant: "destructive", title: "Nama Tidak Valid", description: "Nama lengkap minimal 4 huruf dan hanya boleh berisi huruf." });
        return;
    }
    if (formData.password.length < 6) {
        toast({ variant: "destructive", title: "Password Lemah", description: "Password minimal harus 6 karakter." });
        return;
    }
    const whatsappNumber = formData.whatsapp.startsWith('62') ? formData.whatsapp.substring(2) : formData.whatsapp;
    if (!/^\d+$/.test(whatsappNumber) || whatsappNumber.length < 10) {
        toast({ variant: "destructive", title: "Nomor WhatsApp Tidak Valid", description: "Nomor WhatsApp minimal 10 angka setelah kode negara." });
        return;
    }
    // --- End Validation Logic ---

    setLoading(true);
    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUser(formData.email, formData.password);
      const newUser = userCredential.user;

      // 2. Save user profile and role to Firestore
      await setDoc(doc(db, "user", newUser.uid), {
          name: formData.name.trim(),
          email: formData.email,
          whatsapp: formData.whatsapp,
          role: 'reseller' // Ensure role is always reseller
      });
      
      // 3. Create a notification for the new reseller
      await addDoc(collection(db, "notifications"), {
        title: "Reseller Baru Terdaftar",
        body: `${formData.name.trim()} telah mendaftar sebagai reseller baru.`,
        createdAt: serverTimestamp(),
        type: 'new_reseller',
        relatedId: newUser.uid,
        isRead: false
      });

      toast({
        title: "Pendaftaran Berhasil!",
        description: "Akun reseller Anda telah dibuat. Anda akan diarahkan...",
      });
      
      router.push('/reseller');

    } catch (error: any) {
      console.error("Failed to register", error);
      let description = "Terjadi kesalahan. Silakan coba lagi.";
      if (error.code === 'auth/email-already-in-use') {
          description = "Alamat email ini sudah terdaftar.";
      }
      toast({
        variant: "destructive",
        title: "Pendaftaran Gagal",
        description: description,
      });
    } finally {
        setLoading(false);
    }
  };
  
  if (authLoading || user) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex flex-col justify-center items-center gap-4 mb-4">
            <Logo />
            <CardTitle className="text-3xl font-bold font-headline">Daftar Reseller</CardTitle>
          </div>
          <CardDescription>
            Buat akun baru untuk mulai berbelanja.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input id="name" placeholder="Masukkan nama lengkap Anda" required value={formData.name} onChange={handleInputChange} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="email@contoh.com" required value={formData.email} onChange={handleInputChange} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="whatsapp">Nomor WhatsApp</Label>
              <Input id="whatsapp" type="tel" placeholder="6281234567890" required value={formData.whatsapp} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={formData.password} onChange={handleInputChange} placeholder="Minimal 6 karakter"/>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Mendaftarkan...' : 'Daftar dengan Email'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            Sudah punya akun?{" "}
            <Link href="/" className="underline">
              Login di sini
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
