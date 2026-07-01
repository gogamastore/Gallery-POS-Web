
"use client";

import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Search, Menu, Bell, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { PurchaseCartProvider } from "@/components/providers/purchase-cart-provider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 font-semibold font-headline text-lg">
      <Image src="https://firebasestorage.googleapis.com/v0/b/gallery-makassar.firebasestorage.app/o/GM%20logo.png?alt=media&token=35855c49-17b5-4a6d-9887-45134c7ad829" alt="Gallery Makassar Logo" width={32} height={32} />
       <span className="group-[.collapsed]:hidden">Gallery Makassar</span>
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  // Guard terpusat: hanya role 'admin' yang boleh mengakses dashboard.
  // Reseller diarahkan ke /reseller, role lain / tanpa role ke halaman login.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/");
      return;
    }

    let active = true;
    (async () => {
      try {
        const userDoc = await getDoc(doc(db, "user", user.uid));
        const role = userDoc.exists() ? userDoc.data().role : null;
        if (!active) return;

        if (role === "admin") {
          setAuthorized(true);
        } else if (role === "reseller") {
          router.replace("/reseller");
        } else {
          router.replace("/");
        }
      } catch (error) {
        if (!active) return;
        console.error("Gagal memverifikasi akses dashboard:", error);
        router.replace("/");
      }
    })();

    return () => {
      active = false;
    };
  }, [user, authLoading, router]);

  // Tahan render dashboard sampai status admin terverifikasi
  // (mencegah konten dashboard sempat berkedip sebelum redirect).
  if (authLoading || !authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PurchaseCartProvider>
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] group">
        <div className="hidden border-r bg-card md:block">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
              <Logo />
            </div>
            <div className="flex-1">
              <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                <MainNav />
              </nav>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col">
                <SheetHeader>
                  <SheetTitle>
                    <Logo />
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    A navigation menu for the mobile dashboard.
                  </SheetDescription>
                </SheetHeader>
                <nav className="grid gap-2 text-lg font-medium">
                  <MainNav />
                </nav>
              </SheetContent>
            </Sheet>

            <div className="w-auto flex-1">
              <form>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    className="w-auto appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
                  />
                </div>
              </form>
            </div>
            <ThemeToggle />
             <Button variant="outline" size="icon" className="relative" asChild>
                <Link href="/dashboard/notifications">
                    <Bell className="h-5 w-5" />
                    <span className="sr-only">Notifikasi</span>
                </Link>
            </Button>
            <UserNav />
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    </PurchaseCartProvider>
  );
}
