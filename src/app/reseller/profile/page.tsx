
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCircle, ShieldCheck, Home, LogOut, ChevronRight, Wallet, Package, Star, ShieldQuestion } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

export default function ProfilePage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const handleLogout = async () => {
    try {
        await signOut();
        router.push('/');
        toast({ title: 'Anda telah keluar.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Gagal keluar.' });
    }
  }

  if (authLoading) {
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>;
  }
  if (!user) {
    router.replace('/login');
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>;
  }

  return (
    <div className="bg-muted/40">
        <div className="container max-w-screen-lg mx-auto py-8 md:py-12 animate-in fade-in-0 duration-500">
            <div className="flex items-center gap-4 mb-8">
                <span className="relative flex shrink-0 overflow-hidden rounded-full h-16 w-16">
                    <Image className="aspect-square h-full w-full" alt={user.displayName || "User"} data-ai-hint="user avatar" src={user.photoURL || "https://placehold.co/100x100.png"} width={64} height={64} />
                </span>
                <div>
                    <h1 className="text-2xl font-bold font-headline">{user.displayName}</h1>
                    <p className="text-muted-foreground">{user.email}</p>
                </div>
            </div>

             <Card className="mb-8">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div className="font-semibold tracking-tight font-headline text-lg">Pesanan Saya</div>
                        <Link className="flex items-center text-sm text-primary hover:underline" href="/reseller/orders">
                            Lihat Semua <ChevronRight className="h-4 w-4"/>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center">
                        <Link className="group" href="/reseller/orders?tab=toProcess">
                            <div className="p-2 rounded-lg hover:bg-muted/50">
                                <Wallet className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-muted-foreground group-hover:text-primary"/>
                                <p className="mt-2 text-xs font-medium">Belum Proses</p>
                            </div>
                        </Link>
                         <Link className="group" href="/reseller/orders?tab=processing">
                            <div className="p-2 rounded-lg hover:bg-muted/50">
                                <Package className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-muted-foreground group-hover:text-primary"/>
                                <p className="mt-2 text-xs font-medium">Dikemas</p>
                            </div>
                        </Link>
                         <Link className="group" href="/reseller/orders?tab=shipped">
                            <div className="p-2 rounded-lg hover:bg-muted/50">
                                <Package className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-muted-foreground group-hover:text-primary"/>
                                <p className="mt-2 text-xs font-medium">Dikirim</p>
                            </div>
                        </Link>
                         <Link className="group" href="/reseller/orders?tab=delivered">
                            <div className="p-2 rounded-lg hover:bg-muted/50">
                                <Star className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-muted-foreground group-hover:text-primary"/>
                                <p className="mt-2 text-xs font-medium">Selesai</p>
                            </div>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-2">
                    <div className="flex flex-col">
                        <Link href="/reseller/profile/settings">
                            <div className="flex items-center p-3 md:p-4 rounded-lg hover:bg-muted/50 cursor-pointer">
                                <UserCircle className="h-5 w-5 mr-4 text-muted-foreground"/>
                                <span className="flex-grow font-medium text-sm md:text-base">Profil Saya</span>
                                <ChevronRight className="h-5 w-5 text-muted-foreground"/>
                            </div>
                        </Link>
                         <Separator/>
                        <Link href="/reseller/profile/address">
                            <div className="flex items-center p-3 md:p-4 rounded-lg hover:bg-muted/50 cursor-pointer">
                                <Home className="h-5 w-5 mr-4 text-muted-foreground"/>
                                <span className="flex-grow font-medium text-sm md:text-base">Alamat Saya</span>
                                <ChevronRight className="h-5 w-5 text-muted-foreground"/>
                            </div>
                        </Link>
                         <Separator/>
                        <Link href="/reseller/profile/security">
                            <div className="flex items-center p-3 md:p-4 rounded-lg hover:bg-muted/50 cursor-pointer">
                                <ShieldCheck className="h-5 w-5 mr-4 text-muted-foreground"/>
                                <span className="flex-grow font-medium text-sm md:text-base">Keamanan Akun</span>
                                <ChevronRight className="h-5 w-5 text-muted-foreground"/>
                            </div>
                        </Link>
                         <Separator/>
                        <Link href="/reseller/profile/privacy">
                            <div className="flex items-center p-3 md:p-4 rounded-lg hover:bg-muted/50 cursor-pointer">
                                <ShieldQuestion className="h-5 w-5 mr-4 text-muted-foreground"/>
                                <span className="flex-grow font-medium text-sm md:text-base">Kebijakan Privasi & FAQ</span>
                                <ChevronRight className="h-5 w-5 text-muted-foreground"/>
                            </div>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            <div className="mt-8 text-center">
                <Button onClick={handleLogout} variant="destructive" className="font-headline w-full sm:w-auto">
                    <LogOut className="mr-2 h-4 w-4"/>
                    Keluar
                </Button>
            </div>
        </div>
    </div>
  );
}
