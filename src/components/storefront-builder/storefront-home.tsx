"use client";

/* eslint-disable @next/next/no-img-element */
import { createContext, useContext, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, Loader2, Package, Search, ShoppingBag, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATEGORY_SLIDER_MAX,
  type AppDesign,
  type BannerBlockConfig,
  type BrandsBlockConfig,
  type ButtonBlockConfig,
  type CategoriesBlockConfig,
  type HomeBlock,
  type ImageBlockConfig,
  type ProductBlockConfig,
  type ProductCardStyle,
  type SearchBlockConfig,
  type SpacerBlockConfig,
  type TextBlockConfig,
} from "@/components/app-builder/schema";
import {
  prepareProducts,
  useSourceProducts,
  usePreviewData,
  type PreviewData,
  type PreviewProduct,
} from "@/components/app-builder/preview-data";
import { useAppLayout } from "./use-app-layout";

/**
 * Renderer beranda reseller WEB yang didorong App Builder (`settings/app_layout`).
 * Memakai ulang lapisan data (`preview-data.ts`) & skema (`schema.ts`) yang sama
 * dengan panel admin + aplikasi Flutter, tapi ditata RESPONSIF: kolom produk
 * bertambah otomatis di layar lebar lewat `auto-fill minmax()`.
 */

const rupiahFormat = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const rupiah = (v: number) => rupiahFormat.format(v);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function hexToRgba(hex: string, alpha: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(255,255,255,${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function useGoogleFont(family: string) {
  useEffect(() => {
    if (!family) return;
    const id = `gf-${family.replace(/\s+/g, "-")}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }, [family]);
}

// ── Link aplikasi → rute web reseller ────────────────────────────────
function resolveLink(link: string): string {
  if (!link) return "/reseller";
  if (link.startsWith("/reseller") || link.startsWith("http")) return link;
  const [path, qs] = link.split("?");
  const params = new URLSearchParams(qs || "");
  switch (path) {
    case "/catalog":
      return "/reseller/products";
    case "/cart":
      return "/reseller/cart";
    case "/chat":
      return "/reseller/chat";
    case "/profile":
      return "/reseller/profile";
    case "/collection": {
      const source = params.get("source");
      if (source === "promo") return "/reseller/promo";
      if (source === "trending") return "/reseller/trending";
      if (source === "category" && params.get("category"))
        return `/reseller/products?category=${encodeURIComponent(params.get("category")!)}`;
      if (source === "brand" && params.get("brandId")) return `/reseller/brands/${params.get("brandId")}`;
      return "/reseller/products";
    }
    default:
      return "/reseller";
  }
}

function productSeeAllLink(cfg: ProductBlockConfig): string {
  switch (cfg.source) {
    case "promo":
      return "/reseller/promo";
    case "trending":
      return "/reseller/trending";
    case "category":
      return cfg.category ? `/reseller/products?category=${encodeURIComponent(cfg.category)}` : "/reseller/products";
    case "brand":
      return cfg.brandId ? `/reseller/brands/${cfg.brandId}` : "/reseller/products";
    default:
      return "/reseller/products";
  }
}

// ── Tema (warna dari AppDesign) ──────────────────────────────────────
interface Theme {
  primary: string;
  price: string;
  button: string;
  promos: Record<string, number>;
}
const ThemeCtx = createContext<Theme>({ primary: "#d80073", price: "#d80073", button: "#d80073", promos: {} });
const useTheme = () => useContext(ThemeCtx);

// ── Kartu produk (responsif — mengisi sel grid) ──────────────────────
function pricingOf(p: PreviewProduct, promo: number | undefined) {
  const hasPromo = promo !== undefined && p.price > 0 && promo > 0 && promo < p.price;
  return hasPromo
    ? { hasPromo, price: promo, original: p.price, percent: Math.round((1 - promo / p.price) * 100) }
    : { hasPromo: false, price: p.price, original: p.price, percent: 0 };
}

const shadowCss = (s: ProductCardStyle) =>
  s.shadowEnabled
    ? `${s.shadowOffsetX}px ${s.shadowOffsetY}px ${s.shadowBlur * 1.2}px rgba(0,0,0,${s.shadowOpacity})`
    : undefined;

function ProductCard({
  p,
  style,
  ratio,
}: {
  p: PreviewProduct;
  style: ProductCardStyle;
  ratio?: number;
}) {
  const t = useTheme();
  const pricing = pricingOf(p, t.promos[p.id]);
  const out = p.stock <= 0;
  const isGlass = style.design === "glass";
  const isFlat = style.design === "flat";
  const isSimple = style.design === "simpleCard" || style.design === "flatSimple";
  const aspect = ratio ?? style.imageRatio;
  const imgRadius = style.imageRounded ? Math.max(style.radius - 4, 4) : isSimple ? (style.imageRounded ? style.radius : 0) : 0;

  const image = (
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
      {pricing.hasPromo && style.showDiscountBadge && (
        <span className="absolute left-1.5 top-1.5 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
          -{pricing.percent}%
        </span>
      )}
    </div>
  );

  const info = (
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
      {style.showStock && (
        <div className="text-[11px] font-semibold" style={{ color: out ? "#b91c1c" : "#15803d" }}>
          {out ? "Stok Habis" : `Stok: ${p.stock}`}
        </div>
      )}
      {style.showPrice && (
        <div className="mt-auto flex items-end justify-between gap-1 pt-1">
          <div className="min-w-0">
            {pricing.hasPromo && (
              <div className="truncate text-[11px] text-gray-400 line-through">{rupiah(pricing.original)}</div>
            )}
            <div className="truncate text-sm font-bold" style={{ color: t.price }}>
              {rupiah(pricing.price)}
            </div>
          </div>
          {style.showCartButton && !out && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white" style={{ background: t.button }}>
              <ShoppingBag className="h-4 w-4" />
            </span>
          )}
        </div>
      )}
    </div>
  );

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
      {image}
      <div className="flex flex-1 flex-col p-2">{info}</div>
    </Link>
  );
}

// ── Layout grid produk (responsif) ───────────────────────────────────
function productGridStyle(cfg: ProductBlockConfig): React.CSSProperties {
  const minW = (() => {
    switch (cfg.layout) {
      case "threeColumn":
        return 120;
      case "fourColumn":
        return 95;
      case "largeCard":
        return 280;
      case "grid":
        return Math.max(90, Math.round(380 / clamp(cfg.gridColumns, 1, 6)));
      case "staggered":
      case "quilted":
        return 160;
      default:
        return 150; // twoColumn
    }
  })();
  return { display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${minW}px, 1fr))`, gap: cfg.spacing || 8 };
}

// ── Frame blok (margin/padding/bg + judul + Lihat Semua) ─────────────
function Frame({
  block,
  children,
  seeAllHref,
}: {
  block: HomeBlock;
  children: React.ReactNode;
  seeAllHref?: string;
}) {
  const t = useTheme();
  const s = block.style;
  const hasDeco = !!s.bgColor || !!s.bgImageUrl;
  const title = block.title.trim();
  const showSeeAll = !!seeAllHref && block.showSeeAll;
  return (
    <section
      style={{
        margin: `${s.marginTop}px ${s.marginH}px ${s.marginBottom}px`,
        padding: `${s.paddingV}px 0`,
        backgroundColor: s.bgColor || undefined,
        backgroundImage: s.bgImageUrl ? `url("${s.bgImageUrl}")` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        borderRadius: hasDeco ? s.radius : 0,
        overflow: hasDeco && s.radius > 0 ? "hidden" : undefined,
      }}
    >
      {(title || showSeeAll) && (
        <div className="mb-2 flex items-center justify-between gap-2" style={{ padding: `0 ${s.paddingH}px` }}>
          <h2 className="truncate text-lg font-bold md:text-xl">{title}</h2>
          {showSeeAll && (
            <Link href={seeAllHref!} className="flex shrink-0 items-center gap-0.5 text-sm font-medium" style={{ color: t.primary }}>
              Lihat Semua <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

function EmptyNote({ block, message }: { block: HomeBlock; message: string }) {
  // Di web, blok kosong cukup disembunyikan (tak perlu placeholder admin).
  void block;
  void message;
  return null;
}

// ── Blok Produk ──────────────────────────────────────────────────────
function ProductsBlock({ block }: { block: HomeBlock<"products"> }) {
  const cfg = block.config;
  const theme = useTheme();
  const { products, loading } = useSourceProducts(cfg);
  if (loading) {
    return (
      <Frame block={block}>
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </Frame>
    );
  }
  const list = prepareProducts(products, cfg);
  if (!list.length) return null; // sembunyikan blok kosong (sama seperti app)

  const pad = block.style.paddingH;

  // Carousel & largeCard → gulir horizontal; lainnya → grid responsif.
  if (cfg.layout === "carousel" || cfg.layout === "largeCard") {
    return (
      <Frame block={block} seeAllHref={productSeeAllLink(cfg)}>
        <div className="flex snap-x gap-3 overflow-x-auto pb-1" style={{ padding: `0 ${pad}px`, scrollbarWidth: "none" }}>
          {list.map((p) => (
            <div key={p.id} className="w-[62%] shrink-0 snap-start sm:w-64">
              <ProductCard p={p} style={cfg.card} />
            </div>
          ))}
        </div>
      </Frame>
    );
  }

  if (cfg.layout === "simpleList") {
    return (
      <Frame block={block} seeAllHref={productSeeAllLink(cfg)}>
        <div className="flex flex-col divide-y rounded-lg bg-white" style={{ margin: `0 ${pad}px` }}>
          {list.map((p) => {
            const pr = pricingOf(p, theme.promos[p.id]);
            return (
              <Link key={p.id} href={`/reseller/products/${p.id}`} className="flex items-center gap-3 p-2.5">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-gray-100">
                  {p.image && <img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="truncate text-sm font-bold" style={{ color: theme.price }}>{rupiah(pr.price)}</div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
              </Link>
            );
          })}
        </div>
      </Frame>
    );
  }

  const masonry = cfg.layout === "staggered" || cfg.layout === "quilted";
  return (
    <Frame block={block} seeAllHref={productSeeAllLink(cfg)}>
      <div style={{ padding: `0 ${pad}px` }}>
        {masonry ? (
          <div style={{ columnWidth: 170, columnGap: cfg.spacing || 8 }}>
            {list.map((p, i) => (
              <div key={p.id} className="mb-2 break-inside-avoid" style={{ marginBottom: cfg.spacing || 8 }}>
                <ProductCard p={p} style={cfg.card} ratio={i % 3 === 0 ? (cfg.card.imageRatio || 1) * 0.8 : undefined} />
              </div>
            ))}
          </div>
        ) : (
          <div style={productGridStyle(cfg)}>
            {list.map((p) => (
              <ProductCard key={p.id} p={p} style={cfg.card} />
            ))}
          </div>
        )}
      </div>
    </Frame>
  );
}

// ── Blok Banner ──────────────────────────────────────────────────────
function BannerBlock({ block, data }: { block: HomeBlock<"banner">; data: PreviewData }) {
  const t = useTheme();
  const c: BannerBlockConfig = block.config;
  const banners = data.banners;
  if (!banners.length) return null;
  const single = c.viewportFraction >= 1;
  return (
    <Frame block={block}>
      <div style={{ padding: `0 ${block.style.paddingH}px` }}>
        <div className="flex snap-x gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {banners.map((b) => (
            <div
              key={b.id}
              className={cn("shrink-0 snap-center", single ? "w-full" : "w-[85%] sm:w-[48%] lg:w-[32%]")}
              style={{ padding: `0 ${c.itemMarginH}px` }}
            >
              <div
                className="relative w-full overflow-hidden bg-gray-200 shadow"
                style={{ height: clamp(c.height, 120, 360), borderRadius: c.radius }}
              >
                {b.imageUrl && <img src={b.imageUrl} alt={b.title} className="absolute inset-0 h-full w-full object-cover" />}
                {c.showText && (b.title || b.description) && (
                  <>
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,.6), transparent)" }} />
                    <div className="absolute inset-x-4 bottom-4 text-white">
                      {b.title && <div className="truncate text-xl font-bold md:text-2xl">{b.title}</div>}
                      {b.description && <div className="line-clamp-2 text-sm md:text-base">{b.description}</div>}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        {c.showIndicator && banners.length > 1 && (
          <div className="mt-2.5 flex justify-center gap-2">
            {banners.map((b, i) => (
              <span key={b.id} className="h-2 rounded-full" style={{ width: i === 0 ? 24 : 8, background: i === 0 ? t.primary : "#cbd5e1" }} />
            ))}
          </div>
        )}
      </div>
    </Frame>
  );
}

// ── Blok Brand ───────────────────────────────────────────────────────
function BrandsBlock({ block, data }: { block: HomeBlock<"brands">; data: PreviewData }) {
  const c: BrandsBlockConfig = block.config;
  if (!data.brands.length) return null;
  const circle = c.style === "circle";
  const size = c.itemSize;
  return (
    <Frame block={block} seeAllHref="/reseller/brands">
      <div className="flex gap-3 overflow-x-auto pb-1" style={{ padding: `0 ${block.style.paddingH}px`, scrollbarWidth: "none" }}>
        {data.brands.map((b) => (
          <Link
            key={b.id}
            href={`/reseller/brands/${b.id}`}
            className={cn("flex shrink-0 flex-col items-center", !circle && "overflow-hidden rounded-xl bg-white shadow")}
            style={circle ? { width: size + 14 } : { width: (size * 100) / 70, height: size + 26 }}
          >
            {circle ? (
              <div
                className="flex items-center justify-center overflow-hidden rounded-full bg-white shadow"
                style={{ width: size, height: size, padding: size * 0.15 }}
              >
                {b.logoUrl && <img src={b.logoUrl} alt={b.name} loading="lazy" className="h-full w-full rounded-full object-contain" />}
              </div>
            ) : (
              <div className="min-h-0 w-full flex-1 p-2">
                {b.logoUrl && <img src={b.logoUrl} alt={b.name} loading="lazy" className="h-full w-full object-contain" />}
              </div>
            )}
            <span className="mt-1 w-full truncate px-1 text-center text-[11px]">{b.name}</span>
          </Link>
        ))}
      </div>
    </Frame>
  );
}

// ── Blok Kategori ────────────────────────────────────────────────────
function CategoriesBlock({ block, data }: { block: HomeBlock<"categories">; data: PreviewData }) {
  const t = useTheme();
  const c: CategoriesBlockConfig = block.config;
  const pad = block.style.paddingH;

  // Gaya "Gambar (geser)": kartu manual dengan gambar yang diunggah admin.
  if (c.style === "imageSlider") {
    const items = (Array.isArray(c.items) ? c.items : [])
      .slice(0, Math.min(Math.max(c.limit, 0), CATEGORY_SLIDER_MAX))
      .filter((it) => it && (it.imageUrl || it.name));
    if (!items.length) return null;
    const size = clamp(c.itemSize || 84, 56, 140);
    return (
      <Frame block={block} seeAllHref="/reseller/categories">
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ padding: `0 ${pad}px`, scrollbarWidth: "none" }}>
          {items.map((it, i) => (
            <Link
              key={i}
              href={it.category ? `/reseller/products?category=${encodeURIComponent(it.category)}` : "/reseller/products"}
              className="flex shrink-0 flex-col items-center"
              style={{ width: size + 14 }}
            >
              <div className="flex items-center justify-center overflow-hidden" style={{ width: size, height: size }}>
                {it.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.imageUrl} alt={it.name} loading="lazy" className="h-full w-full object-contain" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center rounded-full font-bold"
                    style={{ background: hexToRgba(t.primary, 0.12), color: t.primary, fontSize: size * 0.4 }}
                  >
                    {(it.name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="mt-1.5 line-clamp-2 w-full text-center text-[11px] leading-tight">{it.name}</span>
            </Link>
          ))}
        </div>
      </Frame>
    );
  }

  const names = data.categories.slice(0, c.limit);
  if (!names.length) return null;
  const circle = (name: string, size: number) => (
    <Link href={`/reseller/products?category=${encodeURIComponent(name)}`} className="flex flex-col items-center">
      <div
        className="flex items-center justify-center rounded-full font-bold"
        style={{ width: size, height: size, background: hexToRgba(t.primary, 0.12), color: t.primary, fontSize: size * 0.4 }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <span className="mt-1.5 line-clamp-2 text-center text-[11px] leading-tight">{name}</span>
    </Link>
  );
  return (
    <Frame block={block} seeAllHref="/reseller/categories">
      {c.style === "grid" ? (
        <div
          className="gap-y-3"
          style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(72px, 1fr))`, padding: `0 ${pad}px` }}
        >
          {names.map((n) => (
            <div key={n}>{circle(n, 52)}</div>
          ))}
        </div>
      ) : c.style === "circle" ? (
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ padding: `0 ${pad}px`, scrollbarWidth: "none" }}>
          {names.map((n) => (
            <div key={n} className="shrink-0" style={{ width: 70 }}>
              {circle(n, 56)}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2" style={{ padding: `0 ${pad}px` }}>
          {names.map((n) => (
            <Link
              key={n}
              href={`/reseller/products?category=${encodeURIComponent(n)}`}
              className="flex h-9 items-center whitespace-nowrap rounded-full bg-white px-3.5 text-sm font-medium"
              style={{ border: `1px solid ${hexToRgba(t.primary, 0.35)}`, color: t.primary }}
            >
              {n}
            </Link>
          ))}
        </div>
      )}
    </Frame>
  );
}

// ── Blok sederhana ───────────────────────────────────────────────────
function SearchBlock({ block }: { block: HomeBlock<"search"> }) {
  const c: SearchBlockConfig = block.config;
  return (
    <Frame block={block}>
      <div style={{ padding: `0 ${block.style.paddingH}px` }}>
        <Link
          href="/reseller/products"
          className="flex h-11 items-center gap-2 px-3 text-gray-500"
          style={{ background: c.bgColor || "#fff", border: `1px solid ${c.borderColor || "#E5E7EB"}`, borderRadius: c.radius }}
        >
          <Search className="h-5 w-5" />
          <span className="truncate text-sm">{c.placeholder}</span>
        </Link>
      </div>
    </Frame>
  );
}

function TextBlock({ block }: { block: HomeBlock<"text"> }) {
  const c: TextBlockConfig = block.config;
  if (!c.text.trim()) return <EmptyNote block={block} message="" />;
  return (
    <Frame block={block}>
      <div
        className="whitespace-pre-wrap"
        style={{
          padding: `0 ${block.style.paddingH}px`,
          fontSize: c.fontSize,
          fontWeight: c.bold ? 700 : 400,
          color: c.color || "#1F2937",
          textAlign: c.align,
        }}
      >
        {c.text.trim()}
      </div>
    </Frame>
  );
}

function ImageBlock({ block }: { block: HomeBlock<"image"> }) {
  const c: ImageBlockConfig = block.config;
  if (!c.imageUrl) return null;
  const img = (
    <div className="overflow-hidden bg-gray-200" style={{ borderRadius: c.radius, aspectRatio: String(c.aspectRatio) }}>
      <img src={c.imageUrl} alt="" className="h-full w-full" style={{ objectFit: c.fit }} />
    </div>
  );
  return (
    <Frame block={block}>
      <div style={{ padding: `0 ${block.style.paddingH}px` }}>
        {c.link ? (
          <Link href={resolveLink(c.link)}>{img}</Link>
        ) : (
          img
        )}
      </div>
    </Frame>
  );
}

function SpacerBlock({ block }: { block: HomeBlock<"spacer"> }) {
  const c: SpacerBlockConfig = block.config;
  return (
    <Frame block={block}>
      <div className="flex items-center" style={{ height: c.height, padding: `0 ${block.style.paddingH}px` }}>
        {c.showDivider && <div className="h-px w-full" style={{ background: c.dividerColor || "#E5E7EB" }} />}
      </div>
    </Frame>
  );
}

function ButtonBlock({ block }: { block: HomeBlock<"button"> }) {
  const t = useTheme();
  const c: ButtonBlockConfig = block.config;
  const color = c.color || t.button;
  const outlined = c.style === "outlined";
  return (
    <Frame block={block}>
      <div style={{ padding: `0 ${block.style.paddingH}px` }}>
        <Link
          href={resolveLink(c.link)}
          className="flex items-center justify-center gap-2 font-bold"
          style={{
            height: c.height,
            borderRadius: c.radius,
            fontSize: 16,
            background: outlined ? "transparent" : color,
            color: outlined ? color : "#fff",
            border: outlined ? `1px solid ${color}` : undefined,
          }}
        >
          {c.showIcon && <Store className="h-5 w-5" />}
          <span className="truncate">{c.label}</span>
        </Link>
      </div>
    </Frame>
  );
}

function BlockView({ block, data }: { block: HomeBlock; data: PreviewData }) {
  switch (block.type) {
    case "products":
      return <ProductsBlock block={block as HomeBlock<"products">} />;
    case "banner":
      return <BannerBlock block={block as HomeBlock<"banner">} data={data} />;
    case "brands":
      return <BrandsBlock block={block as HomeBlock<"brands">} data={data} />;
    case "categories":
      return <CategoriesBlock block={block as HomeBlock<"categories">} data={data} />;
    case "search":
      return <SearchBlock block={block as HomeBlock<"search">} />;
    case "text":
      return <TextBlock block={block as HomeBlock<"text">} />;
    case "image":
      return <ImageBlock block={block as HomeBlock<"image">} />;
    case "spacer":
      return <SpacerBlock block={block as HomeBlock<"spacer">} />;
    case "button":
      return <ButtonBlock block={block as HomeBlock<"button">} />;
    default:
      return null;
  }
}

// ── Root ─────────────────────────────────────────────────────────────
export default function StorefrontHome({ fallback }: { fallback: React.ReactNode }) {
  const { layout, loading, hasConfig } = useAppLayout();
  const data = usePreviewData();
  const design: AppDesign = layout.design;
  useGoogleFont(design.fontFamily);

  // Sebelum config termuat ATAU belum ada config yang di-Publish, tampilkan
  // beranda bawaan (Hero/QuickAccess/FlashSale) — tak ada perubahan mengejutkan.
  if (loading || !hasConfig) return <>{fallback}</>;

  const theme: Theme = {
    primary: design.seedColor || "#d80073",
    price: design.priceColor || design.seedColor || "#d80073",
    button: design.buttonColor || design.seedColor || "#d80073",
    promos: data.promos,
  };
  const visible = layout.blocks.filter((b) => b.enabled);

  return (
    <ThemeCtx.Provider value={theme}>
      <div
        className="mx-auto w-full max-w-screen-2xl animate-in fade-in-0 duration-500"
        style={{ fontFamily: `"${design.fontFamily}", inherit` }}
      >
        {data.loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : visible.length === 0 ? (
          <>{fallback}</>
        ) : (
          visible.map((block) => <BlockView key={block.id} block={block} data={data} />)
        )}
      </div>
    </ThemeCtx.Provider>
  );
}
