"use client"

import * as React from "react"
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  ArrowUpRight,
  MoreVertical,
  UserPlus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const resellers = [
  { 
    id: 1, 
    name: "Ahmad Subarjo", 
    shop: "Toko Sinar Jaya", 
    email: "ahmad@sinarjaya.id", 
    phone: "0812-3456-7890", 
    location: "Jakarta Selatan", 
    joined: "Jan 2023",
    orders: 45,
    spent: "Rp 125.000.000",
    status: "Gold"
  },
  { 
    id: 2, 
    name: "Siti Aminah", 
    shop: "Grosir Barokah", 
    email: "siti@barokah.com", 
    phone: "0856-7890-1234", 
    location: "Bandung", 
    joined: "Mar 2023",
    orders: 32,
    spent: "Rp 82.000.000",
    status: "Silver"
  },
  { 
    id: 3, 
    name: "Budi Santoso", 
    shop: "Minimarket Kita", 
    email: "budi@kita.id", 
    phone: "0878-1234-5678", 
    location: "Surabaya", 
    joined: "Jun 2023",
    orders: 12,
    spent: "Rp 45.000.000",
    status: "Bronze"
  },
  { 
    id: 4, 
    name: "Dewi Lestari", 
    shop: "UD Makmur", 
    email: "dewi@makmur.co.id", 
    phone: "0821-4567-8901", 
    location: "Yogyakarta", 
    joined: "Sep 2023",
    orders: 8,
    spent: "Rp 21.000.000",
    status: "Bronze"
  },
]

export default function ResellersPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Reseller Terdaftar</h1>
          <p className="text-muted-foreground mt-1">Kelola mitra bisnis dan pantau performa mereka.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white font-semibold flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Undang Reseller Baru
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari nama, toko, atau lokasi..." className="pl-10 border-none shadow-none focus-visible:ring-0" />
        </div>
        <Button variant="ghost" className="text-primary font-semibold">Cari</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {resellers.map((reseller) => (
          <Card key={reseller.id} className="border-none shadow-md hover:shadow-lg transition-all overflow-hidden bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border-2 border-primary/10">
                    <AvatarImage src={`https://picsum.photos/seed/${reseller.id + 10}/100/100`} />
                    <AvatarFallback>{reseller.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{reseller.shop}</CardTitle>
                      <Badge className={`
                        ${reseller.status === 'Gold' ? 'bg-amber-400 text-amber-950' : 
                          reseller.status === 'Silver' ? 'bg-slate-300 text-slate-900' :
                          'bg-orange-200 text-orange-900'} 
                        border-none text-[10px] px-2 py-0
                      `}>
                        {reseller.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">{reseller.name}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{reseller.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{reseller.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{reseller.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Sejak {reseller.joined}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Pesanan</p>
                  <p className="font-bold text-lg">{reseller.orders}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nilai Transaksi</p>
                  <p className="font-bold text-lg text-primary">{reseller.spent}</p>
                </div>
              </div>

              <div className="mt-4">
                <Button variant="outline" className="w-full hover:bg-primary hover:text-white transition-all">
                  Lihat Riwayat Lengkap <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}