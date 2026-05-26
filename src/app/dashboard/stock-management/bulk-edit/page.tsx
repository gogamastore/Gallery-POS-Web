
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Download, Upload, FileUp, CheckCircle, Loader2, XCircle, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { collection, getDocs, query, where, writeBatch, doc, orderBy, limit, startAt } from "firebase/firestore";
import { db } from "@/lib/firebase";
import * as XLSX from "xlsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  category: string;
  price: string;
  purchasePrice?: number;
}

interface ProductCategory {
  id: string;
  name: string;
}

interface ExportFilter {
    orderBy: 'name' | 'sku';
    range: 'all' | 'zero_stock' | string; // string for range like "0-500"
}

const parseCurrency = (value: string): number => {
    if (!value || typeof value !== 'string') return 0;
    return Number(String(value).replace(/[^0-9]/g, ''));
}


const ProductSelectionDialog = ({ onSelect, currentFilter }: { onSelect: (filter: ExportFilter) => void, currentFilter: ExportFilter }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState<ExportFilter>(currentFilter);

    const handleSave = () => {
        onSelect(filter);
        setIsOpen(false);
    }
    
    // Logic for range options
    const productCount = 5000; // Assume a large number or fetch if needed
    const ranges = [];
    for (let i = 0; i < productCount; i += 500) {
        ranges.push(`${i}-${i + 500}`);
    }

    return (
         <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline">Pilih Baris Tertentu</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Filter baris data barang yang akan di Export</DialogTitle>
                    <DialogDescription>Anda dapat memilih untuk export Semua Barang, barang dengan stok 0, atau berdasarkan urutan tertentu.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-2">
                    <div>
                        <p className="font-semibold mb-2">Urutkan barang pada Excel berdasarkan:</p>
                         <RadioGroup value={filter.orderBy} onValueChange={(value) => setFilter(f => ({ ...f, orderBy: value as 'name' | 'sku' }))} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="sku" id="sku" />
                                <Label htmlFor="sku">Kode Barang (SKU)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="name" id="name" />
                                <Label htmlFor="name">Nama Barang</Label>
                            </div>
                        </RadioGroup>
                    </div>
                     <div>
                        <p className="font-semibold mb-2">Pilih Produk yang akan di Export:</p>
                        <RadioGroup value={filter.range} onValueChange={(value) => setFilter(f => ({ ...f, range: value }))}>
                            <ScrollArea className="h-60 border p-4 rounded-md">
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="all" id="all" />
                                        <Label htmlFor="all">Semua Data Produk</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="zero_stock" id="zero_stock" />
                                        <Label htmlFor="zero_stock">Produk dengan stok '0'</Label>
                                    </div>
                                     {ranges.map((range, index) => {
                                        const [start] = range.split('-');
                                        return(
                                            <div key={index} className="flex items-center space-x-2">
                                                <RadioGroupItem value={range} id={`range-${index}`} />
                                                <Label htmlFor={`range-${index}`}>Baris ke {Number(start) + 1} - {Number(start) + 500}</Label>
                                            </div>
                                        )
                                     })}
                                </div>
                            </ScrollArea>
                        </RadioGroup>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                    <Button onClick={handleSave}>Pilih</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const CategorySelectionDialog = ({ onSelect, selectedCategories }: { onSelect: (selected: string[]) => void, selectedCategories: string[] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [localSelected, setLocalSelected] = useState<string[]>(selectedCategories);
    
    const fetchCategories = async () => {
        setLoading(true);
        const snapshot = await getDocs(collection(db, "product_categories"));
        setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductCategory)));
        setLoading(false);
    };

    useEffect(() => {
        if(isOpen) fetchCategories();
    }, [isOpen]);
    
    const handleCheckboxChange = (name: string, checked: boolean) => {
        setLocalSelected(prev => checked ? [...prev, name] : prev.filter(cat => cat !== name));
    };

    const handleSaveSelection = () => {
        onSelect(localSelected);
        setIsOpen(false);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <Button type="button" variant="outline">Pilih Kategori Tertentu</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Pilih Kategori</DialogTitle></DialogHeader>
                 <ScrollArea className="h-72 border rounded-md p-4 space-y-2">
                     {loading ? <p>Memuat...</p> : categories.map(cat => (
                         <div key={cat.id} className="flex items-center space-x-2">
                             <Checkbox id={cat.id} checked={localSelected.includes(cat.name)} onCheckedChange={(checked) => handleCheckboxChange(cat.name, !!checked)}/>
                             <Label htmlFor={cat.id}>{cat.name}</Label>
                         </div>
                     ))}
                 </ScrollArea>
                <DialogFooter>
                    <Button onClick={handleSaveSelection}>Simpan Pilihan ({localSelected.length})</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


export default function BulkEditStockPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [exportType, setExportType] = useState('specific'); // 'specific' or 'category'
    const [specificFilter, setSpecificFilter] = useState<ExportFilter>({ orderBy: 'name', range: 'all' });
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState("Tidak ada file terpilih!");

    const filterDescription = useMemo(() => {
        if (exportType === 'specific') {
            const { orderBy, range } = specificFilter;
            const orderText = orderBy === 'name' ? 'Nama Barang' : 'Kode Barang';
            let rangeText = '';
            if (range === 'all') rangeText = 'Semua Produk';
            else if (range === 'zero_stock') rangeText = 'Stok 0';
            else rangeText = `Baris ${Number(range.split('-')[0]) + 1} - ${Number(range.split('-')[1])}`;
            return `Urut berdasarkan ${orderText}, ${rangeText}.`;
        }
        if (exportType === 'category' && selectedCategories.length > 0) {
            return `Kategori: ${selectedCategories.join(', ')}.`;
        }
        return "Belum ada filter yang dipilih!";
    }, [exportType, specificFilter, selectedCategories]);

    const handleExport = async () => {
        setIsProcessing(true);
        try {
            let productsQuery;
             if (exportType === 'category') {
                if (selectedCategories.length === 0) {
                     toast({ variant: "destructive", title: "Tidak ada kategori dipilih" });
                     return;
                }
                productsQuery = query(collection(db, "products"), where('category', 'in', selectedCategories));
            } else { // specific filter
                 const { orderBy: orderByField, range } = specificFilter;
                 let q = query(collection(db, "products"), orderBy(orderByField, 'asc'));

                if(range === 'zero_stock'){
                     q = query(collection(db, "products"), where('stock', '==', 0), orderBy(orderByField, 'asc'));
                }
                
                productsQuery = q;
            }

            const snapshot = await getDocs(productsQuery);
            let productsToExport = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    sku: data.sku,
                    name: data.name,
                    stock: data.stock,
                    price: parseCurrency(data.price),
                    purchasePrice: data.purchasePrice || 0,
                }
            });
            
            // Manual slicing for range
            if (exportType === 'specific' && specificFilter.range !== 'all' && specificFilter.range !== 'zero_stock') {
                 const [start, end] = specificFilter.range.split('-').map(Number);
                 productsToExport = productsToExport.slice(start, end);
            }

            if (productsToExport.length === 0) {
                toast({ variant: "destructive", title: "Tidak ada produk untuk diekspor" });
                return;
            }

            const worksheet = XLSX.utils.json_to_sheet(productsToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Stok Produk");
            XLSX.writeFile(workbook, "update_stok_harga_produk.xlsx");

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Gagal mengekspor data" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" && selectedFile.type !== 'application/vnd.ms-excel') {
                toast({ variant: 'destructive', title: "Format File Salah", description: "Harap unggah file .xlsx atau .xls" });
                return;
            }
            setFile(selectedFile);
            setFileName(selectedFile.name);
        }
    }

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            toast({ variant: 'destructive', title: "Tidak ada file untuk diunggah" });
            return;
        }
        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0 || !json[0].id) {
                    throw new Error("Format file salah atau kolom 'id' tidak ditemukan.");
                }
                
                const batch = writeBatch(db);
                let updatedCount = 0;
                
                for (const row of json) {
                    const { id, stock, price, purchasePrice } = row;
                    if (id) {
                        const productRef = doc(db, "products", String(id));
                        
                        const updates: any = {};
                        if (stock !== undefined && stock !== null && typeof stock === 'number') {
                            updates.stock = stock;
                        }
                        if (price !== undefined && price !== null && typeof price === 'number') {
                            updates.price = new Intl.NumberFormat("id-ID", {
                                style: "currency",
                                currency: "IDR",
                                minimumFractionDigits: 0,
                            }).format(price);
                        }
                        if (purchasePrice !== undefined && purchasePrice !== null && typeof purchasePrice === 'number') {
                            updates.purchasePrice = purchasePrice;
                        }
                        
                        if (Object.keys(updates).length > 0) {
                            batch.update(productRef, updates);
                            updatedCount++;
                        }
                    }
                }
                
                if (updatedCount > 0) {
                    await batch.commit();
                }

                toast({ title: "File Berhasil Diproses", description: `${updatedCount} produk telah diperbarui datanya.` });
                setFile(null);
                setFileName("Tidak ada file terpilih!");

            } catch (error: any) {
                console.error(error);
                toast({ variant: 'destructive', title: "Gagal memproses file", description: error.message || "Pastikan format file Anda sudah benar." });
            } finally {
                setIsProcessing(false);
            }
        }
        reader.readAsArrayBuffer(file);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Kembali ke Manajemen Stok</span>
                </Button>
                <div>
                    <CardTitle>Import / Export Edit Data</CardTitle>
                    <CardDescription>
                        Sesuaikan stok, harga jual, dan harga beli secara massal.
                    </CardDescription>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Alur Kerja Pembaruan Massal</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpload}>
                        <ol className="list-decimal list-inside space-y-8 font-medium">
                            {/* Step 1: Export */}
                            <li>
                                <span>Export Barang (.xlsx)</span>
                                <Card className="p-4 mt-2">
                                    <p className="text-sm font-normal text-muted-foreground mb-4">Pilih produk yang ingin diubah datanya.</p>
                                    <div className="flex items-center gap-4">
                                        <ProductSelectionDialog onSelect={setSpecificFilter} currentFilter={specificFilter} />
                                        <CategorySelectionDialog onSelect={setSelectedCategories} selectedCategories={selectedCategories} />
                                    </div>
                                    <div className="mt-4 space-y-2">
                                        <p className="text-sm">
                                            <span className="font-semibold">Filter Baris:</span> {filterDescription}
                                        </p>
                                        <p className="text-sm">
                                            <span className="font-semibold">Filter Kategori:</span> {selectedCategories.length > 0 ? selectedCategories.join(', ') : 'Belum ada kategori terpilih.'}
                                        </p>
                                    </div>
                                </Card>
                                <Button type="button" onClick={handleExport} disabled={isProcessing} className="mt-4">
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
                                    Export Barang
                                </Button>
                            </li>
                            {/* Step 2: Instructions */}
                             <li>
                                <span>Ubah Data Barang Anda</span>
                                <ul className="list-disc list-inside space-y-2 font-normal text-sm text-muted-foreground mt-2 pl-4">
                                    <li>Buka file Excel yang sudah diekspor, ubah nilai di kolom <strong>stock</strong>, <strong>price</strong> (harga jual), dan/atau <strong>purchasePrice</strong> (harga beli).</li>
                                    <li>Jangan mengubah nilai pada kolom lain, terutama kolom <strong>id</strong> dan <strong>sku</strong>.</li>
                                    <li>Setelah selesai, simpan file tersebut.</li>
                                    <li>Maksimal menampung <strong>500 data barang</strong> per file.</li>
                                </ul>
                            </li>
                            {/* Step 3: Upload */}
                            <li>
                                <span>Pilih File yang telah anda edit di sini</span>
                                 <ul className="list-disc list-inside space-y-2 font-normal text-sm text-muted-foreground mt-2 pl-4 mb-4">
                                    <li>Pastikan file dalam format .xlsx.</li>
                                    <li>Ukuran File Maksimal 10 MB.</li>
                                </ul>
                                <Card className="p-4 max-w-md">
                                    <div className="flex flex-col items-center justify-center space-y-2">
                                        <FileUp className="w-12 h-12 text-muted-foreground" />
                                        <Label htmlFor="file-upload" className="cursor-pointer bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md text-sm font-semibold">
                                            Pilih File
                                        </Label>
                                        <input id="file-upload" type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileChange}/>
                                        <p className="text-xs text-muted-foreground">{fileName}</p>
                                    </div>
                                </Card>
                            </li>
                            {/* Step 4: Submit */}
                             <li>
                                <span>Klik Submit untuk unggah Excel</span>
                                <div className="mt-2">
                                    <Button type="submit" disabled={!file || isProcessing}>
                                         {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4" />}
                                        Submit File
                                    </Button>
                                </div>
                            </li>
                        </ol>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

    