

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Download, CreditCard, CheckCircle, FileText, Printer, Truck, Check, Loader2, Edit, RefreshCw, XCircle, Trash2, Minus, Plus, PlusCircle, Search, Calendar as CalendarIcon, Eye, DollarSign, MessageSquare, MoreHorizontal, Package, User, ExternalLink, FileBox } from "lucide-react"
import { collection, getDocs, doc, updateDoc, getDoc, query, orderBy, writeBatch, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import Link from "next/link";
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import type { DateRange } from "react-day-picker";
import { id as dateFnsLocaleId } from "date-fns/locale";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface Product {
    id: string;
    name: string;
    sku: string;
    price: string | number; // Allow both string and number
    stock: number;
    image: string;
    'data-ai-hint'?: string;
    purchasePrice?: number;
}

interface OrderProduct {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  imageUrl?: string;
  sku?: string;
}
interface CustomerDetails {
    name: string;
    address: string;
    whatsapp: string;
}

type OrderStatus = 'Delivered' | 'Shipped' | 'Processing' | 'Pending' | 'Cancelled';

interface Order {
  id: string;
  customer: string;
  customerDetails?: CustomerDetails;
  status: OrderStatus;
  paymentStatus: 'Paid' | 'Unpaid';
  paymentMethod?: 'cod' | 'bank_transfer';
  paymentProofUrl?: string;
  total: number;
  subtotal: number;
  shippingFee: number;
  shippingMethod?: string;
  date: any; // Allow for Firestore Timestamp object
  shippedAt?: any;
  products: OrderProduct[];
}

const formatCurrency = (amount: number | string) => {
    const numericAmount = typeof amount === 'string' ? parseFloat(String(amount).replace(/[^0-9]/g, '')) : amount;
    if (isNaN(numericAmount)) {
        return 'Rp 0';
    }
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(numericAmount);
};

const parseCurrency = (value: string | number): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const num = Number(value.replace(/[^0-9]/g, ''));
        return isNaN(num) ? 0 : num;
    }
    return 0;
}


function AddProductToOrderDialog({ currentProducts, onAddProduct }: { currentProducts: OrderProduct[], onAddProduct: (product: Product, quantity: number) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [quantity, setQuantity] = useState(1);

    const fetchProducts = async () => {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, "products"));
        const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setAllProducts(productsData);
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            fetchProducts();
        }
    }, [isOpen]);

    useEffect(() => {
        const currentProductIds = currentProducts.map(p => p.productId);
        const availableProducts = allProducts.filter(p => !currentProductIds.includes(p.id));
        const results = availableProducts.filter(p => {
            const nameMatch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            // Safely check SKU
            const skuMatch = p.sku && typeof p.sku === 'string' ? p.sku.toLowerCase().includes(searchTerm.toLowerCase()) : false;
            return nameMatch || skuMatch;
        });
        setFilteredProducts(results);
    }, [searchTerm, allProducts, currentProducts]);
    
    const handleAddClick = (product: Product) => {
        onAddProduct(product, quantity);
        setIsOpen(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4"/>Tambah Produk</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Tambah Produk ke Pesanan</DialogTitle>
                    <DialogDescription>Cari dan pilih produk yang ingin ditambahkan.</DialogDescription>
                </DialogHeader>
                 <div className="relative pt-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari produk berdasarkan nama atau SKU..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex-1 overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Produk</TableHead>
                                <TableHead>Stok</TableHead>
                                <TableHead>Harga</TableHead>
                                <TableHead className="w-[180px]">Jumlah</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center">Memuat produk...</TableCell></TableRow>
                            ) : filteredProducts.length > 0 ? filteredProducts.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium">{p.name}</TableCell>
                                    <TableCell>{p.stock}</TableCell>
                                    <TableCell>{formatCurrency(p.price)}</TableCell>
                                    <TableCell>
                                        <Input type="number" defaultValue={1} min={1} max={p.stock} onChange={(e) => setQuantity(Number(e.target.value))} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button onClick={() => handleAddClick(p)}>Tambah</Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="text-center">Produk tidak ditemukan atau sudah ada di pesanan.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function EditOrderDialog({ order, onOrderUpdated }: { order: Order, onOrderUpdated: () => void }) {
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editableProducts, setEditableProducts] = useState<OrderProduct[]>([]);
    const [shippingFee, setShippingFee] = useState<number>(0);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (order) {
            // Deep copy and ensure SKU is a string
            const productsWithStrSku = (order.products || []).map(p => ({
                ...p,
                sku: String(p.sku || ''),
            }));
            setEditableProducts(productsWithStrSku);
            setShippingFee(order.shippingFee || 0);
        }
    }, [order]);
    
    const sortedEditableProducts = useMemo(() => {
        return [...editableProducts].sort((a, b) => a.name.localeCompare(b.name));
    }, [editableProducts]);

    const handleQuantityChange = (productId: string, newQuantity: number) => {
        const quantity = isNaN(newQuantity) || newQuantity < 0 ? 0 : newQuantity;
        setEditableProducts(products => 
            products.map(p => p.productId === productId ? { ...p, quantity: quantity } : p)
        );
    };

    const handleRemoveItem = (productId: string) => {
        setEditableProducts(products => products.filter(p => p.productId !== productId));
    };

    const handleAddProduct = (product: Product, quantity: number) => {
        const newProduct: OrderProduct = {
            productId: product.id,
            name: product.name,
            quantity: quantity,
            price: parseCurrency(product.price),
            imageUrl: product.image,
            sku: product.sku,
        };
        setEditableProducts(prev => [...prev, newProduct]);
    };

    const subtotal = useMemo(() => {
        return editableProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    }, [editableProducts]);

    const newTotal = useMemo(() => subtotal + shippingFee, [subtotal, shippingFee]);

    const handleSaveChanges = async () => {
        setIsSaving(true);
        const batch = writeBatch(db);

        try {
            const originalProducts = order.products || [];
            const stockAdjustments = new Map<string, number>();

            // Calculate differences for existing products
            originalProducts.forEach(origP => {
                const newP = editableProducts.find(p => p.productId === origP.productId);
                if (newP) {
                    const diff = origP.quantity - newP.quantity; // +ve if stock returns
                    if (diff !== 0) {
                        stockAdjustments.set(origP.productId, (stockAdjustments.get(origP.productId) || 0) + diff);
                    }
                } else { // Item was removed
                    stockAdjustments.set(origP.productId, (stockAdjustments.get(origP.productId) || 0) + origP.quantity);
                }
            });

            // Calculate differences for newly added products
            editableProducts.forEach(newP => {
                if (!originalProducts.some(origP => origP.productId === newP.productId)) {
                     const diff = -newP.quantity; // -ve as stock is taken
                     stockAdjustments.set(newP.productId, (stockAdjustments.get(newP.productId) || 0) + diff);
                }
            });


            // Apply stock updates
            for (const [productId, adjustment] of stockAdjustments.entries()) {
                const productRef = doc(db, "products", productId);
                const productDoc = await getDoc(productRef);
                if (productDoc.exists()) {
                    const currentStock = productDoc.data().stock || 0;
                    batch.update(productRef, { stock: currentStock + adjustment });
                }
            }

            // Update the order itself
            const orderRef = doc(db, "orders", order.id);
            batch.update(orderRef, {
                products: editableProducts,
                shippingFee: shippingFee,
                subtotal: subtotal,
                total: newTotal,
            });
            
            await batch.commit();

            toast({ title: "Pesanan Berhasil Diperbarui", description: "Stok produk dan detail pesanan telah diperbarui." });
            onOrderUpdated();
            setIsEditDialogOpen(false);

        } catch (error) {
            console.error("Error updating order:", error);
            toast({ variant: "destructive", title: "Gagal Menyimpan Perubahan" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Pesanan
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader className="flex-row justify-between items-center">
                    <div>
                        <DialogTitle>Edit Pesanan #{order.id.substring(0, 7)}...</DialogTitle>
                        <DialogDescription>
                            Ubah jumlah, hapus item, atau tambah produk baru ke pesanan.
                        </DialogDescription>
                    </div>
                    <AddProductToOrderDialog currentProducts={editableProducts} onAddProduct={handleAddProduct} />
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-1">
                    <div className="relative w-full overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Produk</TableHead>
                                    <TableHead className="w-[150px]">Jumlah</TableHead>
                                    <TableHead className="text-right">Harga Satuan</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedEditableProducts.map(p => (
                                    <TableRow key={p.productId}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleQuantityChange(p.productId, p.quantity - 1)}>
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <Input
                                                    type="number"
                                                    value={p.quantity}
                                                    onChange={(e) => handleQuantityChange(p.productId, parseInt(e.target.value, 10) || 0)}
                                                    className="w-14 h-7 text-center"
                                                    min="1"
                                                />
                                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleQuantityChange(p.productId, p.quantity + 1)}>
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(p.price)}</TableCell>
                                        <TableCell className="text-right font-semibold">{formatCurrency(p.price * p.quantity)}</TableCell>
                                        <TableCell className="text-right">
                                             <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Hapus Produk dari Pesanan?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Anda yakin ingin menghapus <strong>{p.name}</strong> dari pesanan ini? Stok produk akan dikembalikan secara otomatis.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleRemoveItem(p.productId)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Ya, Hapus</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {sortedEditableProducts.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            Tidak ada produk dalam pesanan. Tambahkan produk baru untuk melanjutkan.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <Separator className="my-4"/>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
                        <div className="space-y-2">
                            <Label htmlFor="shippingFee">Biaya Pengiriman</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                <Input 
                                    id="shippingFee" 
                                    type="number" 
                                    value={shippingFee}
                                    onChange={(e) => setShippingFee(Number(e.target.value))}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                        <div className="space-y-1 text-right md:pt-5">
                            <p className="text-sm text-muted-foreground">Subtotal Produk: {formatCurrency(subtotal)}</p>
                            <p className="text-lg font-bold">Total Baru: {formatCurrency(newTotal)}</p>
                        </div>
                    </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row sm:justify-end items-stretch sm:items-center gap-4 pt-4 border-t">
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleSaveChanges} disabled={isSaving || editableProducts.length === 0}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Simpan Perubahan
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function OrdersPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { toast } = useToast();
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");


  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
        const q = query(collection(db, "orders"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        const ordersData = querySnapshot.docs.map(doc => {
             const data = doc.data();

            // Normalize status to have capital letter
            let status = data.status || 'Pending';
            status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

             // Normalize prices and total
            const products = data.products?.map((p: any) => ({
                 ...p,
                 price: typeof p.price === 'string' ? parseFloat(p.price.replace(/[^0-9]/g, '')) : p.price
             })) || [];
            const total = typeof data.total === 'string' ? parseFloat(data.total.replace(/[^0-9]/g, '')) : data.total || 0;

            return {
                id: doc.id,
                ...data,
                status: status as OrderStatus,
                products,
                total,
                shippingFee: data.shippingFee || 0,
                subtotal: data.subtotal || 0,
            } as Order
        });

        // Auto-complete logic
        const fourDaysAgo = subDays(new Date(), 4);
        const batch = writeBatch(db);
        let updatedInBatch = false;

        const updatedOrders: Order[] = ordersData.map(order => {
            if (order.status === 'Shipped' && order.shippedAt && order.shippedAt.toDate() < fourDaysAgo) {
                const orderRef = doc(db, "orders", order.id);
                batch.update(orderRef, { status: 'Delivered' });
                updatedInBatch = true;
                return { ...order, status: 'Delivered' as OrderStatus };
            }
            return order;
        });
        
        if (updatedInBatch) {
            await batch.commit();
            toast({ title: "Status Pesanan Diperbarui", description: "Beberapa pesanan yang dikirim telah ditandai selesai secara otomatis."});
        }
        
        setAllOrders(updatedOrders);

    } catch (error) {
        console.error("Error fetching orders: ", error);
        toast({
            variant: "destructive",
            title: "Gagal memuat pesanan",
            description: "Terjadi kesalahan saat mengambil data dari server."
        });
    } finally {
        setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  const generatePdf = async (orderId: string, type: 'invoice' | 'packingSlip') => {
    const orderDocRef = doc(db, "orders", orderId);
    const orderDoc = await getDoc(orderDocRef);
    if (!orderDoc.exists()) {
        toast({ variant: "destructive", title: "Pesanan tidak ditemukan" });
        return;
    }
    const orderData = orderDoc.data();
    const total = typeof orderData.total === 'string' ? parseFloat(orderData.total.replace(/[^0-9]/g, '')) : orderData.total || 0;
    const order = { id: orderDoc.id, ...orderData, total } as Order;


    const pdf = new jsPDF();
    
    // Header
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(type === 'invoice' ? 'FAKTUR PENJUALAN' : 'SLIP PENGEPAKAN', 105, 20, { align: 'center' });
    
    // Order Details
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`No. Pesanan: ${order.id}`, 14, 30);
    pdf.text(`Tanggal: ${format(order.date.toDate(), 'dd MMMM yyyy, HH:mm', { locale: dateFnsLocaleId })}`, 14, 35);
    pdf.text(`Status Pesanan: ${order.status}`, 14, 40);
    pdf.text(`Status Pembayaran: ${order.paymentStatus}`, 14, 45);
    
    // Customer Details
    pdf.text(`Kepada:`, 14, 55);
    pdf.setFont('helvetica', 'bold');
    pdf.text(order.customerDetails?.name || order.customer, 14, 60);
    pdf.setFont('helvetica', 'normal');
    const addressLines = pdf.splitTextToSize(order.customerDetails?.address || 'Alamat tidak tersedia', 90);
    pdf.text(addressLines, 14, 65);
    let currentY = 65 + (addressLines.length * 5);
    pdf.text(`Telp/WA: ${order.customerDetails?.whatsapp || 'N/A'}`, 14, currentY);

    // Products Table
    const tableColumn = type === 'invoice' 
        ? ["Produk", "Jumlah", "Harga", "Subtotal"] 
        : ["No.", "Kode SKU", "Nama Produk", "Jumlah"];
    
    // Fetch product details for SKUs if needed
    const productDetailsMap = new Map<string, { sku: string }>();
    if (type === 'packingSlip') {
        const productIds = order.products.map(p => p.productId);
        if (productIds.length > 0) {
            const productDocs = await Promise.all(productIds.map(id => getDoc(doc(db, "products", id))));
            productDocs.forEach(pDoc => {
                if (pDoc.exists()) {
                    productDetailsMap.set(pDoc.id, { sku: pDoc.data().sku || 'N/A' });
                }
            });
        }
    }
    
    const sortedProducts = [...order.products].sort((a, b) => a.name.localeCompare(b.name));

    const tableRows = type === 'invoice'
        ? sortedProducts.map(p => [
            p.name,
            p.quantity,
            formatCurrency(p.price),
            formatCurrency(p.price * p.quantity)
        ])
        : sortedProducts.map((p, index) => [
            index + 1,
            p.sku || productDetailsMap.get(p.productId)?.sku || 'N/A',
            p.name,
            p.quantity
        ]);

    pdf.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: currentY + 10,
        theme: 'grid'
    });
    
    let finalY = (pdf as any).lastAutoTable.finalY;
    
    if (type === 'invoice') {
        // Totals for invoice
        pdf.setFontSize(10);
        pdf.text("Subtotal Produk:", 140, finalY + 10);
        pdf.text(formatCurrency(order.subtotal || 0), 200, finalY + 10, { align: 'right' });

        pdf.text("Biaya Pengiriman:", 140, finalY + 15);
        pdf.text(formatCurrency(order.shippingFee || 0), 200, finalY + 15, { align: 'right' });
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('TOTAL:', 140, finalY + 22);
        pdf.text(String(formatCurrency(order.total)), 200, finalY + 22, { align: 'right' });
    }

    const filename = `${type === 'invoice' ? 'Faktur' : 'Packing-Slip'}-${order.id.substring(0,8)}.pdf`;
    pdf.save(filename);
  };


  const generateBulkDocuments = async (type: 'invoice' | 'packingSlip') => {
      const pdf = new jsPDF();
      let isFirstPage = true;

      for (const orderId of selectedOrders) {
        if (!isFirstPage) {
          pdf.addPage();
        }
        
        const orderRef = doc(db, "orders", orderId);
        const orderDoc = await getDoc(orderRef);
        
        if (orderDoc.exists()) {
          const order = { id: orderDoc.id, ...orderDoc.data() } as Order;
          
          // Header
          pdf.setFontSize(18);
          pdf.setFont('helvetica', 'bold');
          pdf.text(type === 'invoice' ? 'FAKTUR PENJUALAN' : 'SLIP PENGEPAKAN', 105, 20, { align: 'center' });
          
          // Order Details
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`No. Pesanan: ${order.id}`, 14, 30);
          pdf.text(`Tanggal: ${format(order.date.toDate(), 'dd MMMM yyyy, HH:mm', { locale: dateFnsLocaleId })}`, 14, 35);
          pdf.text(`Status Pesanan: ${order.status}`, 14, 40);
          pdf.text(`Status Pembayaran: ${order.paymentStatus}`, 14, 45);
          
          // Customer Details
          pdf.text(`Kepada:`, 14, 55);
          pdf.setFont('helvetica', 'bold');
          pdf.text(order.customerDetails?.name || order.customer, 14, 60);
          pdf.setFont('helvetica', 'normal');
          const addressLines = pdf.splitTextToSize(order.customerDetails?.address || 'Alamat tidak tersedia', 90);
          pdf.text(addressLines, 14, 65);
          let currentY = 65 + (addressLines.length * 5);
          pdf.text(`Telp/WA: ${order.customerDetails?.whatsapp || 'N/A'}`, 14, currentY);
          
          const tableY = currentY + 10;
          
          // Fetch product details for SKUs if needed for packing slip
            const productDetailsMap = new Map<string, { sku: string }>();
            if (type === 'packingSlip') {
                const productIds = order.products.map(p => p.productId);
                if (productIds.length > 0) {
                    const productDocs = await Promise.all(productIds.map(id => getDoc(doc(db, "products", id))));
                    productDocs.forEach(pDoc => {
                        if (pDoc.exists()) {
                            productDetailsMap.set(pDoc.id, { sku: pDoc.data().sku || 'N/A' });
                        }
                    });
                }
            }
            
          const tableColumn = type === 'invoice' 
              ? ["Produk", "Jumlah", "Harga", "Subtotal"] 
              : ["No.", "Kode SKU", "Nama Produk", "Jumlah"];
              
          const sortedProducts = [...order.products].sort((a, b) => a.name.localeCompare(b.name));
          
          const tableRows = type === 'invoice'
              ? sortedProducts.map(p => [
                  p.name,
                  p.quantity,
                  formatCurrency(p.price),
                  formatCurrency(p.price * p.quantity)
              ])
              : sortedProducts.map((p, index) => [
                  index + 1,
                  p.sku || productDetailsMap.get(p.productId)?.sku || 'N/A',
                  p.name,
                  p.quantity
              ]);

          pdf.autoTable({
              head: [tableColumn],
              body: tableRows,
              startY: tableY
          });
          
          const finalTableY = (pdf as any).lastAutoTable.finalY;

          if (type === 'invoice') {
              pdf.setFontSize(10);
              pdf.text('Subtotal:', 140, finalTableY + 10);
              pdf.text(formatCurrency(order.subtotal || 0), 200, finalTableY + 10, { align: 'right' });
              pdf.text('Ongkir:', 140, finalTableY + 15);
              pdf.text(formatCurrency(order.shippingFee || 0), 200, finalTableY + 15, { align: 'right' });
              
              pdf.setFontSize(12);
              pdf.setFont('helvetica', 'bold');
              pdf.text('Total:', 140, finalTableY + 22);
              pdf.text(String(formatCurrency(order.total)), 200, finalTableY + 22, { align: 'right' });
          }
        }
        isFirstPage = false;
      }
      pdf.save(`dokumen-pesanan-terpilih-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const updateOrderStatus = async (orderId: string, updates: Partial<Order>) => {
      setIsProcessing(orderId);
      const orderRef = doc(db, "orders", orderId);
      try {
          if(updates.status === 'Shipped') {
              updates.shippedAt = serverTimestamp();
          }
          await updateDoc(orderRef, updates);
          await fetchOrders();
          toast({
              title: "Status Pesanan Diperbarui",
              description: `Pesanan ${orderId.substring(0,7)}... telah diperbarui.`,
          });
      } catch (error) {
           console.error("Error updating order status: ", error);
           toast({
              variant: "destructive",
              title: "Gagal Memperbarui Status",
          });
      } finally {
          setIsProcessing(null);
      }
  };
  
  const deleteOrder = async (orderId: string) => {
      setIsProcessing(orderId);
      try {
          await deleteDoc(doc(db, "orders", orderId));
          toast({
              title: "Pesanan Dihapus",
              description: "Pesanan yang dibatalkan telah dihapus."
          });
          fetchOrders();
      } catch (error) {
           console.error("Error deleting order: ", error);
           toast({ variant: "destructive", title: "Gagal Menghapus Pesanan"});
      } finally {
          setIsProcessing(null);
      }
  }


  const handleMarkAsPaid = async (order: Order) => {
    setIsProcessing(order.id);
    const orderRef = doc(db, "orders", order.id);
    try {
        const updates: Partial<Order> = { paymentStatus: 'Paid' };
        
        await updateDoc(orderRef, updates);
        await fetchOrders();
        toast({
            title: "Pembayaran Dikonfirmasi",
            description: `Pesanan ${order.id.substring(0,7)}... telah ditandai lunas.`,
        });

    } catch (error) {
        console.error("Error updating payment status: ", error);
        toast({
            variant: "destructive",
            title: "Gagal Memperbarui Status",
        });
    } finally {
        setIsProcessing(null);
    }
  };


  const handleCancelOrder = async (order: Order) => {
    setIsProcessing(order.id);
    const batch = writeBatch(db);

    try {
        const orderRef = doc(db, "orders", order.id);
        batch.update(orderRef, { status: 'Cancelled' });

        // Only return stock if the order was not already cancelled
        if (order.products && order.status !== 'Cancelled') {
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
        
        await batch.commit();

        toast({
            title: "Pesanan Dibatalkan",
            description: "Pesanan telah dibatalkan dan stok produk telah dikembalikan.",
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


  const filteredOrders = useMemo(() => {
    let filtered = allOrders;

    if (dateRange?.from || dateRange?.to) {
        filtered = allOrders.filter(order => {
            if (!order.date?.toDate) return false;
            const orderDate = order.date.toDate();
            const from = dateRange.from ? startOfDay(dateRange.from) : null;
            const to = dateRange.to ? endOfDay(dateRange.to) : null;
            if (from && orderDate < from) return false;
            if (to && orderDate > to) return false;
            return true;
        });
    }

    if (searchTerm) {
        const lowercasedFilter = searchTerm.toLowerCase();
        filtered = filtered.filter(order => {
            const customerName = order.customerDetails?.name || order.customer || '';
            return customerName.toLowerCase().includes(lowercasedFilter) ||
                   order.id.toLowerCase().includes(lowercasedFilter);
        });
    }

    const toProcess = filtered.filter(o => o.status === 'Pending');
    const toShip = filtered.filter(o => o.status === 'Processing');
    const shipped = filtered.filter(o => o.status === 'Shipped');
    const delivered = filtered.filter(o => o.status === 'Delivered');
    const cancelled = filtered.filter(o => o.status === 'Cancelled');

    return { toProcess, toShip, shipped, delivered, cancelled };
  }, [allOrders, dateRange, searchTerm]);
  
  const handleSelectOrder = (orderId: string, isSelected: boolean) => {
      setSelectedOrders(prev => isSelected ? [...prev, orderId] : prev.filter(id => id !== orderId));
  };
  
  const handleSelectAllInTab = (ordersInTab: Order[], isSelected: boolean) => {
    const idsInTab = ordersInTab.map(o => o.id);
    if (isSelected) {
        setSelectedOrders(prev => [...new Set([...prev, ...idsInTab])]);
    } else {
        setSelectedOrders(prev => prev.filter(id => !idsInTab.includes(id)));
    }
  };

  const renderMainActionButton = (order: Order, tabName: string) => {
    switch (tabName) {
        case 'toProcess':
            return (
                <Button size="sm" onClick={() => updateOrderStatus(order.id, { status: 'Processing' })}>
                    Proses Pesanan
                </Button>
            );
        case 'toShip':
            return (
                <Button size="sm" onClick={() => updateOrderStatus(order.id, { status: 'Shipped' })}>
                    Atur Pengiriman
                </Button>
            );
        case 'shipped':
             return (
                 <Button size="sm" onClick={() => updateOrderStatus(order.id, { status: 'Delivered' })}>
                    Tandai Selesai
                </Button>
            );
        case 'delivered':
             return (
                <Button size="sm" onClick={() => generatePdf(order.id, 'invoice')}>Lihat Rincian</Button>
            );
        case 'cancelled':
             return (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4"/> Hapus
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Anda Yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus data pesanan ini secara permanen. Aksi ini tidak dapat diurungkan.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => deleteOrder(order.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Ya, Hapus Permanen</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            );
        default:
            return null;
    }
  }


  const renderOrderList = (orders: Order[], tabName: string) => {
    if (loading) {
        return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>
    }

    const selectedInTabCount = orders.filter(o => selectedOrders.includes(o.id)).length;
    const isAllInTabSelected = orders.length > 0 && selectedInTabCount === orders.length;

    return (
        <div className="space-y-4">
             <div className="flex items-center gap-4 px-2 py-2 bg-muted/50 rounded-md">
                <Checkbox
                    id={`select-all-${tabName}`}
                    checked={isAllInTabSelected}
                    onCheckedChange={(checked) => handleSelectAllInTab(orders, !!checked)}
                    aria-label={`Pilih semua di tab ${tabName}`}
                />
                <Label htmlFor={`select-all-${tabName}`} className="text-sm font-medium">
                    Pilih Semua ({selectedInTabCount} / {orders.length} terpilih)
                </Label>
            </div>
            <div className="space-y-4 mt-4">
                {orders.length > 0 ? (
                    orders.map(order => (
                        <Card key={order.id} className="overflow-hidden">
                            <CardHeader className="p-4 bg-card flex-row items-center justify-between border-b">
                                <div className="flex items-center gap-4">
                                    <Checkbox 
                                        checked={selectedOrders.includes(order.id)}
                                        onCheckedChange={(checked) => handleSelectOrder(order.id, !!checked)}
                                    />
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground"/>
                                        <span className="font-semibold">{order.customerDetails?.name || order.customer}</span>
                                    </div>
                                    <a href={`https://wa.me/${order.customerDetails?.whatsapp}`} target="_blank" rel="noopener noreferrer">
                                        <MessageSquare className="h-4 w-4 text-primary cursor-pointer"/>
                                    </a>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    No. Pesanan <span className="font-medium text-foreground">{order.id.substring(0, 12)}...</span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                            <div className="grid grid-cols-12 gap-4 p-4">
                                <div className="col-span-12 md:col-span-5 flex flex-col gap-2">
                                    {order.products.slice(0, 2).map(product => (
                                        <div key={product.productId} className="flex items-center gap-3">
                                                <Image src={product.imageUrl || product.image || "https://placehold.co/64x64.png"} alt={product.name} width={40} height={40} className="rounded-md border"/>
                                                <div>
                                                    <p className="text-sm font-medium line-clamp-1">{product.name}</p>
                                                    <p className="text-xs text-muted-foreground">x{product.quantity}</p>
                                                </div>
                                        </div>
                                    ))}
                                        {order.products.length > 2 && (
                                            <p className="text-xs text-muted-foreground pl-2">+ {order.products.length - 2} produk lainnya</p>
                                        )}
                                </div>
                                <div className="col-span-4 md:col-span-2 text-sm">
                                    <p className="text-muted-foreground">Total Pesanan</p>
                                    <p className="font-semibold">{formatCurrency(order.total)}</p>
                                     <Badge variant={order.paymentStatus === 'Paid' ? 'default' : 'destructive'} className="mt-1">
                                        {order.paymentStatus === 'Paid' ? 'Lunas' : 'Belum Lunas'}
                                     </Badge>
                                </div>
                               <div className="col-span-4 md:col-span-2 text-sm">
                                    <p className="text-muted-foreground">Status</p>
                                    <Badge variant="outline" className={
                                          order.status === 'Delivered' ? 'text-green-600 border-green-600' :
                                          order.status === 'Shipped' ? 'text-blue-600 border-blue-600' :
                                          order.status === 'Processing' ? 'text-yellow-600 border-yellow-600' : 
                                          order.status === 'Cancelled' ? 'text-red-600 border-red-600' : 'text-gray-600 border-gray-600'
                                      }>{order.status}</Badge>
                                      {order.date?.toDate && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {format(order.date.toDate(), 'dd/MM/yy HH:mm')}
                                        </p>
                                      )}
                                </div>
                               <div className="col-span-4 md:col-span-3 text-sm">
                                    <p className="text-muted-foreground">Jasa Kirim</p>
                                    <p className="font-semibold">{order.shippingMethod === 'pickup' ? 'Jemput Sendiri' : (order.shippingMethod || 'Ekspedisi')}</p>
                                </div>
                           </div>
                        </CardContent>
                        <CardFooter className="p-4 bg-muted/30 flex-wrap gap-2 justify-end">
                              {isProcessing === order.id ? <Loader2 className="h-4 w-4 animate-spin"/> : (
                                <>
                                  <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <MoreHorizontal className="h-4 w-4"/>
                                                <span className="sr-only">Aksi lainnya</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Aksi Cepat</DropdownMenuLabel>
                                            <DropdownMenuSeparator/>
                                             {order.paymentStatus === 'Unpaid' && (
                                                <DropdownMenuItem onClick={() => handleMarkAsPaid(order)}>
                                                    <CheckCircle className="mr-2 h-4 w-4" /> Tandai Lunas
                                                </DropdownMenuItem>
                                            )}
                                             <DropdownMenuItem onClick={() => generatePdf(order.id, 'invoice')}>
                                                <Printer className="mr-2 h-4 w-4" /> Download Faktur
                                             </DropdownMenuItem>
                                             <DropdownMenuItem onClick={() => generatePdf(order.id, 'packingSlip')}>
                                                <FileBox className="mr-2 h-4 w-4" /> Download Pesanan
                                             </DropdownMenuItem>
                                             <EditOrderDialog order={order} onOrderUpdated={fetchOrders} />
                                             {(order.status === 'Pending' || order.status === 'Processing') && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <button className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors text-destructive focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                                                            <XCircle className="mr-2 h-4 w-4" /> Batalkan Pesanan
                                                        </button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Anda Yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan membatalkan pesanan dan mengembalikan stok produk. Aksi ini tidak dapat diurungkan.</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter><AlertDialogCancel>Tidak</AlertDialogCancel><AlertDialogAction onClick={() => handleCancelOrder(order)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Ya, Batalkan</AlertDialogAction></AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                             )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <Dialog>
                                        <DialogTrigger asChild>
                                             <Button variant="outline" size="sm">
                                                <FileText className="mr-2 h-4 w-4" /> Lihat Bukti Bayar
                                             </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
                                            <DialogHeader>
                                                <DialogTitle>Bukti Pembayaran #{order.id}</DialogTitle>
                                                <DialogDescription>Pelanggan: {order.customer}</DialogDescription>
                                            </DialogHeader>
                                            <div className="flex-1 overflow-auto flex items-center justify-center">
                                                {order.paymentProofUrl ? (
                                                    <Link href={order.paymentProofUrl} target="_blank" rel="noopener noreferrer">
                                                        <Image src={order.paymentProofUrl} alt={`Payment proof for ${order.id}`} width={500} height={500} className="rounded-md object-contain border" />
                                                    </Link>
                                                ) : (<p className="text-center text-muted-foreground py-8">Belum ada bukti pembayaran.</p>)}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                     {renderMainActionButton(order, tabName)}
                                </>
                              )}
                        </CardFooter>
                    </Card>
                ))
                ) : (
                    <div className="text-center p-8 border rounded-lg">
                        <Package className="mx-auto h-12 w-12 text-muted-foreground"/>
                        <p className="mt-4 text-muted-foreground">Tidak ada pesanan di kategori ini.</p>
                    </div>
                )}
            </div>
        </div>
    );
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
                 <CardTitle>Pesanan</CardTitle>
                 <CardDescription>Lihat dan kelola semua pesanan</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                 <div className="relative flex-1 sm:flex-auto">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari No. Pesanan / Nama..."
                        className="pl-8 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button id="date" variant={"outline"} className="w-full sm:w-[280px] justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : (<span>Pilih rentang tanggal</span>)}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                    </PopoverContent>
                </Popover>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button disabled={selectedOrders.length === 0} className="w-full sm:w-auto">
                            <Download className="mr-2 h-4 w-4" />
                            Download ({selectedOrders.length})
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Pilih Tipe Dokumen</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => generateBulkDocuments('invoice')}>
                            <Printer className="mr-2 h-4 w-4" />
                            Faktur Penjualan
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => generateBulkDocuments('packingSlip')}>
                            <FileBox className="mr-2 h-4 w-4" />
                            Dokumen Pesanan
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
      </CardHeader>
      <CardContent>
          <Tabs defaultValue="toProcess">
            <TabsList className="h-auto p-1.5 w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                <TabsTrigger value="toProcess">
                    Belum Proses <Badge className="ml-2">{filteredOrders.toProcess.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="toShip">
                    Perlu Dikirim <Badge className="ml-2">{filteredOrders.toShip.length}</Badge>
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
                {renderOrderList(filteredOrders.toProcess, 'toProcess')}
            </TabsContent>
            <TabsContent value="toShip" className="mt-4">
                {renderOrderList(filteredOrders.toShip, 'toShip')}
            </TabsContent>
            <TabsContent value="shipped" className="mt-4">
                 {renderOrderList(filteredOrders.shipped, 'shipped')}
            </TabsContent>
            <TabsContent value="delivered" className="mt-4">
                 {renderOrderList(filteredOrders.delivered, 'delivered')}
            </TabsContent>
            <TabsContent value="cancelled" className="mt-4">
                {renderOrderList(filteredOrders.cancelled, 'cancelled')}
            </TabsContent>
          </Tabs>
      </CardContent>
    </Card>
  )
}

    