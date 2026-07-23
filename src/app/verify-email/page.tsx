
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, signOut } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { app, db } from "@/lib/firebase";
import { sendVerificationEmail } from "@/lib/verification";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, MailCheck } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const auth = getAuth(app);

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const busyRef = useRef(false);

  const email = user?.email ?? auth.currentUser?.email ?? "";

  // Belum login → kembali ke halaman login.
  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  const check = async (silent = false) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setChecking(true);
    try {
      const current = auth.currentUser;
      if (!current) {
        router.replace("/");
        return;
      }
      await current.reload();
      const refreshed = auth.currentUser;
      if (refreshed?.emailVerified) {
        // Perbarui status di Firestore SEBELUM sign out (rules butuh auth).
        await updateDoc(doc(db, "user", refreshed.uid), {
          verificationStatus: "verified",
        });
        await signOut(auth);
        toast({
          title: "Email berhasil diverifikasi!",
          description: "Silakan masuk ke akun Anda.",
        });
        router.replace("/");
      } else if (!silent) {
        toast({
          variant: "destructive",
          title: "Email belum diverifikasi",
          description: "Silakan cek inbox (atau folder spam) email Anda.",
        });
      }
    } catch {
      if (!silent) {
        toast({
          variant: "destructive",
          title: "Gagal memeriksa status verifikasi. Coba lagi.",
        });
      }
    } finally {
      busyRef.current = false;
      setChecking(false);
    }
  };

  // Polling: begitu tautan verifikasi di email diklik, otomatis lanjut.
  useEffect(() => {
    const t = setInterval(() => check(true), 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resend = async () => {
    setResending(true);
    try {
      const current = auth.currentUser;
      if (current) {
        await sendVerificationEmail(current);
        toast({ title: "Email verifikasi telah dikirim ulang." });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title:
          error?.code === "auth/too-many-requests"
            ? "Terlalu banyak percobaan. Silakan coba lagi nanti."
            : "Gagal mengirim ulang email verifikasi.",
      });
    } finally {
      setResending(false);
    }
  };

  const backToLogin = async () => {
    await signOut(auth);
    router.replace("/");
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <MailCheck className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold font-headline">
            Verifikasi Email Anda
          </CardTitle>
          <CardDescription>
            Kami telah mengirim tautan verifikasi ke:
            <br />
            <span className="font-semibold text-foreground">{email}</span>
            <br />
            Buka email Anda dan klik tautannya. Jika tidak ada, cek folder spam.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={() => check(false)} disabled={checking} className="w-full">
            {checking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Saya Sudah Verifikasi
          </Button>
          <Button
            variant="outline"
            onClick={resend}
            disabled={resending}
            className="w-full"
          >
            {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kirim Ulang Email Verifikasi
          </Button>
          <Button variant="ghost" onClick={backToLogin} className="w-full">
            Kembali ke Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
