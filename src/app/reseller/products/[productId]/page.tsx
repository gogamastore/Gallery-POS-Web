
"use client"

import { useState, useEffect, useCallback, useMemo } from "react";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { flashSaleFromDoc, flashSaleStatus, type FlashSale } from "@/lib/flash-sale";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { sendChatMessage } from "@/lib/chat";
import { productChatMessage, productWhatsappMessage } from "@/lib/contact-admin";
import { ContactAdminDialog } from "@/components/reseller/contact-admin-dialog";
import { formatSold } from "@/lib/utils";
import ProductReviews from "@/components/reseller/product-reviews";
import {
  Loader2,
  ChevronLeft,
  Minus,
  Plus,
  ShoppingCart,
  ShieldCheck,
  Truck,
  Scale,
  Boxes,
  Tag,
  Star,
  RotateCcw,
  MessageCircleMore,
  Building,
  Info,
  Zap,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  'data-ai-hint'?: string;
  stock: number;
  description?: string;
  category?: string;
  brandId?: string;
  sku: string;
  weightGram?: number;
  isPromo?: boolean;
  discountPrice?: string;
  maxQtyPerBuyer?: number;
  ratingAvg?: number;
  ratingCount?: number;
  soldCount?: number;
}

interface Promotion {
    productId: string;
    discountPrice: number;
    startDate: Timestamp;
    endDate: Timestamp;
    maxQtyPerBuyer?: number;
}


const formatCurrency = (value: string | number): string => {
    const num = typeof value === 'string' ? Number(value.replace(/[^0-9]/g, '')) : value;
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(num);
}

export default function ProductDetailPage() {
  const [product, setProduct] = useState<Product | null>(null);
  const [brand, setBrand] = useState<{ id: string; name: string; logoUrl: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { addToCart, loading: cartLoading } = useCart();
  const { user } = useAuth();
  const productId = params.productId as string;

  // ── Flash sale aktif untuk produk ini (realtime) ──────────────────
  const [flashEvents, setFlashEvents] = useState<FlashSale[]>([]);
  const [nowTs, setNowTs] = useState<number>(() => Date.now());

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "flash_sales"),
      (snap) => setFlashEvents(snap.docs.map((d) => flashSaleFromDoc(d.id, d.data()))),
      () => {}
    );
    return () => unsub();
  }, []);
  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Event yang sedang AKTIF & memuat produk ini → harga flash override promo.
  const activeFlash = useMemo(() => {
    if (!productId) return null;
    const now = new Date(nowTs);
    for (const e of flashEvents) {
      if (flashSaleStatus(e, now) !== "active") continue;
      const item = e.products.find((p) => p.productId === productId);
      if (item && item.flashPrice > 0) {
        return {
          flashPrice: item.flashPrice,
          oneItemPerEvent: e.oneItemPerEvent,
          maxQtyPerBuyer: e.maxQtyPerBuyer,
        };
      }
    }
    return null;
  }, [flashEvents, nowTs, productId]);

  // Batas jumlah beli: flash sale > promo > stok.
  const maxQty = useMemo(() => {
    if (!product) return 1;
    const flashCap = activeFlash
      ? activeFlash.oneItemPerEvent
        ? 1
        : activeFlash.maxQtyPerBuyer ?? null
      : null;
    const promoCap =
      product.isPromo && product.maxQtyPerBuyer && product.maxQtyPerBuyer > 0
        ? product.maxQtyPerBuyer
        : null;
    const cap = flashCap != null ? flashCap : promoCap;
    return cap != null ? Math.min(product.stock, cap) : product.stock;
  }, [product, activeFlash]);

  // Pastikan jumlah tidak melebihi batas yang berlaku saat batas berubah.
  useEffect(() => {
    setQuantity((q) => Math.min(Math.max(1, q), Math.max(1, maxQty)));
  }, [maxQty]);

  const fetchProductDetails = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const productRef = doc(db, "products", productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        toast({ variant: "destructive", title: "Produk tidak ditemukan." });
        router.push("/reseller");
        return;
      }

      let productData: Product = { id: productSnap.id, ...productSnap.data() } as Product;

      // Check for active promotions
      const now = new Date();
      const promoQuery = query(
          collection(db, "promotions"),
          where("productId", "==", productId),
          where("endDate", ">", now)
      );
      const promoSnapshot = await getDocs(promoQuery);
      if (!promoSnapshot.empty) {
          const promoData = promoSnapshot.docs[0].data() as Promotion;
           if (promoData.startDate.toDate() <= now) {
                productData.isPromo = true;
                productData.discountPrice = formatCurrency(promoData.discountPrice);
                productData.maxQtyPerBuyer = promoData.maxQtyPerBuyer ?? undefined;
           }
      }

      // Brand (kartu brand yang bisa diketuk). Sembunyi bila brandId kosong /
      // brand tak ada. Hanya membaca koleksi `brands` (tidak mengubah produk).
      try {
        if (productData.brandId) {
          const bSnap = await getDoc(doc(db, "brands", productData.brandId));
          if (bSnap.exists()) {
            const bd = bSnap.data() as any;
            setBrand({ id: bSnap.id, name: (bd.name as string) || "", logoUrl: (bd.logoUrl as string) || "" });
          } else {
            setBrand(null);
          }
        } else {
          setBrand(null);
        }
      } catch (e) {
        console.error("Gagal memuat brand:", e);
        setBrand(null);
      }

      setProduct(productData);

    } catch (error) {
      console.error("Error fetching product:", error);
      toast({ variant: "destructive", title: "Gagal memuat detail produk." });
    } finally {
      setLoading(false);
    }
  }, [productId, router, toast]);

  useEffect(() => {
    fetchProductDetails();
  }, [fetchProductDetails]);

  const handleQuantityChange = (newQuantity: number) => {
    // Batas berlaku (flash sale / promo / stok) dihitung di `maxQty`.
    if (newQuantity >= 1 && newQuantity <= maxQty) {
        setQuantity(newQuantity);
    }
  }

  const handleAddToCart = async () => {
    // Tunggu keranjang selesai dimuat agar pengecekan batas 160 produk unik
    // memakai jumlah item yang akurat (menutup celah race saat buka tab baru).
    if (!product || cartLoading) return;
    setIsAddingToCart(true);
    try {
        await addToCart(product, quantity);
    } catch (error) {
        // Error toast is handled in the cart hook
    } finally {
        setIsAddingToCart(false);
    }
  }

  // Harga & link produk (dipakai untuk pesan Obrolan / WhatsApp).
  // Prioritas: flash sale aktif > promo > harga normal.
  const contactPrice = () =>
    activeFlash && activeFlash.flashPrice > 0
      ? activeFlash.flashPrice
      : product!.isPromo && product!.discountPrice
      ? Number(String(product!.discountPrice).replace(/[^0-9]/g, ""))
      : Number(String(product!.price).replace(/[^0-9]/g, ""));
  const contactLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://gallerypos.web.app";
    return `${origin}/reseller/products/${product!.id}`;
  };

  // Obrolan: kirim info produk ke chat aplikasi lalu buka halaman chat.
  const handleContactChat = async () => {
    if (!product || chatBusy) return;
    if (!user) { router.push("/"); return; }
    setChatBusy(true);
    try {
        await sendChatMessage({
            userId: user.uid,
            senderId: user.uid,
            senderRole: "user",
            text: productChatMessage({ name: product.name, price: contactPrice(), link: contactLink() }),
            userInfo: {
                name: user.displayName || undefined,
                email: user.email || undefined,
                photoURL: user.photoURL || undefined,
            },
        });
        setContactOpen(false);
        router.push("/reseller/chat");
    } catch {
        toast({ variant: "destructive", title: "Gagal membuka obrolan" });
    } finally {
        setChatBusy(false);
    }
  };



  if (loading) {
    return <div className="container mx-auto px-4 py-8 flex justify-center items-center h-[80vh]"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  }
  if (!product) {
    return <div className="container mx-auto px-4 py-8 text-center">Produk tidak ditemukan.</div>;
  }

  const stockAvailable = product.stock > 0;
  const numericPrice = Number(String(product.price).replace(/[^0-9]/g, ""));
  const numericDiscount = product.discountPrice
    ? Number(String(product.discountPrice).replace(/[^0-9]/g, ""))
    : 0;
  const promoPercent =
    product.isPromo && numericDiscount > 0 && numericPrice > 0
      ? Math.round(((numericPrice - numericDiscount) / numericPrice) * 100)
      : 0;

  // Tampilan harga: FLASH SALE aktif > promo > normal (realtime).
  const flashOn = !!activeFlash && activeFlash.flashPrice > 0 && activeFlash.flashPrice < numericPrice;
  const promoOn = !!(product.isPromo && product.discountPrice);
  const discounted = flashOn || promoOn;
  const shownDiscountPrice = flashOn ? activeFlash!.flashPrice : numericDiscount;
  const shownPercent = flashOn
    ? Math.round(((numericPrice - activeFlash!.flashPrice) / numericPrice) * 100)
    : promoPercent;

  return (
    <div className="pb-28 md:pb-12">
        <div className="container mx-auto px-4 py-6">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4 -ml-3 text-muted-foreground">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Kembali
            </Button>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                {/* Gallery */}
                <div className="md:sticky md:top-24 self-start">
                    <div className="relative aspect-square w-full overflow-hidden rounded-2xl border bg-muted shadow-sm">
                        <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover"
                            priority
                        />
                        {discounted && shownPercent > 0 && (
                            <div className="absolute left-4 top-4 rounded-full bg-destructive px-3 py-1 text-sm font-bold text-destructive-foreground shadow">
                                -{shownPercent}%
                            </div>
                        )}
                    </div>
                </div>

                {/* Info */}
                <div className="space-y-5">
                    <div className="space-y-2">
                        {product.category && (
                            <Badge variant="secondary" className="rounded-full">{product.category}</Badge>
                        )}
                        <h1 className="text-2xl sm:text-3xl font-bold font-headline leading-tight">{product.name}</h1>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                        key={i}
                                        className={`h-4 w-4 ${
                                            i < Math.round(product.ratingAvg ?? 0)
                                                ? "fill-amber-400 stroke-amber-400"
                                                : "fill-none stroke-muted-foreground/40"
                                        }`}
                                    />
                                ))}
                            </span>
                            <span>·</span>
                            <span>
                                {(product.ratingCount ?? 0) > 0
                                    ? `${(product.ratingAvg ?? 0).toFixed(1)} (${product.ratingCount} ulasan)`
                                    : "Belum ada ulasan"}
                            </span>
                            {(product.soldCount ?? 0) > 0 && (
                                <>
                                    <span>·</span>
                                    <span>{formatSold(product.soldCount ?? 0)} terjual</span>
                                </>
                            )}
                            {product.sku && (
                                <>
                                    <span>·</span>
                                    <span className="hidden sm:inline">SKU {product.sku}</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Price block */}
                    <div className="rounded-2xl bg-muted/50 p-5">
                        {discounted ? (
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-3xl sm:text-4xl font-bold text-primary">{formatCurrency(shownDiscountPrice)}</p>
                                    {shownPercent > 0 && (
                                        <span className="rounded bg-destructive/10 px-2 py-0.5 text-sm font-semibold text-destructive">
                                            -{shownPercent}%
                                        </span>
                                    )}
                                    {flashOn && (
                                        <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-sm font-semibold text-rose-600">
                                            <Zap className="h-3.5 w-3.5" /> Flash Sale
                                        </span>
                                    )}
                                </div>
                                <p className="text-base text-muted-foreground line-through">{formatCurrency(product.price)}</p>
                            </div>
                        ) : (
                            <p className="text-3xl sm:text-4xl font-bold text-primary">{formatCurrency(product.price)}</p>
                        )}
                    </div>

                    {/* Keterangan Flash Sale aktif */}
                    {flashOn && (
                        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-600">
                            <Zap className="h-4 w-4 shrink-0" />
                            <span>
                                Harga <strong>Flash Sale</strong> sedang berlangsung
                                {activeFlash!.oneItemPerEvent
                                    ? " — maksimal 1 produk & 1 pcs dari event ini"
                                    : activeFlash!.maxQtyPerBuyer
                                    ? ` — maksimal ${activeFlash!.maxQtyPerBuyer} pcs`
                                    : ""}
                                .
                            </span>
                        </div>
                    )}

                    {/* Keterangan promo "maksimal 1 pcs per pesanan" (bila bukan flash) */}
                    {!flashOn && product.isPromo && product.maxQtyPerBuyer === 1 && (
                        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
                            <Info className="h-4 w-4 shrink-0" />
                            <span>Promo ini dibatasi <strong>maksimal 1 pcs</strong> per pesanan.</span>
                        </div>
                    )}

                    {/* Highlight chips */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 rounded-xl border p-3">
                            <Boxes className="h-5 w-5 text-primary shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">Stok</p>
                                <p className="text-sm font-semibold">{stockAvailable ? `${product.stock} tersedia` : 'Habis'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border p-3">
                            <Scale className="h-5 w-5 text-primary shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">Berat</p>
                                <p className="text-sm font-semibold">{product.weightGram ? `${product.weightGram} gram` : '200 gram'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border p-3">
                            <Truck className="h-5 w-5 text-primary shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">Dikirim dari</p>
                                <p className="text-sm font-semibold">Makassar</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border p-3">
                            <Tag className="h-5 w-5 text-primary shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">Kategori</p>
                                <p className="text-sm font-semibold truncate">{product.category || 'Umum'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Brand (bisa diketuk → halaman produk brand). Sembunyi bila tak ada brand. */}
                    {brand && (
                        <Link
                            href={`/reseller/brands/${brand.id}`}
                            className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50"
                        >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                                {brand.logoUrl ? (
                                    <Image
                                        src={brand.logoUrl}
                                        alt={brand.name}
                                        width={48}
                                        height={48}
                                        className="h-full w-full object-contain"
                                    />
                                ) : (
                                    <Building className="h-6 w-6 text-muted-foreground" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-muted-foreground">Brand</p>
                                <p className="truncate text-sm font-semibold">{brand.name}</p>
                            </div>
                            <span className="shrink-0 text-sm font-medium text-primary">Lihat produk</span>
                        </Link>
                    )}

                    {/* Trust badges */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-green-500" /> Produk Original</span>
                        <span className="flex items-center gap-1.5"><RotateCcw className="h-4 w-4 text-blue-500" /> Garansi Toko</span>
                    </div>

                    {/* Desktop quantity + add to cart */}
                    <div className="hidden md:block">
                        <Separator className="my-2" />
                        <div className="flex items-center gap-4 pt-2">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="quantity-desktop" className="text-sm text-muted-foreground">Jumlah{maxQty === 1 ? (flashOn ? ' · maks 1 pcs (flash sale)' : ' · maks 1 pcs (promo)') : ''}</Label>
                                <div className="flex items-center rounded-lg border">
                                    <Button variant="ghost" size="icon" className="h-11 w-11 rounded-r-none" onClick={() => handleQuantityChange(quantity - 1)} disabled={!stockAvailable || quantity <= 1}>
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                    <Input
                                        id="quantity-desktop"
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
                                        className="w-14 h-11 border-0 text-center text-lg font-bold focus-visible:ring-0"
                                        min={1}
                                        max={maxQty}
                                        disabled={!stockAvailable}
                                    />
                                    <Button variant="ghost" size="icon" className="h-11 w-11 rounded-l-none" onClick={() => handleQuantityChange(quantity + 1)} disabled={!stockAvailable || quantity >= maxQty}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <Button variant="outline" size="lg" className="h-12" onClick={() => setContactOpen(true)}>
                                <MessageCircleMore className="mr-2 h-5 w-5" /> Hubungi
                            </Button>
                            <Button onClick={handleAddToCart} size="lg" className="flex-1 font-headline text-base h-12" disabled={!stockAvailable || isAddingToCart || cartLoading}>
                                {(isAddingToCart || cartLoading) ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                ) : (
                                    <ShoppingCart className="mr-2 h-5 w-5" />
                                )}
                                {!stockAvailable ? 'Stok Habis' : cartLoading ? 'Menyiapkan keranjang…' : 'Tambah ke Keranjang'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Details */}
            <div className="mt-10 lg:mt-14 max-w-3xl">
                <Accordion type="multiple" defaultValue={["description", "specifications"]} className="w-full">
                    <AccordionItem value="description">
                        <AccordionTrigger className="text-lg font-headline">Deskripsi Produk</AccordionTrigger>
                        <AccordionContent>
                            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-foreground/80 leading-relaxed">
                            {product.description || "Tidak ada deskripsi untuk produk ini."}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="specifications">
                        <AccordionTrigger className="text-lg font-headline">Spesifikasi</AccordionTrigger>
                        <AccordionContent>
                            <dl className="divide-y text-sm">
                                <div className="flex justify-between py-2.5">
                                    <dt className="text-muted-foreground">Kategori</dt>
                                    <dd className="font-medium">{product.category || '-'}</dd>
                                </div>
                                <div className="flex justify-between py-2.5">
                                    <dt className="text-muted-foreground">Berat</dt>
                                    <dd className="font-medium">{product.weightGram ? `${product.weightGram} gram` : '200 gram'}</dd>
                                </div>
                                {product.sku && (
                                    <div className="flex justify-between py-2.5">
                                        <dt className="text-muted-foreground">SKU</dt>
                                        <dd className="font-medium">{product.sku}</dd>
                                    </div>
                                )}
                                <div className="flex justify-between py-2.5">
                                    <dt className="text-muted-foreground">Stok</dt>
                                    <dd className="font-medium">{stockAvailable ? `${product.stock} tersedia` : 'Habis'}</dd>
                                </div>
                            </dl>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                <Separator className="my-4" />
                <ProductReviews
                    productId={product.id}
                    ratingAvg={product.ratingAvg ?? 0}
                    ratingCount={product.ratingCount ?? 0}
                />
            </div>
        </div>

        {/* Sticky Add to Cart for Mobile */}
        <div className="md:hidden fixed bottom-16 left-0 z-40 w-full bg-background border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            <div className="container h-20 mx-auto px-4 flex items-center justify-between gap-2">
                <Button variant="outline" className="h-12 shrink-0 px-3" onClick={() => setContactOpen(true)} aria-label="Hubungi admin">
                    <MessageCircleMore className="mr-1.5 h-5 w-5" /> Hubungi
                </Button>
                <div className="flex items-center rounded-lg border">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-r-none" onClick={() => handleQuantityChange(quantity - 1)} disabled={!stockAvailable || quantity <= 1}>
                        <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                        id="quantity-mobile"
                        type="number"
                        value={quantity}
                        onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
                        className="w-12 h-10 border-0 text-center font-bold focus-visible:ring-0"
                        min={1}
                        max={maxQty}
                        disabled={!stockAvailable}
                    />
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-l-none" onClick={() => handleQuantityChange(quantity + 1)} disabled={!stockAvailable || quantity >= maxQty}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                <Button onClick={handleAddToCart} size="lg" className="flex-1 font-headline h-12" disabled={!stockAvailable || isAddingToCart || cartLoading}>
                    {(isAddingToCart || cartLoading) ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <ShoppingCart className="mr-2 h-5 w-5" />
                    )}
                    {!stockAvailable ? 'Stok Habis' : cartLoading ? 'Menyiapkan…' : 'Tambah'}
                </Button>
            </div>
        </div>

        {/* Hubungi Admin: Obrolan + daftar kontak WhatsApp (whatsapp_contacts). */}
        <ContactAdminDialog
          open={contactOpen}
          onOpenChange={setContactOpen}
          description="Pilih cara menghubungi admin tentang produk ini."
          onChat={handleContactChat}
          buildWhatsappMessage={(name) =>
            productWhatsappMessage({ name: product.name, price: contactPrice(), link: contactLink() }, name)
          }
        />
    </div>
  );
}
