"use client";

/* eslint-disable @next/next/no-img-element */
import { createContext, useContext, useEffect } from "react";
import {
  Bell,
  ChevronRight,
  Home,
  ImageIcon,
  Loader2,
  MessagesSquare,
  Package,
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BLOCK_LABELS,
  CATEGORY_SLIDER_MAX,
  orderParents,
  type AppDesign,
  type AppLayout,
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
} from "./schema";
import {
  prepareProducts,
  useSourceProducts,
  type PreviewData,
  type PreviewProduct,
} from "./preview-data";

/**
 * Preview HTML yang meniru widget Flutter di
 * `lib/src/features/home_layout/presentation`. Ukuran (px) mengikuti logical
 * pixel Flutter pada layar selebar PHONE_WIDTH. Warna "utama" di sini memakai
 * seed langsung, sedangkan Flutter menurunkan nada Material 3 dari seed —
 * jadi warnanya bisa sedikit berbeda.
 */

export const PHONE_WIDTH = 360;
const COMPACT_CARD_WIDTH = 120; // sama dengan _compactCardWidth di Flutter

const rupiahFormat = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const rupiah = (v: number) => rupiahFormat.format(v);

interface PreviewTheme {
  primary: string;
  price: string;
  button: string;
  promos: Record<string, number>;
}

const ThemeCtx = createContext<PreviewTheme>({
  primary: "#2196F3",
  price: "#2196F3",
  button: "#FF5FB4",
  promos: {},
});
const useTheme = () => useContext(ThemeCtx);

function hexToRgba(hex: string, alpha: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(255,255,255,${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// blurRadius Flutter ≈ 0.58×blur CSS (sigma); dikalikan supaya terlihat serupa.
const shadowCss = (s: ProductCardStyle) =>
  s.shadowEnabled
    ? `${s.shadowOffsetX}px ${s.shadowOffsetY}px ${s.shadowBlur * 1.2}px rgba(0,0,0,${s.shadowOpacity})`
    : undefined;

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

const range = (n: number) => Array.from({ length: Math.max(0, n) }, (_, i) => i);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// ───────────────────────────── Kartu produk ────────────────────────────

function pricingOf(p: PreviewProduct, promo: number | undefined) {
  const hasPromo = promo !== undefined && p.price > 0 && promo > 0 && promo < p.price;
  return hasPromo
    ? { hasPromo, price: promo, original: p.price, percent: Math.round((1 - promo / p.price) * 100) }
    : { hasPromo: false, price: p.price, original: p.price, percent: 0 };
}
type Pricing = ReturnType<typeof pricingOf>;

function PImage({
  p,
  pricing,
  style,
  radius,
  compact,
  aspect,
}: {
  p: PreviewProduct;
  pricing: Pricing;
  style: ProductCardStyle;
  radius: number;
  compact?: boolean;
  aspect?: number;
}) {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        aspectRatio: aspect ? String(aspect) : undefined,
        height: aspect ? undefined : "100%",
        borderRadius: radius,
        background: style.imageFit === "contain" ? "#fff" : "#f3f4f6",
      }}
    >
      {p.image ? (
        <img src={p.image} alt="" className="absolute inset-0 h-full w-full" style={{ objectFit: style.imageFit }} />
      ) : (
        <Package className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-gray-300" />
      )}
      {p.stock <= 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/50 font-bold text-white"
          style={{ fontSize: compact ? 11 : 13 }}
        >
          Stok Habis
        </div>
      )}
      {pricing.hasPromo && style.showDiscountBadge && (
        <span
          className="absolute left-1.5 top-1.5 rounded-md bg-red-600 px-1.5 py-0.5 font-bold text-white"
          style={{ fontSize: compact ? 9 : 11 }}
        >
          -{pricing.percent}%
        </span>
      )}
    </div>
  );
}

function PInfo({
  p,
  pricing,
  style,
  compact,
  centered,
  pill,
  fill,
}: {
  p: PreviewProduct;
  pricing: Pricing;
  style: ProductCardStyle;
  compact?: boolean;
  centered?: boolean;
  pill?: boolean;
  fill?: boolean;
}) {
  const t = useTheme();
  const titleSize = compact ? 11 : 13;
  const priceSize = compact ? 12 : 14;
  const small = compact ? 9.5 : 11;
  const out = p.stock <= 0;

  const price = style.showPrice ? (
    <div
      className="min-w-0"
      style={pill ? { border: "1px solid #d1d5db", borderRadius: 20, padding: "3px 8px" } : undefined}
    >
      {pricing.hasPromo && (
        <div className="truncate" style={{ fontSize: priceSize - 3, color: "#9ca3af", textDecoration: "line-through" }}>
          {rupiah(pricing.original)}
        </div>
      )}
      <div className="truncate" style={{ fontSize: priceSize, fontWeight: 700, color: t.price }}>
        {rupiah(pricing.price)}
      </div>
    </div>
  ) : null;
  const cartSize = compact ? 24 : 30;
  const cart =
    style.showCartButton && !out ? (
      <span
        className="flex shrink-0 items-center justify-center rounded-full text-white"
        style={{ width: cartSize, height: cartSize, background: t.button }}
      >
        <ShoppingCart style={{ width: cartSize * 0.55, height: cartSize * 0.55 }} />
      </span>
    ) : null;

  return (
    <div
      className="flex min-w-0 flex-col"
      style={{ textAlign: centered ? "center" : "left", gap: 2, flex: fill ? 1 : undefined }}
    >
      {style.showCategory && p.category && (
        <div className="truncate" style={{ fontSize: small, color: "#6b7280" }}>
          {p.category}
        </div>
      )}
      {style.showTitle && (
        <div
          style={{
            fontSize: titleSize,
            fontWeight: 600,
            lineHeight: 1.25,
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
        <div style={{ fontSize: small, fontWeight: 600, color: out ? "#b91c1c" : "#15803d" }}>
          {out ? "Stok Habis" : `Stok: ${p.stock}`}
        </div>
      )}
      {(price || cart) && (
        <div className="flex items-end gap-1" style={{ marginTop: fill ? "auto" : 0, paddingTop: 2 }}>
          <div className="flex min-w-0 flex-1" style={{ justifyContent: centered ? "center" : "flex-start" }}>
            {price}
          </div>
          {cart}
        </div>
      )}
    </div>
  );
}

function PCard({
  p,
  style,
  compact,
  fill,
  ratio,
}: {
  p: PreviewProduct;
  style: ProductCardStyle;
  compact?: boolean;
  fill?: boolean;
  ratio?: number;
}) {
  const t = useTheme();
  const pricing = pricingOf(p, t.promos[p.id]);
  const aspect = ratio ?? style.imageRatio;

  if (style.design === "simpleCard" || style.design === "flatSimple") {
    const isSimpleCard = style.design === "simpleCard";
    const imgRadius = style.imageRounded ? style.radius : 0;
    return (
      <div
        className="flex w-full flex-col"
        style={{ height: fill ? "100%" : undefined, background: style.cardColor || undefined, borderRadius: style.radius }}
      >
        <div style={{ borderRadius: imgRadius, boxShadow: isSimpleCard ? shadowCss(style) : undefined }}>
          <PImage p={p} pricing={pricing} style={style} radius={imgRadius} compact={compact} aspect={aspect} />
        </div>
        <div className="flex flex-col" style={{ padding: "6px 2px 4px", flex: fill ? 1 : undefined }}>
          <PInfo
            p={p}
            pricing={pricing}
            style={style}
            compact={compact}
            centered={isSimpleCard}
            pill={isSimpleCard}
            fill={fill}
          />
        </div>
      </div>
    );
  }

  const isGlass = style.design === "glass";
  const isFlat = style.design === "flat";
  const inset = style.imageRounded;
  return (
    <div
      className="flex w-full flex-col overflow-hidden"
      style={{
        height: fill ? "100%" : undefined,
        background: isGlass ? hexToRgba(style.cardColor || "#FFFFFF", 0.55) : style.cardColor || "#FFFFFF",
        backdropFilter: isGlass ? "blur(10px)" : undefined,
        borderRadius: style.radius,
        border: isFlat ? "1px solid #E5E7EB" : isGlass ? "1px solid rgba(255,255,255,0.7)" : undefined,
        boxShadow: shadowCss(style),
      }}
    >
      <div style={{ padding: inset ? "6px 6px 0" : 0 }}>
        <PImage
          p={p}
          pricing={pricing}
          style={style}
          radius={inset ? Math.max(style.radius - 4, 4) : 0}
          compact={compact}
          aspect={aspect}
        />
      </div>
      <div className="flex flex-col" style={{ padding: `6px 8px ${compact ? 6 : 8}px`, flex: fill ? 1 : undefined }}>
        <PInfo p={p} pricing={pricing} style={style} compact={compact} fill={fill} />
      </div>
    </div>
  );
}

function PListTile({ p, style }: { p: PreviewProduct; style: ProductCardStyle }) {
  const t = useTheme();
  const pricing = pricingOf(p, t.promos[p.id]);
  const boxed = style.design !== "flatSimple" && style.design !== "simpleCard";
  return (
    <div
      className="flex items-start gap-2.5 overflow-hidden p-2"
      style={
        boxed
          ? {
              background: style.cardColor || "#fff",
              borderRadius: style.radius,
              border: style.design === "flat" ? "1px solid #E5E7EB" : undefined,
              boxShadow: shadowCss(style),
            }
          : undefined
      }
    >
      <div style={{ width: 96, flexShrink: 0 }}>
        <PImage
          p={p}
          pricing={pricing}
          style={style}
          radius={style.imageRounded ? Math.max(style.radius - 4, 4) : 0}
          aspect={style.imageRatio}
        />
      </div>
      <div className="min-w-0 flex-1">
        <PInfo p={p} pricing={pricing} style={style} />
      </div>
    </div>
  );
}

function PSimpleRow({ p, style }: { p: PreviewProduct; style: ProductCardStyle }) {
  const t = useTheme();
  const pricing = pricingOf(p, t.promos[p.id]);
  return (
    <div className="flex items-center gap-3 py-2">
      <div style={{ width: 56, height: 56, flexShrink: 0 }}>
        <PImage p={p} pricing={pricing} style={style} radius={style.imageRounded ? 8 : 0} compact />
      </div>
      <div className="min-w-0 flex-1">
        <PInfo p={p} pricing={pricing} style={style} compact />
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
    </div>
  );
}

function PImageTile({ p, style }: { p: PreviewProduct; style: ProductCardStyle }) {
  const t = useTheme();
  const pricing = pricingOf(p, t.promos[p.id]);
  return (
    <div className="relative h-full overflow-hidden" style={{ borderRadius: style.radius, boxShadow: shadowCss(style) }}>
      <PImage p={p} pricing={pricing} style={style} radius={0} />
      {(style.showTitle || style.showPrice) && (
        <div
          className="absolute inset-x-0 bottom-0 px-2 pb-2 pt-5 text-white"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,.65), transparent)" }}
        >
          {style.showTitle && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                display: "-webkit-box",
                WebkitLineClamp: style.titleMaxLines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {p.name}
            </div>
          )}
          {style.showPrice && <div style={{ fontSize: 13, fontWeight: 700 }}>{rupiah(pricing.price)}</div>}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────── Layout produk ────────────────────────────

const hideScrollbar: React.CSSProperties = { scrollbarWidth: "none" };

function ProductLayoutPreview({
  products,
  cfg,
  paddingH,
  fullWidth,
}: {
  products: PreviewProduct[];
  cfg: ProductBlockConfig;
  paddingH: number;
  fullWidth: number;
}) {
  const style = cfg.card;
  const spacing = cfg.spacing;
  const inner = Math.max(fullWidth - paddingH * 2, 100);
  const columnWidth = (cols: number) => Math.max((fullWidth - paddingH - spacing * cols) / (cols + 0.2), 60);
  const shadowPad = style.shadowEnabled ? clamp(style.shadowBlur / 2 + Math.abs(style.shadowOffsetY), 0, 20) : 0;
  const card = (p: PreviewProduct, width: number, fill = true, ratio?: number) => (
    <PCard p={p} style={style} compact={width < COMPACT_CARD_WIDTH} fill={fill} ratio={ratio} />
  );

  const horizontal = (itemW: number, requestedRows: number) => {
    const rows = Math.max(1, Math.min(requestedRows, products.length));
    const columns = Math.ceil(products.length / rows);
    return (
      <div className="overflow-x-auto" style={{ ...hideScrollbar, padding: `${shadowPad}px ${paddingH}px` }}>
        <div className="flex w-max flex-col" style={{ gap: spacing }}>
          {range(rows).map((r) => (
            <div key={r} className="flex items-stretch" style={{ gap: spacing }}>
              {range(columns).map((j) => {
                const idx = j * rows + r;
                return (
                  <div key={j} className="flex" style={{ width: itemW, flexShrink: 0 }}>
                    {idx < products.length && card(products[idx], itemW)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  switch (cfg.layout) {
    case "threeColumn":
      return horizontal(columnWidth(3), cfg.rows);
    case "fourColumn":
      return horizontal(columnWidth(4), cfg.rows);
    case "largeCard":
      return horizontal((fullWidth - paddingH) * 0.8, 1);
    case "grid": {
      const cols = cfg.gridColumns;
      const itemW = (inner - spacing * (cols - 1)) / cols;
      return (
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: spacing, padding: `0 ${paddingH}px` }}
        >
          {products.map((p) => (
            <div key={p.id} className="flex">
              {card(p, itemW)}
            </div>
          ))}
        </div>
      );
    }
    case "staggered": {
      const cols = clamp(cfg.gridColumns, 2, 3);
      const itemW = (inner - spacing * (cols - 1)) / cols;
      return (
        <div className="flex items-start" style={{ gap: spacing, padding: `0 ${paddingH}px` }}>
          {range(cols).map((k) => (
            <div key={k} className="flex min-w-0 flex-1 flex-col" style={{ gap: spacing }}>
              {products.map((p, i) =>
                i % cols === k ? (
                  <div key={p.id}>
                    {card(p, itemW, false, i % 3 === 0 ? style.imageRatio * 0.75 : style.imageRatio)}
                  </div>
                ) : null,
              )}
            </div>
          ))}
        </div>
      );
    }
    case "listTile":
      return (
        <div className="flex flex-col" style={{ gap: spacing, padding: `0 ${paddingH}px` }}>
          {products.map((p) => (
            <PListTile key={p.id} p={p} style={style} />
          ))}
        </div>
      );
    case "simpleList":
      return (
        <div className="flex flex-col divide-y" style={{ padding: `0 ${paddingH}px` }}>
          {products.map((p) => (
            <PSimpleRow key={p.id} p={p} style={style} />
          ))}
        </div>
      );
    case "carousel": {
      const page = fullWidth * 0.75;
      return (
        <div className="flex overflow-x-auto" style={{ ...hideScrollbar, paddingLeft: fullWidth * 0.125 }}>
          {products.map((p, i) => (
            <div
              key={p.id}
              className="shrink-0"
              style={{ width: page, padding: "2px 6px 6px", transform: i === 0 ? undefined : "scale(0.92)" }}
            >
              <PCard p={p} style={style} />
            </div>
          ))}
        </div>
      );
    }
    case "quilted": {
      const colW = (inner - spacing) / 2;
      const smallH = colW * 0.7;
      const bigH = smallH * 2 + spacing;
      const groups = range(Math.ceil(products.length / 3)).map((g) => products.slice(g * 3, g * 3 + 3));
      return (
        <div className="flex flex-col" style={{ gap: spacing, padding: `0 ${paddingH}px` }}>
          {groups.map((group, g) =>
            group.length === 3 ? (
              <div key={g} className="flex" style={{ height: bigH, gap: spacing, flexDirection: g % 2 ? "row-reverse" : "row" }}>
                <div className="min-w-0 flex-1">
                  <PImageTile p={group[0]} style={style} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col" style={{ gap: spacing }}>
                  <div className="min-h-0 flex-1">
                    <PImageTile p={group[1]} style={style} />
                  </div>
                  <div className="min-h-0 flex-1">
                    <PImageTile p={group[2]} style={style} />
                  </div>
                </div>
              </div>
            ) : (
              <div key={g} className="flex" style={{ height: smallH, gap: spacing }}>
                <div className="min-w-0 flex-1">
                  <PImageTile p={group[0]} style={style} />
                </div>
                <div className="min-w-0 flex-1">{group[1] && <PImageTile p={group[1]} style={style} />}</div>
              </div>
            ),
          )}
        </div>
      );
    }
    case "twoColumn":
    default:
      return horizontal(columnWidth(2), cfg.rows);
  }
}

// ───────────────────────────── Blok ────────────────────────────────────

function Frame({ block, children, seeAll }: { block: HomeBlock; children: React.ReactNode; seeAll?: boolean }) {
  const t = useTheme();
  const s = block.style;
  const hasDeco = !!s.bgColor || !!s.bgImageUrl;
  const title = block.title.trim();
  const showSeeAll = seeAll && block.showSeeAll;
  return (
    <div
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
        <div className="flex items-center justify-between gap-2" style={{ padding: `0 ${s.paddingH}px 8px` }}>
          <span className="truncate" style={{ fontSize: 18, fontWeight: 700 }}>
            {title}
          </span>
          {showSeeAll && (
            <span className="shrink-0" style={{ fontSize: 14, fontWeight: 500, color: t.primary }}>
              Lihat Semua
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function EmptyBlock({ block, message }: { block: HomeBlock; message: string }) {
  return (
    <Frame block={block}>
      <div
        className="mx-3 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-4 text-center text-[11px] text-gray-500"
        style={{ marginLeft: block.style.paddingH || 12, marginRight: block.style.paddingH || 12 }}
      >
        <span>
          <b>{BLOCK_LABELS[block.type].label}:</b> {message}
        </span>
      </div>
    </Frame>
  );
}

function ProductsBlock({ block }: { block: HomeBlock<"products"> }) {
  const cfg = block.config;
  const { products, loading } = useSourceProducts(cfg);
  if (loading) {
    return (
      <Frame block={block}>
        <div className="flex h-[120px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </Frame>
    );
  }
  const list = prepareProducts(products, cfg);
  if (!list.length) {
    const reason =
      cfg.source === "category" && !cfg.category
        ? "pilih kategori terlebih dahulu."
        : cfg.source === "brand" && !cfg.brandId
          ? "pilih brand terlebih dahulu."
          : "tidak ada produk — blok ini disembunyikan di aplikasi.";
    return <EmptyBlock block={block} message={reason} />;
  }
  return (
    <Frame block={block} seeAll>
      <ProductLayoutPreview
        products={list}
        cfg={cfg}
        paddingH={block.style.paddingH}
        fullWidth={PHONE_WIDTH - block.style.marginH * 2}
      />
    </Frame>
  );
}

function BannerBlock({ block, data }: { block: HomeBlock<"banner">; data: PreviewData }) {
  const t = useTheme();
  const c: BannerBlockConfig = block.config;
  if (!data.banners.length) {
    return <EmptyBlock block={block} message="belum ada banner aktif (atur di menu Desain & Banner)." />;
  }
  const available = PHONE_WIDTH - block.style.marginH * 2 - block.style.paddingH * 2;
  const pageW = available * clamp(c.viewportFraction, 0.5, 1);
  const offset = c.viewportFraction < 1 ? (available - pageW) / 2 : 0;
  return (
    <Frame block={block}>
      <div style={{ padding: `0 ${block.style.paddingH}px` }}>
        <div className="flex overflow-hidden" style={{ height: c.height, paddingLeft: offset }}>
          {data.banners.slice(0, 3).map((b) => (
            <div key={b.id} className="shrink-0" style={{ width: pageW, padding: `0 ${c.itemMarginH}px` }}>
              <div
                className="relative h-full overflow-hidden bg-gray-200 shadow"
                style={{ borderRadius: c.radius }}
              >
                {b.imageUrl && <img src={b.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                {c.showText && (
                  <>
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,.6), transparent)" }} />
                    <div className="absolute inset-x-4 bottom-4 text-white">
                      <div className="truncate" style={{ fontSize: 24, fontWeight: 700 }}>
                        {b.title}
                      </div>
                      <div className="line-clamp-2" style={{ fontSize: 16 }}>
                        {b.description}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        {c.showIndicator && (
          <div className="mt-2.5 flex justify-center gap-2">
            {data.banners.map((b, i) => (
              <span
                key={b.id}
                className="h-2 rounded-full"
                style={{ width: i === 0 ? 24 : 8, background: i === 0 ? t.primary : "#9e9e9e" }}
              />
            ))}
          </div>
        )}
      </div>
    </Frame>
  );
}

function BrandsBlock({ block, data }: { block: HomeBlock<"brands">; data: PreviewData }) {
  const c: BrandsBlockConfig = block.config;
  if (!data.brands.length) return <EmptyBlock block={block} message="belum ada brand." />;
  const circle = c.style === "circle";
  const size = c.itemSize;
  return (
    <Frame block={block} seeAll>
      <div className="flex gap-2 overflow-x-auto" style={{ ...hideScrollbar, padding: `0 ${block.style.paddingH}px` }}>
        {data.brands.map((b) =>
          circle ? (
            <div key={b.id} className="flex shrink-0 flex-col items-center" style={{ width: size + 12 }}>
              <div
                className="flex items-center justify-center overflow-hidden rounded-full bg-white shadow"
                style={{ width: size, height: size, padding: size * 0.15 }}
              >
                {b.logoUrl && <img src={b.logoUrl} alt="" className="h-full w-full rounded-full object-contain" />}
              </div>
              <span className="mt-1 w-full truncate text-center" style={{ fontSize: 11 }}>
                {b.name}
              </span>
            </div>
          ) : (
            <div
              key={b.id}
              className="flex shrink-0 flex-col overflow-hidden rounded-xl bg-white shadow"
              style={{ width: (size * 100) / 70, height: size }}
            >
              <div className="min-h-0 flex-1 p-2">
                {b.logoUrl && <img src={b.logoUrl} alt="" className="h-full w-full object-contain" />}
              </div>
              <span className="truncate px-1 pb-2 text-center" style={{ fontSize: 13 }}>
                {b.name}
              </span>
            </div>
          ),
        )}
      </div>
    </Frame>
  );
}

function CategoriesBlock({ block, data }: { block: HomeBlock<"categories">; data: PreviewData }) {
  const t = useTheme();
  const c: CategoriesBlockConfig = block.config;

  // Gaya "Gambar (geser)" — kartu manual dari config.items.
  if (c.style === "imageSlider") {
    const items = (Array.isArray(c.items) ? c.items : []).slice(0, Math.min(Math.max(c.limit, 0), CATEGORY_SLIDER_MAX));
    const filled = items.filter((it) => it && (it.imageUrl || it.name));
    if (!filled.length) return <EmptyBlock block={block} message="isi kartu kategori (nama + gambar)." />;
    const size = Math.min(Math.max(c.itemSize || 84, 56), 140);
    return (
      <Frame block={block} seeAll>
        <div className="flex gap-3 overflow-x-auto" style={{ ...hideScrollbar, padding: `0 ${block.style.paddingH}px` }}>
          {filled.map((it, i) => (
            <div key={i} className="flex shrink-0 flex-col items-center" style={{ width: size + 14 }}>
              <div className="flex items-center justify-center overflow-hidden" style={{ width: size, height: size }}>
                {it.imageUrl ? (
                  <img src={it.imageUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center rounded-full font-bold"
                    style={{ background: hexToRgba(t.primary, 0.12), color: t.primary, fontSize: size * 0.4 }}
                  >
                    {(it.name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="mt-1.5 line-clamp-2 text-center" style={{ fontSize: 11, lineHeight: 1.2 }}>
                {it.name}
              </span>
            </div>
          ))}
        </div>
      </Frame>
    );
  }

  const names = data.categories.slice(0, c.limit);
  if (!names.length) return <EmptyBlock block={block} message="belum ada kategori produk." />;
  const circle = (name: string, size: number) => (
    <div className="flex flex-col items-center">
      <div
        className="flex items-center justify-center rounded-full font-bold"
        style={{ width: size, height: size, background: hexToRgba(t.primary, 0.12), color: t.primary, fontSize: size * 0.4 }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <span className="mt-1.5 line-clamp-2 text-center" style={{ fontSize: 11, lineHeight: 1.2 }}>
        {name}
      </span>
    </div>
  );
  const pad = `0 ${block.style.paddingH}px`;
  return (
    <Frame block={block} seeAll>
      {c.style === "grid" ? (
        <div className="grid gap-y-3" style={{ gridTemplateColumns: `repeat(${c.columns}, minmax(0,1fr))`, padding: pad }}>
          {names.map((n) => (
            <div key={n}>{circle(n, 48)}</div>
          ))}
        </div>
      ) : c.style === "circle" ? (
        <div className="flex gap-2 overflow-x-auto" style={{ ...hideScrollbar, padding: pad }}>
          {names.map((n) => (
            <div key={n} className="shrink-0" style={{ width: 68 }}>
              {circle(n, 52)}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto" style={{ ...hideScrollbar, padding: pad }}>
          {names.map((n) => (
            <span
              key={n}
              className="flex h-9 shrink-0 items-center whitespace-nowrap rounded-full bg-white px-3.5"
              style={{ border: `1px solid ${hexToRgba(t.primary, 0.35)}`, color: t.primary, fontSize: 13, fontWeight: 500 }}
            >
              {n}
            </span>
          ))}
        </div>
      )}
    </Frame>
  );
}

function ParentCategoriesBlock({ block, data }: { block: HomeBlock<"parentCategories">; data: PreviewData }) {
  const t = useTheme();
  const c = block.config;
  const parents = orderParents(data.parents.filter((p) => p.name), c.order).slice(0, c.limit);
  if (!parents.length) return <EmptyBlock block={block} message="belum ada induk kategori." />;

  const avatar = (p: { id: string; name: string; imageUrl: string }, size: number) => (
    <div className="flex flex-col items-center">
      <div
        className="flex items-center justify-center overflow-hidden rounded-full font-bold"
        style={{ width: size, height: size, background: hexToRgba(t.primary, 0.12), color: t.primary, fontSize: size * 0.4 }}
      >
        {p.imageUrl ? (
          <img src={p.imageUrl} alt="" className="h-full w-full object-contain" />
        ) : (
          p.name.charAt(0).toUpperCase()
        )}
      </div>
      <span className="mt-1.5 line-clamp-2 text-center" style={{ fontSize: 11, lineHeight: 1.2 }}>
        {p.name}
      </span>
    </div>
  );
  const pad = `0 ${block.style.paddingH}px`;
  const imgSize = Math.min(Math.max(c.itemSize || 64, 36), 140);
  return (
    <Frame block={block}>
      {c.pinned && (
        <div className="mb-1 px-3 text-[9px] uppercase tracking-wide text-primary/70">Disematkan di app bar</div>
      )}
      {c.style === "image" ? (
        <div className="flex gap-3 overflow-x-auto" style={{ ...hideScrollbar, padding: pad }}>
          {parents.map((p) => (
            <div key={p.id} className="flex shrink-0 flex-col items-center" style={{ width: imgSize + 14 }}>
              <div className="flex items-center justify-center overflow-hidden" style={{ width: imgSize, height: imgSize }}>
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center rounded-full font-bold"
                    style={{ background: hexToRgba(t.primary, 0.12), color: t.primary, fontSize: imgSize * 0.4 }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="mt-1.5 line-clamp-2 text-center" style={{ fontSize: 11, lineHeight: 1.2 }}>
                {p.name}
              </span>
            </div>
          ))}
        </div>
      ) : c.style === "grid" ? (
        <div className="grid gap-y-3" style={{ gridTemplateColumns: `repeat(${c.columns}, minmax(0,1fr))`, padding: pad }}>
          {parents.map((p) => (
            <div key={p.id}>{avatar(p, 48)}</div>
          ))}
        </div>
      ) : c.style === "circle" ? (
        <div className="flex gap-2 overflow-x-auto" style={{ ...hideScrollbar, padding: pad }}>
          {parents.map((p) => (
            <div key={p.id} className="shrink-0" style={{ width: imgSize + 12 }}>
              {avatar(p, imgSize)}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto" style={{ ...hideScrollbar, padding: pad }}>
          {parents.map((p) => (
            <span
              key={p.id}
              className="flex h-9 shrink-0 items-center whitespace-nowrap rounded-full bg-white px-3.5"
              style={{ border: `1px solid ${hexToRgba(t.primary, 0.35)}`, color: t.primary, fontSize: 13, fontWeight: 500 }}
            >
              {p.name}
            </span>
          ))}
        </div>
      )}
    </Frame>
  );
}

function SearchBlock({ block }: { block: HomeBlock<"search"> }) {
  const c: SearchBlockConfig = block.config;
  return (
    <Frame block={block}>
      <div style={{ padding: `0 ${block.style.paddingH}px` }}>
        <div
          className="flex h-11 items-center gap-2 px-3 text-gray-500"
          style={{ background: c.bgColor || "#fff", border: `1px solid ${c.borderColor || "#E5E7EB"}`, borderRadius: c.radius }}
        >
          <Search className="h-5 w-5" />
          <span className="truncate" style={{ fontSize: 14 }}>
            {c.placeholder}
          </span>
        </div>
      </div>
    </Frame>
  );
}

function TextBlock({ block }: { block: HomeBlock<"text"> }) {
  const c: TextBlockConfig = block.config;
  if (!c.text.trim() && !block.title.trim()) return <EmptyBlock block={block} message="teks masih kosong." />;
  return (
    <Frame block={block}>
      {c.text.trim() && (
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
      )}
    </Frame>
  );
}

function ImageBlock({ block }: { block: HomeBlock<"image"> }) {
  const c: ImageBlockConfig = block.config;
  if (!c.imageUrl) return <EmptyBlock block={block} message="unggah gambar terlebih dahulu." />;
  const fixedHeight = typeof c.height === "number" && c.height > 0 ? c.height : null;
  const sidePad = c.fullWidth ? 0 : block.style.paddingH;
  return (
    <Frame block={block}>
      <div style={{ padding: `0 ${sidePad}px` }}>
        <div
          className="w-full overflow-hidden bg-gray-200"
          style={{
            borderRadius: c.radius,
            ...(fixedHeight ? { height: fixedHeight } : { aspectRatio: String(c.aspectRatio) }),
          }}
        >
          <img src={c.imageUrl} alt="" className="h-full w-full" style={{ objectFit: c.fit }} />
        </div>
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
        <div
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
        </div>
      </div>
    </Frame>
  );
}

function BlockPreview({ block, data }: { block: HomeBlock; data: PreviewData }) {
  switch (block.type) {
    case "products":
      return <ProductsBlock block={block as HomeBlock<"products">} />;
    case "banner":
      return <BannerBlock block={block as HomeBlock<"banner">} data={data} />;
    case "brands":
      return <BrandsBlock block={block as HomeBlock<"brands">} data={data} />;
    case "categories":
      return <CategoriesBlock block={block as HomeBlock<"categories">} data={data} />;
    case "parentCategories":
      return <ParentCategoriesBlock block={block as HomeBlock<"parentCategories">} data={data} />;
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

// ───────────────────────────── Ponsel ──────────────────────────────────

function AppBarPreview({ design }: { design: AppDesign }) {
  const title =
    design.showLogo && design.logoUrl ? (
      <img src={design.logoUrl} alt="" style={{ height: 34 }} className="object-contain" />
    ) : (
      <span className="truncate" style={{ fontSize: 18, fontWeight: 700 }}>
        {design.appTitle}
      </span>
    );
  return (
    <div className="relative flex h-14 items-center gap-2 px-4" style={{ background: design.appBarColor, color: design.appBarTextColor }}>
      <div className={cn("flex min-w-0 flex-1", design.centerTitle && "justify-center pl-16")}>{title}</div>
      <ShoppingCart className="h-5 w-5 shrink-0" />
      <MessagesSquare className="ml-3 h-5 w-5 shrink-0" />
    </div>
  );
}

export function PhonePreview({
  layout,
  data,
  selectedId,
  onSelect,
}: {
  layout: AppLayout;
  data: PreviewData;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { design } = layout;
  useGoogleFont(design.fontFamily);
  const primary = design.seedColor;
  const navColor = design.navSelectedColor || primary;
  const theme: PreviewTheme = {
    primary,
    price: design.priceColor || primary,
    button: design.buttonColor,
    promos: data.promos,
  };
  const visible = layout.blocks.filter((b) => b.enabled);

  return (
    <ThemeCtx.Provider value={theme}>
      <div
        className="mx-auto overflow-hidden rounded-[2.4rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-2xl"
        style={{ width: PHONE_WIDTH + 20 }}
      >
        <div
          className="flex flex-col text-[#1f2937]"
          style={{ height: 720, fontFamily: `"${design.fontFamily}", sans-serif`, background: design.backgroundColor }}
        >
          {/* Status bar + app bar → klik untuk membuka pengaturan desain */}
          <div className="cursor-pointer" onClick={() => onSelect(null)} title="Atur desain aplikasi">
            <div
              className="flex h-6 items-center justify-between px-5 text-[11px] font-semibold"
              style={{ background: design.appBarColor, color: design.appBarTextColor }}
            >
              <span>9:41</span>
              <span>●●● ▮</span>
            </div>
            <AppBarPreview design={design} />
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" style={hideScrollbar} onClick={() => onSelect(null)}>
            {data.loading ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-gray-500">
                <ImageIcon className="h-8 w-8" />
                Beranda kosong. Tambahkan blok dari panel kiri.
              </div>
            ) : (
              visible.map((block) => (
                <div
                  key={block.id}
                  // flex-col mencegah margin antar blok "collapse" (Flutter tidak).
                  className={cn(
                    "relative flex shrink-0 cursor-pointer flex-col",
                    selectedId === block.id
                      ? "z-10 outline outline-2 -outline-offset-2 outline-blue-500"
                      : "hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-blue-300",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(block.id);
                  }}
                >
                  <BlockPreview block={block} data={data} />
                  {selectedId === block.id && (
                    <span className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rounded bg-blue-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                      {BLOCK_LABELS[block.type].label}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="grid h-14 shrink-0 grid-cols-4 border-t bg-white text-[11px]">
            {[
              { icon: Home, label: "Beranda" },
              { icon: ShoppingBag, label: "Katalog" },
              { icon: Bell, label: "Notifikasi" },
              { icon: User, label: "Profil" },
            ].map(({ icon: Icon, label }, i) => (
              <div
                key={label}
                className="flex flex-col items-center justify-center gap-0.5"
                style={{ color: i === 0 ? navColor : "#9e9e9e" }}
              >
                <Icon className="h-5 w-5" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}
