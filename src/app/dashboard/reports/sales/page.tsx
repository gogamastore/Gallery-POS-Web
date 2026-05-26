

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { collection, getDocs, doc, getDoc, writeBatch, query, where } from "firebase/firestore";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { DollarSign, Package, Calendar as CalendarIcon, FileText, Loader2, ArrowLeft, Printer, Edit, PlusCircle, Search, Minus, Plus, Trash2 } from "lucide-react";
import { format, isValid, startOfDay, endOfDay } from "date-fns";
import { id as dateFnsLocaleId } from "date-fns/locale";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { DateRange } from "react-day-picker";


declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: string;
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
  purchasePrice?: number;
  sku?: string;
}

interface Order {
  id: string;
  customer: string;
  customerDetails?: { name: string; address: string; whatsapp: string };
  status: 'Delivered' | 'Shipped' | 'Processing' | 'Pending' | 'Cancelled';
  total: number;
  subtotal: number;
  shippingFee: number;
  date: string;
  validatedAt?: string;
  products: OrderProduct[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

const processSalesDataForChart = (orders: Order[]) => {
    const salesByDate: { [key: string]: number } = {};
    orders.forEach(order => {
        // Use validatedAt for chart data as well
        const dateString = order.validatedAt || order.date;
        const date = new Date(dateString); 
        if (isValid(date)) {
            const formattedDate = format(date, 'd MMM', { locale: dateFnsLocaleId });
            if (salesByDate[formattedDate]) {
                salesByDate[formattedDate] += order.total;
            } else {
                salesByDate[formattedDate] = order.total;
            }
        }
    });

    return Object.keys(salesByDate).map(date => ({
        name: date,
        total: salesByDate[date]
    })).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
};


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
        const results = availableProducts.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (p.sku && String(p.sku).toLowerCase().includes(searchTerm.toLowerCase()))
        );
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
            <DialogContent className="sm:max-w-4xl">
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
                <div className="max-h-[50vh] overflow-y-auto">
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
                                    <TableCell>{p.price}</TableCell>
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
            const productsWithStrSku = (order.products || []).map(p => ({
                ...p,
                sku: String(p.sku || ''),
            }));
            setEditableProducts(productsWithStrSku); 
            setShippingFee(order.shippingFee || 0);
        }
    }, [order]);

    const handleQuantityChange = (productId: string, newQuantityStr: string) => {
        const newQuantity = parseInt(newQuantityStr, 10);
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
            price: parseFloat(product.price.replace(/[^0-9]/g, '')),
            imageUrl: product.image,
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
                total: formatCurrency(newTotal),
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
                <Button variant="secondary" className="w-full justify-start gap-2">
                    <Edit/> Edit Pesanan
                </Button>
             </DialogTrigger>
             <DialogContent className="sm:max-w-4xl">
                <DialogHeader className="flex-row justify-between items-center">
                    <div>
                        <DialogTitle>Edit Pesanan #{order.id.substring(0, 7)}...</DialogTitle>
                        <DialogDescription>
                            Ubah jumlah, hapus item, atau tambah produk baru ke pesanan.
                        </DialogDescription>
                    </div>
                    <AddProductToOrderDialog currentProducts={editableProducts} onAddProduct={handleAddProduct} />
                </DialogHeader>
                <div className="max-h-[50vh] overflow-y-auto p-1">
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
                                {editableProducts.map(p => (
                                    <TableRow key={p.productId}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell>
                                             <div className="flex items-center gap-1">
                                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleQuantityChange(p.productId, String(p.quantity - 1))}>
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <Input
                                                    type="number"
                                                    value={p.quantity}
                                                    onChange={(e) => handleQuantityChange(p.productId, e.target.value)}
                                                    className="w-14 h-7 text-center"
                                                    min="1"
                                                />
                                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleQuantityChange(p.productId, String(p.quantity + 1))}>
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(p.price)}</TableCell>
                                        <TableCell className="text-right font-semibold">{formatCurrency(p.price * p.quantity)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(p.productId)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {editableProducts.length === 0 && (
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
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Batal</Button>
                    <Button onClick={handleSaveChanges} disabled={isSaving || editableProducts.length === 0}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Simpan Perubahan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function OrderDetailDialog({ orderId, onOrderUpdated }: { orderId: string, onOrderUpdated: () => void }) {
  const [order, setOrder] = useState<Order | null>(null);
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
                date: data.date.toDate().toISOString(),
                validatedAt: data.validatedAt ? data.validatedAt.toDate().toISOString() : data.date.toDate().toISOString(),
                products: data.products || [],
             } as Order);
        }
    } catch (error) {
        console.error("Failed to fetch order", error);
    } finally {
        setLoading(false);
    }
  }, [orderId, isOpen]);

  useEffect(() => {
    if (isOpen) {
        fetchOrder();
    }
  }, [isOpen, fetchOrder]);

  const handleUpdate = () => {
    fetchOrder(); // Refetch this specific order's details
    onOrderUpdated(); // Refetch the whole list on the parent page
  };


  const generatePdf = () => {
      if (!order) return;
      const pdfDoc = new jsPDF();
      pdfDoc.setFontSize(20);
      pdfDoc.text("Faktur Pesanan", 14, 22);
      pdfDoc.setFontSize(10);
      pdfDoc.text(`ID Pesanan: ${order.id}`, 14, 32);
      pdfDoc.text(`Tanggal: ${format(new Date(order.date), 'dd MMM yyyy, HH:mm', { locale: dateFnsLocaleId })}`, 14, 37);
  
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
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="link" className="p-0 h-auto font-medium">
          ...{orderId.slice(-7)}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Faktur #{order?.id}</DialogTitle>
           <DialogDescription>
              {order ? `Detail pesanan yang divalidasi pada ${format(new Date(order.validatedAt!), 'dd MMMM yyyy, HH:mm', { locale: dateFnsLocaleId })}` : 'Memuat detail pesanan...'}
            </DialogDescription>
        </DialogHeader>
        {loading ? <div className="text-center p-8"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div> : order ? (
          <>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
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
                          <TableCell className="text-right">{formatCurrency(p.price * p.quantity)}</TableCell>
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
             <DialogFooter className="justify-between">
                <div>
                   {order && <EditOrderDialog order={order} onOrderUpdated={handleUpdate}/>}
                </div>
                <Button onClick={generatePdf} variant="outline">
                    <Printer className="mr-2 h-4 w-4"/> Download Faktur
                </Button>
            </DialogFooter>
          </>
        ) : <p>Order tidak ditemukan.</p>}
      </DialogContent>
    </Dialog>
  );
}


export default function SalesReportPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  const [orders, setOrders] = useState<Order[]>([]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { from, to } = dateRange || {};
    if (!from || !to) {
        setLoading(false);
        return;
    }
    
    try {
        const productDocs = await getDocs(collection(db, "products"));
        const productMap = new Map<string, Product>();
        productDocs.forEach(doc => {
            productMap.set(doc.id, { id: doc.id, ...doc.data()} as Product);
        });

        // Query based on validatedAt and relevant statuses
        const ordersQuery = query(
            collection(db, "orders"),
            where('validatedAt', '>=', from),
            where('validatedAt', '<=', to),
            where('status', 'in', ['Processing', 'processing', 'Shipped', 'shipped', 'Delivered', 'delivered'])
        );
      
        const querySnapshot = await getDocs(ordersQuery);
        const ordersDataPromises = querySnapshot.docs.map(async (orderDoc) => {
          const data = orderDoc.data();
          const total = typeof data.total === 'string' 
              ? parseFloat(data.total.replace(/[^0-9]/g, '')) 
              : typeof data.total === 'number' ? data.total : 0;
          
          let customerDetails = data.customerDetails;
          if (data.customerId && !customerDetails) {
              const userDocRef = doc(db, "user", data.customerId);
              const userDoc = await getDoc(userDocRef);
              if (userDoc.exists()) {
                  customerDetails = userDoc.data();
              }
          }

          const productsWithCogs = data.products.map((p: OrderProduct) => {
              const productInfo = productMap.get(p.productId);
              return {
                  ...p,
                  purchasePrice: productInfo?.purchasePrice || 0,
                  image: p.image || productInfo?.image || ''
              }
          });

          return { 
              id: orderDoc.id, 
              ...data, 
              total,
              subtotal: data.subtotal || 0,
              shippingFee: data.shippingFee || 0,
              products: productsWithCogs,
              date: data.date.toDate ? data.date.toDate().toISOString() : new Date(data.date).toISOString(),
              validatedAt: data.validatedAt ? data.validatedAt.toDate().toISOString() : new Date(data.date).toISOString(),
              customerDetails 
          } as Order;
      });
      let ordersData = await Promise.all(ordersDataPromises);
      
      // Sort by validatedAt descending
      ordersData = ordersData.sort((a, b) => new Date(b.validatedAt!).getTime() - new Date(a.validatedAt!).getTime());

      setOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders: ", error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  const handleFilter = () => {
    fetchOrders();
  };

  const handleReset = () => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    setDateRange({ from: todayStart, to: todayEnd });
  };

  const { totalRevenue, totalOrders, grossProfit, totalCogs, chartData } = useMemo(() => {
    const validOrders = orders; // Already filtered by status in query
    
    const revenue = validOrders.reduce((acc, order) => acc + order.total, 0);
    const ordersCount = validOrders.length;
    
    const cogs = validOrders.reduce((acc, order) => {
        const orderCogs = order.products.reduce((sum, p) => sum + ((p.purchasePrice || 0) * p.quantity), 0);
        return acc + orderCogs;
    }, 0);
    
    const profit = revenue - cogs;
    
    const chartDataProcessed = processSalesDataForChart(validOrders);
    
    return {
        totalRevenue: revenue,
        totalOrders: ordersCount,
        grossProfit: profit,
        totalCogs: cogs,
        chartData: chartDataProcessed
    };
}, [orders]);


  if (loading && orders.length === 0) {
    return (
        <div className="text-center p-8">
            <p>Memuat data laporan penjualan...</p>
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
                <CardTitle>Laporan Penjualan</CardTitle>
                <CardDescription>
                    Analisis detail penjualan produk Anda. Filter berdasarkan rentang tanggal untuk wawasan yang lebih spesifik.
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

      <div className="grid gap-4 md:grid-cols-3">
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">HPP: {formatCurrency(totalCogs)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jumlah Pesanan</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
             <p className="text-xs text-muted-foreground">Pesanan dengan status Diproses, Dikirim, & Selesai</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Keuntungan (Laba Kotor)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(grossProfit)}</div>
            <p className="text-xs text-muted-foreground">Total Pendapatan - Total HPP</p>
          </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Tren Penjualan</CardTitle>
           <CardDescription>Visualisasi pendapatan harian dalam rentang tanggal terpilih.</CardDescription>
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
          <CardTitle>Rincian Penjualan</CardTitle>
          <CardDescription>
            Daftar lengkap transaksi penjualan dalam rentang tanggal terpilih.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Tanggal Validasi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {orders.length > 0 ? (
                    orders.map((order) => {
                        const statusText = order.status.toLowerCase() === 'delivered'
                            ? 'Selesai'
                            : order.status.toLowerCase() === 'shipped'
                            ? 'Dikirim'
                            : order.status.toLowerCase() === 'processing'
                            ? 'Diproses'
                            : order.status;
                        return (
                            <TableRow key={order.id}>
                                <TableCell>
                                <OrderDetailDialog orderId={order.id} onOrderUpdated={fetchOrders} />
                                </TableCell>
                                <TableCell>{order.customerDetails?.name || order.customer}</TableCell>
                                <TableCell>{format(new Date(order.validatedAt!), 'dd MMM yyyy, HH:mm', { locale: dateFnsLocaleId })}</TableCell>
                                <TableCell>
                                <Badge
                                    variant="outline"
                                    className={
                                        order.status.toLowerCase() === 'delivered' ? 'text-green-600 border-green-600' :
                                        order.status.toLowerCase() === 'shipped' ? 'text-blue-600 border-blue-600' :
                                        order.status.toLowerCase() === 'processing' ? 'text-orange-500 border-orange-500' : 'text-gray-600 border-gray-600'
                                    }
                                >
                                    {statusText}
                                </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                {formatCurrency(order.total)}
                                </TableCell>
                            </TableRow>
                        )
                    })
                ) : (
                    <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        Tidak ada data penjualan untuk rentang tanggal ini.
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
