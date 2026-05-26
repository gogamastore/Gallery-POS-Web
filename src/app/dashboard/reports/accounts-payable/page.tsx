
"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from "firebase/firestore";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DollarSign, Calendar as CalendarIcon, Loader2, Receipt, ArrowLeft, Banknote, Package, Printer, CreditCard } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { id as dateFnsLocaleId } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  purchasePrice: number;
}
interface FullPurchaseTransaction {
  id: string;
  date: any;
  totalAmount: number;
  items: PurchaseItem[];
  supplierName?: string;
  paymentMethod?: 'cash' | 'bank_transfer' | 'credit';
  paymentStatus?: 'paid' | 'unpaid';
}

interface PurchaseTransaction {
  id: string;
  date: string; // ISO 8601 string
  totalAmount: number;
  supplierName?: string;
  paymentMethod?: 'cash' | 'bank_transfer' | 'credit';
  paymentStatus?: 'paid' | 'unpaid';
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

function PaymentDialog({ transaction, onPaymentSuccess }: { transaction: FullPurchaseTransaction, onPaymentSuccess: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash');
    const [description, setDescription] = useState('');
    const { toast } = useToast();

    const handleProcessPayment = async () => {
        setIsSubmitting(true);
        try {
            const purchaseRef = doc(db, "purchase_transactions", transaction.id);
            await updateDoc(purchaseRef, {
                paymentMethod: paymentMethod,
                paymentStatus: 'paid',
                paymentNotes: description,
                paidAt: new Date()
            });

            toast({ title: "Pembayaran Berhasil", description: "Status transaksi telah diperbarui menjadi lunas." });
            onPaymentSuccess();
            setIsOpen(false);
        } catch (error) {
            console.error("Error processing payment:", error);
            toast({ variant: 'destructive', title: "Gagal memproses pembayaran." });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="default"><CreditCard className="mr-2 h-4 w-4"/>Pembayaran</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Pembayaran Utang Pembelian</DialogTitle>
                    <DialogDescription>ID Transaksi: {transaction.id}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="text-center border p-4 rounded-md">
                        <p className="text-sm text-muted-foreground">Total Tagihan</p>
                        <p className="text-3xl font-bold">{formatCurrency(transaction.totalAmount)}</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Metode Pembayaran</Label>
                        <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'cash' | 'bank_transfer')}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="cash" id="cash"/>
                                <Label htmlFor="cash">Cash</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="bank_transfer" id="bank_transfer"/>
                                <Label htmlFor="bank_transfer">Transfer Bank</Label>
                            </div>
                        </RadioGroup>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="description">Keterangan (Opsional)</Label>
                        <Textarea id="description" placeholder="Catatan untuk pembayaran ini..." value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                    <Button onClick={handleProcessPayment} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Proses Pembayaran
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


function PurchaseInvoiceDialog({ transactionId, onUpdate }: { transactionId: string, onUpdate: () => void }) {
    const [transaction, setTransaction] = useState<FullPurchaseTransaction | null>(null);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const fetchTransaction = useCallback(async () => {
        if (!isOpen) return;
        setLoading(true);
        try {
            const docRef = doc(db, "purchase_transactions", transactionId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setTransaction({ id: docSnap.id, ...docSnap.data() } as FullPurchaseTransaction);
            }
        } catch (error) {
            console.error("Failed to fetch purchase transaction", error);
        } finally {
            setLoading(false);
        }
    }, [transactionId, isOpen]);
    
    useEffect(() => {
        fetchTransaction();
    }, [fetchTransaction]);

    const handlePaymentSuccess = () => {
        setIsOpen(false);
        onUpdate();
    };

    const generatePdf = () => {
        if (!transaction) return;
        const pdfDoc = new jsPDF();
        pdfDoc.setFontSize(20);
        pdfDoc.text("Faktur Pembelian", 14, 22);
        pdfDoc.setFontSize(10);
        pdfDoc.text(`ID Transaksi: ${transaction.id}`, 14, 32);
        pdfDoc.text(`Tanggal: ${format(transaction.date.toDate(), 'dd MMM yyyy', { locale: dateFnsLocaleId })}`, 14, 37);
        pdfDoc.text(`Supplier: ${transaction.supplierName || 'N/A'}`, 14, 42);

        const tableY = 52;
        const tableColumn = ["Nama Produk", "Jumlah", "Harga Beli", "Subtotal"];
        const tableRows = transaction.items?.map(item => [
            item.productName,
            item.quantity,
            formatCurrency(item.purchasePrice),
            formatCurrency(item.purchasePrice * item.quantity)
        ]) || [];

        pdfDoc.autoTable({ head: [tableColumn], body: tableRows, startY: tableY });
        const finalY = (pdfDoc as any).lastAutoTable.finalY + 10;
        
        pdfDoc.setFontSize(12);
        pdfDoc.setFont('helvetica', 'bold');
        pdfDoc.text("Total Pembelian:", 14, finalY);
        pdfDoc.text(formatCurrency(transaction.totalAmount), 14 + 45, finalY);

        pdfDoc.output("dataurlnewwindow");
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="link" className="p-0 h-auto font-medium">
                    {transactionId}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Faktur Pembelian #{transaction?.id}</DialogTitle>
                    {transaction && (
                        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
                            <span>Tanggal: {format(transaction.date.toDate(), 'dd MMMM yyyy', { locale: dateFnsLocaleId })}</span>
                            <Separator orientation="vertical" className="h-4"/>
                            <span>Supplier: {transaction.supplierName || 'N/A'}</span>
                        </div>
                    )}
                </DialogHeader>
                 {loading ? <div className="text-center p-8"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div> : transaction ? (
                     <div className="grid gap-4 py-4 flex-1 overflow-y-auto">
                        <Card>
                            <CardHeader>
                                <CardTitle>Rincian Produk Dibeli</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Produk</TableHead>
                                                <TableHead>Jumlah</TableHead>
                                                <TableHead className="text-right">Harga Beli Satuan</TableHead>
                                                <TableHead className="text-right">Subtotal</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {transaction.items?.map(item => (
                                                <TableRow key={item.productId}>
                                                    <TableCell>{item.productName}</TableCell>
                                                    <TableCell>{item.quantity}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(item.purchasePrice)}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(item.quantity * item.purchasePrice)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                        <Separator/>
                        <div className="flex justify-between items-center text-sm px-2">
                            <div className="text-muted-foreground">
                                Metode Pembayaran: <Badge variant="destructive" className="capitalize">{transaction.paymentMethod?.replace('_', ' ')}</Badge>
                            </div>
                            <div className="text-right font-bold text-lg">
                                Total Pembelian: {formatCurrency(transaction.totalAmount)}
                            </div>
                        </div>
                    </div>
                ) : <p>Transaksi tidak ditemukan.</p>}
                 <DialogFooter className="justify-start gap-2">
                    <Button onClick={generatePdf} variant="outline" disabled={!transaction}>
                        <Printer className="mr-2 h-4 w-4"/> Download Faktur
                    </Button>
                    {transaction && transaction.paymentMethod === 'credit' && transaction.paymentStatus !== 'paid' && (
                        <PaymentDialog transaction={transaction} onPaymentSuccess={handlePaymentSuccess} />
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function AccountsPayablePage() {
  const [allPayables, setAllPayables] = useState<PurchaseTransaction[]>([]);
  const [filteredPayables, setFilteredPayables] = useState<PurchaseTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const router = useRouter();

  const fetchPayables = useCallback(async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "purchase_transactions"), where("paymentMethod", "==", "credit"));
        const querySnapshot = await getDocs(q);
        const payablesData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                date: data.date.toDate ? data.date.toDate().toISOString() : new Date(data.date).toISOString(),
            } as PurchaseTransaction
        }).filter(p => p.paymentStatus !== 'paid'); // Filter locally for flexibility
        setAllPayables(payablesData);
        const filtered = filterPayablesByDate(payablesData, dateRange.from, dateRange.to);
        setFilteredPayables(filtered);
      } catch (error) {
        console.error("Error fetching accounts payable: ", error);
      } finally {
        setLoading(false);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

  const filterPayablesByDate = useCallback((payables: PurchaseTransaction[], from?: Date, to?: Date) => {
    if (!from && !to) {
      return payables;
    }
    return payables.filter(payable => {
      const transactionDate = new Date(payable.date);
      if (from && transactionDate < startOfDay(from)) return false;
      if (to && transactionDate > endOfDay(to)) return false;
      return true;
    });
  }, []);

  useEffect(() => {
    fetchPayables();
  }, [fetchPayables]);

  const handleFilter = () => {
    const filtered = filterPayablesByDate(allPayables, dateRange.from, dateRange.to);
    setFilteredPayables(filtered);
  };

  const handleReset = () => {
    setDateRange({});
    setFilteredPayables(allPayables);
  };

  const totalPayableAmount = filteredPayables.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/reports')}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Kembali ke Laporan</span>
            </Button>
            <div>
                <CardTitle>Laporan Utang Dagang</CardTitle>
                <CardDescription>
                    Lacak semua transaksi pembelian dengan metode pembayaran kredit yang belum lunas.
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
          <Button onClick={handleFilter}>Filter</Button>
          <Button variant="outline" onClick={handleReset}>Reset ke Semua</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Utang Dagang</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPayableAmount)}</div>
            <p className="text-xs text-muted-foreground">Dari transaksi yang difilter.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rincian Utang Dagang</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Transaksi</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Jumlah Utang</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredPayables.length > 0 ? (
                  filteredPayables.map((payable) => (
                    <TableRow key={payable.id}>
                      <TableCell>
                        <PurchaseInvoiceDialog transactionId={payable.id} onUpdate={fetchPayables} />
                      </TableCell>
                      <TableCell>{format(new Date(payable.date), 'dd MMM yyyy', { locale: dateFnsLocaleId })}</TableCell>
                      <TableCell>{payable.supplierName || 'N/A'}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(payable.totalAmount)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                      <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      Tidak ada data utang dagang pada periode ini.
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
