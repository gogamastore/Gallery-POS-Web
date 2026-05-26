"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const formSchema = z.object({
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(1, "Password tidak boleh kosong."),
});

function Logo() {
  return (
    <Image src="https://firebasestorage.googleapis.com/v0/b/gallery-makassar.firebasestorage.app/o/GM%20logo.png?alt=media&token=35855c49-17b5-4a6d-9887-45134c7ad829" alt="Gogama Store Logo" width={75} height={75} priority />
  );
}


export default function LoginForm() {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      await signIn(values.email, values.password);
      toast({
        title: "Login Berhasil!",
        description: "Selamat datang kembali.",
      });
      // The redirect logic is handled in the root page.tsx
    } catch (error) {
      console.error("Login failed", error);
      toast({
        variant: "destructive",
        title: "Login Gagal",
        description: "Email atau password yang Anda masukkan salah.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="space-y-1 text-center">
            <div className="flex flex-col justify-center items-center gap-4 mb-4">
                <Logo />
                <CardTitle className="text-3xl font-bold font-headline">Selamat Datang</CardTitle>
            </div>
          <CardDescription>
            Masukkan email dan password untuk masuk ke akun Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email@contoh.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                     <FormMessage />
                  </FormItem>
                )}
              />
              <div className="text-right text-sm">
                  <Link href="/auth/action?mode=resetPassword" className="underline text-muted-foreground hover:text-primary">
                    Lupa Password?
                  </Link>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                {loading ? 'Masuk...' : 'Masuk'}
              </Button>
            </form>
          </Form>
        </CardContent>
         <CardFooter className="flex flex-col gap-4">
             <div className="text-center text-sm">
                Belum punya akun reseller?{" "}
                <Link href="/register" className="underline">
                    Daftar di sini
                </Link>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
