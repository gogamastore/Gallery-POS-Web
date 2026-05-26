
"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, DollarSign, ArrowLeft, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { id as dateFnsLocaleId } from "date-fns/locale";
import { useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";


const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function NetIncomeReportPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  
  const [reportData, setReportData] = useState({
    totalRevenue: 0,
    totalCogs: 0,
    totalExpenses: 0,
    netIncome: 0,
  });

  const fetchDataForReport = useCallback(async (from: Date, to: Date) => {
    setLoading(true);
    try {
        // 1. Fetch Sales (Revenue)
        const ordersQuery = query(
            collection(db, "orders"),
            where("status", "in", ['Processing', 'processing', 'Delivered', 'delivered', 'Shipped', 'shipped']),
            where("date", ">=", from),
            where("date", "<=", to)
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        let totalRevenue = 0;
        const soldProductsMap = new Map<string, number>();

        ordersSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const total = typeof data.total === 'string' ? parseFloat(data.total.replace(/[^0-9]/g, '')) : data.total || 0;
            totalRevenue += total;
            data.products?.forEach((p: { productId: string; quantity: number; }) => {
                soldProductsMap.set(p.productId, (soldProductsMap.get(p.productId) || 0) + p.quantity);
            });
        });

        // 2. Fetch Purchase Prices for COGS
        let totalCogs = 0;
        const productPurchasePrices = new Map<string, number>();
        if (soldProductsMap.size > 0) {
            for (const [productId, quantity] of soldProductsMap.entries()) {
                let purchasePrice = productPurchasePrices.get(productId);
                if (purchasePrice === undefined) {
                    const productRef = doc(db, "products", productId);
                    const productSnap = await getDoc(productRef);
                    if (productSnap.exists()) {
                        purchasePrice = productSnap.data().purchasePrice || 0;
                        productPurchasePrices.set(productId, purchasePrice);
                    } else {
                        purchasePrice = 0; // Product might be deleted
                    }
                }
                totalCogs += (purchasePrice || 0) * quantity;
            }
        }
        
        // 3. Fetch Operational Expenses
        const expensesQuery = query(
            collection(db, "operational_expenses"),
            where("date", ">=", from),
            where("date", "<=", to)
        );
        const expensesSnapshot = await getDocs(expensesQuery);
        const totalExpenses = expensesSnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

        // 4. Calculate Net Income
        const netIncome = totalRevenue - totalCogs - totalExpenses;

        setReportData({ totalRevenue, totalCogs, totalExpenses, netIncome });

    } catch (error) {
        console.error("Error generating net income report:", error);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
        fetchDataForReport(startOfDay(dateRange.from), endOfDay(dateRange.to));
    }
  }, [dateRange, fetchDataForReport]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/reports')}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Kembali ke Laporan</span>
            </Button>
            <div>
                <CardTitle>Laporan Pendapatan Bersih</CardTitle>
                <CardDescription>
                    Lihat pendapatan bersih setelah dikurangi semua biaya dalam periode tertentu.
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
                    <Button id="date" variant={"outline"} className="w-[280px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : (<span>Pilih rentang tanggal</span>)}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                </PopoverContent>
            </Popover>
        </CardContent>
      </Card>
      
      {loading ? (
        <div className="text-center p-8 text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Menghitung laporan...</span>
        </div>
      ) : (
        <Card>
            <CardHeader>
                <CardTitle>Ringkasan Pendapatan Bersih</CardTitle>
                <CardDescription>
                    Periode: {dateRange?.from ? format(dateRange.from, "d MMMM yyyy", { locale: dateFnsLocaleId }) : ''} - {dateRange?.to ? format(dateRange.to, "d MMMM yyyy", { locale: dateFnsLocaleId }) : ''}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        <TableRow className="text-base">
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="h-5 w-5 text-green-500"/>
                                    <span className="font-medium">Total Pendapatan (Revenue)</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(reportData.totalRevenue)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={2} className="pt-4 pb-0"><CardDescription>Dikurangi:</CardDescription></TableCell>
                        </TableRow>
                        <TableRow className="text-base border-b-0">
                            <TableCell className="pl-10">
                                <div className="flex items-center gap-3">
                                    <TrendingDown className="h-5 w-5 text-red-500"/>
                                    <span>Harga Pokok Penjualan (HPP)</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">{`(${formatCurrency(reportData.totalCogs)})`}</TableCell>
                        </TableRow>
                         <TableRow className="text-base">
                            <TableCell className="pl-10">
                               <div className="flex items-center gap-3">
                                    <TrendingDown className="h-5 w-5 text-yellow-500"/>
                                    <span>Beban Operasional</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">{`(${formatCurrency(reportData.totalExpenses)})`}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter className="bg-muted/50 p-6 mt-4">
                 <div className={`flex justify-between items-center w-full text-xl font-bold ${reportData.netIncome >= 0 ? 'text-primary' : 'text-destructive'}`}>
                     <div className="flex items-center gap-3">
                        <DollarSign className="h-6 w-6"/>
                        <span>Pendapatan Bersih</span>
                    </div>
                    <span>{formatCurrency(reportData.netIncome)}</span>
                </div>
            </CardFooter>
        </Card>
      )}
    </div>
  )
}
