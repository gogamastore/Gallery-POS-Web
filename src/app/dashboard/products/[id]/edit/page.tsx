"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import { ProductForm, type ProductFormData } from "@/components/dashboard/product-form";
import { useToast } from "@/hooks/use-toast";

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductFormData | null>(null);
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
        setProduct({ id: snap.id, ...snap.data() } as ProductFormData);
      } catch (error) {
        console.error("Error fetching product:", error);
        toast({ variant: "destructive", title: "Gagal memuat produk." });
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, router, toast]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) return null;

  return <ProductForm product={product} />;
}
