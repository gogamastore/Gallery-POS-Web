
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Archive,
  ClipboardList,
  LineChart,
  Settings,
  Bot,
  ChevronDown,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import React from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Pesanan", icon: ShoppingCart },
  { href: "/dashboard/products", label: "Manajemen Produk", icon: Package },
  { href: "/dashboard/stock-management", label: "Manajemen Stok", icon: Warehouse },
  { href: "/dashboard/purchases", label: "Transaksi Pembelian", icon: Archive },
  { href: "/dashboard/operational-costs", label: "Biaya Operasional", icon: ClipboardList },
];

const reportsSubMenu = [
    { href: "/dashboard/reports/sales", label: "Penjualan" },
    { href: "/dashboard/reports/product-sales", label: "Penjualan Produk" },
    { href: "/dashboard/reports/purchases", label: "Pembelian" },
    { href: "/dashboard/reports/operational-expenses", label: "Beban Operasional" },
    { href: "/dashboard/reports/stock-flow", label: "Arus Stok" },
    { href: "/dashboard/reports/receivables", label: "Piutang Usaha" },
    { href: "/dashboard/reports/accounts-payable", label: "Utang Dagang" },
    { href: "/dashboard/reports/customers", label: "Pelanggan" },
];

export function MainNav() {
  const pathname = usePathname();
  const isReportsOpen = pathname.startsWith('/dashboard/reports');
  const isSettingsOpen = pathname.startsWith('/dashboard/settings');

  return (
    <nav className="flex flex-col items-start gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href) && (item.href !== "/dashboard" || pathname === "/dashboard");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex w-full items-center justify-start gap-3 rounded-md p-2 text-sm font-medium transition-colors group-[.collapsed]:px-2 group-[.collapsed]:w-auto group-[.collapsed]:justify-center",
              isActive
                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="group-[.collapsed]:hidden">{item.label}</span>
          </Link>
        );
      })}

      <Collapsible defaultOpen={isReportsOpen} className="w-full">
        <CollapsibleTrigger asChild>
            <div className={cn(
                "flex w-full items-center justify-start gap-3 p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer",
                 isReportsOpen ? 'text-accent-foreground' : 'text-muted-foreground',
                "group-[.collapsed]:px-2 group-[.collapsed]:w-auto group-[.collapsed]:justify-center"
            )}>
                <LineChart className="h-5 w-5" />
                <span className="group-[.collapsed]:hidden flex-1 text-left">Laporan</span>
                <ChevronDown className="h-4 w-4 transition-transform [&[data-state=open]]:rotate-180 group-[.collapsed]:hidden" />
            </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-8 pr-2 space-y-1">
            {reportsSubMenu.map(subItem => (
                <Link key={subItem.href} href={subItem.href} className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    pathname.startsWith(subItem.href) ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}>
                    {subItem.label}
                </Link>
            ))}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible defaultOpen={isSettingsOpen} className="w-full">
        <CollapsibleTrigger asChild>
            <div className={cn(
                "flex w-full items-center justify-start gap-3 p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer",
                 isSettingsOpen ? 'text-accent-foreground' : 'text-muted-foreground',
                "group-[.collapsed]:px-2 group-[.collapsed]:w-auto group-[.collapsed]:justify-center"
            )}>
                <Settings className="h-5 w-5" />
                <span className="group-[.collapsed]:hidden flex-1 text-left">Pengaturan</span>
                <ChevronDown className="h-4 w-4 transition-transform [&[data-state=open]]:rotate-180 group-[.collapsed]:hidden" />
            </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-8 pr-2 space-y-1">
             <Link href="/dashboard/settings" className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground", pathname === "/dashboard/settings" ? "bg-accent text-accent-foreground" : "text-muted-foreground")}>
                Umum
            </Link>
        </CollapsibleContent>
      </Collapsible>
      
      <Link
        href="/dashboard/stock-suggestions"
        className={cn(
          "flex w-full items-center justify-start gap-3 rounded-md p-2 text-sm font-medium transition-colors group-[.collapsed]:px-2 group-[.collapsed]:w-auto group-[.collapsed]:justify-center",
          pathname.startsWith('/dashboard/stock-suggestions')
            ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <Bot className="h-5 w-5" />
        <span className="group-[.collapsed]:hidden">Saran Stok</span>
      </Link>

    </nav>
  );
}
