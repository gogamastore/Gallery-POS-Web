"use client"

import * as React from "react"
import { 
  TrendingUp, 
  Package, 
  Users, 
  ShoppingCart, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronRight,
  MoreVertical
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"

const chartData = [
  { month: "Jan", sales: 186, orders: 80 },
  { month: "Feb", sales: 305, orders: 200 },
  { month: "Mar", sales: 237, orders: 120 },
  { month: "Apr", sales: 73, orders: 190 },
  { month: "May", sales: 209, orders: 130 },
  { month: "Jun", sales: 214, orders: 140 },
]

const chartConfig = {
  sales: {
    label: "Penjualan (Juta)",
    color: "hsl(var(--primary))",
  },
  orders: {
    label: "Pesanan",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig

const stats = [
  {
    title: "Total Pendapatan",
    value: "Rp 1.250M",
    change: "+12.5%",
    trend: "up",
    icon: TrendingUp,
  },
  {
    title: "Total Produk",
    value: "1,248",
    change: "+4.2%",
    trend: "up",
    icon: Package,
  },
  {
    title: "Pesanan Masuk",
    value: "456",
    change: "-2.4%",
    trend: "down",
    icon: ShoppingCart,
  },
  {
    title: "Reseller Aktif",
    value: "89",
    change: "+18.1%",
    trend: "up",
    icon: Users,
  },
]

const recentOrders = [
  { id: "ORD-7234", reseller: "Toko Berkah Jaya", amount: "Rp 12.500.000", status: "Diproses" },
  { id: "ORD-7235", reseller: "CV Maju Terus", amount: "Rp 8.200.000", status: "Dikirim" },
  { id: "ORD-7236", reseller: "UD Sederhana", amount: "Rp 15.000.000", status: "Selesai" },
  { id: "ORD-7237", reseller: "Grosir Sentosa", amount: "Rp 5.750.000", status: "Dibatalkan" },
  { id: "ORD-7238", reseller: "Toko Sembako Abadi", amount: "Rp 21.000.000", status: "Diproses" },
]

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Ringkasan Bisnis</h1>
        <p className="text-muted-foreground mt-1 text-lg">
          Selamat datang kembali, Admin. Berikut adalah performa NexusWholesale hari ini.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="border-none shadow-md hover:shadow-lg transition-shadow bg-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="bg-primary/10 p-2 rounded-lg">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center mt-1">
                {stat.trend === "up" ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-destructive mr-1" />
                )}
                <span className={`text-xs font-semibold ${stat.trend === "up" ? "text-emerald-500" : "text-destructive"}`}>
                  {stat.change}
                </span>
                <span className="text-xs text-muted-foreground ml-1">vs bulan lalu</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4 border-none shadow-md bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">Analisis Penjualan</CardTitle>
              <CardDescription>Visualisasi performa penjualan 6 bulan terakhir.</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="hidden sm:flex">
              Download CSV
            </Button>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="h-[300px] w-full">
               <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tickFormatter={(value) => `${value}`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="sales" fill="var(--color-sales)" radius={[4, 4, 0, 0]} barSize={40} />
                  <Bar dataKey="orders" fill="var(--color-orders)" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-none shadow-md bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">Pesanan Terbaru</CardTitle>
              <CardDescription>Status transaksi terkini dari para reseller.</CardDescription>
            </div>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Reseller</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-secondary/30 transition-colors">
                    <TableCell className="font-medium text-xs py-4">{order.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{order.reseller}</span>
                        <span className="text-xs text-muted-foreground">{order.amount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <Badge 
                        variant="secondary" 
                        className={`font-semibold text-[10px] uppercase tracking-wider ${
                          order.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' :
                          order.status === 'Dibatalkan' ? 'bg-rose-100 text-rose-700' :
                          'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4">
              <Button variant="link" className="w-full text-primary font-semibold flex items-center justify-center gap-1">
                Lihat Semua Pesanan <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
