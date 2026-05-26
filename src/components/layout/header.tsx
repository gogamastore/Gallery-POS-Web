
"use client"

import Link from "next/link";
import { Search, ShoppingCart, User, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";

export default function Header() {
  const logoUrl = "https://firebasestorage.googleapis.com/v0/b/orderflow-r7jsk.firebasestorage.app/o/ic_gogama_logo.png?alt=media&token=c7caf8ae-553a-4cf8-a4ae-bce1446b599c";
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        {/* Logo */}
        <Link href="/" className="mr-6 flex items-center space-x-2">
            <Image src={logoUrl} alt="Gogama Logo" width={28} height={28} className="h-7 w-7" />
            <span className="hidden font-bold lg:inline-block font-headline">
              Gogama Store
            </span>
        </Link>
          
        {/* Desktop Menu */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-sm">
            <Link
            href="/"
            className="transition-colors hover:text-foreground/80 text-foreground"
            >
            Beranda
            </Link>
            <Link
                href="#"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
                Kategori
            </Link>
            <Link
                href="#"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
                Promo
            </Link>
            <Link
                href="#"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
                Terbaru
            </Link>
        </nav>
       
        <div className="flex flex-1 items-center justify-end space-x-1 sm:space-x-2">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari produk..."
                className="w-full pl-9"
              />
            </div>
          </div>
          <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex">
            <Link href="#">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifikasi</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="hidden md:inline-flex">
            <Link href="/cart">
              <ShoppingCart className="h-5 w-5" />
              <span className="sr-only">Keranjang</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="hidden md:inline-flex">
            <Link href="/profile">
              <User className="h-5 w-5" />
              <span className="sr-only">Profil</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
