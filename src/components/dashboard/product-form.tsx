"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronLeft, ImagePlus, Loader2, Save } from "lucide-react";

interface ProductCategory {
  id: string;
  name: string;
}

export interface ProductFormData {
  id?: string;
  name?: string;
  sku?: string;
  category?: string;
  price?: number | string;
  purchasePrice?: number;
  stock?: number;
  weightGram?: number;
  description?: string;
  image?: string;
}

const parseCurrency = (value: string | number): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const num = Number(value.replace(/[^0-9]/g, ""));
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

function AddCategoryDialog({
  onCategoryAdded,
}: {
  onCategoryAdded: (newCategory: ProductCategory) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const { toast } = useToast();

  const handleAddCategory = async () => {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Nama kategori tidak boleh kosong" });
      return;
    }
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, "product_categories"), {
        name: name.trim(),
        createdAt: serverTimestamp(),
      });
      onCategoryAdded({ id: docRef.id, name: name.trim() });
      toast({ title: "Kategori baru ditambahkan" });
      setIsOpen(false);
      setName("");
    } catch (error) {
      console.error("Error adding category:", error);
      toast({ variant: "destructive", title: "Gagal menambah kategori" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-full text-left p-2 text-sm text-primary hover:bg-accent rounded-md"
        >
          + Tambah Kategori Baru
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Kategori Produk Baru</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="category-name">Nama Kategori</Label>
          <Input
            id="category-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Batal
          </Button>
          <Button onClick={handleAddCategory} disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan Kategori"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProductForm({ product }: { product?: ProductFormData }) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!product?.id;

  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    product?.image || null
  );
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categorySearch, setCategorySearch] = useState("");

  const [formData, setFormData] = useState({
    name: product?.name || "",
    sku: product?.sku || "",
    purchasePrice: product?.purchasePrice || 0,
    price: product ? parseCurrency(product.price ?? 0) : 0,
    stock: product?.stock || 0,
    weightGram: product?.weightGram || 0,
    category: product?.category || "",
    description: product?.description || "",
    image: product?.image || "",
  });

  useEffect(() => {
    const fetchCategories = async () => {
      const snapshot = await getDocs(collection(db, "product_categories"));
      const fetched = snapshot.docs.map((d) => ({ id: d.id, name: d.data().name }));
      fetched.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(fetched);
    };
    fetchCategories();
  }, []);

  const filteredCategories = useMemo(
    () =>
      categories.filter((cat) =>
        cat.name.toLowerCase().includes(categorySearch.toLowerCase())
      ),
    [categories, categorySearch]
  );

  const handleCategoryAdded = (newCategory: ProductCategory) => {
    const updated = [...categories, newCategory].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    setCategories(updated);
    setFormData((prev) => ({ ...prev, category: newCategory.name }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    const numericFields = ["purchasePrice", "price", "stock", "weightGram"];
    setFormData((prev) => ({
      ...prev,
      [id]: numericFields.includes(id) ? Number(value) : value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
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
        const storageRef = ref(
          storage,
          `product_images/${Date.now()}_${imageFile.name}`
        );
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      const dataToSave: any = {
        name: formData.name,
        sku: formData.sku,
        purchasePrice: formData.purchasePrice,
        price: formatRupiah(formData.price),
        weightGram: formData.weightGram || 0,
        category: formData.category,
        description: formData.description,
        image: imageUrl,
      };

      if (!dataToSave.image) {
        dataToSave.image = `https://placehold.co/400x400.png`;
        dataToSave["data-ai-hint"] = "product item";
      }

      if (isEdit && product?.id) {
        await updateDoc(doc(db, "products", product.id), dataToSave);
        toast({
          title: "Produk Berhasil Diperbarui",
          description: `${formData.name} telah diperbarui.`,
        });
        router.push(`/dashboard/products/${product.id}`);
      } else {
        const docRef = await addDoc(collection(db, "products"), {
          ...dataToSave,
          stock: formData.stock || 0,
          createdAt: serverTimestamp(),
        });
        toast({
          title: "Produk Berhasil Ditambahkan",
          description: `${formData.name} telah ditambahkan ke daftar produk.`,
        });
        router.push(`/dashboard/products/${docRef.id}`);
      }
      router.refresh();
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        variant: "destructive",
        title: `Gagal ${isEdit ? "Memperbarui" : "Menambahkan"} Produk`,
        description: "Terjadi kesalahan saat menyimpan data ke server.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-28">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">
            {isEdit ? "Edit Produk" : "Tambah Produk Baru"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? "Ubah detail produk yang sudah ada."
              : "Isi detail produk baru yang akan ditambahkan ke toko Anda."}
          </p>
        </div>
      </div>

      {/* Foto Produk */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Foto Produk</CardTitle>
          <CardDescription>
            Gunakan foto dengan rasio 1:1 agar tampil maksimal di etalase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border bg-muted">
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <ImagePlus className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Unggah Gambar</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              <p className="text-xs text-muted-foreground">
                Format JPG/PNG. Kosongkan untuk memakai gambar bawaan.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informasi Produk */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi Produk</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Produk</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Contoh: Kaos Polos Katun Combed 30s"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={handleInputChange}
                placeholder="Kode unik produk"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <Select
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
                value={formData.category}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Kategori Produk" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Cari kategori..."
                      className="h-8 w-full"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                    />
                  </div>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                  <Separator className="my-2" />
                  <AddCategoryDialog onCategoryAdded={handleCategoryAdded} />
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={5}
              placeholder="Jelaskan detail, bahan, dan keunggulan produk..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Harga & Stok */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Harga, Stok & Pengiriman</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Harga Beli (Modal)</Label>
              <Input
                id="purchasePrice"
                type="number"
                value={formData.purchasePrice}
                onChange={handleInputChange}
                placeholder="Harga modal produk"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Harga Jual</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="Harga yang tampil di toko"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stock">Stok {isEdit ? "(Saat Ini)" : "Awal"}</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={handleInputChange}
                disabled={isEdit}
                placeholder={isEdit ? "Atur via Manajemen Stok" : "Jumlah stok awal"}
              />
              {isEdit && (
                <p className="text-xs text-muted-foreground">
                  Stok diatur melalui menu Manajemen Stok.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="weightGram">Berat Produk (gram)</Label>
              <Input
                id="weightGram"
                type="number"
                value={formData.weightGram}
                onChange={handleInputChange}
                placeholder="Contoh: 500"
              />
              <p className="text-xs text-muted-foreground">
                Dipakai untuk menghitung ongkos kirim (Biteship). Default 200 gram bila kosong.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-end gap-2 px-4 py-3">
          <Button variant="outline" onClick={() => router.back()} disabled={loading}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {loading ? "Menyimpan..." : "Simpan Produk"}
          </Button>
        </div>
      </div>
    </div>
  );
}
