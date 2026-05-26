
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Banknote, Users, Contact, LayoutTemplate, Percent, TrendingUp, Building, LayoutGrid } from "lucide-react";
import Link from "next/link";


const settingsCards = [
  {
    title: "Rekening Bank",
    description: "Kelola rekening bank untuk pembayaran via transfer.",
    icon: Banknote,
    href: "/dashboard/settings/bank-accounts",
  },
  {
    title: "Manajemen Staf",
    description: "Tambah atau hapus akun staf dengan akses ke dasbor.",
    icon: Users,
    href: "/dashboard/settings/staff",
  },
  {
    title: "Daftar Kontak",
    description: "Kelola daftar kontak admin untuk dihubungi reseller.",
    icon: Contact,
    href: "/dashboard/settings/contacts",
  },
  {
    title: "Manajemen Supplier",
    description: "Kelola daftar supplier untuk transaksi pembelian.",
    icon: Building,
    href: "/dashboard/settings/suppliers",
  },
   {
    title: "Kategori Produk",
    description: "Atur kategori untuk pengelompokan produk Anda.",
    icon: LayoutGrid,
    href: "/dashboard/settings/product-categories",
  },
  {
    title: "Manajemen Brand",
    description: "Atur brand dan produk yang terasosiasi di dalamnya.",
    icon: Building,
    href: "/dashboard/settings/brands",
  },
  {
    title: "Desain",
    description: "Atur banner dan tampilan halaman reseller.",
    icon: LayoutTemplate,
    href: "/dashboard/settings/design",
  },
  {
    title: "Promo",
    description: "Buat dan kelola diskon produk atau flash sale.",
    icon: Percent,
    href: "/dashboard/settings/promo",
  },
   {
    title: "Produk Trending",
    description: "Atur produk yang akan ditampilkan sebagai produk terlaris.",
    icon: TrendingUp,
    href: "/dashboard/settings/trending-products",
  },
];


export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pengaturan</CardTitle>
          <CardDescription>
            Kelola pengaturan umum untuk toko Anda di sini.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsCards.map((card) => (
          <Card key={card.title} className="flex flex-col">
            <CardHeader className="flex-1">
                <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-medium">{card.title}</CardTitle>
                    <card.icon className="h-6 w-6 text-muted-foreground" />
                </div>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent>
                <Link href={card.href} className="text-sm font-medium text-primary hover:underline">
                    Buka Pengaturan &rarr;
                </Link>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
}
