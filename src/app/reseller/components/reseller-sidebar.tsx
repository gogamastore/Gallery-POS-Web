"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/reseller", label: "Beranda", icon: Home },
  { href: "/reseller/trending", label: "Katalog Produk", icon: LayoutGrid },
  { href: "/reseller/cart", label: "Keranjang", icon: ShoppingCart },
  { href: "/reseller/profile", label: "Profil", icon: User },
];

// Menu samping kiri untuk tampilan layar lebar (tablet/PC).
// Disembunyikan di mobile (pakai bottom nav) dan bisa di-hide lewat tombol
// toggle di header.
export default function ResellerSidebar({ open }: { open: boolean }) {
  const pathname = usePathname();
  const { totalItems } = useCart();

  if (!open) return null;

  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 self-start sticky top-16 h-[calc(100dvh-4rem)] overflow-y-auto border-r bg-card p-3">
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/reseller" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.href === "/reseller/cart" && totalItems > 0 && (
                <Badge className="h-5 min-w-5 justify-center p-0 px-1">
                  {totalItems}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
