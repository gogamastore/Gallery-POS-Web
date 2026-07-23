
"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PanelLeft, ShoppingCart, User, Archive, MessageSquare, Search } from "lucide-react"
import Link from "next/link"
import { useCart } from "@/hooks/use-cart"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { useResellerFilters } from "@/components/providers/reseller-filter-provider"
import { usePathname, useRouter } from "next/navigation"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useEffect, useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

function Logo() {
  return (
    <Link href="/reseller" className="flex items-center gap-2 font-semibold font-headline text-lg">
      <Image src="https://firebasestorage.googleapis.com/v0/b/gallerypos.firebasestorage.app/o/Manafidh%20Logo.png?alt=media&token=4472e2c9-c319-4222-85e8-708dbf36e7be" alt="Gogama Store Logo" width={28} height={28} />
      Manafidh Store
    </Link>
  );
}

export default function ResellerHeader({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
    const { distinctItems, loading: cartLoading } = useCart();
    const { user, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { searchTerm, setSearchTerm } = useResellerFilters();
    const [isMounted, setIsMounted] = useState(false);
    const [chatUnread, setChatUnread] = useState(0);

    // Kotak pencarian hanya tampil di Katalog Produk, dan karena berada di
    // dalam header yang sticky, ia tidak ikut ter-scroll bersama daftar produk.
    const showSearch = pathname === "/reseller/trending";

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Badge pesan belum dibaca dari admin
    useEffect(() => {
        if (!user) {
            setChatUnread(0);
            return;
        }
        const unsub = onSnapshot(doc(db, "chats", user.uid), (snap) => {
            setChatUnread(snap.exists() ? (snap.data().unreadForUser || 0) : 0);
        });
        return () => unsub();
    }, [user]);

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    }

    const renderAuthSection = () => {
        if (!isMounted) {
            return <div className="h-8 w-8"></div>; // Placeholder to prevent layout shift
        }

        if (user) {
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={user.photoURL || ""} alt={user.displayName || "User"} />
                            <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{user.displayName || 'Reseller'}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                            </p>
                        </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                         <DropdownMenuItem onSelect={() => router.push('/reseller/profile')}>
                            <User className="mr-2 h-4 w-4" />
                            <span>Profil Saya</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => router.push('/reseller/orders')}>
                            <Archive className="mr-2 h-4 w-4" />
                            <span>Riwayat Pesanan</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={handleSignOut}>
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        }

        return (
            <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="border-white/60 bg-transparent text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
            >
                Login
            </Button>
        );
    }

    // Tombol ikon di atas app bar: putih dengan sorotan transparan.
    const iconButtonClass = "text-primary-foreground hover:bg-white/15 hover:text-primary-foreground";
    // Badge notifikasi dibalik warnanya agar terbaca di atas latar merek.
    const badgeClass = "absolute -top-2 -right-2 h-5 w-5 justify-center p-0 bg-white text-primary hover:bg-white";

    const searchBox = (
        <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                placeholder="Cari produk..."
                aria-label="Cari produk"
                className="h-10 w-full rounded-full border-transparent bg-white pl-9 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-0"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
    );

    return (
        <header className="bg-primary text-primary-foreground sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              {onToggleSidebar && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("hidden md:inline-flex", iconButtonClass)}
                  onClick={onToggleSidebar}
                  aria-label="Tampilkan atau sembunyikan menu"
                >
                  <PanelLeft className="h-5 w-5" />
                </Button>
              )}
              <Logo />
            </div>
            {/* Layar sedang ke atas: pencarian duduk sebaris dengan logo,
                dibatasi lebarnya supaya tidak melebar memenuhi app bar. */}
            {showSearch && (
              <div className="hidden sm:flex w-full max-w-xs items-center">
                {searchBox}
              </div>
            )}
            <div className="flex items-center gap-1 sm:gap-2">
              <Button variant="ghost" size="icon" className={iconButtonClass} asChild>
                <Link href="/reseller/cart" className="relative">
                    {isMounted && !cartLoading && distinctItems > 0 && (
                         <Badge className={badgeClass}>{distinctItems}</Badge>
                    )}
                    <ShoppingCart className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" className={iconButtonClass} asChild>
                <Link href="/reseller/chat" className="relative">
                    {isMounted && chatUnread > 0 && (
                         <Badge className={badgeClass}>{chatUnread}</Badge>
                    )}
                    <MessageSquare className="h-5 w-5" />
                </Link>
              </Button>
               <Button variant="ghost" size="icon" className={iconButtonClass} asChild>
                <Link href="/reseller/orders">
                  <Archive className="h-5 w-5" />
                </Link>
              </Button>
              {renderAuthSection()}
            </div>
          </div>
          {/* Layar kecil: pencarian pindah ke baris kedua agar logo dan
              ikon tidak berdesakan — tetap di dalam header yang sticky. */}
          {showSearch && (
            <div className="sm:hidden pb-3">
              {searchBox}
            </div>
          )}
        </div>
      </header>
    )
}
