"use client";

export const dynamic = 'force-dynamic';

import Image from "next/image"
import { useRouter } from "next/navigation"
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
import { PlusCircle, ArrowUp, ArrowDown, Upload, FileDown, Loader2, Search, ChevronLeft, ChevronRight, Trash2, ChevronRight as ChevronRightIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox";
import { collection, getDocs, serverTimestamp, doc, writeBatch, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils";
import { BarcodeScannerDialog } from "@/components/barcode-scanner-dialog";


interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number; // Normalized to number
  purchasePrice?: number;
  stock: number;
  weightGram?: number;
  image: string;
  'data-ai-hint': string;
  description?: string;
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
            ["name", "sku", "price", "purchasePrice", "stock", "weightGram", "category", "description"],
            ["Kaos Polos", "KP-001", 120000, 75000, 100, 250, "Pakaian", "Kaos polos bahan katun combed 30s."],
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
                        weightGram: Number(row.weightGram) || 0,
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


export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
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
                    <Button size="sm" className="h-8 gap-1" onClick={() => router.push('/dashboard/products/new')}>
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                            Tambah Produk
                        </span>
                    </Button>
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
                        <TableHead className="w-[40px]"><span className="sr-only">Buka</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">Memuat produk...</TableCell>
                            </TableRow>
                        ) : paginatedProducts.length > 0 ? (
                            paginatedProducts.map((product) => (
                                <TableRow
                                    key={product.id}
                                    data-state={selectedProducts.includes(product.id) && "selected"}
                                    className="cursor-pointer"
                                    onClick={() => router.push(`/dashboard/products/${product.id}`)}
                                >
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            checked={selectedProducts.includes(product.id)}
                                            onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                                            aria-label={`Pilih produk ${product.name}`}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Image
                                            alt={product.name}
                                            className="aspect-square rounded-md object-cover"
                                            height={64}
                                            width={64}
                                            src={product.image || 'https://placehold.co/64x64.png'}
                                        />
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
                                    <TableCell className="text-right text-muted-foreground">
                                        <ChevronRightIcon className="ml-auto h-4 w-4" />
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
  )
}
