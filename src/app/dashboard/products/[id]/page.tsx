"use client";

export const dynamic = "force-dynamic";

import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id as dateFnsLocaleId } from "date-fns/locale";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeft,
  Edit,
  History,
  Loader2,
  Trash2,
  Package,
  Scale,
  Tag,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  purchasePrice?: number;
  stock: number;
  weightGram?: number;
  image: string;
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
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const num = Number(value.replace(/[^0-9]/g, ""));
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

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
      setHistory(
        querySnapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as PurchaseHistoryItem)
        )
      );
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
        <Button variant="outline" className="w-full sm:w-auto">
          <History className="mr-2 h-4 w-4" /> Log Produk
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log Produk: {product.name}</DialogTitle>
          <DialogDescription>Riwayat pembelian untuk produk ini.</DialogDescription>
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
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Memuat riwayat...
                  </TableCell>
                </TableRow>
              ) : history.length > 0 ? (
                history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.purchaseDate
                        ? format(item.purchaseDate.toDate(), "dd MMM yyyy", {
                            locale: dateFnsLocaleId,
                          })
                        : "N/A"}
                    </TableCell>
                    <TableCell>{item.supplierName}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.purchasePrice)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Tidak ada riwayat pembelian.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-right text-sm font-medium">{children}</div>
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) return;
      try {
        const snap = await getDoc(doc(db, "products", productId));
        if (!snap.exists()) {
          toast({ variant: "destructive", title: "Produk tidak ditemukan." });
          router.push("/dashboard/products");
          return;
        }
        const data = snap.data();
        setProduct({
          id: snap.id,
          ...data,
          price: parseCurrency(data.price),
        } as Product);
      } catch (error) {
        console.error("Error fetching product:", error);
        toast({ variant: "destructive", title: "Gagal memuat produk." });
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, router, toast]);

  const handleDelete = async () => {
    if (!product) return;
    try {
      await deleteDoc(doc(db, "products", product.id));
      toast({
        title: "Produk Dihapus",
        description: "Produk telah berhasil dihapus dari database.",
      });
      router.push("/dashboard/products");
      router.refresh();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        variant: "destructive",
        title: "Gagal Menghapus Produk",
        description: "Terjadi kesalahan saat menghapus produk.",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) return null;

  const margin = (product.price || 0) - (product.purchasePrice || 0);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Detail Produk</h1>
            <p className="text-sm text-muted-foreground">
              Informasi lengkap dan aksi produk.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProductLogDialog product={product} />
          <Button onClick={() => router.push(`/dashboard/products/${product.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" /> Edit Produk
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        {/* Image */}
        <Card className="overflow-hidden">
          <div className="aspect-square w-full bg-muted">
            <Image
              src={product.image || "https://placehold.co/400x400.png"}
              alt={product.name}
              width={400}
              height={400}
              className="h-full w-full object-cover"
            />
          </div>
        </Card>

        {/* Main info */}
        <div className="space-y-4">
          <div>
            {product.category && (
              <Badge variant="secondary" className="mb-2">
                {product.category}
              </Badge>
            )}
            <h2 className="text-2xl font-bold">{product.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">SKU: {product.sku}</p>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-primary">
              {formatCurrency(product.price)}
            </span>
            <Badge
              className={cn({
                "bg-destructive text-destructive-foreground hover:bg-destructive/80":
                  product.stock === 0,
                "bg-orange-500 text-white hover:bg-orange-500/80":
                  product.stock > 0 && product.stock <= 5,
                "bg-green-100 text-green-700 hover:bg-green-100":
                  product.stock > 5,
              })}
            >
              {product.stock > 0 ? `Stok ${product.stock}` : "Stok Habis"}
            </Badge>
          </div>

          <Card>
            <CardContent className="divide-y px-4 py-1">
              <InfoRow icon={Tag} label="Harga Beli (Modal)">
                {formatCurrency(product.purchasePrice || 0)}
              </InfoRow>
              <InfoRow icon={Tag} label="Margin / Untung">
                <span className={margin >= 0 ? "text-green-600" : "text-destructive"}>
                  {formatCurrency(margin)}
                </span>
              </InfoRow>
              <InfoRow icon={Boxes} label="Stok Saat Ini">
                {product.stock}
              </InfoRow>
              <InfoRow icon={Scale} label="Berat Produk">
                {product.weightGram ? `${product.weightGram} gram` : "Belum diatur (default 200 gram)"}
              </InfoRow>
              <InfoRow icon={Package} label="Kategori">
                {product.category || "-"}
              </InfoRow>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deskripsi Produk</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
            {product.description || "Tidak ada deskripsi untuk produk ini."}
          </p>
        </CardContent>
      </Card>

      <Separator />

      {/* Danger zone */}
      <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div>
          <p className="font-medium">Hapus Produk</p>
          <p className="text-sm text-muted-foreground">
            Tindakan ini permanen dan tidak dapat diurungkan.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Hapus
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini akan menghapus produk{" "}
                <span className="font-bold">{product.name}</span> secara permanen.
                Aksi ini tidak dapat diurungkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Ya, Hapus Produk
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
