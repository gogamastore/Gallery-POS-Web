"use client"

import * as React from "react"
import { 
  BarChart3, 
  Download, 
  Calendar as CalendarIcon, 
  Filter, 
  ChevronDown,
  Printer,
  Share2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Area, 
  AreaChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts"

const data = [
  { name: "Sen", value: 4000 },
  { name: "Sel", value: 3000 },
  { name: "Rab", value: 2000 },
  { name: "Kam", value: 2780 },
  { name: "Jum", value: 1890 },
  { name: "Sab", value: 2390 },
  { name: "Min", value: 3490 },
]

const pieData = [
  { name: "Sembako", value: 45 },
  { name: "Minuman", value: 25 },
  { name: "Kebutuhan Rumah", value: 20 },
  { name: "Lainnya", value: 10 },
]

const COLORS = ["#2259C7", "#3DBFDA", "#8884d8", "#ffc658"]

export default function ReportsPage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Laporan Penjualan</h1>
          <p className="text-muted-foreground mt-1">Analisis data performa bisnis grosir secara mendalam.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" /> Share
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white font-semibold">
            <Download className="h-4 w-4 mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-white border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider">Gross Sales</CardDescription>
            <CardTitle className="text-2xl">Rp 1.2M</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-emerald-500 font-bold flex items-center gap-1">
              +14% <span className="text-muted-foreground font-normal">than last period</span>
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider">Average Order</CardDescription>
            <CardTitle className="text-2xl">Rp 8.5jt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-emerald-500 font-bold flex items-center gap-1">
              +5% <span className="text-muted-foreground font-normal">than last period</span>
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider">New Resellers</CardTitle>
            <CardTitle className="text-2xl">12</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-rose-500 font-bold flex items-center gap-1">
              -2% <span className="text-muted-foreground font-normal">than last period</span>
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider">Net Profit</CardDescription>
            <CardTitle className="text-2xl">Rp 185jt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-emerald-500 font-bold flex items-center gap-1">
              +21% <span className="text-muted-foreground font-normal">than last period</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal bg-white",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Select defaultValue="all">
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="sembako">Sembako</SelectItem>
              <SelectItem value="minuman">Minuman</SelectItem>
              <SelectItem value="rumah">Kebutuhan Rumah</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="bg-white">
            <Filter className="h-4 w-4 mr-2" /> Apply Filters
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border shadow-md bg-white">
          <CardHeader>
            <CardTitle>Performa Mingguan</CardTitle>
            <CardDescription>Pendapatan kotor dari Senin sampai Minggu</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2259C7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2259C7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={10} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={10} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#2259C7" fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-md bg-white">
          <CardHeader>
            <CardTitle>Komposisi Penjualan</CardTitle>
            <CardDescription>Berdasarkan kategori produk grosir</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center">
            <div className="h-[300px] w-full max-w-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}