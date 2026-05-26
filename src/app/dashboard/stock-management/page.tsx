

"use client";

export const dynamic = 'force-dynamic';

import Image from "next/image"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown, Search, ArrowUpDown, Upload, FileDown, ChevronLeft, ChevronRight, Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { collection, getDocs, doc, updateDoc, writeBatch, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils";
import Link from "next/link";
import * as XLSX from "xlsx";
import { BarcodeScannerDialog } from "@/components/barcode-scanner-dialog";


interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: string;
  purchasePrice?: number;
  stock: number;
  image: string;
  'data-ai-hint': string;
  description?: string;
}

function AdjustStockDialog({ product, onStockAdjusted }: { product: Product, onStockAdjusted: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [adjustment, setAdjustment] = useState({
        type: 'in', // 'in' or 'out'
        quantity: 0,
        reason: ''
    });
    const { toast } = useToast();

    const handleAdjustStock = async () => {
        if (adjustment.quantity <= 0 || !adjustment.reason) {
            toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Jumlah dan alasan harus diisi.' });
            return;
        }
        if (adjustment.type === 'out' && adjustment.quantity > product.stock) {
            toast({ variant: 'destructive', title: 'Stok Tidak Cukup', description: 'Jumlah penarikan stok melebihi stok yang tersedia.' });
            return;
        }

        setLoading(true);
        const batch = writeBatch(db);

        try {
            // 1. Update product stock
            const productRef = doc(db, "products", product.id);
            const newStock = adjustment.type === 'in'
                ? product.stock + adjustment.quantity
                : product.stock - adjustment.quantity;
            batch.update(productRef, { stock: newStock });

            // 2. Create stock adjustment log
            const logRef = doc(collection(db, "stock_adjustments"));
            batch.set(logRef, {
                productId: product.id,
                productName: product.name,
                sku: product.sku,
                type: adjustment.type, // 'in' or 'out'
                quantity: adjustment.quantity,
                reason: adjustment.reason,
                previousStock: product.stock,
                newStock: newStock,
                createdAt: serverTimestamp()
            });
            
            await batch.commit();

            toast({ title: 'Stok Berhasil Disesuaikan', description: `Stok untuk ${product.name} telah diperbarui.` });
            onStockAdjusted();
            setIsOpen(false);
            setAdjustment({ type: 'in', quantity: 0, reason: '' }); // Reset form
        } catch (error) {
            console.error("Error adjusting stock:", error);
            toast({ variant: 'destructive', title: 'Gagal Menyesuaikan Stok' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">Sesuaikan Stok</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Penyesuaian Stok: {product.name}</DialogTitle>
                    <DialogDescription>Stok saat ini: <span className="font-bold">{product.stock}</span></DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <RadioGroup defaultValue="in" onValueChange={(value) => setAdjustment(p => ({ ...p, type: value }))}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="in" id="in" />
                            <Label htmlFor="in" className="flex items-center gap-2"><ArrowUp className="h-4 w-4 text-green-500" /> Stok Masuk</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="out" id="out" />
                            <Label htmlFor="out" className="flex items-center gap-2"><ArrowDown className="h-4 w-4 text-red-500" /> Stok Keluar</Label>
                        </div>
                    </RadioGroup>
                    <div className="space-y-1">
                        <Label htmlFor="quantity">Jumlah</Label>
                        <Input id="quantity" type="number" value={adjustment.quantity} onChange={e => setAdjustment(p => ({ ...p, quantity: Number(e.target.value) }))} min="1" />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="reason">Alasan Penyesuaian</Label>
                        <Textarea id="reason" placeholder="Contoh: Stok opname, barang rusak, retur..." value={adjustment.reason} onChange={e => setAdjustment(p => ({ ...p, reason: e.target.value }))} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                    <Button onClick={handleAdjustStock} disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
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


export default function StockManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [activeTab, setActiveTab] = useState("stock-management");

  const [pagination, setPagination] = useState({
    'stock-management': { currentPage: 1, itemsPerPage: 24 },
    'low-stock': { currentPage: 1, itemsPerPage: 24 },
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(productsData);
        
        const lowStockQuery = query(collection(db, "products"), where("stock", "<=", 5));
        const lowStockSnapshot = await getDocs(lowStockQuery);
        const lowStockData = lowStockSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setLowStockProducts(lowStockData);
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
  
  const sortedAndFilteredLowStockProducts = useMemo(() => {
    let filtered = lowStockProducts;
    if (searchTerm) {
        const lowercasedFilter = searchTerm.toLowerCase();
        filtered = lowStockProducts.filter(product => {
            const nameMatch = product.name.toLowerCase().includes(lowercasedFilter);
            const skuMatch = String(product.sku || '').toLowerCase().includes(lowercasedFilter);
            return nameMatch || skuMatch;
        });
    }
    return sortProducts(filtered, sortConfig);
  }, [searchTerm, lowStockProducts, sortConfig]);

  const handlePageChange = (tab: string, newPage: number) => {
    setPagination(prev => ({ ...prev, [tab]: { ...prev[tab as keyof typeof prev], currentPage: newPage } }));
  };

  const handleItemsPerPageChange = (tab: string, newSize: number) => {
    setPagination(prev => ({ ...prev, [tab]: { currentPage: 1, itemsPerPage: newSize } }));
  };
  
  const paginatedAllProducts = useMemo(() => {
      const { currentPage, itemsPerPage } = pagination['stock-management'];
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      return sortedAndFilteredProducts.slice(startIndex, endIndex);
  }, [pagination, sortedAndFilteredProducts]);

  const paginatedLowStockProducts = useMemo(() => {
      const { currentPage, itemsPerPage } = pagination['low-stock'];
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      return sortedAndFilteredLowStockProducts.slice(startIndex, endIndex);
  }, [pagination, sortedAndFilteredLowStockProducts]);

  const totalPagesAll = Math.ceil(sortedAndFilteredProducts.length / pagination['stock-management'].itemsPerPage);
  const totalPagesLowStock = Math.ceil(sortedAndFilteredLowStockProducts.length / pagination['low-stock'].itemsPerPage);


  const toggleSortDirection = (key: string) => {
    setSortConfig(prev => {
        if (prev.key === key) {
            return { ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        }
        return { key, direction: 'asc' };
    });
  };
  
  const handleExportStock = async () => {
    const dataToExport = products.map(({ id, sku, name, stock }) => ({ id, sku, name, stock }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Stok");
    XLSX.writeFile(workbook, "laporan_stok_produk.xlsx");
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
  
  const renderPaginationControls = (tab: 'stock-management' | 'low-stock') => {
    const { currentPage, itemsPerPage } = pagination[tab];
    const totalPages = tab === 'stock-management' ? totalPagesAll : totalPagesLowStock;
    const paginatedItems = tab === 'stock-management' ? paginatedAllProducts : paginatedLowStockProducts;
    const totalItems = tab === 'stock-management' ? sortedAndFilteredProducts.length : sortedAndFilteredLowStockProducts.length;
    
    return (
        <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
            <div className="flex-1">
                Menampilkan {paginatedItems.length} dari {totalItems} produk.
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <p>Baris per halaman</p>
                    <Select
                        value={`${itemsPerPage}`}
                        onValueChange={(value) => handleItemsPerPageChange(tab, Number(value))}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={itemsPerPage} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[24, 48, 96].map((pageSize) => (
                                <SelectItem key={pageSize} value={`${pageSize}`}>{pageSize}</SelectItem>
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
                        onClick={() => handlePageChange(tab, Math.max(currentPage - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePageChange(tab, Math.min(currentPage + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
  }


  return (
    <>
    <Tabs defaultValue="stock-management" onValueChange={(value) => { setSearchTerm(''); setActiveTab(value); }}>
        <div className="flex items-center justify-between">
            <TabsList>
                <TabsTrigger value="stock-management">Manajemen Stok</TabsTrigger>
                <TabsTrigger value="low-stock">Stok Menipis</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
                 <Button onClick={handleExportStock} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export Laporan Stok
                </Button>
                <Button asChild variant="outline">
                    <Link href="/dashboard/stock-management/bulk-edit">
                        <Upload className="mr-2 h-4 w-4" />
                        Import/Export Stok
                    </Link>
                </Button>
            </div>
        </div>
        <TabsContent value="low-stock">
            <Card>
                <CardHeader>
                    <CardTitle>Produk Stok Menipis</CardTitle>
                    <CardDescription>
                        Produk dengan jumlah stok 5 atau kurang. Segera restock!
                    </CardDescription>
                     {renderSortControls()}
                </CardHeader>
                <CardContent>
                     <div className="relative w-full overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[64px]">Gambar</TableHead>
                                    <TableHead>Nama Produk</TableHead>
                                    <TableHead className="hidden md:table-cell">SKU</TableHead>
                                    <TableHead className="text-right">Stok Tersisa</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">Memuat produk...</TableCell>
                                    </TableRow>
                                ) : paginatedLowStockProducts.length > 0 ? paginatedLowStockProducts.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <ImageViewer src={product.image} alt={product.name}/>
                                        </TableCell>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell className="hidden md:table-cell">{product.sku}</TableCell>
                                        <TableCell className="text-right">
                                          <Badge variant={product.stock === 0 ? "destructive" : "default"} className={cn({'bg-orange-500 text-white hover:bg-orange-500/80': product.stock > 0})}>{product.stock}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <AdjustStockDialog product={product} onStockAdjusted={fetchProducts} />
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">Tidak ada produk dengan stok menipis.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                     </div>
                </CardContent>
                <CardFooter>
                    {renderPaginationControls('low-stock')}
                </CardFooter>
            </Card>
        </TabsContent>
        <TabsContent value="stock-management">
            <Card>
                <CardHeader>
                    <CardTitle>Manajemen Stok</CardTitle>
                    <CardDescription>
                        Lakukan penyesuaian stok untuk produk Anda dan lihat riwayat perubahan.
                    </CardDescription>
                    {renderSortControls()}
                </CardHeader>
                <CardContent>
                     <div className="relative w-full overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[64px]">Gambar</TableHead>
                                    <TableHead>Nama Produk</TableHead>
                                    <TableHead className="hidden md:table-cell">SKU</TableHead>
                                    <TableHead className="text-center">Stok Saat Ini</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">Memuat produk...</TableCell>
                                    </TableRow>
                                ) : paginatedAllProducts.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <ImageViewer src={product.image} alt={product.name}/>
                                        </TableCell>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell className="hidden md:table-cell">{product.sku}</TableCell>
                                        <TableCell className="text-center font-bold">{product.stock}</TableCell>
                                        <TableCell className="text-right">
                                            <AdjustStockDialog product={product} onStockAdjusted={fetchProducts} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     </div>
                </CardContent>
                 <CardFooter>
                    {renderPaginationControls('stock-management')}
                </CardFooter>
            </Card>
        </TabsContent>
    </Tabs>
    </>
  )
}
    

    

    
