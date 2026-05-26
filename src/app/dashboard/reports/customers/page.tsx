
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Users, FileText, ShoppingCart, DollarSign, ArrowLeft, Loader2, Printer } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { id as dateFnsLocaleId } from "date-fns/locale";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import jsPDF from "jspdf";
import "jspdf-autotable";


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
  image: string;
}
interface FullOrder {
  id: string;
  customer: string;
  customerDetails?: { name: string; address: string; whatsapp: string };
  status: 'Delivered' | 'delivered' | 'Shipped' | 'shipped' | 'Processing' | 'processing' | 'Pending' | 'pending' | 'cancelled' | 'Cancelled';
  paymentStatus: 'Paid' | 'paid' | 'unpaid' |'Unpaid';
  total: number;
  subtotal: number;
  shippingFee: number;
  date: any; // Firestore Timestamp
  products: OrderProduct[];
}

interface Order {
  id: string;
  customer: string;
  customerId: string;
  status: 'Delivered' | 'delivered' | 'Shipped' | 'shipped' | 'Processing' | 'processing' | 'Pending' | 'pending' | 'cancelled' | 'Cancelled';
  paymentStatus: 'Paid' | 'paid' | 'unpaid' |'Unpaid';
  total: number;
  date: string;
}

interface CustomerReport {
  id: string;
  name: string;
  transactionCount: number;
  totalSpent: number;
  receivables: number;
  orders: Order[];
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
        pdfDoc.text(`Status Pesanan: ${order.status}`, 14, 42);
        pdfDoc.text(`Status Pembayaran: ${order.paymentStatus}`, 14, 47);
    
        const customerInfo = order.customerDetails;
        pdfDoc.text("Informasi Pelanggan:", 14, 57);
        pdfDoc.text(`Nama: ${customerInfo?.name || order.customer}`, 14, 62);
        const addressLines = pdfDoc.splitTextToSize(`Alamat: ${customerInfo?.address || 'N/A'}`, 180);
        pdfDoc.text(addressLines, 14, 67);
        let currentY = 67 + (addressLines.length * 5);
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
          {orderId.substring(0,7)}...
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Faktur #{order?.id}</DialogTitle>
          {order && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
                <div>Status Pesanan: <Badge variant="outline" className={
                    order.status === 'Delivered' ? 'text-green-600 border-green-600' :
                    order.status === 'Shipped' ? 'text-blue-600 border-blue-600' :
                    order.status === 'Processing' ? 'text-yellow-600 border-yellow-600' : 
                    order.status === 'Cancelled' ? 'text-red-600 border-red-600' : 'text-gray-600 border-gray-600'
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
                          <Image src={p.image || 'https://placehold.co/40x40.png'} alt={p.name} width={40} height={40} className="rounded" />
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


export default function CustomersReportPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [customerReports, setCustomerReports] = useState<CustomerReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const router = useRouter();

  const processOrdersToReports = useCallback((orders: Order[]) => {
    const reportMap = new Map<string, CustomerReport>();

    orders.forEach(order => {
        const customerId = order.customerId || order.customer; // Fallback to name if ID is missing
        if (!reportMap.has(customerId)) {
            reportMap.set(customerId, {
                id: customerId,
                name: order.customer,
                transactionCount: 0,
                totalSpent: 0,
                receivables: 0,
                orders: []
            });
        }

        const report = reportMap.get(customerId)!;
        report.transactionCount += 1;
        report.totalSpent += order.total;
        if (order.paymentStatus === 'Unpaid' && (order.status === 'Shipped' || order.status === 'Delivered')) {
            report.receivables += order.total;
        }
        report.orders.push(order);
        report.orders.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return Array.from(reportMap.values()).sort((a,b) => b.totalSpent - a.totalSpent);
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "orders"));
        const ordersData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const total = typeof data.total === 'string' 
                ? parseFloat(data.total.replace(/[^0-9]/g, '')) 
                : typeof data.total === 'number' ? data.total : 0;
            return { 
                id: doc.id, 
                ...data,
                total,
                date: data.date.toDate ? data.date.toDate().toISOString() : new Date(data.date).toISOString(),
            } as Order;
        });
        setAllOrders(ordersData);
        setCustomerReports(processOrdersToReports(ordersData));
      } catch (error) {
        console.error("Error fetching orders for customer report: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [processOrdersToReports]);

  const handleFilter = () => {
    const { from, to } = dateRange;
    let filtered = allOrders;
    if (from || to) {
        filtered = allOrders.filter(order => {
            const orderDate = new Date(order.date);
            if (from && orderDate < startOfDay(from)) return false;
            if (to && orderDate > endOfDay(to)) return false;
            return true;
        });
    }
    setCustomerReports(processOrdersToReports(filtered));
  };
  
  const handleReset = () => {
      setDateRange({});
      setCustomerReports(processOrdersToReports(allOrders));
  }
  
  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/reports')}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Kembali ke Laporan</span>
            </Button>
            <div>
                <CardTitle>Laporan Pelanggan</CardTitle>
                <CardDescription>
                Analisis data dan perilaku pelanggan. Filter berdasarkan rentang tanggal transaksi.
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
            <CardHeader>
                <CardTitle>Ringkasan Pelanggan</CardTitle>
                 <CardDescription>
                    Daftar pelanggan berdasarkan total belanja dalam periode yang dipilih.
                 </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama Pelanggan</TableHead>
                                <TableHead className="text-center">Jumlah Transaksi</TableHead>
                                <TableHead className="text-right">Total Belanja</TableHead>
                                <TableHead className="text-right">Total Piutang</TableHead>
                                <TableHead className="text-center w-[100px]">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">Memuat data pelanggan...</TableCell>
                                </TableRow>
                            ) : customerReports.length > 0 ? (
                                customerReports.map((customer) => (
                                <TableRow key={customer.id}>
                                    <TableCell className="font-medium">{customer.name}</TableCell>
                                    <TableCell className="text-center">{customer.transactionCount}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(customer.totalSpent)}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={customer.receivables > 0 ? "destructive" : "outline"}>
                                            {formatCurrency(customer.receivables)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                    <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <FileText className="h-4 w-4" />
                                                    <span className="sr-only">Lihat Riwayat</span>
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                                                <DialogHeader>
                                                    <DialogTitle>Riwayat Transaksi: {customer.name}</DialogTitle>
                                                    <DialogDescription>
                                                        Semua transaksi yang dilakukan oleh pelanggan ini dalam periode yang dipilih.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="flex-1 overflow-y-auto p-1">
                                                    <div className="overflow-auto">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>Order ID</TableHead>
                                                                    <TableHead>Tanggal</TableHead>
                                                                    <TableHead>Status</TableHead>
                                                                    <TableHead>Pembayaran</TableHead>
                                                                    <TableHead className="text-right">Total</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {customer.orders.map(order => (
                                                                    <TableRow key={order.id}>
                                                                        <TableCell>
                                                                           <OrderDetailDialog orderId={order.id}/>
                                                                        </TableCell>
                                                                        <TableCell>{format(new Date(order.date), "dd MMM yyyy")}</TableCell>
                                                                        <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                                                                        <TableCell><Badge variant={order.paymentStatus === 'Paid' ? 'default' : 'destructive'}>{order.paymentStatus === 'Paid' ? 'Lunas' : 'Belum Lunas'}</Badge></TableCell>
                                                                        <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
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
                                        Tidak ada data pelanggan untuk periode ini.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                 </div>
            </CardContent>
        </Card>
    </div>
  )
}

    