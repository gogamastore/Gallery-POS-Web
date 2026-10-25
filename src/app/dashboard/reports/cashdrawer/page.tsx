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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar as CalendarIcon,
  Wallet,
  Receipt,
  ArrowLeftRight,
  QrCode,
  MoreHorizontal,
  ChevronRight,
  ArrowLeft,
  Users,
  Info,
} from "lucide-react";
import { format, startOfDay, endOfDay, startOfMonth, subDays } from "date-fns";
import { id as dateFnsLocaleId } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import Link from "next/link";

// ─── Tipe & util ────────────────────────────────────────────────────
type Bucket = "cash" | "transfer" | "midtrans" | "other";

interface PaymentBreakdown {
  cash: number;
  transfer: number;
  midtrans: number;
  other: number;
}

interface DailyRevenue {
  key: string; // yyyy-MM-dd
  date: Date;
  total: number;
  orderCount: number;
  breakdown: PaymentBreakdown;
  startingCash: number; // modal awal shift yang dibuka hari itu
  expenses: number; // pengeluaran selama jam shift hari itu
}

interface RawOrder {
  date: Date;
  total: number;
  method?: string;
  source?: string;
  cashierId?: string;
  kasir?: string;
}

const emptyBreakdown = (): PaymentBreakdown => ({
  cash: 0,
  transfer: 0,
  midtrans: 0,
  other: 0,
});

function bucketOf(method?: string): Bucket {
  const m = (method || "").toLowerCase();
  if (m === "cash" || m === "cod" || m === "tunai") return "cash";
  if (m === "bank_transfer" || m === "transfer") return "transfer";
  if (m === "midtrans" || m === "qris") return "midtrans";
  return "other";
}

// Transaksi yang masuk LACI KAS toko: semua POS, atau marketplace yang diambil
// di toko (dibayar di kasir). Marketplace via kurir TIDAK masuk.
function isDrawerOrder(source?: string, shippingMethod?: string): boolean {
  if (source === "pos") return true;
  if (source === "marketplace") {
    return (shippingMethod || "").trim().toLowerCase() === "ambil di toko";
  }
  return false;
}

function parseTotal(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string")
    return parseFloat(value.replace(/[^0-9]/g, "")) || 0;
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

export default function CashdrawerReportPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfDay(new Date()),
  });
  const [activeFilter, setActiveFilter] = useState<QuickFilter>("thisMonth");
  const [rawOrders, setRawOrders] = useState<RawOrder[]>([]);
  const [rawShifts, setRawShifts] = useState<
    { date: Date; endTime: Date | null; cashierId?: string; startingCash: number }[]
  >([]);
  const [rawExpenses, setRawExpenses] = useState<
    { date: Date; cashierId?: string; amount: number }[]
  >([]);
  const [sourceFilter, setSourceFilter] = useState<"all" | "pos" | "marketplace">("all");
  const [cashierFilter, setCashierFilter] = useState<string>("all"); // cashierId | "all"
  const [selectedDay, setSelectedDay] = useState<DailyRevenue | null>(null);

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
      // Rentang memakai `validatedAt` (waktu pesanan DIPROSES). Order yang belum
      // diproses tak punya validatedAt → otomatis tidak terhitung.
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
      const rows: RawOrder[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Pra-filter: hanya transaksi yang masuk laci kas.
        if (!isDrawerOrder(data.source, data.shippingMethod)) return;
        const d = toDate(data.validatedAt) || toDate(data.date);
        if (!d) return;
        rows.push({
          date: d,
          total: parseTotal(data.total),
          method: data.paymentMethod,
          source: data.source,
          cashierId: data.cashierId,
          kasir: data.kasir,
        });
      });

      // Modal awal (shift) & pengeluaran dalam rentang → rekonsiliasi laci kas.
      // Query satu field range masing-masing (tanpa index komposit).
      const shiftsSnap = await getDocs(
        query(
          collection(db, "cashdrawers"),
          where("startTime", ">=", from),
          where("startTime", "<=", to)
        )
      );
      const shifts = shiftsSnap.docs.map((d) => {
        const data = d.data();
        return {
          date: toDate(data.startTime) || from,
          endTime: toDate(data.endTime),
          cashierId: data.cashierId as string | undefined,
          startingCash: parseTotal(data.startingCash),
        };
      });
      const expSnap = await getDocs(
        query(
          collection(db, "operational_expenses"),
          where("date", ">=", from),
          where("date", "<=", to)
        )
      );
      const expenses = expSnap.docs.map((d) => {
        const data = d.data();
        return {
          date: toDate(data.date) || from,
          cashierId: data.cashierId as string | undefined,
          amount: parseTotal(data.amount),
        };
      });

      setRawOrders(rows);
      setRawShifts(shifts);
      setRawExpenses(expenses);
    } catch (error) {
      console.error("Error fetching cashdrawer report:", error);
      setRawOrders([]);
      setRawShifts([]);
      setRawExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const cashiers = useMemo(() => {
    const m = new Map<string, string>();
    rawOrders.forEach((o) => {
      if (o.cashierId) {
        m.set(
          o.cashierId,
          o.kasir && o.kasir !== "N/A" ? o.kasir : o.cashierId
        );
      }
    });
    return Array.from(m.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rawOrders]);

  useEffect(() => {
    if (cashierFilter !== "all" && !cashiers.some((c) => c.id === cashierFilter)) {
      setCashierFilter("all");
    }
  }, [cashiers, cashierFilter]);

  const {
    daily,
    totalRevenue,
    totalTransactions,
    startingCash,
    cashIncome,
    totalExpenses,
    endingCash,
  } = useMemo(() => {
    const filtered = rawOrders.filter((o) => {
      if (sourceFilter !== "all" && o.source !== sourceFilter) return false;
      if (cashierFilter !== "all" && o.cashierId !== cashierFilter) return false;
      return true;
    });

    const map = new Map<string, DailyRevenue>();
    filtered.forEach((o) => {
      const key = format(o.date, "yyyy-MM-dd");
      const entry =
        map.get(key) ||
        ({
          key,
          date: startOfDay(o.date),
          total: 0,
          orderCount: 0,
          breakdown: emptyBreakdown(),
          startingCash: 0,
          expenses: 0,
        } as DailyRevenue);
      entry.total += o.total;
      entry.orderCount += 1;
      entry.breakdown[bucketOf(o.method)] += o.total;
      map.set(key, entry);
    });

    // Shift (ikut filter kasir) + modal awal per hari (hari shift dibuka).
    const shifts = rawShifts.filter(
      (s) => cashierFilter === "all" || s.cashierId === cashierFilter
    );
    const startByDay = new Map<string, number>();
    let startingCash = 0;
    shifts.forEach((s) => {
      startingCash += s.startingCash;
      const k = format(startOfDay(s.date), "yyyy-MM-dd");
      startByDay.set(k, (startByDay.get(k) ?? 0) + s.startingCash);
    });

    // PENGELUARAN hanya selama JAM SHIFT AKTIF (waktu ∈ [shift.start, shift.end]
    // & kasir sama). Bila ada 2 shift bergantian dalam sehari, tiap pengeluaran
    // masuk ke shift yang benar — shift ke-2 hanya dapat pengeluaran setelah ia
    // dibuka. Pengeluaran di luar jam shift tidak dihitung.
    const rangeEnd = new Date();
    const expByDay = new Map<string, number>();
    let totalExpenses = 0;
    rawExpenses
      .filter((e) => cashierFilter === "all" || e.cashierId === cashierFilter)
      .forEach((e) => {
        const shift = shifts.find(
          (s) =>
            s.cashierId === e.cashierId &&
            e.date >= s.date &&
            e.date <= (s.endTime ?? rangeEnd)
        );
        if (!shift) return;
        totalExpenses += e.amount;
        const k = format(startOfDay(shift.date), "yyyy-MM-dd");
        expByDay.set(k, (expByDay.get(k) ?? 0) + e.amount);
      });

    const cashIncome = filtered.reduce(
      (acc, o) => (bucketOf(o.method) === "cash" ? acc + o.total : acc),
      0
    );

    // Lampirkan modal awal + pengeluaran per hari ke tiap entry.
    map.forEach((entry) => {
      entry.startingCash = startByDay.get(entry.key) ?? 0;
      entry.expenses = expByDay.get(entry.key) ?? 0;
    });

    const list = Array.from(map.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );

    return {
      daily: list,
      totalRevenue: filtered.reduce((acc, o) => acc + o.total, 0),
      totalTransactions: filtered.length,
      cashIncome,
      startingCash,
      totalExpenses,
      endingCash: startingCash + cashIncome - totalExpenses,
    };
  }, [rawOrders, rawShifts, rawExpenses, sourceFilter, cashierFilter]);

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
          <h1 className="text-2xl font-bold">Laporan Cashdrawer</h1>
          <p className="text-sm text-muted-foreground">
            Uang masuk laci kas per hari (POS &amp; marketplace Ambil di Toko).
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950/20 dark:text-blue-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Mencakup transaksi POS + pesanan marketplace &quot;Ambil di Toko&quot;
          (dibayar di kasir). Pesanan marketplace via kurir tidak termasuk.
        </span>
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
                      {format(dateRange.from, "dd MMM yyyy", {
                        locale: dateFnsLocaleId,
                      })}{" "}
                      -{" "}
                      {format(dateRange.to, "dd MMM yyyy", {
                        locale: dateFnsLocaleId,
                      })}
                    </>
                  ) : (
                    format(dateRange.from, "dd MMM yyyy", {
                      locale: dateFnsLocaleId,
                    })
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

          {/* Filter kanal */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="mr-1 text-sm text-muted-foreground">Sumber:</span>
            {(
              [
                { v: "all", l: "Semua" },
                { v: "pos", l: "POS" },
                { v: "marketplace", l: "Ambil di Toko" },
              ] as const
            ).map((s) => (
              <Button
                key={s.v}
                variant={sourceFilter === s.v ? "default" : "outline"}
                size="sm"
                onClick={() => setSourceFilter(s.v)}
              >
                {s.l}
              </Button>
            ))}
          </div>

          {/* Filter per kasir */}
          {cashiers.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Select value={cashierFilter} onValueChange={setCashierFilter}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Semua Kasir" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kasir</SelectItem>
                  {cashiers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ringkasan total */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          title="Total Masuk Laci"
          value={loading ? null : formatCurrency(totalRevenue)}
          icon={Wallet}
          accent="text-green-600"
        />
        <SummaryCard
          title="Total Transaksi"
          value={loading ? null : `${totalTransactions} pesanan`}
          icon={Receipt}
          accent="text-blue-600"
        />
      </div>

      {/* Rekonsiliasi laci kas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5 text-teal-600" /> Rekonsiliasi Laci Kas
          </CardTitle>
          <CardDescription>
            Modal Awal + Pemasukan Tunai − Pengeluaran = Modal Akhir. QRIS &amp;
            Transfer tidak termasuk Modal Akhir (bukan uang tunai di laci) — hanya
            masuk Total Penjualan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <ReconRow
            label="Modal Awal (Cash Awal)"
            value={loading ? null : formatCurrency(startingCash)}
          />
          <ReconRow
            label="+ Pemasukan Tunai (Penjualan)"
            value={loading ? null : formatCurrency(cashIncome)}
          />
          <ReconRow
            label="− Pengeluaran"
            value={loading ? null : formatCurrency(totalExpenses)}
            accent="text-red-600"
          />
          <Separator className="my-2" />
          <ReconRow
            label="Modal Akhir (Ending Cash)"
            value={loading ? null : formatCurrency(endingCash)}
            bold
            accent="text-teal-700"
          />
        </CardContent>
      </Card>

      {/* Daftar harian */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rincian Harian</CardTitle>
          <CardDescription>
            Klik satu hari untuk melihat rincian per metode pembayaran.
          </CardDescription>
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
              Tidak ada transaksi pada periode ini.
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
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {format(day.date, "EEEE, dd MMM yyyy", {
                          locale: dateFnsLocaleId,
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {day.orderCount} transaksi
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-green-600">
                      {formatCurrency(day.total)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog detail per hari */}
      <Dialog
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
      >
        <DialogContent className="sm:max-w-md">
          {selectedDay && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {format(selectedDay.date, "EEEE, dd MMMM yyyy", {
                    locale: dateFnsLocaleId,
                  })}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/20">
                    <p className="text-xs text-muted-foreground">
                      Total Masuk Laci
                    </p>
                    <p className="mt-1 text-lg font-bold text-green-600">
                      {formatCurrency(selectedDay.total)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
                    <p className="text-xs text-muted-foreground">
                      Total Transaksi
                    </p>
                    <p className="mt-1 text-lg font-bold text-blue-600">
                      {selectedDay.orderCount} pesanan
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="mb-2 text-sm font-semibold">
                    Rincian Metode Pembayaran
                  </p>
                  <div className="space-y-1">
                    <BreakdownRow
                      label="Cash / Tunai"
                      amount={selectedDay.breakdown.cash}
                      icon={Wallet}
                    />
                    <BreakdownRow
                      label="Transfer Bank"
                      amount={selectedDay.breakdown.transfer}
                      icon={ArrowLeftRight}
                    />
                    <BreakdownRow
                      label="Midtrans (QRIS)"
                      amount={selectedDay.breakdown.midtrans}
                      icon={QrCode}
                    />
                    {selectedDay.breakdown.other > 0 && (
                      <BreakdownRow
                        label="Lainnya"
                        amount={selectedDay.breakdown.other}
                        icon={MoreHorizontal}
                      />
                    )}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(selectedDay.total)}
                  </span>
                </div>

                <Separator />

                <div>
                  <p className="mb-2 text-sm font-semibold">
                    Rincian Cashdrawer
                  </p>
                  <div className="space-y-1">
                    <ReconRow
                      label="Modal Awal (Cash Awal)"
                      value={formatCurrency(selectedDay.startingCash)}
                    />
                    <ReconRow
                      label="+ Pemasukan Tunai"
                      value={formatCurrency(selectedDay.breakdown.cash)}
                    />
                    <ReconRow
                      label="− Pengeluaran"
                      value={formatCurrency(selectedDay.expenses)}
                      accent="text-red-600"
                    />
                    <Separator className="my-1" />
                    <ReconRow
                      label="Modal Akhir (Ending Cash)"
                      value={formatCurrency(
                        selectedDay.startingCash +
                          selectedDay.breakdown.cash -
                          selectedDay.expenses
                      )}
                      bold
                      accent="text-teal-700"
                    />
                  </div>
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
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
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

function ReconRow({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string | null;
  bold?: boolean;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={`text-sm ${bold ? "font-bold" : ""}`}>{label}</span>
      {value === null ? (
        <Skeleton className="h-5 w-24" />
      ) : (
        <span
          className={`font-semibold ${bold ? "text-base" : "text-sm"} ${accent ?? ""}`}
        >
          {value}
        </span>
      )}
    </div>
  );
}
