

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Package, FileText, Loader2, ArrowLeft, Printer, Search, Download } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { id as dateFnsLocaleId } from "date-fns/locale";
import Image from "next/image";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";

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
  total: number;
  subtotal: number;
  shippingFee: number;
  date: any; // Firestore Timestamp
  products: OrderProduct[];
}

interface ProductSalesReport {
    id: string;
    name: string;
    sku: string;
    image: string;
    totalSold: number;
    relatedOrders: { orderId: string, customer: string, date: any, quantity: number }[];
}

const formatCurrency = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(String(amount).replace(/[^0-9]/g, '')) : amount;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);
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
                 <Button variant="link" asChild className="p-0 h-auto">
                    <span className="cursor-pointer">...{orderId.slice(-6)}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                 <DialogHeader>
                    <DialogTitle>Faktur #{order?.id}</DialogTitle>
                    {order && (
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{format(order.date.toDate(), 'dd MMMM yyyy, HH:mm', { locale: dateFnsLocaleId })}</span>
                            <Badge variant="outline" className={
                                order.status === 'Delivered' ? 'text-green-600 border-green-600' :
                                order.status === 'Shipped' ? 'text-blue-600 border-blue-600' :
                                order.status === 'Processing' ? 'text-yellow-600 border-yellow-600' : 
                                order.status === 'Cancelled' ? 'text-red-600 border-red-600' : 'text-gray-600 border-gray-600'
                            }>{order.status}</Badge>
                        </div>
                    )}
                </DialogHeader>
                {loading ? <div className="text-center p-8"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div> : order ? (
                     <div className="grid gap-4 py-4 flex-1 overflow-y-auto">
                        <Card>
                            <CardHeader><CardTitle>Informasi Pelanggan</CardTitle></CardHeader>
                            <CardContent className="text-sm space-y-1">
                                <p><strong>Nama:</strong> {order.customerDetails?.name || order.customer}</p>
                                <p><strong>Alamat:</strong> {order.customerDetails?.address || 'N/A'}</p>
                                <p><strong>WhatsApp:</strong> {order.customerDetails?.whatsapp || 'N/A'}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Rincian Produk</CardTitle></CardHeader>
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
                    </div>
                ) : <p>Order tidak ditemukan.</p>}
                <DialogFooter>
                    <Button onClick={generatePdf} variant="outline" disabled={!order}>
                        <Printer className="mr-2 h-4 w-4"/> Download Faktur
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function ProductSalesReportPage() {
  const [allReportData, setAllReportData] = useState<ProductSalesReport[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [searchTerm, setSearchTerm] = useState("");

  const generateReport = useCallback(async (from: Date, to: Date) => {
    setLoading(true);
    try {
        const productsSnapshot = await getDocs(collection(db, "products"));
        const productsMap = new Map();
        productsSnapshot.forEach(doc => {
            productsMap.set(doc.id, { ...doc.data(), id: doc.id });
        });

        const ordersQuery = query(
            collection(db, "orders"),
            where("date", ">=", startOfDay(from)),
            where("date", "<=", endOfDay(to))
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        
        const salesMap = new Map<string, ProductSalesReport>();

        ordersSnapshot.forEach(orderDoc => {
            const order = orderDoc.data() as FullOrder;
            const normalizedStatus = (order.status || '').toLowerCase();

            // Only count sales from non-cancelled orders
            if (normalizedStatus !== 'cancelled') {
                order.products?.forEach(productItem => {
                    if (!salesMap.has(productItem.productId)) {
                        const productDetails = productsMap.get(productItem.productId);
                        if (productDetails) {
                             salesMap.set(productItem.productId, {
                                id: productItem.productId,
                                name: productDetails.name,
                                sku: productDetails.sku,
                                image: productDetails.image || '',
                                totalSold: 0,
                                relatedOrders: []
                            });
                        }
                    }
                    const reportItem = salesMap.get(productItem.productId);
                    if(reportItem) {
                        reportItem.totalSold += productItem.quantity;
                        reportItem.relatedOrders.push({
                            orderId: orderDoc.id,
                            customer: order.customer,
                            date: order.date,
                            quantity: productItem.quantity,
                        });
                    }
                });
            }
        });

        const sortedReport = Array.from(salesMap.values()).sort((a, b) => b.totalSold - a.totalSold);
        setAllReportData(sortedReport);

    } catch (error) {
        console.error("Error generating product sales report:", error);
    } finally {
        setLoading(false);
    }
  }, []);

  const filteredReportData = useMemo(() => {
    if (!searchTerm) {
        return allReportData;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return allReportData.filter(product => 
        product.name.toLowerCase().includes(lowercasedFilter) ||
        (product.sku && String(product.sku).toLowerCase().includes(lowercasedFilter))
    );
  }, [allReportData, searchTerm]);

  useEffect(() => {
    if (dateRange && dateRange.from && dateRange.to) {
        generateReport(dateRange.from, dateRange.to);
    }
  }, [dateRange, generateReport]);
  
  const handleDownloadExcel = () => {
    const dataToExport = filteredReportData.map((product, index) => ({
      'Peringkat': index + 1,
      'Nama Produk': product.name,
      'SKU': product.sku,
      'Total Terjual (unit)': product.totalSold,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Penjualan Produk");

    const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
    const toDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';
    XLSX.writeFile(workbook, `Laporan_Penjualan_Produk_${fromDate}_to_${toDate}.xlsx`);
  };
  
  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/reports')}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Kembali ke Laporan</span>
            </Button>
            <div>
                <CardTitle>Laporan Penjualan Produk</CardTitle>
                <CardDescription>
                Analisis produk terlaris berdasarkan jumlah penjualan dalam periode waktu tertentu.
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
                 <Button onClick={handleDownloadExcel} disabled={loading}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Laporan
                </Button>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Peringkat Penjualan Produk</CardTitle>
                 <CardDescription>
                    Daftar produk terlaris dalam periode yang dipilih.
                 </CardDescription>
                 <div className="relative pt-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari produk berdasarkan nama atau SKU..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                 <div className="overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Peringkat</TableHead>
                                <TableHead>Produk</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead className="text-right">Total Terjual</TableHead>
                                <TableHead className="text-center w-[100px]">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></TableCell>
                                </TableRow>
                            ) : filteredReportData.length > 0 ? (
                                filteredReportData.map((product, index) => (
                                <TableRow key={product.id}>
                                    <TableCell className="font-bold text-lg text-muted-foreground">#{index + 1}</TableCell>
                                    <TableCell className="font-medium flex items-center gap-3">
                                        <Image src={product.image} alt={product.name} width={40} height={40} className="rounded-md object-cover"/>
                                        {product.name}
                                    </TableCell>
                                    <TableCell>{product.sku}</TableCell>
                                    <TableCell className="text-right font-bold text-primary">{product.totalSold} unit</TableCell>
                                    <TableCell className="text-center">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="sm">Lihat</Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
                                                <DialogHeader>
                                                    <DialogTitle>Detail Transaksi: {product.name}</DialogTitle>
                                                    <DialogDescription>
                                                        Daftar pesanan yang menyertakan produk ini dalam periode terpilih.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="flex-1 overflow-y-auto p-1">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Order ID</TableHead>
                                                                <TableHead>Pelanggan</TableHead>
                                                                <TableHead>Tanggal</TableHead>
                                                                <TableHead className="text-right">Jumlah Beli</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {product.relatedOrders.map(order => (
                                                                <TableRow key={order.orderId}>
                                                                    <TableCell>
                                                                        <OrderDetailDialog orderId={order.orderId} />
                                                                    </TableCell>
                                                                    <TableCell>{order.customer}</TableCell>
                                                                    <TableCell>{format(order.date.toDate(), 'dd MMM yyyy')}</TableCell>
                                                                    <TableCell className="text-right">{order.quantity}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        Tidak ada data penjualan untuk periode ini.
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
