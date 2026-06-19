"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Banknote,
  Users,
  Contact,
  LayoutTemplate,
  Percent,
  TrendingUp,
  Building,
  LayoutGrid,
  MapPinHouse,        // ← ikon untuk Alamat Toko
} from "lucide-react";
import Link from "next/link";


const settingsCards = [
  // ── BARU: Alamat Toko — ditaruh paling atas karena penting untuk Biteship ──
  {
    title: "Alamat Toko",
    description: "Atur lokasi, koordinat GPS, dan Area Biteship sebagai titik asal pengiriman.",
    icon: MapPinHouse,
    href: "/dashboard/settings/store-address",
    highlight: true,  // tampilkan dengan styling berbeda
  },
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
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {settingsCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link key={card.href} href={card.href}>
                  <Card
                    className={`hover:shadow-md transition-all cursor-pointer h-full ${
                      card.highlight
                        ? "border-blue-200 bg-blue-50/50 hover:border-blue-400"
                        : "hover:border-primary/50"
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            card.highlight
                              ? "bg-blue-100 text-blue-600"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base">{card.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">
                        {card.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
