
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip"
import { LayoutDashboard, ShoppingCart, Package, LineChart, Archive, ClipboardList, Settings, ChevronDown, Banknote, Users, Contact, Building, Receipt, FileWarning, DollarSign, ArrowUpRight, Scale, Warehouse, Replace, Landmark, LayoutGrid, Percent, TrendingUp, LayoutTemplate } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "./ui/button"

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/orders", label: "Pesanan", icon: ShoppingCart },
    { href: "/dashboard/products", label: "Manajemen Produk", icon: Package },
    { href: "/dashboard/stock-management", label: "Manajemen Stok", icon: Warehouse },
    { href: "/dashboard/purchases", label: "Transaksi Pembelian", icon: Archive },
    { href: "/dashboard/operational-costs", label: "Biaya Operasional", icon: ClipboardList },
]

const reportsSubMenu = [
    { href: "/dashboard/reports/purchases", label: "Pembelian", icon: Archive },
    { href: "/dashboard/reports/operational-expenses", label: "Beban Operasional", icon: Landmark },
    { href: "/dashboard/reports/stock-flow", label: "Arus Stok", icon: Replace },
    { href: "/dashboard/reports/receivables", label: "Piutang Usaha", icon: FileWarning },
    { href: "/dashboard/reports/accounts-payable", label: "Utang Dagang", icon: Receipt },
    { href: "/dashboard/reports/customers", label: "Pelanggan", icon: Users },
]

const settingsSubMenu = [
    { href: "/dashboard/settings/bank-accounts", label: "Rekening Bank", icon: Banknote },
    { href: "/dashboard/settings/staff", label: "Manajemen Staf", icon: Users },
    { href: "/dashboard/settings/contacts", label: "Daftar Kontak", icon: Contact },
    { href: "/dashboard/settings/suppliers", label: "Manajemen Supplier", icon: Building },
    { href: "/dashboard/settings/product-categories", label: "Kategori Produk", icon: LayoutGrid },
    { href: "/dashboard/settings/brands", label: "Manajemen Brand", icon: Building },
    { href: "/dashboard/settings/promo", label: "Promo", icon: Percent },
    { href: "/dashboard/settings/design", label: "Desain", icon: LayoutTemplate },
    { href: "/dashboard/settings/trending-products", label: "Produk Trending", icon: TrendingUp },
]


export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname()
  const isReportsOpen = pathname.startsWith('/dashboard/reports');
  const isSettingsOpen = pathname.startsWith('/dashboard/settings');

  const renderSubMenuItem = (item: { href: string; label: string; icon?: React.ElementType }) => {
    const Icon = item.icon;
    const isActive = pathname.startsWith(item.href);
    return (
        <Link 
            key={item.href}
            href={item.href} 
            className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground", isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground")}
        >
           {Icon && <Icon className="h-4 w-4" />}
           <span>{item.label}</span>
        </Link>
    );
  };
  

  return (
    <TooltipProvider>
      <nav
        className={cn("flex flex-col items-start gap-1", className)}
        {...props}
      >
        {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href) && (item.href !== "/dashboard" || pathname === "/dashboard")
            return (
                <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                         <Link
                            href={item.href}
                            className={cn(
                                "flex w-full items-center justify-start gap-3 rounded-md p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                isActive
                                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                                : "text-muted-foreground",
                                "group-[.collapsed]:px-2 group-[.collapsed]:w-auto group-[.collapsed]:justify-center"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            <span className="group-[.collapsed]:hidden">{item.label}</span>
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        {item.label}
                    </TooltipContent>
                </Tooltip>
            )
        })}

        <Collapsible defaultOpen={isReportsOpen} className="w-full">
             <CollapsibleTrigger asChild>
                <div className={cn( "flex w-full items-center justify-start gap-3 p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer", isReportsOpen ? "text-accent-foreground" : "text-muted-foreground", "group-[.collapsed]:px-2 group-[.collapsed]:w-auto group-[.collapsed]:justify-center" )}>
                    <LineChart className="h-5 w-5" />
                    <span className="group-[.collapsed]:hidden flex-1 text-left">Laporan</span>
                    <ChevronDown className="h-4 w-4 transition-transform [&[data-state=open]]:rotate-180 group-[.collapsed]:hidden" />
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-8 pr-2 space-y-1">
                {reportsSubMenu.map(renderSubMenuItem)}
            </CollapsibleContent>
        </Collapsible>
        
        <Collapsible defaultOpen={isSettingsOpen} className="w-full">
            <CollapsibleTrigger asChild>
                 <div className={cn( "flex w-full items-center justify-start gap-3 p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer", isSettingsOpen ? "text-accent-foreground" : "text-muted-foreground", "group-[.collapsed]:px-2 group-[.collapsed]:w-auto group-[.collapsed]:justify-center" )}>
                    <Settings className="h-5 w-5" />
                    <span className="group-[.collapsed]:hidden flex-1 text-left">Pengaturan</span>
                    <ChevronDown className="h-4 w-4 transition-transform [&[data-state=open]]:rotate-180 group-[.collapsed]:hidden" />
                </div>
            </CollapsibleTrigger>
             <CollapsibleContent className="pl-8 pr-2 space-y-1">
                {settingsSubMenu.map(renderSubMenuItem)}
            </CollapsibleContent>
        </Collapsible>
      </nav>
    </TooltipProvider>
  )
}
