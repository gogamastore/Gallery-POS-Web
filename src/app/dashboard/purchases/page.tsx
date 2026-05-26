
"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { collection, getDocs, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PlusCircle, Search, ShoppingCart, Trash2, XCircle, ChevronLeft, ChevronRight, ArrowRight, ArrowUp, ArrowDown, Minus, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePurchaseCart, type CartItem } from "@/hooks/use-purchase-cart";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarcodeScannerDialog } from "@/components/barcode-scanner-dialog";


interface Product {
  id: string;
  name: string;
  sku: string;
  price: string;
  stock: number;
  image: string;
  purchasePrice?: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

function AddToCartDialog({ product, onAddToCart }: { product: Product, onAddToCart: (quantity: number, purchasePrice: number) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState(product.purchasePrice || 0);

  const handleSave = () => {
    onAddToCart(quantity, purchasePrice);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tambah ke Keranjang Pembelian</DialogTitle>
          <DialogDescription>
            Masukkan jumlah dan harga beli untuk produk: <strong>{product.name}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Jumlah
            </Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="col-span-3"
              min="1"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="purchase-price" className="text-right">
              Harga Beli (satuan)
            </Label>
            <Input
              id="purchase-price"
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(Number(e.target.value))}
              className="col-span-3"
              min="0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function EditCartItemDialog({ item, onUpdate, children }: { item: CartItem, onUpdate: (updates: { quantity?: number, purchasePrice?: number }) => void, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(item.quantity);
  const [purchasePrice, setPurchasePrice] = useState(item.purchasePrice);

  const handleSave = () => {
    onUpdate({ quantity, purchasePrice });
    setIsOpen(false);
  };

  // Reset state when dialog opens with a new item's data
  useEffect(() => {
    if (isOpen) {
        setQuantity(item.quantity);
        setPurchasePrice(item.purchasePrice);
    }
  }, [isOpen, item]);


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Item: {item.name}</DialogTitle>
          <DialogDescription>
            Ubah jumlah dan harga beli untuk produk ini.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity-edit" className="text-right">
              Jumlah
            </Label>
            <Input
              id="quantity-edit"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="col-span-3"
              min="1"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="purchase-price-edit" className="text-right">
              Harga Beli (satuan)
            </Label>
            <Input
              id="purchase-price-edit"
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(Number(e.target.value))}
              className="col-span-3"
              min="0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave}>Simpan Perubahan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PurchaseTransactionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { cart, addToCart, removeFromCart, clearCart, updateCartItem, totalPurchase } = usePurchaseCart();
  const { toast } = useToast();
  const router = useRouter();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "products"));
      const productsData = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Product)
      );
      setProducts(productsData);
      setLoading(false);
    };
    fetchProducts();
  }, []);

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
    const lowercasedFilter = searchTerm.toLowerCase();
    let filtered = products;
    if (lowercasedFilter) {
      filtered = products.filter((product) => {
          const nameMatch = product.name.toLowerCase().includes(lowercasedFilter);
          const skuMatch = product.sku ? String(product.sku).toLowerCase().includes(lowercasedFilter) : false;
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

  const toggleSortDirection = (key: string) => {
    setSortConfig(prev => {
        if (prev.key === key) {
            return { ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        }
        return { key, direction: 'asc' };
    });
  };

  const handleAddToCart = (product: Product, quantity: number, purchasePrice: number) => {
    addToCart({ ...product, quantity, purchasePrice });
     toast({
        title: "Produk Ditambahkan",
        description: `${product.name} telah ditambahkan ke keranjang.`,
    });
  };

  const handleProceedToPayment = () => {
      if(cart.length === 0) {
          toast({ variant: 'destructive', title: 'Keranjang Kosong', description: 'Silakan tambahkan produk terlebih dahulu.'});
          return;
      }
      router.push('/dashboard/purchases/process-payment');
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Product List */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Daftar Produk</CardTitle>
            <CardDescription>Cari dan pilih produk untuk ditambahkan ke keranjang pembelian.</CardDescription>
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
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="hidden w-[80px] sm:table-cell">Gambar</TableHead>
                            <TableHead>Produk</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Stok Saat Ini</TableHead>
                            <TableHead className="text-right w-[120px]">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">Memuat produk...</TableCell>
                            </TableRow>
                        ) : paginatedProducts.length > 0 ? (
                            paginatedProducts.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell className="hidden sm:table-cell">
                                        <Image
                                            alt={product.name}
                                            className="aspect-square rounded-md object-cover"
                                            height="64"
                                            src={product.image || "https://placehold.co/64x64.png"}
                                            width="64"
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">{product.name}</TableCell>
                                    <TableCell>{product.sku}</TableCell>
                                    <TableCell>{product.stock}</TableCell>
                                    <TableCell className="text-right">
                                        <AddToCartDialog 
                                            product={product} 
                                            onAddToCart={(quantity, purchasePrice) => handleAddToCart(product, quantity, purchasePrice)} 
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">Produk tidak ditemukan.</TableCell>
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
                                <SelectValue placeholder={`${itemsPerPage}`} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[10, 20].map((pageSize) => (
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
      </div>

      {/* Purchase Cart */}
      <div>
        <Card className="sticky top-20">
          <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Keranjang Pembelian</CardTitle>
                    <CardDescription>Daftar produk yang akan dibeli.</CardDescription>
                </div>
                 <Button variant="ghost" size="icon" onClick={clearCart} disabled={cart.length === 0}>
                    <XCircle className="h-5 w-5" />
                    <span className="sr-only">Kosongkan Keranjang</span>
                 </Button>
            </div>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto">
            {cart.length > 0 ? (
                <div className="overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Produk</TableHead>
                                <TableHead className="text-right">Subtotal</TableHead>
                                <TableHead className="w-[40px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {cart.map(item => (
                                <EditCartItemDialog 
                                    key={item.id} 
                                    item={item} 
                                    onUpdate={(updates) => updateCartItem(item.id, updates)}
                                >
                                    <TableRow className="cursor-pointer">
                                        <TableCell>
                                            <div className="font-medium">{item.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {item.quantity} x {formatCurrency(item.purchasePrice)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(item.quantity * item.purchasePrice)}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                </EditCartItemDialog>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="text-center text-muted-foreground p-8">
                    <ShoppingCart className="mx-auto h-12 w-12" />
                    <p className="mt-4">Keranjang masih kosong</p>
                </div>
            )}
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-4 mt-4">
            <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(totalPurchase)}</span>
            </div>
            <Button onClick={handleProceedToPayment} disabled={cart.length === 0}>
                Lanjutkan ke Pembayaran
                <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
