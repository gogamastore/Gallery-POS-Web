"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BrainCircuit,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Store,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Produk",
    url: "/products",
    icon: Package,
  },
  {
    title: "Pesanan Massal",
    url: "/orders",
    icon: ShoppingCart,
  },
  {
    title: "Reseller",
    url: "/resellers",
    icon: Users,
  },
  {
    title: "AI Insights",
    url: "/insights",
    icon: BrainCircuit,
  },
  {
    title: "Laporan Penjualan",
    url: "/reports",
    icon: BarChart3,
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" className="border-r-0 shadow-xl">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border/30">
        <Link href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="bg-white p-1.5 rounded-lg">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white group-data-[collapsible=icon]:hidden">
            NexusWholesale
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/60 px-4 mb-2">Menu Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className="hover:bg-white/10 text-white data-[active=true]:bg-accent data-[active=true]:text-accent-foreground transition-all duration-200"
                  >
                    <Link href={item.url}>
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border/30">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="text-white/80 hover:bg-white/10 hover:text-white">
              <Settings className="h-5 w-5" />
              <span>Pengaturan</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="text-white/80 hover:bg-white/10 hover:text-white">
              <LogOut className="h-5 w-5" />
              <span>Keluar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}