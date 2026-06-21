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
  Settings,
  ChevronDown,
  MapPin,
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

const settingsSubMenu = [
  // ── Diletakkan paling atas — paling sering diakses untuk setup Biteship ──
  {
    href: "/dashboard/settings/store-address",
    label: "Alamat Toko",
    icon: MapPin,
    highlight: true,
  },
  { href: "/dashboard/settings/bank-accounts", label: "Rekening Bank" },
  { href: "/dashboard/settings/staff", label: "Manajemen Staf" },
  { href: "/dashboard/settings/contacts", label: "Daftar Kontak" },
  { href: "/dashboard/settings/suppliers", label: "Manajemen Supplier" },
  { href: "/dashboard/settings/product-categories", label: "Kategori Produk" },
  { href: "/dashboard/settings/brands", label: "Manajemen Brand" },
  { href: "/dashboard/settings/promo", label: "Promo" },
  { href: "/dashboard/settings/design", label: "Desain" },
  { href: "/dashboard/settings/trending-products", label: "Produk Trending" },
];

export function MainNav() {
  const pathname = usePathname();
  const isReportsOpen = pathname.startsWith("/dashboard/reports");
  const isSettingsOpen = pathname.startsWith("/dashboard/settings");

  return (
    <nav className="flex flex-col items-start gap-1">
      {/* Nav items utama */}
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname.startsWith(item.href) &&
          (item.href !== "/dashboard" || pathname === "/dashboard");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex w-full items-center justify-start gap-3 rounded-md p-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}

      {/* Laporan — collapsible */}
      <Collapsible defaultOpen={isReportsOpen} className="w-full">
        <CollapsibleTrigger
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-md p-2 text-sm font-medium transition-colors",
            isReportsOpen
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <div className="flex items-center gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span>Laporan</span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4 pt-1">
          {reportsSubMenu.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex w-full items-center rounded-md px-2 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </CollapsibleContent>
      </Collapsible>

      {/* Pengaturan — collapsible */}
      <Collapsible defaultOpen={isSettingsOpen} className="w-full">
        <CollapsibleTrigger
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-md p-2 text-sm font-medium transition-colors",
            isSettingsOpen
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <div className="flex items-center gap-3">
            <Settings className="h-4 w-4 shrink-0" />
            <span>Pengaturan</span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4 pt-1">
          {settingsSubMenu.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : item.highlight
                    ? "text-primary/80 hover:bg-primary/5 hover:text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                {item.label}
              </Link>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    </nav>
  );
}
