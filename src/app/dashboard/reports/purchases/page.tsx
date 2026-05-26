
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { collection, getDocs, doc, getDoc, writeBatch, query as firestoreQuery, where, updateDoc } from "firebase/firestore";
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
import { DollarSign, Package, Calendar as CalendarIcon, FileText, Edit, Plus, Minus, Trash2, Loader2, Search, PlusCircle, ArrowLeft, Printer, Banknote, CreditCard } from "lucide-react";
import { format, isValid, startOfDay, endOfDay } from "date-fns";
import { id as dateFnsLocaleId } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";


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
  purchasePrice?: number;
}

interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  purchasePrice: number;
  image?: string; // Add image property
}
interface PurchaseTransaction {
  id: string;
  date: string; // ISO 8601 string
  totalAmount: number;
  items: PurchaseItem[];
  supplierName?: string;
  paymentMethod?: 'cash' | 'bank_transfer' | 'credit';
  paymentStatus?: 'paid' | 'unpaid';
}

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

// Helper to process data for the chart
const processPurchaseDataForChart = (transactions: PurchaseTransaction[]) => {
    const purchasesByDate: { [key: string]: number } = {};
    transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        if (isValid(date)) {
            const formattedDate = format(date, 'd MMM', { locale: dateFnsLocaleId });
            if (purchasesByDate[formattedDate]) {
                purchasesByDate[formattedDate] += transaction.totalAmount;
            } else {
                purchasesByDate[formattedDate] = transaction.totalAmount;
            }
        }
    });

    return Object.keys(purchasesByDate).map(date => ({
        name: date,
        total: purchasesByDate[date]
    })).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
};

function AddProductToPurchaseDialog({ currentItems, onAddProduct }: { currentItems: PurchaseItem[], onAddProduct: (product: Product, quantity: number, purchasePrice: number) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [purchasePrice, setPurchasePrice] = useState(0);

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
        const currentProductIds = currentItems.map(p => p.productId);
        const availableProducts = allProducts.filter(p => !currentProductIds.includes(p.id));
        const results = availableProducts.filter(p => {
            const nameMatch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            // Safely check SKU
            const skuMatch = p.sku && typeof p.sku === 'string' ? p.sku.toLowerCase().includes(searchTerm.toLowerCase()) : false;
            return nameMatch || skuMatch;
        });
        setFilteredProducts(results);
    }, [searchTerm, allProducts, currentItems]);

    const handleAddClick = (product: Product) => {
        onAddProduct(product, quantity, purchasePrice || product.purchasePrice || 0);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4"/>Tambah Produk</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Tambah Produk ke Transaksi Pembelian</DialogTitle>
                    <DialogDescription>Cari dan pilih produk yang ingin ditambahkan.</DialogDescription>
                </DialogHeader>
                 <div className="relative pt-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Cari produk..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex-1 overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Produk</TableHead>
                                <TableHead>Stok</TableHead>
                                <TableHead className="w-[180px]">Harga Beli</TableHead>
                                <TableHead className="w-[120px]">Jumlah</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center">Memuat produk...</TableCell></TableRow>
                            ) : filteredProducts.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium">{p.name}</TableCell>
                                    <TableCell>{p.stock}</TableCell>
                                    <TableCell>
                                        <Input type="number" defaultValue={p.purchasePrice || 0} onChange={(e) => setPurchasePrice(Number(e.target.value))} />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" defaultValue={1} min={1} onChange={(e) => setQuantity(Number(e.target.value))} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button onClick={() => handleAddClick(p)}>Tambah</Button>
                                    </TableCell>
                                </TableRow>
                            )) }
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function PaymentDialog({ transaction, onPaymentSuccess }: { transaction: PurchaseTransaction, onPaymentSuccess: () => void }) {
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
                paymentStatus: 'paid', // Assuming full payment, you can adjust logic for partial payments
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

function EditPurchaseDialog({ transaction, onPurchaseUpdated }: { transaction: PurchaseTransaction, onPurchaseUpdated: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [editableItems, setEditableItems] = useState<PurchaseItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (transaction) {
            setEditableItems(JSON.parse(JSON.stringify(transaction.items || [])));
        }
    }, [transaction]);

    const handleQuantityChange = (productId: string, newQuantity: number) => {
        if (newQuantity < 0) return; // Allow 0 to remove item implicitly
        setEditableItems(items =>
            items.map(p => p.productId === productId ? { ...p, quantity: newQuantity } : p)
        );
    };

    const handlePriceChange = (productId: string, newPrice: number) => {
        if (newPrice < 0) return;
        setEditableItems(items => 
            items.map(p => p.productId === productId ? { ...p, purchasePrice: newPrice } : p)
        );
    };
    
    const handleRemoveItem = (productId: string) => {
        setEditableItems(items => items.filter(p => p.productId !== productId));
    };

    const handleAddProduct = (product: Product, quantity: number, purchasePrice: number) => {
        const newItem: PurchaseItem = {
            productId: product.id,
            productName: product.name,
            quantity: quantity,
            purchasePrice: purchasePrice,
            image: product.image
        };
        setEditableItems(prev => [...prev, newItem]);
    };
    
    const newTotal = useMemo(() => {
        return editableItems.reduce((sum, item) => sum + (item.purchasePrice * item.quantity), 0);
    }, [editableItems]);

    const handleSaveChanges = async () => {
        setIsSaving(true);
        const batch = writeBatch(db);
    
        try {
            const originalItems = transaction.items || [];
            const allProductIds = new Set([...originalItems.map(i => i.productId), ...editableItems.map(i => i.productId)]);
    
            // 1. Prepare Stock and Price Adjustments
            const productUpdates = new Map<string, { stockChange: number, newPurchasePrice?: number }>();
            for (const productId of allProductIds) {
                const originalItem = originalItems.find(i => i.productId === productId);
                const newItem = editableItems.find(i => i.productId === productId);
                const originalQty = originalItem?.quantity || 0;
                const newQty = newItem?.quantity || 0;
                
                const stockChange = newQty - originalQty;
                
                const update: { stockChange: number, newPurchasePrice?: number } = { stockChange };

                // Check if purchase price has changed for an item that exists in the new list
                if (newItem && originalItem && newItem.purchasePrice !== originalItem.purchasePrice) {
                    update.newPurchasePrice = newItem.purchasePrice;
                } else if (newItem && !originalItem) {
                    // This is a newly added item, update its purchase price
                    update.newPurchasePrice = newItem.purchasePrice;
                }

                if (update.stockChange !== 0 || update.newPurchasePrice !== undefined) {
                    productUpdates.set(productId, {
                        ...productUpdates.get(productId),
                        ...update
                    });
                }
            }
    
            // 2. Fetch all product docs and apply updates
            const productDocsToUpdate = Array.from(productUpdates.keys());
            if (productDocsToUpdate.length > 0) {
                 const productDocs = await Promise.all(productDocsToUpdate.map(id => getDoc(doc(db, "products", id))));
                 productDocs.forEach(productDoc => {
                    if (productDoc.exists()) {
                        const updateData = productUpdates.get(productDoc.id)!;
                        const productRef = productDoc.ref;
                        
                        const firestoreUpdate: any = {};
                        
                        // Update stock
                        if(updateData.stockChange !== 0) {
                             const currentStock = productDoc.data().stock || 0;
                             firestoreUpdate.stock = currentStock + updateData.stockChange;
                        }

                        // Update purchase price
                        if (updateData.newPurchasePrice !== undefined) {
                             firestoreUpdate.purchasePrice = updateData.newPurchasePrice;
                        }

                        if(Object.keys(firestoreUpdate).length > 0) {
                            batch.update(productRef, firestoreUpdate);
                        }
                    }
                });
            }
           
            // 3. Update the purchase transaction
            const purchaseRef = doc(db, "purchase_transactions", transaction.id);
            const finalItems = editableItems.filter(i => i.quantity > 0);
            batch.update(purchaseRef, {
                items: finalItems.map(({ image, ...rest }) => rest), // Remove image before saving to transaction
                totalAmount: newTotal,
            });
    
            // 4. Sync changes to purchase_history
            const historyQuery = firestoreQuery(collection(db, "purchase_history"), where("transactionId", "==", transaction.id));
            const historySnapshot = await getDocs(historyQuery);
            
            historySnapshot.forEach(historyDoc => {
                const historyData = historyDoc.data();
                const correspondingNewItem = finalItems.find(item => item.productId === historyData.productId);
                
                if (correspondingNewItem) {
                    if(correspondingNewItem.purchasePrice !== historyData.purchasePrice || correspondingNewItem.quantity !== historyData.quantity) {
                       batch.update(historyDoc.ref, { 
                           purchasePrice: correspondingNewItem.purchasePrice,
                           quantity: correspondingNewItem.quantity
                       });
                    }
                } else {
                    batch.delete(historyDoc.ref);
                }
            });
    
            await batch.commit();
            toast({ title: "Transaksi Pembelian Diperbarui", description: "Stok produk dan riwayat pembelian telah disesuaikan." });
            onPurchaseUpdated();
            setIsOpen(false);
    
        } catch (error) {
            console.error("Error updating purchase:", error);
            toast({ variant: "destructive", title: "Gagal Menyimpan Perubahan" });
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Edit Transaksi</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                 <DialogHeader className="flex-row justify-between items-center">
                    <div>
                        <DialogTitle>Edit Transaksi Pembelian #{transaction.id.substring(0, 7)}...</DialogTitle>
                        <DialogDescription>Ubah jumlah, hapus, atau tambah item baru.</DialogDescription>
                    </div>
                    <AddProductToPurchaseDialog currentItems={editableItems} onAddProduct={handleAddProduct} />
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-1">
                     <div className="relative w-full overflow-auto">
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead>Produk</TableHead>
                                    <TableHead className="w-[150px]">Jumlah</TableHead>
                                    <TableHead className="w-[180px]">Harga Beli (Satuan)</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {editableItems.map(item => (
                                     <TableRow key={item.productId}>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <Image src={item.image || "https://placehold.co/64x64.png"} alt={item.productName} width={40} height={40} className="rounded-md border"/>
                                            {item.productName}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                                                <Input type="number" value={item.quantity} onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value, 10))} className="w-14 h-7 text-center" min="0"/>
                                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Input 
                                                type="number" 
                                                value={item.purchasePrice} 
                                                onChange={(e) => handlePriceChange(item.productId, Number(e.target.value))} 
                                                className="w-full h-8"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">{formatCurrency(item.purchasePrice * item.quantity)}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.productId)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                     <Separator className="my-4"/>
                    <div className="text-right font-bold text-lg pr-4">Total Baru: {formatCurrency(newTotal)}</div>
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                    <Button onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Simpan Perubahan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function PurchaseDetailDialog({ transaction, onPurchaseUpdated }: { transaction: PurchaseTransaction, onPurchaseUpdated: () => void }) {
    const generatePdf = () => {
        if (!transaction) return;
        const pdfDoc = new jsPDF();
        
        const paymentMethodText = 
            transaction.paymentMethod === 'bank_transfer' ? 'Bank Transfer' :
            transaction.paymentMethod === 'credit' ? 'Kredit' :
            'Cash';

        pdfDoc.setFontSize(20);
        pdfDoc.text("Faktur Pembelian", 14, 22);
        pdfDoc.setFontSize(10);
        pdfDoc.text(`ID Transaksi: ${transaction.id}`, 14, 32);
        pdfDoc.text(`Tanggal: ${format(new Date(transaction.date), 'dd MMM yyyy', { locale: dateFnsLocaleId })}`, 14, 37);
        pdfDoc.text(`Supplier: ${transaction.supplierName || 'N/A'}`, 14, 42);
        pdfDoc.text(`Metode Bayar: ${paymentMethodText}`, 14, 47);


        const tableY = 57;
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
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <FileText className="h-4 w-4" />
                    <span className="sr-only">Lihat Faktur Pembelian</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Faktur Pembelian #{transaction.id}</DialogTitle>
                    <DialogDescription>Rincian transaksi pembelian.</DialogDescription>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
                        <span>Tanggal: {format(new Date(transaction.date), 'dd MMMM yyyy', { locale: dateFnsLocaleId })}</span>
                        <Separator orientation="vertical" className="h-4"/>
                        <span>Supplier: {transaction.supplierName || 'N/A'}</span>
                    </div>
                </DialogHeader>
                <div className="grid gap-4 py-4 flex-1 overflow-y-auto">
                    <Card>
                        <CardHeader><CardTitle>Rincian Produk Dibeli</CardTitle></CardHeader>
                        <CardContent>
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
                                            <TableCell className="font-medium flex items-center gap-2">
                                                <Image src={item.image || "https://placehold.co/64x64.png"} alt={item.productName} width={40} height={40} className="rounded-md border"/>
                                                {item.productName}
                                            </TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.purchasePrice)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.quantity * item.purchasePrice)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
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
                <DialogFooter className="justify-between">
                    <div className="flex gap-2">
                         <Button onClick={generatePdf} variant="outline">
                            <Printer className="mr-2 h-4 w-4"/> Download Faktur
                        </Button>
                        {transaction.paymentMethod === 'credit' && transaction.paymentStatus !== 'paid' && (
                            <PaymentDialog transaction={transaction} onPaymentSuccess={onPurchaseUpdated}/>
                        )}
                    </div>
                    <EditPurchaseDialog transaction={transaction} onPurchaseUpdated={onPurchaseUpdated} />
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function PurchasesReportPage() {
  const [allTransactions, setAllTransactions] = useState<PurchaseTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<PurchaseTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  
  const filterTransactionsByDate = useCallback((transactions: PurchaseTransaction[], from?: Date, to?: Date) => {
    if (!from && !to) {
        return transactions;
    }
    return transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        if (from && transactionDate < startOfDay(from)) return false;
        if (to && transactionDate > endOfDay(to)) return false;
        return true;
    });
  }, []);

  const fetchTransactions = useCallback(async () => {
      setLoading(true);
      try {
        const productsSnapshot = await getDocs(collection(db, "products"));
        const productsMap = new Map<string, { image: string }>();
        productsSnapshot.forEach(doc => {
            productsMap.set(doc.id, { image: doc.data().image });
        });

        const querySnapshot = await getDocs(collection(db, "purchase_transactions"));
        const transactionsData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const itemsWithImages = data.items?.map((item: PurchaseItem) => ({
                ...item,
                image: productsMap.get(item.productId)?.image || "https://placehold.co/64x64.png"
            })) || [];
            
            return { 
                id: doc.id, 
                ...data,
                items: itemsWithImages,
                date: data.date.toDate ? data.date.toDate().toISOString() : new Date(data.date).toISOString(),
            } as PurchaseTransaction;
        });
        setAllTransactions(transactionsData);
        // Apply initial date filter
        const initialFiltered = filterTransactionsByDate(transactionsData, dateRange.from, dateRange.to);
        setFilteredTransactions(initialFiltered);
      } catch (error) {
        console.error("Error fetching purchase transactions: ", error);
      } finally {
        setLoading(false);
      }
    }, [filterTransactionsByDate, dateRange]);


  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);
  
  const handleFilter = () => {
    const { from, to } = dateRange;
    const filtered = filterTransactionsByDate(allTransactions, from, to);
    setFilteredTransactions(filtered);
  };

  const handleReset = () => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    setDateRange({ from: todayStart, to: todayEnd });
    const todayTransactions = filterTransactionsByDate(allTransactions, todayStart, todayEnd);
    setFilteredTransactions(todayTransactions);
  };

  const { totalPurchaseAmount, totalTransactions, chartData } = useMemo(() => {
    const amount = filteredTransactions.reduce((acc, trans) => acc + trans.totalAmount, 0);
    const transCount = filteredTransactions.length;
    const chartDataProcessed = processPurchaseDataForChart(filteredTransactions);
    return {
        totalPurchaseAmount: amount,
        totalTransactions: transCount,
        chartData: chartDataProcessed,
    };
  }, [filteredTransactions]);

  if (loading && allTransactions.length === 0) {
    return (
        <div className="text-center p-8">
            <p>Memuat data laporan pembelian...</p>
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
                <CardTitle>Laporan Transaksi Pembelian</CardTitle>
                <CardDescription>
                    Lacak semua transaksi pembelian stok. Filter berdasarkan rentang tanggal.
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

      <div className="grid gap-4 md:grid-cols-2">
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pembelian</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPurchaseAmount)}</div>
            <p className="text-xs text-muted-foreground">Dari transaksi yang difilter</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jumlah Transaksi</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
             <p className="text-xs text-muted-foreground">Dalam rentang tanggal terpilih</p>
          </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Tren Pembelian</CardTitle>
           <CardDescription>Visualisasi pengeluaran pembelian harian dalam rentang tanggal terpilih.</CardDescription>
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
          <CardTitle>Rincian Transaksi Pembelian</CardTitle>
          <CardDescription>
            Daftar lengkap transaksi pembelian dalam rentang tanggal terpilih.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>ID Transaksi</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Status Pembayaran</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {loading && filteredTransactions.length === 0 ? (
                     <TableRow><TableCell colSpan={6} className="text-center h-24">Memuat transaksi...</TableCell></TableRow>
                ) : filteredTransactions.length > 0 ? (
                    filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{transaction.id.substring(0,7)}...</TableCell>
                        <TableCell>{format(new Date(transaction.date), 'dd MMM yyyy', { locale: dateFnsLocaleId })}</TableCell>
                        <TableCell>{transaction.supplierName || 'N/A'}</TableCell>
                        <TableCell>
                            <Badge variant={transaction.paymentMethod === 'credit' && transaction.paymentStatus !== 'paid' ? 'destructive' : 'default'}>
                                {transaction.paymentMethod === 'credit' && transaction.paymentStatus !== 'paid' ? 'Kredit' : 'Lunas'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                        {formatCurrency(transaction.totalAmount)}
                        </TableCell>
                        <TableCell className="text-center">
                           <PurchaseDetailDialog transaction={transaction} onPurchaseUpdated={fetchTransactions} />
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                        Tidak ada data pembelian untuk rentang tanggal ini.
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

    