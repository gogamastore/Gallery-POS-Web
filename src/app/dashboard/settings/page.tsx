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
  MapPin,
} from "lucide-react";
import Link from "next/link";

const settingsCards = [
  // ── Baru: Alamat Toko / Origin Biteship ─────────────────────
  {
    title: "Alamat Toko",
    description:
      "Atur lokasi toko sebagai titik asal pickup Biteship. Termasuk Origin Area ID dan koordinat GPS untuk kurir instan.",
    icon: MapPin,
    href: "/dashboard/settings/store-address",
    highlight: true, // tampil lebih menonjol
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {settingsCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link key={card.href} href={card.href}>
                  <Card
                    className={`h-full cursor-pointer transition-colors hover:bg-accent ${
                      card.highlight
                        ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
                        : ""
                    }`}
                  >
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                      <div
                        className={`p-2 rounded-md ${
                          card.highlight
                            ? "bg-primary/15 text-primary"
                            : "bg-muted"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-sm font-semibold">
                        {card.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        {card.description}
                      </p>
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
