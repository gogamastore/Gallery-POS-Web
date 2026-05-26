
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { DollarSign, Landmark, Calendar as CalendarIcon, FileText, ArrowLeft } from "lucide-react";
import { format, isValid, startOfDay, endOfDay } from "date-fns";
import { id as dateFnsLocaleId } from "date-fns/locale";
import { useRouter } from "next/navigation";


interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string; // ISO 8601 string
}

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

// Helper to process data for the chart
const processExpenseDataForChart = (expenses: ExpenseItem[]) => {
    const expensesByDate: { [key: string]: number } = {};
    expenses.forEach(expense => {
        const date = new Date(expense.date);
        if (isValid(date)) {
            const formattedDate = format(date, 'd MMM', { locale: dateFnsLocaleId });
            if (expensesByDate[formattedDate]) {
                expensesByDate[formattedDate] += expense.amount;
            } else {
                expensesByDate[formattedDate] = expense.amount;
            }
        }
    });

    return Object.keys(expensesByDate).map(date => ({
        name: date,
        total: expensesByDate[date]
    })).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
};

export default function OperationalExpensesReportPage() {
  const [allExpenses, setAllExpenses] = useState<ExpenseItem[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  
  const filterExpensesByDate = useCallback((expenses: ExpenseItem[], from?: Date, to?: Date) => {
    if (!from && !to) {
        return expenses;
    }
    return expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        if (from && expenseDate < startOfDay(from)) return false;
        if (to && expenseDate > endOfDay(to)) return false;
        return true;
    });
  }, []);

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "operational_expenses"));
        const expensesData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                date: data.date.toDate ? data.date.toDate().toISOString() : new Date(data.date).toISOString(),
            } as ExpenseItem;
        });
        setAllExpenses(expensesData);
        const todayExpenses = filterExpensesByDate(expensesData, startOfDay(new Date()), endOfDay(new Date()));
        setFilteredExpenses(todayExpenses);
      } catch (error) {
        console.error("Error fetching operational expenses: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [filterExpensesByDate]);
  
  const handleFilter = () => {
    const { from, to } = dateRange;
    const filtered = filterExpensesByDate(allExpenses, from, to);
    setFilteredExpenses(filtered);
  };

  const handleReset = () => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    setDateRange({ from: todayStart, to: todayEnd });
    const todayTransactions = filterExpensesByDate(allExpenses, todayStart, todayEnd);
    setFilteredExpenses(todayTransactions);
  };

  const { totalExpenseAmount, totalTransactions, chartData } = useMemo(() => {
    const amount = filteredExpenses.reduce((acc, trans) => acc + trans.amount, 0);
    const transCount = filteredExpenses.length;
    const chartDataProcessed = processExpenseDataForChart(filteredExpenses);
    return {
        totalExpenseAmount: amount,
        totalTransactions: transCount,
        chartData: chartDataProcessed,
    };
  }, [filteredExpenses]);

  if (loading) {
    return (
        <div className="text-center p-8">
            <p>Memuat data laporan beban operasional...</p>
        </div>
    )
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/reports')}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Kembali ke Laporan</span>
            </Button>
            <div>
                <CardTitle>Laporan Beban Operasional</CardTitle>
                <CardDescription>
                    Lacak semua pengeluaran operasional bisnis Anda. Filter berdasarkan rentang tanggal.
                </CardDescription>
            </div>
        </div>
      <Card>
        <CardHeader>
            <CardTitle>Filter Data</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className="w-[280px] justify-start text-left font-normal"
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                        dateRange.to ? (
                            <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(dateRange.from, "LLL dd, y")
                        )
                        ) : (
                        <span>Pilih rentang tanggal</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
            <Button onClick={handleFilter}>Filter</Button>
            <Button variant="outline" onClick={handleReset}>Reset</Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenseAmount)}</div>
            <p className="text-xs text-muted-foreground">Dari transaksi yang difilter</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jumlah Transaksi</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
             <p className="text-xs text-muted-foreground">Dalam rentang tanggal terpilih</p>
          </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Tren Beban Operasional</CardTitle>
           <CardDescription>Visualisasi pengeluaran operasional harian dalam rentang tanggal terpilih.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value as number)} />
                    <Tooltip
                        contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "var(--radius)",
                        }}
                         formatter={(value) => formatCurrency(value as number)}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rincian Beban Operasional</CardTitle>
          <CardDescription>
            Daftar lengkap transaksi beban operasional dalam rentang tanggal terpilih.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredExpenses.length > 0 ? (
                    filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                        <TableCell>{format(new Date(expense.date), 'dd MMM yyyy', { locale: dateFnsLocaleId })}</TableCell>
                        <TableCell className="font-medium">{expense.category}</TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell className="text-right">
                        {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell className="text-center">
                        <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <FileText className="h-4 w-4" />
                                        <span className="sr-only">Lihat Detail Biaya</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle>Detail Biaya Operasional</DialogTitle>
                                        <DialogDescription>
                                            Transaksi ID: {expense.id}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4 text-sm">
                                    <div className="flex justify-between">
                                            <span className="text-muted-foreground">Tanggal</span>
                                            <span>{format(new Date(expense.date), 'dd MMMM yyyy', { locale: dateFnsLocaleId })}</span>
                                    </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Kategori Biaya</span>
                                            <span className="font-medium">{expense.category}</span>
                                    </div>
                                        <div className="flex flex-col space-y-2">
                                            <span className="text-muted-foreground">Keterangan</span>
                                            <p className="p-3 bg-muted rounded-md">{expense.description || 'Tidak ada keterangan.'}</p>
                                    </div>
                                        <div className="flex justify-between items-center border-t pt-4 mt-2">
                                            <span className="text-muted-foreground font-bold">Total Biaya</span>
                                            <span className="font-bold text-lg">{formatCurrency(expense.amount)}</span>
                                    </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        Tidak ada data beban operasional untuk rentang tanggal ini.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
