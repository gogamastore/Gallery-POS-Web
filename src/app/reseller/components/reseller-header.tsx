
"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ShoppingCart, User, Archive, Loader2 } from "lucide-react"
import Link from "next/link"
import { useCart } from "@/hooks/use-cart"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
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

function Logo() {
  return (
    <Link href="/reseller" className="flex items-center gap-2 font-semibold font-headline text-lg">
      <Image src="https://firebasestorage.googleapis.com/v0/b/orderflow-r7jsk.firebasestorage.app/o/ic_gogama_logo.png?alt=media&token=c7caf8ae-553a-4cf8-a4ae-bce1446b599c" alt="Gogama Store Logo" width={28} height={28} />
      Gogama Store
    </Link>
  );
}

export default function ResellerHeader() {
    const { totalItems, loading: cartLoading } = useCart();
    const { user, signOut } = useAuth();
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

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

        return <Button variant="outline" onClick={() => router.push('/')}>Login</Button>;
    }


    return (
        <header className="bg-card sticky top-0 z-40 border-b">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Logo />
            <div className="hidden md:flex flex-1 max-w-lg items-center relative">
              
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/reseller/cart" className="relative">
                    {isMounted && !cartLoading && totalItems > 0 && (
                         <Badge className="absolute -top-2 -right-2 h-5 w-5 justify-center p-0">{totalItems}</Badge>
                    )}
                    <ShoppingCart className="h-5 w-5" />
                </Link>
              </Button>
               <Button variant="ghost" size="icon" asChild>
                <Link href="/reseller/orders">
                  <Archive className="h-5 w-5" />
                </Link>
              </Button>
              {renderAuthSection()}
            </div>
          </div>
        </div>
      </header>
    )
}
