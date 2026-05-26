
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc, writeBatch, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Loader2, Package, ArrowLeft, Banknote, UploadCloud, XCircle, Eye, Printer, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { id as dateFnsLocaleId } from 'date-fns/locale';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from '@/components/ui/separator';
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
  image?: string;
  imageUrl?: string;
}

interface BankAccount {
    id: string;
    bankName: string;
    accountHolder: string;
    accountNumber: string;
}

type OrderStatus = 'delivered' | 'shipped' | 'processing' | 'pending' | 'cancelled';


interface Order {
  id: string;
  customer: string;
  status: OrderStatus;
  paymentMethod: 'bank_transfer' | 'cod';
  paymentStatus: 'Paid' | 'Unpaid';
  paymentProofUrl?: string;
  total: number;
  date: any;
  products: OrderProduct[];
}

const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(String(amount).replace(/[^0-9]/g, '')) : amount;
    if (isNaN(num)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(num);
};


function PaymentUploader({ order, onUploadSuccess }: { order: Order, onUploadSuccess: (orderId: string, url: string) => void }) {
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(order.paymentProofUrl || null);
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        async function fetchBankAccounts() {
            const querySnapshot = await getDocs(collection(db, "bank_accounts"));
            const accounts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankAccount));
            setBankAccounts(accounts);
        }
        fetchBankAccounts();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPaymentProof(file);
            setPaymentProofPreview(URL.createObjectURL(file));
        }
    };

    const handleUpload = async () => {
        if (!paymentProof) {
            toast({ title: "Pilih file terlebih dahulu", variant: "destructive" });
            return;
        }
        setIsUploading(true);
        try {
            const storage = getStorage();
            const storageRef = ref(storage, `payment_proofs/${order.id}_${paymentProof.name}`);
            await uploadBytes(storageRef, paymentProof);
            const downloadUrl = await getDownloadURL(storageRef);
            
            const batch = writeBatch(db);
            const orderRef = doc(db, "orders", order.id);
            batch.update(orderRef, { 
                paymentProofUrl: downloadUrl,
                // Do not automatically mark as paid. Admin must confirm.
            });
            
            // Create notification
            const notificationRef = doc(collection(db, "notifications"));
            batch.set(notificationRef, {
                title: "Bukti Pembayaran Diunggah",
                body: `Pelanggan ${order.customer} telah mengunggah bukti bayar untuk pesanan #${order.id.substring(0,7)}...`,
                createdAt: serverTimestamp(),
                type: 'payment_proof',
                relatedId: order.id,
                isRead: false
            });

            await batch.commit();

            toast({ 
                title: "Bukti pembayaran berhasil diunggah!",
                description: "Pembayaran Anda akan segera dikonfirmasi oleh admin."
            });
            onUploadSuccess(order.id, downloadUrl);

        } catch (error) {
            console.error("Upload error:", error);
            toast({ title: "Gagal mengunggah", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Card className="mt-4 bg-muted/50">
            <CardHeader>
                <CardTitle>Instruksi Pembayaran</CardTitle>
                <CardDescription>Silakan lakukan pembayaran ke salah satu rekening berikut dan unggah bukti transfer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    {bankAccounts.map(acc => (
                         <Alert key={acc.id}>
                            <Banknote className="h-4 w-4"/>
                            <AlertTitle>{acc.bankName.toUpperCase()}</AlertTitle>
                            <AlertDescription>
                                {acc.accountNumber} a/n {acc.accountHolder}
                            </AlertDescription>
                        </Alert>
                    ))}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="payment-proof">Unggah Bukti Pembayaran</Label>
                    <div className="flex items-center gap-4">
                        <Input id="payment-proof" type="file" accept="image/*" onChange={handleFileChange} disabled={!!order.paymentProofUrl} />
                        <Button onClick={handleUpload} disabled={isUploading || !paymentProof || !!order.paymentProofUrl}>
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UploadCloud className="mr-2 h-4 w-4"/>}
                            Unggah
                        </Button>
                    </div>
                </div>

                {paymentProofPreview && (
                    <div className="flex flex-col items-center">
                        <p className="text-sm font-medium mb-2">Pratinjau / Bukti Terunggah:</p>
                        <Image src={paymentProofPreview} alt="Bukti Pembayaran" width={250} height={300} className="rounded-md border object-contain" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function OrderDetailsDialog({ order, onCancelOrder, onUploadSuccess }: { order: Order, onCancelOrder: (order: Order) => void, onUploadSuccess: (orderId: string, url: string) => void }) {
    
    const generatePdf = () => {
        const pdfDoc = new jsPDF();
        pdfDoc.setFontSize(20);
        pdfDoc.text("Faktur Pesanan", 14, 22);
        pdfDoc.setFontSize(10);
        pdfDoc.text(`ID Pesanan: ${order.id}`, 14, 32);
        pdfDoc.text(`Tanggal: ${format(order.date.toDate(), 'dd MMM yyyy, HH:mm', { locale: dateFnsLocaleId })}`, 14, 37);

        let currentY = 37;
        pdfDoc.text(`Status Pesanan: ${order.status}`, 14, currentY += 5);
        pdfDoc.text(`Status Pembayaran: ${order.paymentStatus}`, 14, currentY += 5);
        pdfDoc.text(`Metode Pembayaran: ${order.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'COD'}`, 14, currentY += 5);
        

        const tableColumn = ["Produk", "Jumlah", "Harga Satuan", "Subtotal"];
        const tableRows = order.products.map(prod => [
            prod.name,
            prod.quantity,
            formatCurrency(prod.price),
            formatCurrency(prod.price * prod.quantity)
        ]);

        pdfDoc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: currentY + 15,
        });

        const finalY = (pdfDoc as any).lastAutoTable.finalY + 10;
        const subtotalOrder = order.products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        const shippingFee = (typeof order.total === 'string' ? parseFloat(String(order.total).replace(/[^0-9]/g, '')) : order.total) - subtotalOrder;
        
        pdfDoc.setFontSize(10);
        pdfDoc.text("Subtotal Produk:", 140, finalY);
        pdfDoc.text(formatCurrency(subtotalOrder), 200, finalY, { align: 'right' });
        pdfDoc.text("Biaya Pengiriman:", 140, finalY + 7);
        pdfDoc.text(formatCurrency(shippingFee), 200, finalY + 7, { align: 'right' });
        
        pdfDoc.setFontSize(12);
        pdfDoc.setFont('helvetica', 'bold');
        pdfDoc.text("Total Pesanan:", 140, finalY + 14);
        pdfDoc.text(formatCurrency(order.total), 200, finalY + 14, { align: 'right' });

        pdfDoc.output("dataurlnewwindow");
    };


    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Eye className="mr-2 h-4 w-4"/>
                    Lihat
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Detail Pesanan #{order.id}</DialogTitle>
                    <DialogDescription>
                        Tanggal: {format(order.date.toDate(), 'dd MMMM yyyy, HH:mm', { locale: dateFnsLocaleId })}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-1 space-y-4 pr-6">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
                        <div>
                            Status Pesanan: <Badge variant="outline" className={
                                order.status === 'delivered' ? 'text-green-600 border-green-600' :
                                order.status === 'shipped' ? 'text-blue-600 border-blue-600' :
                                order.status === 'processing' ? 'text-yellow-600 border-yellow-600' : 
                                order.status === 'cancelled' ? 'text-red-600 border-red-600' : 'text-gray-600 border-gray-600'
                            }>{order.status}</Badge>
                        </div>
                        <Separator orientation="vertical" className="h-4"/>
                        <div>
                            Status Pembayaran: <Badge variant={order.paymentStatus === 'Paid' ? 'default' : 'destructive'} className="capitalize">{order.paymentStatus === 'Paid' ? 'Lunas' : 'Belum Lunas'}</Badge>
                        </div>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Produk yang Dipesan</CardTitle></CardHeader>
                        <CardContent>
                            <div className="relative w-full overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Produk</TableHead>
                                            <TableHead>Jumlah</TableHead>
                                            <TableHead className="text-right">Harga</TableHead>
                                            <TableHead className="text-right">Subtotal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {order.products.map(p => (
                                            <TableRow key={p.productId}>
                                                <TableCell className="flex items-center gap-2">
                                                    <Image src={p.imageUrl || p.image || "https://placehold.co/64x64.png"} alt={p.name} width={40} height={40} className="rounded" />
                                                    {p.name}
                                                </TableCell>
                                                <TableCell>{p.quantity}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(p.price)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(p.price * p.quantity)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    {order.paymentStatus === 'Unpaid' && order.status !== 'cancelled' && order.paymentMethod === 'bank_transfer' && (
                        <PaymentUploader order={order} onUploadSuccess={onUploadSuccess} />
                    )}

                    <div className="text-right font-bold text-lg border-t pt-4">
                        Total Pesanan: {formatCurrency(order.total)}
                    </div>
                </div>
                 <DialogFooter className="justify-between">
                    <Button onClick={generatePdf} variant="secondary">
                        <Printer className="mr-2 h-4 w-4"/> Download Faktur
                    </Button>
                    {order.status === 'processing' && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">
                                    <XCircle className="mr-2 h-4 w-4" /> Batalkan Pesanan
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Anda Yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan membatalkan pesanan dan mengembalikan stok produk. Aksi ini tidak dapat diurungkan.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Tidak</AlertDialogCancel><AlertDialogAction onClick={() => onCancelOrder(order)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Ya, Batalkan</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                 </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function OrderHistoryPageContent() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const defaultTab = searchParams.get('tab') || 'toProcess';

  const fetchOrders = useCallback(async () => {
    if (!user) {
      if (!authLoading) setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const q = query(
        collection(db, 'orders'),
        where('customerId', '==', user.uid),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const ordersData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        const total = typeof data.total === 'string' 
            ? parseFloat(data.total.replace(/[^0-9]/g, '')) 
            : typeof data.total === 'number' ? data.total : 0;
        
        return {
            id: doc.id,
            ...data,
            status: (data.status || 'pending').toLowerCase(),
            total,
          } as Order;
      });
      setOrders(ordersData);
    } catch (error: any) {
      console.error('Error fetching orders: ', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Memuat Pesanan',
        description: error.code === 'permission-denied' 
            ? 'Anda tidak memiliki izin untuk melihat data ini. Pastikan aturan keamanan sudah benar.'
            : 'Terjadi kesalahan saat mengambil data.',
      });
    } finally {
      setLoading(false);
    }
  }, [user, authLoading, toast]);


  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  const filteredOrders = useMemo(() => {
    const toProcess = orders.filter(o => o.status === 'pending');
    const processing = orders.filter(o => o.status === 'processing');
    const shipped = orders.filter(o => o.status === 'shipped');
    const delivered = orders.filter(o => o.status === 'delivered');
    const cancelled = orders.filter(o => o.status === 'cancelled');

    return { toProcess, processing, shipped, delivered, cancelled };
  }, [orders]);


  const handleUploadSuccess = (orderId: string, url: string) => {
      setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? { ...o, paymentProofUrl: url, paymentStatus: 'Paid' } : o));
      fetchOrders();
  };

  const handleCancelOrder = async (order: Order) => {
    setIsProcessing(order.id);
    const batch = writeBatch(db);

    try {
        const orderRef = doc(db, "orders", order.id);
        batch.update(orderRef, { status: 'Cancelled' });

        if (order.products && order.status !== 'cancelled') {
            for (const item of order.products) {
                const productRef = doc(db, "products", item.productId);
                const productDoc = await getDoc(productRef);
                if (productDoc.exists()) {
                    const currentStock = productDoc.data().stock || 0;
                    const newStock = currentStock + item.quantity;
                    batch.update(productRef, { stock: newStock });
                }
            }
        }
        
        // Create notification for cancelled order
        const notificationRef = doc(collection(db, "notifications"));
        batch.set(notificationRef, {
            title: "Pesanan Dibatalkan",
            body: `Pelanggan ${order.customer} telah membatalkan pesanan #${order.id.substring(0,7)}...`,
            createdAt: serverTimestamp(),
            type: 'order_cancelled',
            relatedId: order.id,
            isRead: false
        });

        await batch.commit();

        toast({
            title: "Pesanan Dibatalkan",
            description: "Pesanan Anda telah berhasil dibatalkan.",
        });

        await fetchOrders();

    } catch (error) {
        console.error("Error cancelling order:", error);
        toast({
            variant: "destructive",
            title: "Gagal Membatalkan",
            description: "Terjadi kesalahan saat membatalkan pesanan.",
        });
    } finally {
        setIsProcessing(null);
    }
  };

  const renderOrderList = (orders: Order[]) => {
      return (
          <div className="space-y-4">
              {loading ? (
                   <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>
              ) : orders.length > 0 ? (
                  orders.map(order => {
                        const statusDisplayMap: Record<OrderStatus, string> = {
                            delivered: 'Selesai',
                            shipped: 'Dikirim',
                            processing: 'Diproses',
                            pending: 'Belum Proses',
                            cancelled: 'Dibatalkan',
                        };

                        const statusText = statusDisplayMap[order.status] || order.status;

                      return (
                      <Card key={order.id} className="overflow-hidden">
                          <CardHeader className="p-4 bg-card flex-row items-center justify-between border-b">
                              <div className="text-sm text-muted-foreground">
                                  No. Pesanan <span className="font-medium text-foreground">{order.id.substring(0, 12)}...</span>
                              </div>
                              {order.date?.toDate && (
                                <p className="text-sm text-muted-foreground">
                                    {format(order.date.toDate(), 'dd/MM/yy HH:mm')}
                                </p>
                              )}
                          </CardHeader>
                          <CardContent className="p-4">
                            {order.products.slice(0, 2).map(product => (
                               <div key={product.productId} className="flex items-center gap-3 mb-2">
                                    <Image src={product.imageUrl || product.image || "https://placehold.co/64x64.png"} alt={product.name} width={40} height={40} className="rounded-md border"/>
                                    <div>
                                        <p className="text-sm font-medium line-clamp-1">{product.name}</p>
                                        <p className="text-xs text-muted-foreground">x{product.quantity}</p>
                                    </div>
                               </div>
                           ))}
                            {order.products.length > 2 && (
                                <p className="text-xs text-muted-foreground pl-2 mt-1">+ {order.products.length - 2} produk lainnya</p>
                            )}
                            <Separator className="my-3"/>
                            <div className="flex justify-between items-center text-sm">
                                <div>
                                    <span className="text-muted-foreground">Status: </span>
                                    <Badge variant="outline" className={
                                          order.status === 'delivered' ? 'text-green-600 border-green-600' :
                                          order.status === 'shipped' ? 'text-blue-600 border-blue-600' :
                                          order.status === 'processing' ? 'text-yellow-600 border-yellow-600' : 
                                          order.status === 'cancelled' ? 'text-red-600 border-red-600' : 'text-gray-600 border-gray-600'
                                      }>{statusText}</Badge>
                                </div>
                                <div className="text-right">
                                    <p className="text-muted-foreground">Total</p>
                                    <p className="font-bold">{formatCurrency(order.total)}</p>
                                </div>
                            </div>
                            <div className="mt-2 text-sm">
                                <span className="text-muted-foreground">Pembayaran: </span>
                                <Badge variant={order.paymentStatus === 'Paid' ? 'default' : 'destructive'} className="capitalize">{order.paymentStatus === 'Paid' ? 'Lunas' : 'Belum Lunas'}</Badge>
                            </div>
                          </CardContent>
                          <CardFooter className="p-4 bg-muted/30 flex-wrap gap-2 justify-end">
                                {isProcessing === order.id ? <Loader2 className="h-4 w-4 animate-spin"/> : (
                                  <OrderDetailsDialog order={order} onCancelOrder={handleCancelOrder} onUploadSuccess={handleUploadSuccess} />
                                )}
                          </CardFooter>
                      </Card>
                      )
                  })
              ) : (
                  <div className="text-center p-8 border rounded-lg">
                      <Package className="mx-auto h-12 w-12 text-muted-foreground"/>
                      <p className="mt-4 text-muted-foreground">Tidak ada pesanan di kategori ini.</p>
                  </div>
              )}
          </div>
      )
  };


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
         <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Kembali</span>
        </Button>
        <h1 className="text-3xl font-bold font-headline">Riwayat Pesanan</h1>
      </div>
       <Card>
        <CardHeader>
          <CardTitle>Pesanan Saya</CardTitle>
          <CardDescription>
            Lihat semua riwayat transaksi Anda di sini.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Tabs defaultValue={defaultTab}>
            <TabsList className="h-auto p-1.5 w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                <TabsTrigger value="toProcess">
                    Belum Proses <Badge className="ml-2">{filteredOrders.toProcess.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="processing">
                    Diproses <Badge className="ml-2">{filteredOrders.processing.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="shipped">
                    Dikirim <Badge className="ml-2">{filteredOrders.shipped.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="delivered">
                    Selesai <Badge className="ml-2">{filteredOrders.delivered.length}</Badge>
                </TabsTrigger>
                 <TabsTrigger value="cancelled">
                    Dibatalkan <Badge className="ml-2">{filteredOrders.cancelled.length}</Badge>
                </TabsTrigger>
            </TabsList>
            <TabsContent value="toProcess" className="mt-4">
                {renderOrderList(filteredOrders.toProcess)}
            </TabsContent>
            <TabsContent value="processing" className="mt-4">
                {renderOrderList(filteredOrders.processing)}
            </TabsContent>
            <TabsContent value="shipped" className="mt-4">
                 {renderOrderList(filteredOrders.shipped)}
            </TabsContent>
            <TabsContent value="delivered" className="mt-4">
                 {renderOrderList(filteredOrders.delivered)}
            </TabsContent>
            <TabsContent value="cancelled" className="mt-4">
                 {renderOrderList(filteredOrders.cancelled)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}


export default function OrderHistoryPage() {
    return (
        <React.Suspense fallback={<div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto"/></div>}>
            <OrderHistoryPageContent />
        </React.Suspense>
    )
}
