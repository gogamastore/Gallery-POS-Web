
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
import { ArrowLeft, Banknote, CreditCard, DollarSign, Loader2, PlusCircle, Building, Users, Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Entity {
    id: string;
    name: string;
    address?: string;
    whatsapp?: string;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
};

// Dialog generik untuk memilih / menambah entitas (supplier atau owner)
// dari sebuah collection Firestore. Dilengkapi kotak pencarian.
function EntityPickerDialog({
    collectionName,
    triggerLabel,
    triggerIcon,
    dialogTitle,
    dialogDescription,
    addLabel,
    nameLabel,
    namePlaceholder,
    emptyText,
    searchPlaceholder,
    showContactFields = true,
    onSelect,
}: {
    collectionName: string;
    triggerLabel: string;
    triggerIcon: React.ReactNode;
    dialogTitle: string;
    dialogDescription: string;
    addLabel: string;
    nameLabel: string;
    namePlaceholder: string;
    emptyText: string;
    searchPlaceholder: string;
    showContactFields?: boolean;
    onSelect: (entity: Entity) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [items, setItems] = useState<Entity[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [newEntity, setNewEntity] = useState({ name: "", address: "", whatsapp: "" });
    const { toast } = useToast();

    const fetchItems = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, collectionName), orderBy('name', 'asc'));
            const snapshot = await getDocs(q);
            setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entity)));
        } catch (error) {
            console.error(`Error fetching ${collectionName}:`, error);
            toast({ variant: 'destructive', title: 'Gagal memuat data' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && !isAdding) {
            fetchItems();
        }
    }, [isOpen, isAdding]);

    const filteredItems = useMemo(
        () => items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())),
        [items, search]
    );

    const handleAdd = async () => {
        if (!newEntity.name.trim()) {
            toast({ variant: 'destructive', title: `${nameLabel} harus diisi` });
            return;
        }
        try {
            const payload: Record<string, string> = showContactFields
                ? { name: newEntity.name, whatsapp: newEntity.whatsapp, address: newEntity.address }
                : { name: newEntity.name };
            const docRef = await addDoc(collection(db, collectionName), { ...payload, createdAt: serverTimestamp() });
            const added = { id: docRef.id, ...payload } as Entity;
            onSelect(added); // Auto-select entitas baru
            toast({ title: "Berhasil ditambahkan" });
            setIsAdding(false);
            setNewEntity({ name: "", address: "", whatsapp: "" });
            setSearch("");
            setIsOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Gagal menambah data' });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) { setIsAdding(false); setSearch(""); } }}>
            <DialogTrigger asChild>
                <Button variant="outline">{triggerIcon}{triggerLabel}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                    <DialogDescription>{dialogDescription}</DialogDescription>
                </DialogHeader>
                 {isAdding ? (
                    <div className="space-y-4 p-2 border rounded-md">
                        <h3 className="font-semibold">{addLabel}</h3>
                        <div className="space-y-2">
                            <Label htmlFor="entity-name">{nameLabel}</Label>
                            <Input id="entity-name" placeholder={namePlaceholder} value={newEntity.name} onChange={(e) => setNewEntity(p => ({...p, name: e.target.value}))}/>
                        </div>
                        {showContactFields && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="entity-whatsapp">Kontak (WhatsApp)</Label>
                                    <Input id="entity-whatsapp" placeholder="Nomor WhatsApp (opsional)" value={newEntity.whatsapp} onChange={(e) => setNewEntity(p => ({...p, whatsapp: e.target.value}))}/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="entity-address">Alamat</Label>
                                    <Textarea id="entity-address" placeholder="Alamat (opsional)" value={newEntity.address} onChange={(e) => setNewEntity(p => ({...p, address: e.target.value}))}/>
                                </div>
                            </>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsAdding(false)}>Batal</Button>
                            <Button onClick={handleAdd} size="sm">Simpan</Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={searchPlaceholder}
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {loading ? (
                                <p className="text-sm text-muted-foreground text-center p-4">Memuat...</p>
                            ) : filteredItems.length > 0 ? filteredItems.map(s => (
                                <div key={s.id} onClick={() => { onSelect(s); setIsOpen(false); setSearch(""); }}
                                    className="p-3 hover:bg-muted rounded-md cursor-pointer border-b">
                                    <p className="font-semibold">{s.name}</p>
                                    {s.whatsapp && <p className="text-sm text-muted-foreground">{s.whatsapp}</p>}
                                    {s.address && <p className="text-xs text-muted-foreground">{s.address}</p>}
                                </div>
                            )) : (
                                <p className="text-sm text-muted-foreground text-center p-4">
                                    {search ? "Tidak ada hasil yang cocok." : emptyText}
                                </p>
                            )}
                        </div>
                        <Separator/>
                        <DialogFooter>
                            <Button variant="secondary" onClick={() => setIsAdding(true)} className="w-full justify-start">
                                <PlusCircle className="mr-2 h-4 w-4"/> {addLabel}
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
    const [selectedSupplier, setSelectedSupplier] = useState<Entity | null>(null);
    const [selectedOwner, setSelectedOwner] = useState<Entity | null>(null);
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
        if (!selectedSupplier) {
            toast({ variant: "destructive", title: "Supplier wajib dipilih", description: "Silakan pilih supplier terlebih dahulu." });
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
                supplierId: selectedSupplier.id,
                supplierName: selectedSupplier.name,
                ownerId: selectedOwner?.id || null,
                ownerName: selectedOwner?.name || null,
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
                    supplierName: selectedSupplier.name,
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                   <Label>Supplier <span className="text-destructive">*</span></Label>
                                   <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <EntityPickerDialog
                                            collectionName="suppliers"
                                            triggerLabel="Pilih Supplier"
                                            triggerIcon={<Building className="mr-2 h-4 w-4"/>}
                                            dialogTitle="Pilih atau Tambah Supplier"
                                            dialogDescription="Pilih supplier dari daftar yang ada, atau tambahkan supplier baru ke dalam sistem."
                                            addLabel="Tambah Supplier Baru"
                                            nameLabel="Nama Supplier"
                                            namePlaceholder="Nama Perusahaan / Toko"
                                            emptyText="Belum ada supplier. Silakan tambah baru."
                                            searchPlaceholder="Cari nama supplier..."
                                            onSelect={setSelectedSupplier}
                                        />
                                        {selectedSupplier && <p className="text-sm font-medium p-2 border rounded-md bg-muted">{selectedSupplier.name}</p>}
                                   </div>
                                </div>
                                <div>
                                   <Label>Owner (Pemesan)</Label>
                                   <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <EntityPickerDialog
                                            collectionName="owners"
                                            triggerLabel="Pilih Owner"
                                            triggerIcon={<Users className="mr-2 h-4 w-4"/>}
                                            dialogTitle="Pilih atau Tambah Owner"
                                            dialogDescription="Pilih owner (pemesan) dari daftar, atau tambahkan owner baru. Digunakan untuk mengetahui transaksi ini dipesan oleh siapa."
                                            addLabel="Tambah Owner Baru"
                                            nameLabel="Nama Owner"
                                            namePlaceholder="Nama pemesan"
                                            emptyText="Belum ada owner. Silakan tambah baru."
                                            searchPlaceholder="Cari nama owner..."
                                            showContactFields={false}
                                            onSelect={setSelectedOwner}
                                        />
                                        {selectedOwner && <p className="text-sm font-medium p-2 border rounded-md bg-muted">{selectedOwner.name}</p>}
                                   </div>
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
