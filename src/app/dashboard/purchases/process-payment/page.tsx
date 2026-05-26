
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { usePurchaseCart } from "@/hooks/use-purchase-cart";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { addDoc, collection, doc, serverTimestamp, writeBatch, getDocs, query, orderBy } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Banknote, CreditCard, DollarSign, Loader2, PlusCircle, Building, Users } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Supplier {
    id: string;
    name: string;
    address?: string;
    whatsapp?: string;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
};


function SupplierDialog({ onSelectSupplier }: { onSelectSupplier: (supplier: Supplier) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(false);
    const [newSupplier, setNewSupplier] = useState({ name: "", address: "", whatsapp: "" });
    const { toast } = useToast();

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'suppliers'), orderBy('name', 'asc'));
            const snapshot = await getDocs(q);
            setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
        } catch (error) {
            console.error("Error fetching suppliers:", error);
            toast({ variant: 'destructive', title: 'Gagal memuat supplier' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && !isAdding) {
            fetchSuppliers();
        }
    }, [isOpen, isAdding]);

    const handleAddSupplier = async () => {
        if (!newSupplier.name) {
            toast({ variant: 'destructive', title: 'Nama supplier harus diisi' });
            return;
        }
        try {
            const docRef = await addDoc(collection(db, 'suppliers'), { ...newSupplier, createdAt: serverTimestamp() });
            const addedSupplier = { id: docRef.id, ...newSupplier };
            onSelectSupplier(addedSupplier); // Auto-select the new supplier
            toast({ title: "Supplier berhasil ditambahkan" });
            setIsAdding(false);
            setNewSupplier({ name: "", address: "", whatsapp: "" });
            setIsOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Gagal menambah supplier' });
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline"><Building className="mr-2 h-4 w-4"/>Pilih Supplier</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Pilih atau Tambah Supplier</DialogTitle>
                    <DialogDescription>
                        Pilih supplier dari daftar yang ada, atau tambahkan supplier baru ke dalam sistem.
                    </DialogDescription>
                </DialogHeader>
                 {isAdding ? (
                    <div className="space-y-4 p-2 border rounded-md">
                        <h3 className="font-semibold">Tambah Supplier Baru</h3>
                        <div className="space-y-2">
                            <Label htmlFor="supplier-name">Nama Supplier</Label>
                            <Input id="supplier-name" placeholder="Nama Perusahaan / Toko" value={newSupplier.name} onChange={(e) => setNewSupplier(p => ({...p, name: e.target.value}))}/>
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="supplier-whatsapp">Kontak (WhatsApp)</Label>
                            <Input id="supplier-whatsapp" placeholder="Nomor WhatsApp (opsional)" value={newSupplier.whatsapp} onChange={(e) => setNewSupplier(p => ({...p, whatsapp: e.target.value}))}/>
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="supplier-address">Alamat</Label>
                            <Textarea id="supplier-address" placeholder="Alamat supplier (opsional)" value={newSupplier.address} onChange={(e) => setNewSupplier(p => ({...p, address: e.target.value}))}/>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsAdding(false)}>Batal</Button>
                            <Button onClick={handleAddSupplier} size="sm">Simpan Supplier</Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="max-h-80 overflow-y-auto">
                            {loading ? <p>Memuat...</p> : suppliers.length > 0 ? suppliers.map(s => (
                                <div key={s.id} onClick={() => { onSelectSupplier(s); setIsOpen(false); }}
                                    className="p-3 hover:bg-muted rounded-md cursor-pointer border-b">
                                    <p className="font-semibold">{s.name}</p>
                                    <p className="text-sm text-muted-foreground">{s.whatsapp}</p>
                                    <p className="text-xs text-muted-foreground">{s.address}</p>
                                </div>
                            )) : <p className="text-sm text-muted-foreground text-center p-4">Belum ada supplier. Silakan tambah baru.</p>}
                        </div>
                        <Separator/>
                        <DialogFooter>
                            <Button variant="secondary" onClick={() => setIsAdding(true)} className="w-full justify-start">
                                <PlusCircle className="mr-2 h-4 w-4"/> Tambah Supplier Baru
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}

export default function ProcessPaymentPage() {
    const { cart, totalPurchase, clearCart } = usePurchaseCart();
    const router = useRouter();
    const { toast } = useToast();
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const purchaseDate = new Date();

    useEffect(() => {
        if(cart.length === 0) {
            toast({ variant: 'destructive', title: 'Keranjang pembelian kosong', description: 'Anda akan diarahkan kembali.'});
            router.replace('/dashboard/purchases');
        }
    }, [cart, router, toast]);

    const handleProcessTransaction = async () => {
        if (cart.length === 0) {
            toast({ variant: "destructive", title: "Keranjang Kosong" });
            return;
        }
        setIsProcessing(true);
        const batch = writeBatch(db);
    
        try {
            const purchaseTransactionRef = doc(collection(db, "purchase_transactions"));
            batch.set(purchaseTransactionRef, {
                date: purchaseDate,
                totalAmount: totalPurchase,
                items: cart.map(item => ({
                    productId: item.id,
                    productName: item.name,
                    quantity: item.quantity,
                    purchasePrice: item.purchasePrice,
                    image: item.image, // Add image here
                })),
                supplierId: selectedSupplier?.id || null,
                supplierName: selectedSupplier?.name || "Supplier Umum",
                paymentMethod: paymentMethod,
            });
    
            for (const item of cart) {
                const productRef = doc(db, "products", item.id);
                const newStock = (item.stock || 0) + item.quantity;
                batch.update(productRef, { stock: newStock, purchasePrice: item.purchasePrice });
                
                // Add to purchase_history
                const historyRef = doc(collection(db, "purchase_history"));
                batch.set(historyRef, {
                    productId: item.id,
                    productName: item.name,
                    quantity: item.quantity,
                    purchasePrice: item.purchasePrice,
                    purchaseDate: purchaseDate,
                    supplierName: selectedSupplier?.name || "Supplier Umum",
                    transactionId: purchaseTransactionRef.id
                });
            }
    
            await batch.commit();
    
            toast({
                title: "Transaksi Berhasil",
                description: "Stok produk dan riwayat pembelian telah diperbarui.",
            });
    
            clearCart();
            router.replace('/dashboard/purchases');
    
        } catch (error) {
            console.error("Error processing transaction:", error);
            toast({ variant: "destructive", title: "Transaksi Gagal" });
        } finally {
            setIsProcessing(false);
        }
    };

    if(cart.length === 0) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-3xl font-bold font-headline">Proses Pembayaran Pembelian</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>1. Detail Supplier & Pembayaran</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                               <Label>Supplier (Opsional)</Label>
                               <div className="flex items-center gap-4 mt-2">
                                    <SupplierDialog onSelectSupplier={setSelectedSupplier}/>
                                    {selectedSupplier && <p className="text-sm font-medium p-2 border rounded-md bg-muted">{selectedSupplier.name}</p>}
                               </div>
                            </div>
                            <div>
                                <Label>Metode Pembayaran</Label>
                                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="mt-2">
                                     <div className="flex items-center space-x-2 p-3 border rounded-md has-[:checked]:bg-muted has-[:checked]:border-primary">
                                        <RadioGroupItem value="cash" id="cash" />
                                        <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer"><DollarSign/> Cash</Label>
                                    </div>
                                    <div className="flex items-center space-x-2 p-3 border rounded-md has-[:checked]:bg-muted has-[:checked]:border-primary">
                                        <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                                        <Label htmlFor="bank_transfer" className="flex items-center gap-2 cursor-pointer"><Banknote/> Bank Transfer</Label>
                                    </div>
                                    <div className="flex items-center space-x-2 p-3 border rounded-md has-[:checked]:bg-muted has-[:checked]:border-primary">
                                        <RadioGroupItem value="credit" id="credit" />
                                        <Label htmlFor="credit" className="flex items-center gap-2 cursor-pointer"><CreditCard/> Kredit</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div>
                    <Card className="sticky top-20">
                        <CardHeader>
                            <CardTitle>2. Ringkasan Pembelian</CardTitle>
                        </CardHeader>
                         <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Produk</TableHead>
                                        <TableHead className="text-right">Subtotal</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cart.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-medium">{item.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {item.quantity} x {formatCurrency(item.purchasePrice)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(item.quantity * item.purchasePrice)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         </CardContent>
                         <CardFooter className="flex-col items-stretch gap-4 mt-4 bg-muted/50 p-4">
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total Pembelian</span>
                                <span>{formatCurrency(totalPurchase)}</span>
                            </div>
                            <Button size="lg" onClick={handleProcessTransaction} disabled={isProcessing}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                {isProcessing ? 'Memproses...' : 'Proses Transaksi'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    )
}
