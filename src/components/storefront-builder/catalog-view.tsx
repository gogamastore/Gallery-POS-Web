"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ChevronRight, Loader2, Package, ShoppingCart, Star } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { formatSold } from "@/lib/utils";
import type { AppLayout, ProductCardStyle } from "@/components/app-builder/schema";

/**
 * Daftar produk katalog web yang didorong App Builder (`settings/app_layout`
 * → `catalog`). TERBATAS pada tipe layout + gaya kartu produk saja (sesuai
 * permintaan): tanpa blok kategori / tombol tambahan. Tombol "keranjang" pada
 * kartu tetap BERFUNGSI (addToCart) bila diaktifkan di pengaturan kartu.
 *
 * Komponen ini hanya merender; pengambilan/pengurutan/paging produk tetap di
 * `product-grid.tsx`. Dipakai hanya saat admin sudah mem-Publish konfigurasi.
 */

export interface CatalogProduct {
  id: string;
  name: string;
  sku: string;
  category?: string;
  price: string;
  image: string;
  stock: number;
  isPromo?: boolean;
  discountPrice?: string;
  ratingAvg?: number;
  ratingCount?: number;
  soldCount?: number;
}

const rupiahFormat = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const rupiah = (v: number) => rupiahFormat.format(v);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const toNum = (v?: string | number) =>
  typeof v === "number" ? v : Number(String(v ?? "").replace(/[^0-9]/g, "")) || 0;

function hexToRgba(hex: string, alpha: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(255,255,255,${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function pricing(p: CatalogProduct) {
  const base = toNum(p.price);
  const promo = p.isPromo && p.discountPrice ? toNum(p.discountPrice) : 0;
  const hasPromo = promo > 0 && promo < base;
  return {
    hasPromo,
    price: hasPromo ? promo : base,
    original: base,
    percent: hasPromo ? Math.round((1 - promo / base) * 100) : 0,
  };
}

const shadowCss = (s: ProductCardStyle) =>
  s.shadowEnabled
    ? `${s.shadowOffsetX}px ${s.shadowOffsetY}px ${s.shadowBlur * 1.2}px rgba(0,0,0,${s.shadowOpacity})`
    : undefined;

interface Theme {
  price: string;
  button: string;
}

// ── Kartu produk (vertikal) — menghormati ProductCardStyle ────────────
function CatalogCard({
  p,
  style,
  theme,
  ratio,
}: {
  p: CatalogProduct;
  style: ProductCardStyle;
  theme: Theme;
  ratio?: number;
}) {
  const { addToCart, loading: cartLoading } = useCart();
  const { toast } = useToast();
  const pr = pricing(p);
  const out = p.stock <= 0;
  const isGlass = style.design === "glass";
  const isFlat = style.design === "flat";
  const isSimple = style.design === "simpleCard" || style.design === "flatSimple";
  const aspect = ratio ?? style.imageRatio;
  const imgRadius = style.imageRounded ? Math.max(style.radius - 4, 4) : 0;

  const add = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartLoading || out) return;
    try {
      await addToCart(p, 1);
    } catch {
      toast({ variant: "destructive", title: "Gagal menambahkan ke keranjang" });
    }
  };

  return (
    <Link
      href={`/reseller/products/${p.id}`}
      className="flex h-full flex-col overflow-hidden transition-transform hover:-translate-y-0.5"
      style={{
        background: isGlass ? hexToRgba(style.cardColor || "#FFFFFF", 0.6) : style.cardColor || (isSimple ? undefined : "#FFFFFF"),
        backdropFilter: isGlass ? "blur(10px)" : undefined,
        borderRadius: style.radius,
        border: isFlat ? "1px solid #E5E7EB" : isGlass ? "1px solid rgba(255,255,255,0.7)" : undefined,
        boxShadow: isSimple && style.design === "flatSimple" ? undefined : shadowCss(style),
      }}
    >
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: String(aspect || 1),
          borderRadius: isSimple ? (style.imageRounded ? style.radius : 0) : imgRadius,
          background: style.imageFit === "contain" ? "#fff" : "#f3f4f6",
        }}
      >
        {p.image ? (
          <img src={p.image} alt={p.name} loading="lazy" className="absolute inset-0 h-full w-full" style={{ objectFit: style.imageFit }} />
        ) : (
          <Package className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 text-gray-300" />
        )}
        {out && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-bold text-white">Stok Habis</div>
        )}
        {pr.hasPromo && style.showDiscountBadge && (
          <span className="absolute left-1.5 top-1.5 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            -{pr.percent}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5" style={{ textAlign: isSimple ? "center" : "left" }}>
          {style.showCategory && p.category && <div className="truncate text-[11px] text-gray-500">{p.category}</div>}
          {style.showTitle && (
            <div
              className="font-semibold leading-tight"
              style={{
                fontSize: 13,
                display: "-webkit-box",
                WebkitLineClamp: style.titleMaxLines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {p.name}
            </div>
          )}
          {style.showRating && (p.ratingCount ?? 0) > 0 && (
            <div
              className={`flex items-center gap-1 text-[11px] text-gray-600 ${isSimple ? "justify-center" : ""}`}
            >
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="font-semibold">{(p.ratingAvg ?? 0).toFixed(1)}</span>
              <span>({p.ratingCount})</span>
            </div>
          )}
          {style.showSold && (p.soldCount ?? 0) > 0 && (
            <div className={`text-[11px] text-gray-500 ${isSimple ? "text-center" : ""}`}>
              {formatSold(p.soldCount ?? 0)} terjual
            </div>
          )}
          {style.showStock && (
            <div className="text-[11px] font-semibold" style={{ color: out ? "#b91c1c" : "#15803d" }}>
              {out ? "Stok Habis" : `Stok: ${p.stock}`}
            </div>
          )}
          {style.showPrice && (
            <div className="mt-auto flex items-end justify-between gap-1 pt-1">
              <div className="min-w-0">
                {pr.hasPromo && <div className="truncate text-[11px] text-gray-400 line-through">{rupiah(pr.original)}</div>}
                <div className="truncate text-sm font-bold" style={{ color: theme.price }}>
                  {rupiah(pr.price)}
                </div>
              </div>
              {style.showCartButton && !out && (
                <button
                  type="button"
                  onClick={add}
                  disabled={cartLoading}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-60"
                  style={{ background: theme.button }}
                  aria-label="Tambah ke keranjang"
                >
                  {cartLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Baris produk (listTile / simpleList) ─────────────────────────────
function CatalogRow({ p, theme, compact }: { p: CatalogProduct; theme: Theme; compact: boolean }) {
  const pr = pricing(p);
  return (
    <Link href={`/reseller/products/${p.id}`} className="flex items-center gap-3 p-2.5">
      <div className={`${compact ? "h-14 w-14" : "h-20 w-20"} shrink-0 overflow-hidden rounded-md bg-gray-100`}>
        {p.image && <img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        {!compact && p.category && <div className="truncate text-[11px] text-gray-500">{p.category}</div>}
        <div className={`${compact ? "truncate" : "line-clamp-2"} text-sm font-semibold`}>{p.name}</div>
        {pr.hasPromo && <div className="truncate text-[11px] text-gray-400 line-through">{rupiah(pr.original)}</div>}
        <div className="truncate text-sm font-bold" style={{ color: theme.price }}>
          {rupiah(pr.price)}
        </div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
    </Link>
  );
}

// ── Root ─────────────────────────────────────────────────────────────
export function CatalogProductsView({ products, layout }: { products: CatalogProduct[]; layout: AppLayout }) {
  const cfg = layout.catalog;
  const design = layout.design;
  const theme: Theme = {
    price: design.priceColor || design.seedColor || "#d80073",
    button: design.buttonColor || design.seedColor || "#d80073",
  };
  const gap = cfg.spacing || 8;

  // simpleList / listTile → daftar vertikal
  if (cfg.layout === "simpleList" || cfg.layout === "listTile") {
    const compact = cfg.layout === "simpleList";
    return (
      <div className="flex flex-col divide-y overflow-hidden rounded-lg border bg-white">
        {products.map((p) => (
          <CatalogRow key={p.id} p={p} theme={theme} compact={compact} />
        ))}
      </div>
    );
  }

  // staggered / quilted → masonry (CSS columns)
  if (cfg.layout === "staggered" || cfg.layout === "quilted") {
    const cols = clamp(cfg.gridColumns || 2, 2, 3);
    return (
      <div style={{ columnCount: cols, columnGap: gap }}>
        {products.map((p, i) => (
          <div key={p.id} className="break-inside-avoid" style={{ marginBottom: gap }}>
            <CatalogCard p={p} style={cfg.card} theme={theme} ratio={i % 3 === 0 ? (cfg.card.imageRatio || 1) * 0.8 : undefined} />
          </div>
        ))}
      </div>
    );
  }

  // grid (default) → responsif; kolom bertambah otomatis di layar lebar
  const minW = Math.max(90, Math.round(380 / clamp(cfg.gridColumns || 2, 1, 6)));
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${minW}px, 1fr))`, gap }}>
      {products.map((p) => (
        <CatalogCard key={p.id} p={p} style={cfg.card} theme={theme} />
      ))}
    </div>
  );
}
