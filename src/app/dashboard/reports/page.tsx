import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  LineChart,
  Users,
  FileText,
  DollarSign,
  ArrowUpRight,
  Landmark,
  FileWarning,
  Scale,
  Warehouse,
  Package,
  Replace,
  Receipt,
} from "lucide-react"
import Link from "next/link"

const reportCards = [
  {
    title: "Laporan Transaksi Pembelian",
    description: "Lacak semua transaksi pembelian stok.",
    icon: FileText,
    href: "/dashboard/reports/purchases",
  },
   {
    title: "Laporan Beban Operasional",
    description: "Lacak semua pengeluaran operasional.",
    icon: Landmark,
    href: "/dashboard/reports/operational-expenses",
  },
  {
    title: "Laporan Arus Stok",
    description: "Lacak riwayat pergerakan stok produk.",
    icon: Replace,
    href: "/dashboard/reports/stock-flow",
  },
  {
    title: "Laporan Piutang Usaha",
    description: "Lacak pesanan yang belum dibayar.",
    icon: FileWarning,
    href: "/dashboard/reports/receivables",
  },
  {
    title: "Laporan Utang Dagang",
    description: "Lacak pembelian kredit yang belum lunas.",
    icon: Receipt,
    href: "/dashboard/reports/accounts-payable",
  },
  {
    title: "Laporan Laba-Rugi",
    description: "Pahami keuntungan dan kerugian bisnis.",
    icon: DollarSign,
    href: "/dashboard/reports/profit-loss",
  },
  {
    title: "Laporan Pendapatan Bersih",
    description: "Lihat pendapatan bersih setelah semua biaya.",
    icon: ArrowUpRight,
    href: "/dashboard/reports/net-income",
  },
  {
    title: "Laporan Pelanggan",
    description: "Analisis data dan perilaku pelanggan.",
    icon: Users,
    href: "/dashboard/reports/customers",
  },
   {
    title: "Laporan Neraca",
    description: "Lihat posisi keuangan bisnis Anda.",
    icon: Scale,
    href: "/dashboard/reports/balance-sheet",
  },
  {
    title: "Laporan Modal Produk",
    description: "Lihat total nilai modal dari stok produk.",
    icon: Warehouse,
    href: "/dashboard/reports/inventory-valuation",
  }
]

export default function ReportsPage() {
  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
          <CardTitle>Pusat Laporan</CardTitle>
          <CardDescription>
            Pilih laporan yang ingin Anda lihat untuk mendapatkan wawasan mendalam tentang bisnis Anda.
          </CardDescription>
        </CardHeader>
      </Card>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportCards.map((report) => (
          <Card key={report.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">
                {report.title}
              </CardTitle>
              <report.icon className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{report.description}</p>
              <Button asChild>
                <Link href={report.href}>Lihat Laporan</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
