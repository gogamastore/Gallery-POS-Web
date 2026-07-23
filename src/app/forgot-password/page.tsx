    
"use client";

import Link from "next/link";
import { useState } from "react";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { app } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
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
import { Loader2, MailCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const auth = getAuth(app);
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({ variant: "destructive", title: "Format email tidak valid." });
      return;
    }

    setLoading(true);
    try {
      // Continue URL memakai origin saat ini agar valid di project mana pun.
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const settings = origin
        ? { url: `${origin}/login`, handleCodeInApp: false }
        : undefined;
      try {
        await sendPasswordResetEmail(auth, trimmed, settings);
      } catch (err: any) {
        if (err?.code === "auth/unauthorized-continue-uri") {
          await sendPasswordResetEmail(auth, trimmed);
        } else {
          throw err;
        }
      }
      // Tampilkan sukses secara generik (tidak membocorkan apakah email terdaftar).
      setSent(true);
    } catch (error: any) {
      if (error?.code === "auth/too-many-requests") {
        toast({
          variant: "destructive",
          title: "Terlalu banyak percobaan. Coba lagi nanti.",
        });
      } else if (error?.code === "auth/user-not-found") {
        // Demi privasi, perlakukan seperti berhasil.
        setSent(true);
      } else {
        toast({
          variant: "destructive",
          title: "Gagal mengirim email reset. Coba lagi.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <MailCheck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold font-headline">
            Lupa Password
          </CardTitle>
          <CardDescription>
            {sent
              ? "Jika email terdaftar, kami telah mengirim tautan untuk mengatur ulang password Anda. Cek inbox (atau folder spam)."
              : "Masukkan email akun Anda. Kami akan mengirim tautan untuk mengatur ulang password."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!sent && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@contoh.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kirim Tautan Reset
              </Button>
            </form>
          )}

          {sent && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
            >
              Kirim ke email lain
            </Button>
          )}

          <div className="text-center text-sm">
            <Link href="/" className="underline">
              Kembali ke Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}