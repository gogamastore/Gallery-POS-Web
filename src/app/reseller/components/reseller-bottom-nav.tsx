
"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, TrendingUp, ShoppingCart, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { Badge } from "@/components/ui/badge";

const navItems = [
    { href: "/reseller", label: "Beranda", icon: Home },
    { href: "/reseller/trending", label: "Trending", icon: TrendingUp },
    { href: "/reseller/cart", label: "Keranjang", icon: ShoppingCart },
    { href: "/reseller/profile", label: "Profil", icon: User },
];

export default function BottomNav() {
    const pathname = usePathname();
    const { totalItems } = useCart();

    return (
        <div className="md:hidden fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t border-border/40">
            <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href) && (item.href !== "/reseller" || pathname === "/reseller");
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                                "relative inline-flex flex-col items-center justify-center px-5 hover:bg-muted group",
                                isActive ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            {item.href === "/reseller/cart" && totalItems > 0 && (
                                <Badge className="absolute top-1 right-3 h-5 w-5 justify-center p-0">{totalItems}</Badge>
                            )}
                            <item.icon className={cn("w-5 h-5 mb-1", isActive ? "text-primary" : "text-gray-500 group-hover:text-primary")} />
                            <span className="text-xs">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
