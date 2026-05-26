

"use client";

export const dynamic = 'force-dynamic';

import Image from "next/image"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button"
import { PlusCircle, MoreHorizontal, Edit, Settings, ArrowUp, ArrowDown, Upload, FileDown, Loader2, Search, ChevronLeft, ChevronRight, Eye, Trash2, ArrowUpDown, History } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea"
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc, writeBatch, query, where, deleteDoc, orderBy } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id as dateFnsLocaleId } from "date-fns/locale";
import { BarcodeScannerDialog } from "@/components/barcode-scanner-dialog";


interface ProductCategory {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number; // Normalized to number
  purchasePrice?: number;
  stock: number;
  image: string;
  'data-ai-hint': string;
  description?: string;
}

interface PurchaseHistoryItem {
    id: string;
    purchaseDate: any;
    quantity: number;
    purchasePrice: number;
    supplierName: string;
}

const parseCurrency = (value: string | number): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const num = Number(value.replace(/[^0-9]/g, ''));
        return isNaN(num) ? 0 : num;
    }
    return 0;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
};


function AddCategoryDialog({ onCategoryAdded }: { onCategoryAdded: (newCategory: ProductCategory) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const { toast } = useToast();

    const handleAddCategory = async () => {
        if (!name.trim()) {
            toast({ variant: 'destructive', title: 'Nama kategori tidak boleh kosong' });
            return;
        }
        setLoading(true);
        try {
            const docRef = await addDoc(collection(db, "product_categories"), {
                name: name.trim(),
                createdAt: serverTimestamp(),
            });
            onCategoryAdded({ id: docRef.id, name: name.trim() });
            toast({ title: 'Kategori baru ditambahkan' });
            setIsOpen(false);
            setName("");
        } catch (error) {
            console.error("Error adding category:", error);
            toast({ variant: 'destructive', title: 'Gagal menambah kategori' });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button className="w-full text-left p-2 text-sm text-primary hover:bg-accent rounded-md">
                    + Tambah Kategori Baru
                </button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Tambah Kategori Produk Baru</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="category-name">Nama Kategori</Label>
                    <Input id="category-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                    <Button onClick={handleAddCategory} disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Kategori'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


function ProductForm({ product, onSave, onOpenChange }: { product?: Product, onSave: () => void, onOpenChange: (open: boolean) => void }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(product?.image || null);
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [categorySearch, setCategorySearch] = useState("");


    const [formData, setFormData] = useState({
        name: product?.name || "",
        sku: product?.sku || "",
        purchasePrice: product?.purchasePrice || 0,
        price: product ? parseCurrency(product.price) : 0,
        stock: product?.stock || 0,
        category: product?.category || "",
        description: product?.description || "",
        image: product?.image || "",
    });

    useEffect(() => {
        const fetchCategories = async () => {
            const snapshot = await getDocs(collection(db, "product_categories"));
            const fetchedCategories = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
            // Sort categories alphabetically by name
            fetchedCategories.sort((a, b) => a.name.localeCompare(b.name));
            setCategories(fetchedCategories);
        };
        fetchCategories();
    }, []);
    
    const filteredCategories = useMemo(() => {
        return categories.filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase()));
    }, [categories, categorySearch]);


    const handleCategoryAdded = (newCategory: ProductCategory) => {
        const updatedCategories = [...categories, newCategory].sort((a, b) => a.name.localeCompare(b.name));
        setCategories(updatedCategories);
        setFormData(prev => ({...prev, category: newCategory.name }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        const numericFields = ['purchasePrice', 'price', 'stock'];
        setFormData(prev => ({ ...prev, [id]: numericFields.includes(id) ? Number(value) : value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };


    const handleSaveProduct = async () => {
        if (!formData.name || !formData.sku || formData.price <= 0) {
            toast({
                variant: "destructive",
                title: "Data Tidak Lengkap",
                description: "Nama produk, SKU, dan harga jual harus diisi.",
            });
            return;
        }
        setLoading(true);
        try {
            let imageUrl = formData.image;

            if (imageFile) {
                const storageRef = ref(storage, `product_images/${Date.now()}_${imageFile.name}`);
                await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(storageRef);
            }
            
            const dataToSave: any = {
                name: formData.name,
                sku: formData.sku,
                purchasePrice: formData.purchasePrice,
                price: new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                }).format(formData.price),
                category: formData.category,
                description: formData.description,
                image: imageUrl,
            };

            if (!dataToSave.image) {
                dataToSave.image = `https://placehold.co/400x400.png`;
                dataToSave['data-ai-hint'] = 'product item';
            }


            if (product) { // Editing existing product - stock is not updated here
                const productRef = doc(db, "products", product.id);
                await updateDoc(productRef, dataToSave);
                toast({
                    title: "Produk Berhasil Diperbarui",
                    description: `${formData.name} telah diperbarui.`,
                });
            } else { // Adding new product
                await addDoc(collection(db, "products"), {
                    ...dataToSave,
                    stock: formData.stock || 0, // Use stock from form for new products
                    createdAt: serverTimestamp(),
                });
                toast({
                    title: "Produk Berhasil Ditambahkan",
                    description: `${formData.name} telah ditambahkan ke daftar produk.`,
                });
            }
            onSave();
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving product:", error);
            toast({
                variant: "destructive",
                title: `Gagal ${product ? 'Memperbarui' : 'Menambahkan'} Produk`,
                description: "Terjadi kesalahan saat menyimpan data ke server.",
            });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <>
            <SheetHeader>
                <SheetTitle>{product ? 'Edit Produk' : 'Tambah Produk Baru'}</SheetTitle>
                <SheetDescription>
                    {product ? 'Ubah detail produk yang sudah ada.' : 'Isi detail produk baru yang akan ditambahkan ke toko Anda.'}
                </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 py-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Nama Produk</Label>
                    <Input id="name" value={formData.name} onChange={handleInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="sku" className="text-right">SKU</Label>
                    <Input id="sku" value={formData.sku} onChange={handleInputChange} className="col-span-3" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category" className="text-right">Kategori</Label>
                     <Select onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))} defaultValue={formData.category}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Pilih Kategori Produk" />
                        </SelectTrigger>
                        <SelectContent>
                             <div className="p-2">
                                <Input 
                                    placeholder="Cari kategori..." 
                                    className="w-full h-8"
                                    value={categorySearch}
                                    onChange={(e) => setCategorySearch(e.target.value)}
                                />
                            </div>
                            {filteredCategories.map(cat => (
                                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                            ))}
                            <Separator className="my-2"/>
                            <AddCategoryDialog onCategoryAdded={handleCategoryAdded} />
                        </SelectContent>
                    </Select>
                </div>
                 <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="image" className="text-right pt-2">Gambar</Label>
                    <div className="col-span-3 space-y-2">
                        {imagePreview && <Image src={imagePreview} alt="Preview" width={100} height={100} className="rounded-md object-cover" />}
                        <Input id="image" type="file" accept="image/*" onChange={handleImageChange} className="col-span-3" />
                    </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="purchasePrice" className="text-right">Harga Beli</Label>
                    <Input id="purchasePrice" type="number" value={formData.purchasePrice} onChange={handleInputChange} className="col-span-3" placeholder="Harga modal produk" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="price" className="text-right">Harga Jual</Label>
                    <Input id="price" type="number" value={formData.price} onChange={handleInputChange} className="col-span-3" placeholder="Harga yang akan tampil di toko" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="stock" className="text-right">Stok Awal</Label>
                     <Input 
                        id="stock" 
                        type="number" 
                        value={formData.stock}
                        onChange={handleInputChange} 
                        className="col-span-3" 
                        disabled={!!product} // Disable if editing existing product
                        placeholder={product ? "Atur via Manajemen Stok" : "Jumlah stok awal"}
                    />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="description" className="text-right pt-2">Deskripsi</Label>
                    <Textarea id="description" value={formData.description} onChange={handleInputChange} className="col-span-3" />
                </div>
            </div>
            <div className="flex justify-end">
                <Button onClick={handleSaveProduct} disabled={loading}>
                  {loading ? "Menyimpan..." : "Simpan Produk"}
                </Button>
            </div>
        </>
    )
}

function ProductSheet({ onProductAdded }: { onProductAdded: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="h-8 gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Tambah Produk
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <ProductForm onSave={onProductAdded} onOpenChange={setIsOpen} />
      </SheetContent>
    </Sheet>
  )
}

function BulkImportDialog({ onImportSuccess }: { onImportSuccess: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleDownloadTemplate = () => {
        const worksheet = XLSX.utils.aoa_to_sheet([
            ["name", "sku", "price", "purchasePrice", "stock", "category", "description"],
            ["Kaos Polos", "KP-001", 120000, 75000, 100, "Pakaian", "Kaos polos bahan katun combed 30s."],
        ]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Produk");
        XLSX.writeFile(workbook, "template_impor_produk.xlsx");
    };

    const handleProcessImport = async () => {
        if (!file) {
            toast({ variant: 'destructive', title: 'File tidak ditemukan', description: 'Silakan pilih file Excel terlebih dahulu.' });
            return;
        }

        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);
                
                if (json.length === 0) throw new Error("File Excel kosong atau format salah.");

                // --- Start of new category logic ---
                const categoriesFromExcel = [...new Set(json.map(row => row.category).filter(cat => typeof cat === 'string' && cat.trim() !== ''))];
                const categoriesSnapshot = await getDocs(collection(db, 'product_categories'));
                const existingCategories = new Set(categoriesSnapshot.docs.map(doc => doc.data().name));
                const newCategories = categoriesFromExcel.filter(cat => !existingCategories.has(cat));
                
                if (newCategories.length > 0) {
                    const categoryBatch = writeBatch(db);
                    newCategories.forEach(catName => {
                        const categoryRef = doc(collection(db, 'product_categories'));
                        categoryBatch.set(categoryRef, { name: catName, createdAt: serverTimestamp() });
                    });
                    await categoryBatch.commit();
                    toast({ title: 'Kategori Baru Ditambahkan', description: `${newCategories.length} kategori baru dari file Excel telah dibuat.` });
                }
                // --- End of new category logic ---

                let addedCount = 0;
                const productBatch = writeBatch(db);

                json.forEach((row) => {
                    if (!row.name || !row.sku || !row.price) return; // Skip invalid rows
                    
                    const productRef = doc(collection(db, "products"));
                    productBatch.set(productRef, {
                        name: row.name,
                        sku: row.sku,
                        price: new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(row.price || 0),
                        purchasePrice: Number(row.purchasePrice) || 0,
                        stock: Number(row.stock) || 0,
                        category: row.category || "Uncategorized",
                        description: row.description || "",
                        image: 'https://placehold.co/400x400.png',
                        'data-ai-hint': 'product item',
                        createdAt: serverTimestamp(),
                    });
                    addedCount++;
                });
                
                if (addedCount > 0) {
                    await productBatch.commit();
                }

                toast({ 
                    title: 'Impor Selesai', 
                    description: `${addedCount} produk berhasil ditambahkan.`
                });

                onImportSuccess();
                setIsOpen(false);
                setFile(null);

            } catch (error) {
                console.error("Error importing products:", error);
                toast({ variant: 'destructive', title: 'Gagal Mengimpor', description: "Terjadi kesalahan saat memproses file. Pastikan format sudah benar." });
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                    <Upload className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Impor Massal</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Impor Produk Massal</DialogTitle>
                    <DialogDescription>
                        Tambah banyak produk sekaligus menggunakan file Excel.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div>
                        <Label>Langkah 1: Download Template</Label>
                        <p className="text-sm text-muted-foreground mb-2">Gunakan template ini untuk memastikan format data Anda benar.</p>
                        <Button variant="secondary" onClick={handleDownloadTemplate}>
                            <FileDown className="mr-2 h-4 w-4" />
                            Download Template
                        </Button>
                    </div>
                    <div>
                        <Label htmlFor="excel-file">Langkah 2: Upload File</Label>
                        <p className="text-sm text-muted-foreground mb-2">Pilih file Excel (.xlsx) yang sudah Anda isi.</p>
                        <Input id="excel-file" type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                    <Button onClick={handleProcessImport} disabled={isProcessing || !file}>
                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Proses Impor
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ImageViewer({ src, alt }: { src: string, alt: string }) {
  return (
    <Dialog>
        <DialogTrigger asChild>
            <Image
                alt={alt}
                className="aspect-square rounded-md object-cover cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                height="64"
                src={src || 'https://placehold.co/64x64.png'}
                width="64"
            />
        </DialogTrigger>
        <DialogContent className="max-w-xl">
             <DialogHeader>
                <DialogTitle className="sr-only">{alt}</DialogTitle>
                <DialogDescription className="sr-only">Pratinjau gambar untuk {alt}</DialogDescription>
             </DialogHeader>
            <Image
                alt={alt}
                className="rounded-lg object-contain"
                height="800"
                src={src || 'https://placehold.co/800x800.png'}
                width="800"
            />
        </DialogContent>
    </Dialog>
  );
}

function ProductLogDialog({ product }: { product: Product }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<PurchaseHistoryItem[]>([]);

    const fetchPurchaseHistory = useCallback(async () => {
        if (!isOpen) return;
        setLoading(true);
        try {
            const q = query(
                collection(db, "purchase_history"),
                where("productId", "==", product.id),
                orderBy("purchaseDate", "desc")
            );
            const querySnapshot = await getDocs(q);
            const historyData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as PurchaseHistoryItem));
            setHistory(historyData);
        } catch (error) {
            console.error("Error fetching purchase history:", error);
        } finally {
            setLoading(false);
        }
    }, [isOpen, product.id]);

    useEffect(() => {
        fetchPurchaseHistory();
    }, [fetchPurchaseHistory]);
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" className="w-full justify-start">
                    <History className="mr-2 h-4 w-4" /> Log Produk
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Log Produk: {product.name}</DialogTitle>
                    <DialogDescription>
                        Riwayat pembelian untuk produk ini.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tanggal Beli</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead className="text-right">Jumlah</TableHead>
                                <TableHead className="text-right">Harga Beli</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center">Memuat riwayat...</TableCell></TableRow>
                            ) : history.length > 0 ? (
                                history.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            {item.purchaseDate ? format(item.purchaseDate.toDate(), 'dd MMM yyyy', { locale: dateFnsLocaleId }) : 'N/A'}
                                        </TableCell>
                                        <TableCell>{item.supplierName}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.purchasePrice)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center">Tidak ada riwayat pembelian.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}


export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const { toast } = useToast();
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });


  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const productsData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                price: parseCurrency(data.price), // Normalize price here
            } as Product;
        });
        setProducts(productsData);
    } catch (error) {
        console.error("Error fetching products:", error);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const sortProducts = (productsToSort: Product[], config: { key: string; direction: string; }) => {
    return [...productsToSort].sort((a, b) => {
        if (config.key === 'name') {
            return config.direction === 'asc' 
                ? a.name.localeCompare(b.name) 
                : b.name.localeCompare(a.name);
        }
        if (config.key === 'stock') {
            const stockA = a.stock || 0;
            const stockB = b.stock || 0;
            return config.direction === 'asc' ? stockA - stockB : stockB - stockA;
        }
        return 0;
    });
  };

  const sortedAndFilteredProducts = useMemo(() => {
    let filtered = products;
    if (searchTerm) {
        const lowercasedFilter = searchTerm.toLowerCase();
        filtered = products.filter(product => {
            const nameMatch = product.name.toLowerCase().includes(lowercasedFilter);
            const skuMatch = String(product.sku || '').toLowerCase().includes(lowercasedFilter);
            return nameMatch || skuMatch;
        });
    }
    return sortProducts(filtered, sortConfig);
  }, [searchTerm, products, sortConfig]);


  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedAndFilteredProducts.slice(startIndex, endIndex);
  }, [currentPage, itemsPerPage, sortedAndFilteredProducts]);

  const totalPages = Math.ceil(sortedAndFilteredProducts.length / itemsPerPage);


  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setIsSheetOpen(true);
  };
  
  const handleSheetOpenChange = (open: boolean) => {
      setIsSheetOpen(open);
      if (!open) {
          setEditingProduct(undefined);
      }
  }

  const handleDeleteProduct = async (productId: string) => {
    try {
        await deleteDoc(doc(db, "products", productId));
        toast({
            title: "Produk Dihapus",
            description: "Produk telah berhasil dihapus dari database.",
        });
        fetchProducts(); // Refresh the product list
    } catch (error) {
        console.error("Error deleting product:", error);
        toast({
            variant: "destructive",
            title: "Gagal Menghapus Produk",
            description: "Terjadi kesalahan saat menghapus produk.",
        });
    }
  };

  const handleDeleteSelectedProducts = async () => {
    if (selectedProducts.length === 0) return;
    const batch = writeBatch(db);
    selectedProducts.forEach(id => {
        batch.delete(doc(db, "products", id));
    });

    try {
        await batch.commit();
        toast({
            title: `${selectedProducts.length} Produk Dihapus`,
            description: "Produk yang dipilih telah berhasil dihapus.",
        });
        setSelectedProducts([]);
        fetchProducts();
    } catch (error) {
        console.error("Error deleting selected products:", error);
        toast({
            variant: "destructive",
            title: "Gagal Menghapus Produk",
            description: "Terjadi kesalahan saat menghapus produk yang dipilih.",
        });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
        setSelectedProducts(paginatedProducts.map(p => p.id));
    } else {
        setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
        setSelectedProducts(prev => [...prev, productId]);
    } else {
        setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  const isAllOnPageSelected = paginatedProducts.length > 0 && selectedProducts.length === paginatedProducts.length;

  
  const toggleSortDirection = (key: string) => {
    setSortConfig(prev => {
        if (prev.key === key) {
            return { ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        }
        return { key, direction: 'asc' };
    });
  };

  const renderSortControls = () => (
    <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Cari produk berdasarkan nama atau SKU..."
                className="w-full pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="flex gap-2">
            <BarcodeScannerDialog onScanSuccess={setSearchTerm} />
            <Select value={sortConfig.key} onValueChange={(value) => setSortConfig(prev => ({ ...prev, key: value }))}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Urutkan berdasarkan" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="name">Nama Produk</SelectItem>
                    <SelectItem value="stock">Stok</SelectItem>
                </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => toggleSortDirection(sortConfig.key)}>
                {sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                <span className="sr-only">Toggle urutan</span>
            </Button>
        </div>
    </div>
  );


  return (
    <>
    <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Manajemen Produk</CardTitle>
                    <CardDescription>
                        Kelola produk Anda dan lihat performa penjualannya.
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    {selectedProducts.length > 0 && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="h-8 gap-1">
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span className="sr-only sm:not-sr-only">Hapus ({selectedProducts.length})</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Tindakan ini akan menghapus {selectedProducts.length} produk secara permanen. Aksi ini tidak dapat diurungkan.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteSelectedProducts} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                        Ya, Hapus Produk
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    <BulkImportDialog onImportSuccess={fetchProducts} />
                    <ProductSheet onProductAdded={fetchProducts} />
                </div>
            </div>
            {renderSortControls()}
        </CardHeader>
        <CardContent>
            <div className="relative w-full overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead className="w-[40px]">
                            <Checkbox
                                checked={isAllOnPageSelected}
                                onCheckedChange={handleSelectAll}
                                aria-label="Pilih semua"
                            />
                        </TableHead>
                        <TableHead className="w-[64px]">
                            <span className="sr-only">Image</span>
                        </TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead className="hidden md:table-cell">Stok</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Harga Beli</TableHead>
                        <TableHead className="text-right">Harga Jual</TableHead>
                        <TableHead className="w-[50px] text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">Memuat produk...</TableCell>
                            </TableRow>
                        ) : paginatedProducts.length > 0 ? (
                            paginatedProducts.map((product) => (
                                <TableRow key={product.id} data-state={selectedProducts.includes(product.id) && "selected"}>
                                    <TableCell>
                                            <Checkbox
                                            checked={selectedProducts.includes(product.id)}
                                            onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                                            aria-label={`Pilih produk ${product.name}`}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <ImageViewer src={product.image} alt={product.name}/>
                                    </TableCell>
                                    <TableCell className="font-medium">{product.name}</TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <Badge className={cn({
                                            'bg-destructive text-destructive-foreground hover:bg-destructive/80': product.stock === 0,
                                            'bg-orange-500 text-white hover:bg-orange-500/80': product.stock > 0 && product.stock <= 5,
                                        })}>
                                            {product.stock > 0 ? `${product.stock}` : 'Habis'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right hidden sm:table-cell">{formatCurrency(product.purchasePrice || 0)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                                    <TableCell className="text-right">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm">
                                                    <Eye className="mr-2 h-4 w-4"/>
                                                    Lihat
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-md">
                                                <DialogHeader>
                                                    <DialogTitle>Aksi untuk: {product.name}</DialogTitle>
                                                    <DialogDescription>Detail produk dan aksi yang bisa dilakukan.</DialogDescription>
                                                </DialogHeader>
                                                
                                                <div className="py-4 space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">SKU</span>
                                                        <span className="font-medium">{product.sku}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Kategori</span>
                                                        <span className="font-medium">{product.category}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Stok Saat Ini</span>
                                                        <span className="font-medium">{product.stock}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Harga Beli</span>
                                                        <span className="font-medium">{formatCurrency(product.purchasePrice || 0)}</span>
                                                    </div>
                                                        <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Harga Jual</span>
                                                        <span className="font-medium">{formatCurrency(product.price)}</span>
                                                    </div>
                                                        <div className="space-y-1">
                                                        <span className="text-muted-foreground">Deskripsi</span>
                                                        <p className="font-medium p-2 bg-muted rounded-md">{product.description || 'Tidak ada deskripsi.'}</p>
                                                    </div>
                                                </div>

                                                <Separator />
                                                <div className="grid grid-cols-1 gap-2 py-2">
                                                    <Button variant="outline" className="w-full justify-start" onClick={() => handleEditClick(product)}>
                                                        <Edit className="mr-2 h-4 w-4"/> Edit Produk
                                                    </Button>
                                                    <ProductLogDialog product={product} />
                                                        <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="destructive" className="w-full justify-start">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Hapus Produk
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Tindakan ini akan menghapus produk <span className="font-bold">{product.name}</span> secara permanen. Aksi ini tidak dapat diurungkan.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteProduct(product.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Ya, Hapus Produk</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    Tidak ada produk yang cocok dengan pencarian Anda.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
            <CardFooter>
            <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                <div className="flex-1">
                    Menampilkan {paginatedProducts.length} dari {sortedAndFilteredProducts.length} produk.
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
                                <SelectValue placeholder={itemsPerPage} />
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

     <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent>
            {editingProduct && <ProductForm product={editingProduct} onSave={fetchProducts} onOpenChange={handleSheetOpenChange} />}
        </SheetContent>
    </Sheet>
    </>
  )
}
