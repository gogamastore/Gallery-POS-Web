"use client"

import * as React from "react"
import { Search, Bell, Moon, Sun, User, Power, Settings } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PlaceHolderImages } from "@/lib/placeholder-images"

export function DashboardHeader() {
  const [isStoreOpen, setIsStoreOpen] = React.useState(true)
  const profileImg = PlaceHolderImages.find(img => img.id === 'admin-avatar')?.imageUrl

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-4 lg:gap-8">
        <SidebarTrigger />
        <div className="relative hidden w-full max-w-sm sm:flex">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari produk atau pesanan..."
            className="w-full bg-background pl-8 focus-visible:ring-primary"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 rounded-full bg-secondary/50 px-3 py-1.5 md:flex">
          <Label htmlFor="store-status" className="text-xs font-medium cursor-pointer">
            Status Toko: <span className={isStoreOpen ? "text-emerald-600 font-bold" : "text-destructive font-bold"}>
              {isStoreOpen ? "BUKA" : "TUTUP"}
            </span>
          </Label>
          <Switch
            id="store-status"
            checked={isStoreOpen}
            onCheckedChange={setIsStoreOpen}
            className="data-[state=checked]:bg-emerald-500 scale-75"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative text-muted-foreground">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-primary" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border-2 border-primary/20 transition-all hover:border-primary/50">
                  <AvatarImage src={profileImg} alt="Admin" />
                  <AvatarFallback className="bg-primary text-white">AD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Admin Nexus</p>
                  <p className="text-xs leading-none text-muted-foreground">admin@nexuswholesale.id</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profil Saya</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Pengaturan Akun</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Power className="mr-2 h-4 w-4" />
                <span>Keluar Aplikasi</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
