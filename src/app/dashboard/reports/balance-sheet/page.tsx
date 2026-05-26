
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { collection, getDocs, query, where, Timestamp, getDoc, doc } from "firebase/firestore";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Download, Scale, Loader2, ArrowLeft } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { id as dateFnsLocaleId } from "date-fns/locale";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";


// Helper function
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

// Generate month options for the filter
const getMonthOptions = () => {
  const options = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    options.push({
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy", { locale: dateFnsLocaleId }),
    });
  }
  return options;
};

// Define fixed values
const INITIAL_OWNER_CAPITAL = 200000000;
const INITIAL_CASH = 50000000;
const INITIAL_BANK = 120000000;


export default function BalanceSheetPage() {
  const [loading, setLoading] = useState(true);
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const router = useRouter();
  
  const [reportData, setReportData] = useState({
    assets: {
      currentAssets: {
        cash: INITIAL_CASH,
        bank: INITIAL_BANK,
        receivables: 0,
        inventory: 0,
        total: 0,
      },
      fixedAssets: {
          total: 0, // Placeholder for now
      },
      total: 0,
    },
    liabilitiesAndEquity: {
      liabilities: {
          tradePayables: 0,
          total: 0,
      },
      equity: {
        initialCapital: INITIAL_OWNER_CAPITAL,
        retainedEarnings: 0,
        total: 0,
      },
      total: 0,
    },
  });

  const generateReport = useCallback(async (month: string) => {
    setLoading(true);
    try {
        const [year, monthIndex] = month.split('-').map(Number);
        const endDate = endOfMonth(new Date(year, monthIndex - 1));

        // --- CALCULATE ASSETS ---
        // 1. Receivables (Piutang)
        const receivablesQuery = query(
            collection(db, "orders"),
            where("paymentStatus", "==", "Unpaid"),
            where("status", "in", ["Shipped", "Delivered"]),
            where("date", "<=", Timestamp.fromDate(endDate))
        );
        const receivablesSnapshot = await getDocs(receivablesQuery);
        const totalReceivables = receivablesSnapshot.docs.reduce((sum, doc) => {
             const totalString = doc.data().total?.toString().replace(/[^0-9]/g, '') || '0';
             return sum + parseFloat(totalString);
        }, 0);
        
        // 2. Inventory Value (Nilai Persediaan)
        const productsSnapshot = await getDocs(collection(db, "products"));
        const totalInventoryValue = productsSnapshot.docs.reduce((sum, doc) => {
            const product = doc.data();
            const stock = product.stock || 0;
            const purchasePrice = product.purchasePrice || 0;
            return sum + (stock * purchasePrice);
        }, 0);

        // --- CALCULATE LIABILITIES & EQUITY ---
        // 3. Trade Payables (Utang Dagang)
        const payablesQuery = query(
            collection(db, "purchase_transactions"),
            where("paymentMethod", "==", "credit"),
            where("date", "<=", Timestamp.fromDate(endDate))
        );
        const payablesSnapshot = await getDocs(payablesQuery);
        const totalPayables = payablesSnapshot.docs.reduce((sum, doc) => sum + (doc.data().totalAmount || 0), 0);
        
        // 4. Retained Earnings (Laba Ditahan) - Kumulatif hingga akhir bulan terpilih
        const revenueQuery = query(
            collection(db, "orders"), 
            where("status", "in", ["Shipped", "Delivered"]),
            where("date", "<=", Timestamp.fromDate(endDate))
        );
        const expensesQuery = query(
            collection(db, "operational_expenses"), 
            where("date", "<=", Timestamp.fromDate(endDate))
        );
        
        const [revenueSnapshot, expensesSnapshot] = await Promise.all([
             getDocs(revenueQuery),
             getDocs(expensesQuery),
        ]);

        const totalRevenue = revenueSnapshot.docs.reduce((sum, doc) => {
             const totalString = doc.data().total?.toString().replace(/[^0-9]/g, '') || '0';
             return sum + parseFloat(totalString);
        }, 0);
        
        const totalExpenses = expensesSnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        
        // Calculate COGS based on sold products within the period
        let totalCogs = 0;
        const productPurchasePrices = new Map<string, number>();
        for (const orderDoc of revenueSnapshot.docs) {
            const orderData = orderDoc.data();
            for (const item of orderData.products) {
                let purchasePrice = productPurchasePrices.get(item.productId);
                if (purchasePrice === undefined) {
                    const productRef = doc(db, "products", item.productId);
                    const productSnap = await getDoc(productRef);
                    if (productSnap.exists()) {
                        purchasePrice = productSnap.data().purchasePrice || 0;
                        productPurchasePrices.set(item.productId, purchasePrice);
                    } else {
                        purchasePrice = 0; // Product might be deleted
                    }
                }
                totalCogs += purchasePrice * item.quantity;
            }
        }
        
        const retainedEarnings = totalRevenue - totalCogs - totalExpenses;
        
        // --- SUMMARIZE ---
        const totalCurrentAssets = INITIAL_CASH + INITIAL_BANK + totalReceivables + totalInventoryValue;
        const totalFixedAssets = 0; // Placeholder
        const totalAssets = totalCurrentAssets + totalFixedAssets;
        
        const totalLiabilities = totalPayables;
        const totalEquity = INITIAL_OWNER_CAPITAL + retainedEarnings;
        const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

        setReportData({
            assets: {
                currentAssets: { cash: INITIAL_CASH, bank: INITIAL_BANK, receivables: totalReceivables, inventory: totalInventoryValue, total: totalCurrentAssets },
                fixedAssets: { total: totalFixedAssets },
                total: totalAssets,
            },
            liabilitiesAndEquity: {
                liabilities: { tradePayables: totalPayables, total: totalLiabilities },
                equity: { initialCapital: INITIAL_OWNER_CAPITAL, retainedEarnings, total: totalEquity },
                total: totalLiabilitiesAndEquity,
            }
        });

    } catch (error) {
        console.error("Error generating balance sheet:", error);
    } finally {
        setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    generateReport(selectedMonth);
  }, [selectedMonth, generateReport]);

  const handleDownloadExcel = () => {
    const period = monthOptions.find(opt => opt.value === selectedMonth)?.label || selectedMonth;

    const data = [
        ["Laporan Neraca"],
        ["Periode", period],
        [],
        ["AKTIVA", "Jumlah", "", "PASIVA", "Jumlah"],
        ["Aset Lancar", "", "", "Kewajiban (Liabilitas)", ""],
        ["  Kas", reportData.assets.currentAssets.cash, "", "  Utang Dagang", reportData.liabilitiesAndEquity.liabilities.tradePayables],
        ["  Bank", reportData.assets.currentAssets.bank, "", "Total Kewajiban", reportData.liabilitiesAndEquity.liabilities.total],
        ["  Piutang Usaha", reportData.assets.currentAssets.receivables, "", "", ""],
        ["  Persediaan", reportData.assets.currentAssets.inventory, "", "Ekuitas (Modal)", ""],
        ["Total Aset Lancar", reportData.assets.currentAssets.total, "", "  Modal Awal", reportData.liabilitiesAndEquity.equity.initialCapital],
        ["", "", "", "  Laba Ditahan", reportData.liabilitiesAndEquity.equity.retainedEarnings],
        ["Aset Tetap", "", "", "Total Ekuitas", reportData.liabilitiesAndEquity.equity.total],
        ["Total Aset Tetap", reportData.assets.fixedAssets.total, "", "", ""],
        [],
        ["TOTAL AKTIVA", reportData.assets.total, "", "TOTAL PASIVA", reportData.liabilitiesAndEquity.total]
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Apply currency format to number columns
    worksheet["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 5 }, { wch: 25 }, { wch: 15 }];
    const currencyFormat = '"Rp"#,##0;\\-"Rp"#,##0';
    const numberCells = ["B6", "B7", "B8", "B9", "B10", "B13", "B15", "E6", "E7", "E10", "E11", "E12", "E15"];
    numberCells.forEach(cell => {
        if(worksheet[cell]) {
            worksheet[cell].t = 'n'; // Set cell type to number
            worksheet[cell].z = currencyFormat;
        }
    });

    // Styling headers
    ["A1", "A4", "D4", "B10", "B13", "B15", "E7", "E12", "E15"].forEach(cell => {
        if(worksheet[cell]) worksheet[cell].s = { font: { bold: true } };
    });
    
    worksheet["A1"].s.font.sz = 16;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Neraca");
    XLSX.writeFile(workbook, `Laporan_Neraca_${period.replace(" ", "_")}.xlsx`);
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/reports')}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Kembali ke Laporan</span>
            </Button>
            <div>
                <CardTitle>Laporan Neraca</CardTitle>
                <CardDescription>
                  Lihat posisi keuangan aset, kewajiban, dan ekuitas bisnis Anda pada akhir bulan tertentu.
                </CardDescription>
            </div>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Data</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Pilih Bulan" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleDownloadExcel} disabled={loading}>
            <Download className="mr-2 h-4 w-4" />
            Download Excel
          </Button>
        </CardContent>
      </Card>
      
      {loading ? (
        <div className="text-center p-8 text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Menyusun laporan neraca...</span>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Neraca Keuangan</CardTitle>
            <CardDescription>
              Posisi per akhir {monthOptions.find(opt => opt.value === selectedMonth)?.label}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                {/* Aktiva */}
                <div className="overflow-auto space-y-4">
                    <h3 className="text-lg font-semibold mb-2 text-center bg-muted p-2 rounded-md">AKTIVA</h3>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Aset Lancar</TableHead>
                                <TableHead className="text-right">Jumlah</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow><TableCell>Kas</TableCell><TableCell className="text-right">{formatCurrency(reportData.assets.currentAssets.cash)}</TableCell></TableRow>
                            <TableRow><TableCell>Bank</TableCell><TableCell className="text-right">{formatCurrency(reportData.assets.currentAssets.bank)}</TableCell></TableRow>
                             <TableRow><TableCell>Piutang Usaha</TableCell><TableCell className="text-right">{formatCurrency(reportData.assets.currentAssets.receivables)}</TableCell></TableRow>
                             <TableRow><TableCell>Persediaan</TableCell><TableCell className="text-right">{formatCurrency(reportData.assets.currentAssets.inventory)}</TableCell></TableRow>
                            <TableRow className="font-bold bg-muted/50"><TableCell>Total Aset Lancar</TableCell><TableCell className="text-right">{formatCurrency(reportData.assets.currentAssets.total)}</TableCell></TableRow>
                        </TableBody>
                    </Table>
                     <Table>
                        <TableHeader><TableRow><TableHead>Aset Tetap</TableHead><TableHead></TableHead></TableRow></TableHeader>
                        <TableBody>
                           <TableRow className="font-bold bg-muted/50"><TableCell>Total Aset Tetap</TableCell><TableCell className="text-right">{formatCurrency(reportData.assets.fixedAssets.total)}</TableCell></TableRow>
                        </TableBody>
                     </Table>
                </div>
                {/* Pasiva */}
                <div className="overflow-auto space-y-4">
                    <h3 className="text-lg font-semibold mb-2 text-center bg-muted p-2 rounded-md">PASIVA</h3>
                     <Table>
                        <TableHeader><TableRow><TableHead>Kewajiban (Liabilitas)</TableHead><TableHead></TableHead></TableRow></TableHeader>
                        <TableBody>
                             <TableRow><TableCell>Utang Dagang</TableCell><TableCell className="text-right">{formatCurrency(reportData.liabilitiesAndEquity.liabilities.tradePayables)}</TableCell></TableRow>
                            <TableRow className="font-bold bg-muted/50"><TableCell>Total Kewajiban</TableCell><TableCell className="text-right">{formatCurrency(reportData.liabilitiesAndEquity.liabilities.total)}</TableCell></TableRow>
                        </TableBody>
                    </Table>
                    <Table>
                        <TableHeader><TableRow><TableHead>Ekuitas (Modal)</TableHead><TableHead></TableHead></TableRow></TableHeader>
                        <TableBody>
                            <TableRow><TableCell>Modal Awal</TableCell><TableCell className="text-right">{formatCurrency(reportData.liabilitiesAndEquity.equity.initialCapital)}</TableCell></TableRow>
                            <TableRow><TableCell>Laba Ditahan</TableCell><TableCell className="text-right">{formatCurrency(reportData.liabilitiesAndEquity.equity.retainedEarnings)}</TableCell></TableRow>
                            <TableRow className="font-bold bg-muted/50"><TableCell>Total Ekuitas</TableCell><TableCell className="text-right">{formatCurrency(reportData.liabilitiesAndEquity.equity.total)}</TableCell></TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>
          </CardContent>
          <CardFooter className="bg-primary/10 p-6 mt-4 grid md:grid-cols-2 gap-8">
            <div className="flex justify-between items-center w-full text-lg font-bold text-primary">
                <div className="flex items-center gap-3"><Scale className="h-6 w-6"/><span>TOTAL AKTIVA</span></div>
                <span>{formatCurrency(reportData.assets.total)}</span>
            </div>
            <div className="flex justify-between items-center w-full text-lg font-bold text-primary">
                <div className="flex items-center gap-3"><Scale className="h-6 w-6"/><span>TOTAL PASIVA</span></div>
                <span>{formatCurrency(reportData.liabilitiesAndEquity.total)}</span>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
