
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
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
import { Badge } from "@/components/ui/badge";
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
  DialogFooter
} from "@/components/ui/dialog";
import { DollarSign, FileWarning, Calendar as CalendarIcon, Package, ArrowLeft, Loader2, Printer, Download } from "lucide-react";
import { format, isValid, startOfDay, endOfDay } from "date-fns";
import { id as dateFnsLocaleId } from "date-fns/locale";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import jsPDF from "jspdf";
import "jspdf-autotable";
import type { DateRange } from "react-day-picker";

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface OrderProduct {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  imageUrl?: string;
}
interface FullOrder {
  id: string;
  customer: string;
  customerDetails?: { name: string; address: string; whatsapp: string };
  status: 'Delivered' | 'Shipped' | 'Processing' | 'Pending' | 'Cancelled';
  paymentStatus: 'Paid' | 'Unpaid';
  total: number;
  subtotal: number;
  shippingFee: number;
  date: any; // Firestore Timestamp
  products: OrderProduct[];
}

interface Order {
  id: string;
  customer: string;
  status: 'Delivered' | 'Shipped' | 'Processing' | 'Pending' | 'Cancelled';
  paymentStatus: 'Paid' | 'Unpaid';
  total: number;
  date: string; // ISO 8601 string
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};


function OrderDetailDialog({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<FullOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
        const orderDoc = await getDoc(doc(db, "orders", orderId));
        if (orderDoc.exists()) {
            const data = orderDoc.data();
            const total = typeof data.total === 'string' ? parseFloat(data.total.replace(/[^0-9]/g, '')) : data.total || 0;
            setOrder({ 
                id: orderDoc.id,
                ...data,
                total,
                subtotal: data.subtotal || 0,
                shippingFee: data.shippingFee || 0,
                products: data.products || [],
             } as FullOrder);
        }
    } catch (error) {
        console.error("Failed to fetch order", error);
    } finally {
        setLoading(false);
    }
  }, [orderId, isOpen]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);
  
  const generatePdf = () => {
        if (!order) return;
        const pdfDoc = new jsPDF();
        pdfDoc.setFontSize(20);
        pdfDoc.text("Faktur Pesanan", 14, 22);
        pdfDoc.setFontSize(10);
        pdfDoc.text(`ID Pesanan: ${order.id}`, 14, 32);
        pdfDoc.text(`Tanggal: ${format(order.date.toDate(), 'dd MMM yyyy, HH:mm', { locale: dateFnsLocaleId })}`, 14, 37);
    
        const customerInfo = order.customerDetails;
        pdfDoc.text("Informasi Pelanggan:", 14, 47);
        pdfDoc.text(`Nama: ${customerInfo?.name || order.customer}`, 14, 52);
        const addressLines = pdfDoc.splitTextToSize(`Alamat: ${customerInfo?.address || 'N/A'}`, 180);
        pdfDoc.text(addressLines, 14, 57);
        let currentY = 57 + (addressLines.length * 5);
        pdfDoc.text(`WhatsApp: ${customerInfo?.whatsapp || 'N/A'}`, 14, currentY + 5);
    
        const tableY = currentY + 15;
        const tableColumn = ["Nama Produk", "Jumlah", "Harga Satuan", "Subtotal"];
        const tableRows = order.products?.map(prod => [
            prod.name,
            prod.quantity,
            formatCurrency(prod.price),
            formatCurrency(prod.price * prod.quantity)
        ]) || [];
    
        pdfDoc.autoTable({ head: [tableColumn], body: tableRows, startY: tableY });
        const finalY = (pdfDoc as any).lastAutoTable.finalY + 10;
    
        pdfDoc.setFontSize(10);
        pdfDoc.text("Subtotal Produk:", 14, finalY);
        pdfDoc.text(formatCurrency(order.subtotal || 0), 14 + 40, finalY);
        pdfDoc.text("Biaya Pengiriman:", 14, finalY + 5);
        pdfDoc.text(formatCurrency(order.shippingFee || 0), 14 + 40, finalY + 5);
        
        pdfDoc.setFontSize(12);
        pdfDoc.setFont('helvetica', 'bold');
        pdfDoc.text("Total:", 14, finalY + 12);
        pdfDoc.text(formatCurrency(order.total), 14 + 40, finalY + 12);
        pdfDoc.output("dataurlnewwindow");
    };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="link" className="p-0 h-auto font-medium">
          {orderId}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Faktur #{order?.id}</DialogTitle>
          {order && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
                <div>Status Pesanan: <Badge variant="outline" className={
                    order.status.toLowerCase() === 'delivered' ? 'text-green-600 border-green-600' :
                    order.status.toLowerCase() === 'shipped' ? 'text-blue-600 border-blue-600' :
                    order.status.toLowerCase() === 'processing' ? 'text-yellow-600 border-yellow-600' : 
                    order.status.toLowerCase() === 'cancelled' ? 'text-red-600 border-red-600' : 'text-gray-600 border-gray-600'
                }>{order.status}</Badge></div>
                <Separator orientation="vertical" className="h-4"/>
                <div>Status Pembayaran: <Badge variant={order.paymentStatus === 'Paid' ? 'default' : 'destructive'}>{order.paymentStatus}</Badge></div>
            </div>
          )}
        </DialogHeader>
        {loading ? <div className="text-center p-8"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div> : order ? (
          <div className="grid gap-4 py-4 flex-1 overflow-y-auto pr-4">
            <Card>
              <CardHeader>
                <CardTitle>Informasi Pelanggan</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><strong>Nama:</strong> {order.customerDetails?.name || order.customer}</p>
                <p><strong>Alamat:</strong> {order.customerDetails?.address || 'N/A'}</p>
                <p><strong>WhatsApp:</strong> {order.customerDetails?.whatsapp || 'N/A'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Rincian Produk</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produk</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead className="text-right">Harga Satuan</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.products?.map(p => (
                      <TableRow key={p.productId}>
                        <TableCell className="flex items-center gap-2">
                          <Image src={p.imageUrl || p.image || 'https://placehold.co/40x40.png'} alt={p.name} width={40} height={40} className="rounded" />
                          {p.name}
                        </TableCell>
                        <TableCell>{p.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.quantity * p.price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className="space-y-2 text-right text-sm">
              <p>Subtotal Produk: <span className="font-medium">{formatCurrency(order.subtotal)}</span></p>
              <p>Biaya Pengiriman: <span className="font-medium">{formatCurrency(order.shippingFee)}</span></p>
              <p className="font-bold text-base border-t pt-2 mt-2">Total: <span className="text-primary">{formatCurrency(order.total)}</span></p>
            </div>
             <DialogFooter className="pt-4">
                <Button onClick={generatePdf} variant="outline" disabled={!order}>
                    <Printer className="mr-2 h-4 w-4"/> Download Faktur
                </Button>
            </DialogFooter>
          </div>
        ) : <p>Order tidak ditemukan.</p>}
      </DialogContent>
    </Dialog>
  );
}


export default function ReceivablesReportPage() {
  const [allReceivables, setAllReceivables] = useState<Order[]>([]);
  const [filteredReceivables, setFilteredReceivables] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const router = useRouter();


  const filterReceivablesByDate = useCallback((receivables: Order[], from?: Date, to?: Date) => {
    if (!from && !to) {
        return receivables;
    }
    return receivables.filter(order => {
        const orderDate = new Date(order.date);
        if (from && orderDate < startOfDay(from)) return false;
        if (to && orderDate > endOfDay(to)) return false;
        return true;
    });
  }, []);

  useEffect(() => {
    const fetchReceivables = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "orders"), where("paymentStatus", "in", ["Unpaid", "unpaid"]));
        const querySnapshot = await getDocs(q);
        
        const receivableOrders = querySnapshot.docs
            .map(doc => {
                const data = doc.data();
                // Normalize total to be a number
                const total = typeof data.total === 'string' 
                    ? parseFloat(data.total.replace(/[^0-9]/g, '')) 
                    : typeof data.total === 'number' ? data.total : 0;
                
                return { 
                    id: doc.id, 
                    ...data,
                    status: data.status,
                    total,
                    date: data.date.toDate ? data.date.toDate().toISOString() : new Date(data.date).toISOString(),
                } as Order;
            })
            // Post-filter by status in the code to include all relevant, non-cancelled orders
            .filter(order => {
                const lowerCaseStatus = order.status.toLowerCase();
                return lowerCaseStatus === 'processing' || lowerCaseStatus === 'shipped' || lowerCaseStatus === 'delivered';
            });

        setAllReceivables(receivableOrders);
        setFilteredReceivables(receivableOrders); // Initially show all receivables
      } catch (error) {
        console.error("Error fetching receivables: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReceivables();
  }, []);

  const handleFilter = () => {
    const { from, to } = dateRange || {};
    const filtered = filterReceivablesByDate(allReceivables, from, to);
    setFilteredReceivables(filtered);
  };

  const handleReset = () => {
    setDateRange(undefined);
    setFilteredReceivables(allReceivables);
  };

  const { totalReceivableAmount, totalReceivableOrders } = useMemo(() => {
    const amount = filteredReceivables.reduce((acc, order) => acc + order.total, 0);
    const ordersCount = filteredReceivables.length;
    return {
        totalReceivableAmount: amount,
        totalReceivableOrders: ordersCount,
    };
  }, [filteredReceivables]);
  
  const generatePdfReport = () => {
    const doc = new jsPDF();
    const fromDate = dateRange?.from ? format(dateRange.from, "dd MMMM yyyy", { locale: dateFnsLocaleId }) : "awal";
    const toDate = dateRange?.to ? format(dateRange.to, "dd MMMM yyyy", { locale: dateFnsLocaleId }) : "sekarang";

    doc.setFontSize(18);
    doc.text("Laporan Piutang Usaha", 14, 22);
    doc.setFontSize(11);
    doc.text(`Periode: ${fromDate} - ${toDate}`, 14, 30);
    doc.text(`Total Piutang: ${formatCurrency(totalReceivableAmount)}`, 14, 36);


    const tableColumn = ["Order ID", "Pelanggan", "Tanggal Pesan", "Status", "Jumlah Piutang"];
    const tableRows = filteredReceivables.map(order => [
        order.id.substring(0,10) + '...',
        order.customer,
        format(new Date(order.date), 'dd MMM yyyy', { locale: dateFnsLocaleId }),
        order.status.charAt(0).toUpperCase() + order.status.slice(1),
        formatCurrency(order.total)
    ]);
    
    tableRows.push(["", "", "", "Total", formatCurrency(totalReceivableAmount)]);

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 42,
        foot: [[
            { content: 'Total', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
            { content: formatCurrency(totalReceivableAmount), styles: { halign: 'right', fontStyle: 'bold' } }
        ]],
        footStyles: { fillColor: [230, 230, 230] }
    });

    doc.save(`Laporan_Piutang_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  if (loading) {
    return (
        <div className="text-center p-8">
            <p>Memuat data laporan piutang...</p>
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
                <CardTitle>Laporan Piutang Usaha</CardTitle>
                <CardDescription>
                    Lacak semua pesanan yang telah dikirim namun belum lunas. Filter berdasarkan rentang tanggal pesanan.
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
            <Button variant="outline" onClick={handleReset}>Reset ke Semua</Button>
            <Button onClick={generatePdfReport} variant="secondary">
                <Download className="mr-2 h-4 w-4"/>
                Download Piutang
            </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Piutang</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalReceivableAmount)}</div>
            <p className="text-xs text-muted-foreground">Dari pesanan yang difilter</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jumlah Transaksi Piutang</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReceivableOrders}</div>
             <p className="text-xs text-muted-foreground">Dalam rentang tanggal terpilih</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Rincian Piutang</CardTitle>
          <CardDescription>
            Daftar lengkap transaksi piutang dalam rentang tanggal terpilih.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Tanggal Pesan</TableHead>
                    <TableHead>Status Pesanan</TableHead>
                    <TableHead className="text-right">Jumlah Piutang</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredReceivables.length > 0 ? (
                    filteredReceivables.map((order) => (
                    <TableRow key={order.id}>
                        <TableCell>
                           <OrderDetailDialog orderId={order.id} />
                        </TableCell>
                        <TableCell>{order.customer}</TableCell>
                        <TableCell>{format(new Date(order.date), 'dd MMM yyyy', { locale: dateFnsLocaleId })}</TableCell>
                        <TableCell>
                        <Badge
                            variant="outline"
                            className={
                                order.status.toLowerCase() === 'delivered' ? 'text-green-600 border-green-600' : 
                                order.status.toLowerCase() === 'shipped' ? 'text-blue-600 border-blue-600' :
                                order.status.toLowerCase() === 'processing' ? 'text-yellow-600 border-yellow-600' :
                                ''
                            }
                        >
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                        {formatCurrency(order.total)}
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        <FileWarning className="h-8 w-8 mx-auto text-muted-foreground mb-2"/>
                        Tidak ada data piutang untuk rentang tanggal ini.
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
