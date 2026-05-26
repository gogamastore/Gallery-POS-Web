"use client"

import * as React from "react"
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileDown,
  ChevronRight,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const orders = [
  { id: "ORD-1001", reseller: "Toko Sinar Jaya", date: "12 Mar 2024", total: "Rp 15.500.000", status: "Diproses", payment: "Lunas" },
  { id: "ORD-1002", reseller: "Grosir Barokah", date: "12 Mar 2024", total: "Rp 8.250.000", status: "Dikirim", payment: "Lunas" },
  { id: "ORD-1003", reseller: "Minimarket Kita", date: "11 Mar 2024", total: "Rp 21.000.000", status: "Menunggu Pembayaran", payment: "Pending" },
  { id: "ORD-1004", reseller: "UD Makmur", date: "11 Mar 2024", total: "Rp 5.400.000", status: "Selesai", payment: "Lunas" },
  { id: "ORD-1005", reseller: "Toko Abadi", date: "10 Mar 2024", total: "Rp 12.900.000", status: "Diproses", payment: "Lunas" },
  { id: "ORD-1006", reseller: "Koperasi Pegawai", date: "10 Mar 2024", total: "Rp 4.150.000", status: "Dibatalkan", payment: "Refund" },
]

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Pesanan Massal</h1>
          <p className="text-muted-foreground mt-1">Kelola dan pantau status pesanan grosir dari reseller.</p>
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          Ekspor Laporan
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-white border-none shadow-sm">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-full text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Perlu Diproses</p>
              <p className="text-2xl font-bold">12</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-none shadow-sm">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-full text-blue-600">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Sedang Dikirim</p>
              <p className="text-2xl font-bold">24</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-none shadow-sm">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="bg-emerald-100 p-3 rounded-full text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Selesai Hari Ini</p>
              <p className="text-2xl font-bold">48</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-none shadow-sm">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="bg-rose-100 p-3 rounded-full text-rose-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Isu Pengiriman</p>
              <p className="text-2xl font-bold">3</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <TabsList className="bg-white border shadow-sm h-12">
            <TabsTrigger value="all" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white">Semua</TabsTrigger>
            <TabsTrigger value="pending" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white">Menunggu</TabsTrigger>
            <TabsTrigger value="shipping" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white">Dikirim</TabsTrigger>
            <TabsTrigger value="done" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white">Selesai</TabsTrigger>
          </TabsList>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari Reseller atau ID..." className="pl-10 bg-white" />
          </div>
        </div>

        <TabsContent value="all" className="mt-0">
          <Card className="border-none shadow-md bg-white overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="px-6">ID Pesanan</TableHead>
                    <TableHead>Nama Reseller</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Total Tagihan</TableHead>
                    <TableHead>Status Pesanan</TableHead>
                    <TableHead>Pembayaran</TableHead>
                    <TableHead className="text-right px-6">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="group hover:bg-secondary/20 transition-colors">
                      <TableCell className="px-6 font-mono text-xs font-bold text-primary">{order.id}</TableCell>
                      <TableCell className="font-semibold">{order.reseller}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{order.date}</TableCell>
                      <TableCell className="font-bold">{order.total}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`
                          ${order.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 
                            order.status === 'Dibatalkan' ? 'bg-rose-100 text-rose-700' :
                            order.status === 'Dikirim' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          } border-none font-semibold px-3 py-0.5
                        `}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${order.payment === 'Lunas' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span className="text-sm font-medium">{order.payment}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            Detail <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Kelola Pesanan</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Ubah Status</DropdownMenuItem>
                              <DropdownMenuItem>Cetak Invoice</DropdownMenuItem>
                              <DropdownMenuItem>Hubungi Reseller</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">Batalkan Pesanan</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}