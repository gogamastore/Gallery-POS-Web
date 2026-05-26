"use client"

import * as React from "react"
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash, 
  Eye, 
  Package,
  ArrowUpDown
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const products = [
  { id: 1, name: "Beras Premium 25kg", category: "Sembako", sku: "SKU-BRS-001", stock: 120, price: "Rp 320.000", status: "Tersedia" },
  { id: 2, name: "Minyak Goreng 2L (Karton)", category: "Sembako", sku: "SKU-MYK-002", stock: 45, price: "Rp 210.000", status: "Stok Menipis" },
  { id: 3, name: "Gula Pasir 50kg", category: "Sembako", sku: "SKU-GLA-003", stock: 15, price: "Rp 750.000", status: "Stok Menipis" },
  { id: 4, name: "Kopi Arabika (Pack 10)", category: "Minuman", sku: "SKU-KPI-004", stock: 200, price: "Rp 150.000", status: "Tersedia" },
  { id: 5, name: "Tepung Terigu 25kg", category: "Sembako", sku: "SKU-TPN-005", stock: 0, price: "Rp 245.000", status: "Habis" },
  { id: 6, name: "Susu UHT (Karton)", category: "Minuman", sku: "SKU-SSU-006", stock: 85, price: "Rp 180.000", status: "Tersedia" },
]

export default function ProductsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Katalog Produk</h1>
          <p className="text-muted-foreground mt-1">Kelola inventaris dan harga produk grosir Anda.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white font-semibold flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Tambah Produk Baru
        </Button>
      </div>

      <Card className="border-none shadow-md bg-white overflow-hidden">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari SKU atau nama produk..." className="pl-10" />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button variant="outline" className="flex items-center gap-2 flex-1 md:flex-none">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              <Button variant="outline" className="flex items-center gap-2 flex-1 md:flex-none">
                <ArrowUpDown className="h-4 w-4" />
                Urutkan
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[80px] px-6">Gambar</TableHead>
                <TableHead className="min-w-[200px]">Nama Produk</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Stok</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right px-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} className="hover:bg-secondary/20 transition-colors">
                  <TableCell className="px-6">
                    <Avatar className="h-10 w-10 rounded-md border">
                      <AvatarImage src={`https://picsum.photos/seed/${product.id}/100/100`} />
                      <AvatarFallback><Package className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-semibold">{product.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono">{product.sku}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-secondary/50 font-medium">
                      {product.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`font-bold ${product.stock < 20 ? 'text-destructive' : 'text-foreground'}`}>
                      {product.stock} unit
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold text-primary">{product.price}</TableCell>
                  <TableCell>
                    <Badge 
                      className={`${
                        product.status === 'Tersedia' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        product.status === 'Habis' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      } border`}
                    >
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuLabel>Opsi Produk</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" /> Detail
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash className="mr-2 h-4 w-4" /> Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}