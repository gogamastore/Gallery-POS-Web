"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar as CalendarIcon,
  Receipt,
  Wallet,
  CreditCard,
  Landmark,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { format, startOfDay, endOfDay, startOfMonth, subDays } from "date-fns";
import { id as dateFnsLocaleId } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import Link from "next/link";

// ─── Tipe & util ────────────────────────────────────────────────────
interface FeeBreakdown {
  admin: number;
  service: number;
  payment: number;
}

interface DailyFees {
  key: string; // yyyy-MM-dd
  date: Date;
  total: number; // admin + service + payment
  orderCount: number;
  breakdown: FeeBreakdown;
}

interface RawFeeOrder {
  date: Date;
  adminFee: number;
  serviceFee: number;
  paymentFee: number;
}

const emptyBreakdown = (): FeeBreakdown => ({ admin: 0, service: 0, payment: 0 });

function parseNum(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value.replace(/[^0-9]/g, "")) || 0;
  return 0;
}

function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

type QuickFilter = "today" | "yesterday" | "last7days" | "thisMonth" | "custom";

export default function AdminFeesReportPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfDay(new Date()),
  });
  const [activeFilter, setActiveFilter] = useState<QuickFilter>("thisMonth");
  const [rawOrders, setRawOrders] = useState<RawFeeOrder[]>([]);
  const [selectedDay, setSelectedDay] = useState<DailyFees | null>(null);

  const applyQuickFilter = (filter: QuickFilter) => {
    const now = new Date();
    switch (filter) {
      case "today":
        setDateRange({ from: startOfDay(now), to: endOfDay(now) });
        break;
      case "yesterday": {
        const y = subDays(now, 1);
        setDateRange({ from: startOfDay(y), to: endOfDay(y) });
        break;
      }
      case "last7days":
        setDateRange({ from: startOfDay(subDays(now, 6)), to: endOfDay(now) });
        break;
      case "thisMonth":
        setDateRange({ from: startOfMonth(now), to: endOfDay(now) });
        break;
      default:
        break;
    }
    setActiveFilter(filter);
  };

  const fetchData = useCallback(async () => {
    const { from, to } = dateRange || {};
    if (!from || !to) return;
    setLoading(true);
    try {
      // Memakai `validatedAt` + status (sama seperti Laporan Pendapatan →
      // tak perlu indeks baru). Source 'marketplace' disaring di memori.
      const ordersQuery = query(
        collection(db, "orders"),
        where("validatedAt", ">=", from),
        where("validatedAt", "<=", to),
        where("status", "in", [
          "Processing",
          "processing",
          "success",
          "Shipped",
          "shipped",
          "Delivered",
          "delivered",
        ])
      );

      const snapshot = await getDocs(ordersQuery);
      const rows: RawFeeOrder[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Hanya pesanan pembeli marketplace.
        if (data.source !== "marketplace") return;
        const d = toDate(data.validatedAt) || toDate(data.date);
        if (!d) return;
        rows.push({
          date: d,
          adminFee: parseNum(data.adminFee),
          serviceFee: parseNum(data.serviceFee),
          paymentFee: parseNum(data.paymentFee),
        });
      });

      setRawOrders(rows);
    } catch (error) {
      console.error("Error fetching admin-fees report:", error);
      setRawOrders([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { daily, totalFees, totalTransactions, totals } = useMemo(() => {
    const map = new Map<string, DailyFees>();
    const grand = emptyBreakdown();
    let txCount = 0;

    rawOrders.forEach((o) => {
      const orderTotal = o.adminFee + o.serviceFee + o.paymentFee;
      if (orderTotal <= 0) return; // hanya pesanan yang memang ada biayanya
      txCount += 1;
      grand.admin += o.adminFee;
      grand.service += o.serviceFee;
      grand.payment += o.paymentFee;

      const key = format(o.date, "yyyy-MM-dd");
      const entry =
        map.get(key) ||
        ({
          key,
          date: startOfDay(o.date),
          total: 0,
          orderCount: 0,
          breakdown: emptyBreakdown(),
        } as DailyFees);
      entry.total += orderTotal;
      entry.orderCount += 1;
      entry.breakdown.admin += o.adminFee;
      entry.breakdown.service += o.serviceFee;
      entry.breakdown.payment += o.paymentFee;
      map.set(key, entry);
    });

    const list = Array.from(map.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
    return {
      daily: list,
      totalFees: grand.admin + grand.service + grand.payment,
      totalTransactions: txCount,
      totals: grand,
    };
  }, [rawOrders]);

  const quickFilters: { value: QuickFilter; label: string }[] = [
    { value: "today", label: "Hari Ini" },
    { value: "yesterday", label: "Kemarin" },
    { value: "last7days", label: "7 Hari Terakhir" },
    { value: "thisMonth", label: "Bulan Ini" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/reports">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Laporan Biaya Admin &amp; Layanan</h1>
          <p className="text-sm text-muted-foreground">
            Biaya admin, layanan &amp; layanan pembayaran yang dibayar pembeli marketplace per hari.
          </p>
        </div>
      </div>

      {/* Filter periode */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filter Periode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((f) => (
              <Button
                key={f.value}
                variant={activeFilter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => applyQuickFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={activeFilter === "custom" ? "default" : "outline"}
                className="w-full justify-start text-left font-normal sm:w-auto"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd MMM yyyy", { locale: dateFnsLocaleId })} -{" "}
                      {format(dateRange.to, "dd MMM yyyy", { locale: dateFnsLocaleId })}
                    </>
                  ) : (
                    format(dateRange.from, "dd MMM yyyy", { locale: dateFnsLocaleId })
                  )
                ) : (
                  <span>Pilih tanggal</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range);
                  setActiveFilter("custom");
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Ringkasan total */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          title="Total Biaya Diterima"
          value={loading ? null : formatCurrency(totalFees)}
          icon={Receipt}
          accent="text-green-600"
        />
        <SummaryCard
          title="Total Transaksi"
          value={loading ? null : `${totalTransactions} pesanan`}
          icon={CreditCard}
          accent="text-blue-600"
        />
      </div>

      {/* Rincian total per jenis biaya */}
      {!loading && totalFees > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Rincian per Jenis Biaya</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <BreakdownRow label="Biaya Admin" amount={totals.admin} icon={Landmark} />
            <BreakdownRow label="Biaya Layanan" amount={totals.service} icon={Receipt} />
            <BreakdownRow label="Biaya Layanan Pembayaran" amount={totals.payment} icon={CreditCard} />
          </CardContent>
        </Card>
      )}

      {/* Daftar harian */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rincian Harian</CardTitle>
          <CardDescription>Klik satu hari untuk melihat rincian per jenis biaya.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : daily.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              Tidak ada biaya pada periode ini.
            </p>
          ) : (
            <div className="divide-y rounded-lg border">
              {daily.map((day) => (
                <button
                  key={day.key}
                  onClick={() => setSelectedDay(day)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CalendarIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {format(day.date, "EEEE, dd MMM yyyy", { locale: dateFnsLocaleId })}
                      </p>
                      <p className="text-sm text-muted-foreground">{day.orderCount} transaksi</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-green-600">{formatCurrency(day.total)}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog detail per hari */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedDay && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {format(selectedDay.date, "EEEE, dd MMMM yyyy", { locale: dateFnsLocaleId })}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/20">
                    <p className="text-xs text-muted-foreground">Total Biaya</p>
                    <p className="mt-1 text-lg font-bold text-green-600">
                      {formatCurrency(selectedDay.total)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
                    <p className="text-xs text-muted-foreground">Total Transaksi</p>
                    <p className="mt-1 text-lg font-bold text-blue-600">
                      {selectedDay.orderCount} pesanan
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="mb-2 text-sm font-semibold">Rincian Jenis Biaya</p>
                  <div className="space-y-1">
                    <BreakdownRow label="Biaya Admin" amount={selectedDay.breakdown.admin} icon={Landmark} />
                    <BreakdownRow label="Biaya Layanan" amount={selectedDay.breakdown.service} icon={Receipt} />
                    <BreakdownRow
                      label="Biaya Layanan Pembayaran"
                      amount={selectedDay.breakdown.payment}
                      icon={CreditCard}
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(selectedDay.total)}
                  </span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string | null;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${accent}`} />
      </CardHeader>
      <CardContent>
        {value === null ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <p className={`text-2xl font-bold ${accent}`}>{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

function BreakdownRow({
  label,
  amount,
  icon: Icon,
}: {
  label: string;
  amount: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-semibold">{formatCurrency(amount)}</span>
    </div>
  );
}
