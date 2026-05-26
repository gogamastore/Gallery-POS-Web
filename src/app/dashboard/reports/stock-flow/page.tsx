

"use client";

import { useEffect, useState, useMemo, useCallback, Fragment } from "react";
import { collection, getDocs, query, where, Timestamp, orderBy, doc, getDoc } from "firebase/firestore";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Calendar as CalendarIcon, Search, Package, Loader2, ArrowUp, ArrowDown, ArrowLeft, Printer, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfDay, endOfDay, parseISO } from "date-fns";
import { id as dateFnsLocaleId } from "date-fns/locale";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Interfaces
interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  image: string;
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
  status: 'Delivered' | 'Shipped' | 'Processing' | 'Pending' | 'Cancelled';
  paymentStatus: 'Paid' | 'Unpaid';
  total: number;
  subtotal: number;
  shippingFee: number;
  date: any; // Firestore Timestamp
  products: OrderProduct[];
}

interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  purchasePrice: number;
}
interface FullPurchaseTransaction {
  id: string;
  date: any; // Firestore Timestamp
  totalAmount: number;
  items: PurchaseItem[];
  supplierName?: string;
  paymentMethod?: 'cash' | 'bank_transfer' | 'credit';
}

interface StockMovement {
    date: Date;
    type: 'Penjualan' | 'Pembelian' | 'Penyesuaian Masuk' | 'Penyesuaian Keluar' | 'Pesanan Dibatalkan';
    quantityChange: number;
    relatedInfo: string;
    description: string;
    stockAfter: number | null;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};


function PurchaseDetailDialog({ transactionId }: { transactionId: string }) {
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
                <Button variant="link" asChild className="p-0 h-auto">
                    <span className="cursor-pointer">Faktur #{transactionId.substring(0, 7)}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
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
                     <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
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
                                Metode Pembayaran: <span className="font-medium text-foreground capitalize">{transaction.paymentMethod?.replace('_', ' ')}</span>
                            </div>
                            <div className="text-right font-bold text-lg">
                                Total Pembelian: {formatCurrency(transaction.totalAmount)}
                            </div>
                        </div>
                    </div>
                ) : <p>Transaksi tidak ditemukan.</p>}
                 <DialogFooter>
                    <Button onClick={generatePdf} variant="outline" disabled={!transaction}>
                        <Printer className="mr-2 h-4 w-4"/> Download Faktur
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

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
                 <Button variant="link" asChild className="p-0 h-auto">
                    <span className="cursor-pointer">Order #{orderId.substring(0, 7)}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
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
                     <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
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

function StockHistoryDialog({ product, dateRange }: { product: Product, dateRange: { from?: Date; to?: Date } }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<StockMovement[]>([]);

    const fetchHistory = useCallback(async (productId: string, from?: Date, to?: Date) => {
        if (!from || !to) return;
        setLoading(true);

        const movements: Omit<StockMovement, 'stockAfter'>[] = [];
        const startDate = startOfDay(from);
        const endDate = endOfDay(to);

        // 1. Fetch ALL Orders (as stock out)
        const allOrdersQuery = query(
            collection(db, "orders"),
            where("productIds", "array-contains", productId),
            where("date", ">=", startDate),
            where("date", "<=", endDate)
        );
        const allOrdersSnapshot = await getDocs(allOrdersQuery);
        allOrdersSnapshot.forEach(doc => {
            const orderData = doc.data();
            // Don't log a stock out for an order that was immediately cancelled in the same period
            if (orderData.status !== 'Cancelled') {
                 orderData.products?.forEach((item: { productId: string, quantity: number }) => {
                    if (item.productId === productId) {
                        movements.push({
                            date: orderData.date.toDate(),
                            type: 'Penjualan',
                            quantityChange: -item.quantity,
                            relatedInfo: doc.id,
                            description: `Pelanggan: ${orderData.customer}`
                        });
                    }
                });
            }
        });
        
        // 2. Fetch Cancelled Orders (as stock IN)
        const cancelledQuery = query(
            collection(db, "orders"),
            where("productIds", "array-contains", productId),
            where("status", "==", "Cancelled"),
            where("date", ">=", startDate),
            where("date", "<=", endDate)
        );
        const cancelledSnapshot = await getDocs(cancelledQuery);
        cancelledSnapshot.forEach(doc => {
            const orderData = doc.data();
            orderData.products?.forEach((item: { productId: string, quantity: number }) => {
                if (item.productId === productId) {
                    movements.push({
                        date: orderData.date.toDate(),
                        type: 'Pesanan Dibatalkan',
                        quantityChange: item.quantity, // Positive change
                        relatedInfo: doc.id,
                        description: `Stok dikembalikan dari pesanan: ${orderData.customer}`
                    });
                }
            });
        });
        
        // 3. Fetch Purchases
        const purchasesQuery = query(
            collection(db, "purchase_transactions"),
            where("date", ">=", startDate),
            where("date", "<=", endDate)
        );
        const purchasesSnapshot = await getDocs(purchasesQuery);
        purchasesSnapshot.forEach(doc => {
             doc.data().items?.forEach((item: { productId: string, quantity: number }) => {
                if(item.productId === productId) {
                    movements.push({
                        date: doc.data().date.toDate(),
                        type: 'Pembelian',
                        quantityChange: item.quantity,
                        relatedInfo: doc.id,
                        description: `Supplier: ${doc.data().supplierName || 'Umum'}`
                    })
                }
            })
        });

        // 4. Fetch Adjustments
        const adjustmentsQuery = query(
            collection(db, "stock_adjustments"),
            where("productId", "==", productId),
            where("createdAt", ">=", startDate),
            where("createdAt", "<=", endDate)
        );
        const adjustmentsSnapshot = await getDocs(adjustmentsQuery);
        adjustmentsSnapshot.forEach(doc => {
            const adjData = doc.data();
            const type = adjData.type === 'in' ? 'Penyesuaian Masuk' : 'Penyesuaian Keluar';
            const quantityChange = adjData.type === 'in' ? adjData.quantity : -adjData.quantity;
             movements.push({
                date: adjData.createdAt.toDate(),
                type: type,
                quantityChange: quantityChange,
                relatedInfo: 'Admin Adjustment',
                description: `Alasan: ${adjData.reason}`
            });
        });

        // Sort all movements by date, descending (most recent first)
        const sortedMovements = movements.sort((a,b) => b.date.getTime() - a.date.getTime());

        // Calculate stock after each movement (running total in reverse)
        let runningStock = product.stock;
        const finalHistory = sortedMovements.map(movement => {
            const stockAfter = runningStock;
            // To find the stock before this movement, we reverse the operation.
            // If it was a sale (-5), we add 5 to get the previous stock.
            // If it was a purchase (+10), we subtract 10.
            runningStock = runningStock - movement.quantityChange; 
            return { ...movement, stockAfter };
        });

        setHistory(finalHistory);
        setLoading(false);
    }, []);

    useEffect(() => {
        if(isOpen) {
            fetchHistory(product.id, dateRange.from, dateRange.to);
        }
    }, [isOpen, product.id, dateRange, fetchHistory]);
    

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">Detail</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Riwayat Stok: {product.name}</DialogTitle>
                    <DialogDescription>
                        Menampilkan semua pergerakan stok untuk produk ini dari {dateRange.from ? format(dateRange.from, 'd MMM yyyy') : ''} hingga {dateRange.to ? format(dateRange.to, 'd MMM yyyy') : ''}.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto p-1">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Tipe</TableHead>
                                <TableHead>Info</TableHead>
                                <TableHead>Perubahan</TableHead>
                                <TableHead className="text-right">Stok Akhir</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">Memuat riwayat...</TableCell></TableRow>
                            ) : history.length > 0 ? (
                                history.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{format(item.date, 'dd MMM yyyy, HH:mm')}</TableCell>
                                        <TableCell>
                                            <Badge variant={item.quantityChange > 0 ? "default" : "destructive"}>{item.type}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">
                                                {item.type === 'Penjualan' || item.type === 'Pesanan Dibatalkan' ? (
                                                     <OrderDetailDialog orderId={item.relatedInfo} />
                                                ) : item.type === 'Pembelian' ? (
                                                     <PurchaseDetailDialog transactionId={item.relatedInfo} />
                                                ) : (
                                                    item.relatedInfo
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground">{item.description}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className={`flex items-center gap-1 font-bold ${item.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {item.quantityChange > 0 ? <ArrowUp className="h-4 w-4"/> : <ArrowDown className="h-4 w-4"/>}
                                                {Math.abs(item.quantityChange)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold">{item.stockAfter}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">Tidak ada pergerakan stok pada periode ini.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default function StockFlowReportPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: startOfDay(new Date(new Date().setDate(new Date().getDate() - 30))),
    to: endOfDay(new Date()),
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        // Sort by name alphabetically (A-Z)
        productsData.sort((a, b) => a.name.localeCompare(b.name));
        setAllProducts(productsData);
        setFilteredProducts(productsData);
    } catch (error) {
        console.error("Error fetching products: ", error);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const results = allProducts.filter(product => {
      const nameMatch = product.name.toLowerCase().includes(lowercasedFilter);
      const skuMatch = String(product.sku || '').toLowerCase().includes(lowercasedFilter);
      return nameMatch || skuMatch;
    });
    setFilteredProducts(results);
    setCurrentPage(1); // Reset page on new search
  }, [searchTerm, allProducts]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  }, [currentPage, itemsPerPage, filteredProducts]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);


  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/reports')}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Kembali ke Laporan</span>
            </Button>
            <div>
                <CardTitle>Laporan Arus Stok</CardTitle>
                <CardDescription>
                    Lacak semua riwayat pergerakan stok untuk setiap produk dalam rentang tanggal tertentu.
                </CardDescription>
            </div>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Pencarian</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1 w-full md:w-auto">
                 <Label htmlFor="date-range">Rentang Tanggal Riwayat</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button id="date-range" variant={"outline"} className="w-full md:w-[280px] justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : (<span>Pilih rentang tanggal</span>)}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="flex-1 w-full md:w-auto">
                <Label htmlFor="search-product">Cari Produk</Label>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="search-product" placeholder="Cari berdasarkan nama atau SKU..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Daftar Produk</CardTitle>
            <CardDescription>Pilih produk untuk melihat detail riwayat pergerakan stoknya.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Gambar</TableHead>
                            <TableHead>Produk</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead className="text-right">Stok Saat Ini</TableHead>
                            <TableHead className="text-center w-[100px]">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                             <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></TableCell></TableRow>
                        ) : paginatedProducts.length > 0 ? (
                            paginatedProducts.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell>
                                        <Image src={product.image} alt={product.name} width={64} height={64} className="rounded-md object-cover" />
                                    </TableCell>
                                    <TableCell className="font-medium">{product.name}</TableCell>
                                    <TableCell>{product.sku}</TableCell>
                                    <TableCell className="text-right font-bold">{product.stock}</TableCell>
                                    <TableCell className="text-center">
                                       <StockHistoryDialog product={product} dateRange={dateRange}/>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow><TableCell colSpan={5} className="h-24 text-center">Produk tidak ditemukan.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
        <CardFooter>
            <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                <div className="flex-1">
                    Menampilkan {paginatedProducts.length} dari {filteredProducts.length} produk.
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <p>Baris per halaman</p>
                        <Select
                            value={`${itemsPerPage}`}
                            onValueChange={(value) => {
                                setItemsPerPage(Number(value));
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue placeholder={`${itemsPerPage}`} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[20, 50, 100].map((pageSize) => (
                                    <SelectItem key={pageSize} value={`${pageSize}`}>
                                        {pageSize}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>Halaman {currentPage} dari {totalPages}</div>
                    <div className="flex items-center gap-2">
                        <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </CardFooter>
      </Card>

    </div>
  );
}

