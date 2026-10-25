/**
 * Skema desain aplikasi Flutter yang diedit lewat App Builder.
 *
 * Disimpan di Firestore:
 *   - `settings/app_layout_draft` → hasil "Simpan Draft" (belum tampil di app)
 *   - `settings/app_layout`       → hasil "Publish" (dibaca aplikasi real-time)
 *
 * PENTING: nama field & nilai default harus sama dengan
 * `lib/src/features/home_layout/domain/app_layout.dart` di proyek Flutter.
 */

export type BlockType =
  | "banner"
  | "brands"
  | "categories"
  | "parentCategories"
  | "products"
  | "search"
  | "text"
  | "image"
  | "spacer"
  | "button";

export type ProductSource = "trending" | "promo" | "latest" | "category" | "brand";

export type ProductLayout =
  | "twoColumn"
  | "threeColumn"
  | "fourColumn"
  | "grid"
  | "staggered"
  | "listTile"
  | "simpleList"
  | "largeCard"
  | "carousel"
  | "quilted";

export type CardDesign = "card" | "glass" | "simpleCard" | "flat" | "flatSimple";

export interface AppDesign {
  appTitle: string;
  logoUrl: string;
  showLogo: boolean;
  centerTitle: boolean;
  seedColor: string;
  appBarColor: string;
  appBarTextColor: string;
  buttonColor: string;
  backgroundColor: string;
  /** Kosong = warna utama (seed). */
  priceColor: string;
  /** Kosong = warna utama (seed). */
  navSelectedColor: string;
  fontFamily: string;
}

export interface BlockStyle {
  marginTop: number;
  marginBottom: number;
  marginH: number;
  paddingH: number;
  paddingV: number;
  bgColor: string;
  bgImageUrl: string;
  radius: number;
  /** Warna teks judul seksi blok. Kosong = warna default (teks tema). */
  titleColor: string;
}

export interface ProductCardStyle {
  design: CardDesign;
  radius: number;
  imageRatio: number;
  imageFit: "cover" | "contain";
  imageRounded: boolean;
  showTitle: boolean;
  titleMaxLines: number;
  showCategory: boolean;
  showPrice: boolean;
  showStock: boolean;
  showDiscountBadge: boolean;
  showCartButton: boolean;
  /** Tampilkan rata-rata bintang + jumlah ulasan pada kartu produk. */
  showRating: boolean;
  /** Tampilkan jumlah terjual (soldCount) pada kartu produk. */
  showSold: boolean;
  cardColor: string;
  shadowEnabled: boolean;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowOpacity: number;
}

export interface ProductBlockConfig {
  source: ProductSource;
  category: string;
  brandId: string;
  limit: number;
  sort: "default" | "priceAsc" | "priceDesc" | "nameAsc" | "stockDesc";
  hideOutOfStock: boolean;
  layout: ProductLayout;
  gridColumns: number;
  rows: number;
  spacing: number;
  autoSlide: boolean;
  card: ProductCardStyle;
}

export interface BannerBlockConfig {
  height: number;
  viewportFraction: number;
  itemMarginH: number;
  radius: number;
  autoplaySeconds: number;
  showIndicator: boolean;
  showText: boolean;
}

export interface BrandsBlockConfig {
  style: "card" | "circle";
  itemSize: number;
}

/** Satu kartu kategori manual untuk gaya "imageSlider" (Gambar geser). */
export interface CategorySliderItem {
  /** Nama yang tampil di bawah gambar. */
  name: string;
  /** Kategori produk yang dituju saat diketuk (nama di `product_categories`). */
  category: string;
  /** Gambar PNG (biasanya tanpa latar) yang diunggah admin. */
  imageUrl: string;
}

export interface CategoriesBlockConfig {
  /** imageSlider = kartu gambar manual (lihat `items`); lainnya pakai daftar kategori. */
  style: "chip" | "grid" | "circle" | "imageSlider";
  columns: number;
  limit: number;
  /** Ukuran kartu untuk gaya imageSlider. */
  itemSize: number;
  /** Isi manual untuk gaya imageSlider (maks. 8). */
  items: CategorySliderItem[];
}

/** Blok "Induk Kategori" — menampilkan induk dari koleksi `category_parents`.
 *  Klik induk → halaman sub-kategorinya. Bisa disematkan (sticky) di app bar. */
export interface ParentCategoriesBlockConfig {
  /** image = gambar PNG datar (tanpa lingkaran) yang digeser, pakai `imageUrl` tiap induk. */
  style: "chip" | "grid" | "circle" | "image";
  columns: number;
  limit: number;
  /** Ukuran kartu untuk gaya "image" (PNG datar). */
  itemSize: number;
  /** Urutan tampil (id dokumen `category_parents`). Induk yang tak ada di sini
   *  ditampilkan setelahnya (urut nama) sehingga induk baru tetap muncul. */
  order: string[];
  /** true = blok menempel di bawah app bar saat halaman di-scroll. */
  pinned: boolean;
  /** true = tampilkan juga sebagai bar menempel di halaman Katalog Produk. */
  showInCatalog: boolean;
}

export interface SearchBlockConfig {
  placeholder: string;
  radius: number;
  bgColor: string;
  borderColor: string;
}

export interface TextBlockConfig {
  text: string;
  fontSize: number;
  bold: boolean;
  align: "left" | "center" | "right";
  color: string;
}

export interface ImageBlockConfig {
  imageUrl: string;
  aspectRatio: number;
  /** Tinggi tetap (px) seperti banner. 0 = otomatis dari rasio (aspectRatio). */
  height: number;
  /** true = gambar membentang penuh lebar halaman (abaikan padding samping). */
  fullWidth: boolean;
  radius: number;
  link: string;
  fit: "cover" | "contain";
}

export interface SpacerBlockConfig {
  height: number;
  showDivider: boolean;
  dividerColor: string;
}

export interface ButtonBlockConfig {
  label: string;
  link: string;
  style: "filled" | "outlined";
  /** Kosong = warna tombol utama. */
  color: string;
  radius: number;
  height: number;
  showIcon: boolean;
}

export interface BlockConfigMap {
  banner: BannerBlockConfig;
  brands: BrandsBlockConfig;
  categories: CategoriesBlockConfig;
  parentCategories: ParentCategoriesBlockConfig;
  products: ProductBlockConfig;
  search: SearchBlockConfig;
  text: TextBlockConfig;
  image: ImageBlockConfig;
  spacer: SpacerBlockConfig;
  button: ButtonBlockConfig;
}

export interface HomeBlock<T extends BlockType = BlockType> {
  id: string;
  type: T;
  enabled: boolean;
  title: string;
  showSeeAll: boolean;
  style: BlockStyle;
  config: BlockConfigMap[T];
}

/**
 * Desain halaman KATALOG produk (web & aplikasi) — TERBATAS pada tipe layout
 * + gaya kartu produk saja (tanpa kategori / tombol). Filter & pencarian
 * katalog tetap ditangani halaman masing-masing.
 */
export interface CatalogConfig {
  layout: ProductLayout;
  gridColumns: number;
  spacing: number;
  card: ProductCardStyle;
}

export interface AppLayout {
  version: number;
  design: AppDesign;
  blocks: HomeBlock[];
  catalog: CatalogConfig;
}

// ───────────────────────────── Default ─────────────────────────────────

export const DEFAULT_DESIGN: AppDesign = {
  appTitle: "Manafidh Store",
  logoUrl: "",
  showLogo: false,
  centerTitle: false,
  seedColor: "#2196F3",
  appBarColor: "#FC4AA9",
  appBarTextColor: "#FFFFFF",
  buttonColor: "#FF5FB4",
  backgroundColor: "#F5F5F7",
  priceColor: "",
  navSelectedColor: "",
  fontFamily: "Poppins",
};

export const DEFAULT_STYLE: BlockStyle = {
  marginTop: 0,
  marginBottom: 0,
  marginH: 0,
  paddingH: 0,
  paddingV: 0,
  bgColor: "",
  bgImageUrl: "",
  radius: 0,
  titleColor: "",
};

export const DEFAULT_CARD: ProductCardStyle = {
  design: "card",
  radius: 12,
  imageRatio: 1,
  imageFit: "cover",
  imageRounded: false,
  showTitle: true,
  titleMaxLines: 2,
  showCategory: true,
  showPrice: true,
  showStock: true,
  showDiscountBadge: true,
  showCartButton: false,
  showRating: false,
  showSold: false,
  cardColor: "",
  shadowEnabled: true,
  shadowBlur: 8,
  shadowOffsetX: 0,
  shadowOffsetY: 2,
  shadowOpacity: 0.12,
};

export const DEFAULT_CONFIGS: BlockConfigMap = {
  banner: {
    height: 200,
    viewportFraction: 1,
    itemMarginH: 8,
    radius: 15,
    autoplaySeconds: 6,
    showIndicator: true,
    showText: true,
  },
  brands: { style: "card", itemSize: 70 },
  categories: { style: "chip", columns: 4, limit: 12, itemSize: 84, items: [] },
  parentCategories: { style: "circle", columns: 4, limit: 12, itemSize: 64, order: [], pinned: false, showInCatalog: false },
  products: {
    source: "latest",
    category: "",
    brandId: "",
    limit: 10,
    sort: "default",
    hideOutOfStock: false,
    layout: "twoColumn",
    gridColumns: 2,
    rows: 1,
    spacing: 8,
    autoSlide: false,
    card: DEFAULT_CARD,
  },
  search: {
    placeholder: "Cari produk...",
    radius: 10,
    bgColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  text: { text: "", fontSize: 16, bold: true, align: "left", color: "#1F2937" },
  image: { imageUrl: "", aspectRatio: 2, height: 0, fullWidth: true, radius: 12, link: "", fit: "cover" },
  spacer: { height: 16, showDivider: false, dividerColor: "#E5E7EB" },
  button: {
    label: "Lihat Semua Produk",
    link: "/catalog",
    style: "filled",
    color: "",
    radius: 10,
    height: 50,
    showIcon: true,
  },
};

export const DEFAULT_CATALOG: CatalogConfig = {
  layout: "grid",
  gridColumns: 2,
  spacing: 8,
  card: { ...DEFAULT_CARD },
};

function block<T extends BlockType>(
  id: string,
  type: T,
  partial: {
    title?: string;
    showSeeAll?: boolean;
    style?: Partial<BlockStyle>;
    config?: Partial<BlockConfigMap[T]>;
  } = {},
): HomeBlock<T> {
  return {
    id,
    type,
    enabled: true,
    title: partial.title ?? "",
    showSeeAll: partial.showSeeAll ?? false,
    style: { ...DEFAULT_STYLE, ...partial.style },
    config: { ...structuredClone(DEFAULT_CONFIGS[type]), ...partial.config },
  };
}

/** Susunan default — sama dengan `AppLayout.defaults()` di Flutter. */
export function defaultLayout(): AppLayout {
  return {
    version: 1,
    design: { ...DEFAULT_DESIGN },
    blocks: [
      block("banner-1", "banner", { style: { marginTop: 16 } }),
      block("brands-1", "brands", {
        title: "Brand Favoritmu",
        style: { marginTop: 24, paddingH: 16 },
      }),
      block("promo-1", "products", {
        title: "Flash Sale",
        style: { marginTop: 24, paddingH: 16 },
        config: { source: "promo", layout: "grid", gridColumns: 3, limit: 12 },
      }),
      block("trending-1", "products", {
        title: "Produk Trending",
        showSeeAll: true,
        style: { marginTop: 24, paddingH: 16 },
        config: { source: "trending", layout: "twoColumn", limit: 10 },
      }),
      block("button-1", "button", {
        style: { marginTop: 24, marginBottom: 24, paddingH: 16 },
        config: { label: "Lihat Semua Produk di Katalog", link: "/catalog" },
      }),
    ],
    catalog: structuredClone(DEFAULT_CATALOG),
  };
}

export function newBlockId(type: BlockType): string {
  return `${type}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Blok baru dengan pengaturan awal yang langsung enak dilihat. */
export function createBlock(type: BlockType): HomeBlock {
  const id = newBlockId(type);
  switch (type) {
    case "products":
      return block(id, type, {
        title: "Produk Pilihan",
        showSeeAll: true,
        style: { marginTop: 16, paddingH: 16 },
      });
    case "categories":
      return block(id, type, { title: "Kategori", style: { marginTop: 16, paddingH: 16 } });
    case "parentCategories":
      return block(id, type, { title: "Kategori Pilihan", style: { marginTop: 16, paddingH: 16 } });
    case "brands":
      return block(id, type, { title: "Brand", style: { marginTop: 16, paddingH: 16 } });
    case "banner":
      return block(id, type, { style: { marginTop: 16 } });
    case "text":
      return block(id, type, {
        style: { marginTop: 16, paddingH: 16 },
        config: { text: "Judul seksi" },
      });
    case "spacer":
      return block(id, type);
    default:
      return block(id, type, { style: { marginTop: 16, paddingH: 16 } });
  }
}

// ─────────────────────── Normalisasi data Firestore ─────────────────────

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Gabungkan `raw` ke `defaults` hanya untuk key yang dikenal & bertipe sama. */
function mergeKnown<T extends object>(defaults: T, raw: unknown): T {
  const out = structuredClone(defaults) as Record<string, unknown>;
  if (!isObj(raw)) return out as T;
  for (const key of Object.keys(out)) {
    const def = out[key];
    const val = raw[key];
    if (val === undefined || val === null) continue;
    if (isObj(def)) out[key] = mergeKnown(def, val);
    else if (typeof def === typeof val) out[key] = val;
  }
  return out as T;
}

const BLOCK_TYPES = Object.keys(DEFAULT_CONFIGS) as BlockType[];

/** Layout yang masuk akal untuk halaman katalog (gulir vertikal) — tanpa
 *  carousel / kolom-horizontal yang hanya pas untuk blok beranda. */
const CATALOG_LAYOUT_VALUES = new Set<ProductLayout>([
  "grid", "staggered", "listTile", "simpleList", "quilted",
]);

function normalizeCatalog(raw: unknown): CatalogConfig {
  const c = mergeKnown(DEFAULT_CATALOG, raw);
  if (!CATALOG_LAYOUT_VALUES.has(c.layout)) c.layout = DEFAULT_CATALOG.layout;
  return c;
}

export function normalizeLayout(raw: unknown): AppLayout {
  if (!isObj(raw)) return defaultLayout();
  const blocks: HomeBlock[] = [];
  if (Array.isArray(raw.blocks)) {
    raw.blocks.forEach((b, i) => {
      if (!isObj(b) || !BLOCK_TYPES.includes(b.type as BlockType)) return;
      const type = b.type as BlockType;
      blocks.push({
        id: typeof b.id === "string" && b.id ? b.id : `${type}-${i}`,
        type,
        enabled: typeof b.enabled === "boolean" ? b.enabled : true,
        title: typeof b.title === "string" ? b.title : "",
        showSeeAll: typeof b.showSeeAll === "boolean" ? b.showSeeAll : false,
        style: mergeKnown(DEFAULT_STYLE, b.style),
        config: mergeKnown(DEFAULT_CONFIGS[type], b.config),
      });
    });
  }
  return {
    version: 1,
    design: mergeKnown(DEFAULT_DESIGN, raw.design),
    blocks: Array.isArray(raw.blocks) ? blocks : defaultLayout().blocks,
    catalog: normalizeCatalog(raw.catalog),
  };
}

/**
 * Mengurutkan daftar induk kategori sesuai `order` (id dokumen) yang disimpan di
 * konfigurasi blok. Induk yang tidak ada di `order` ditaruh setelahnya dengan
 * urutan aslinya — jadi induk baru tetap muncul tanpa admin harus mengaturnya.
 */
export function orderParents<T extends { id: string }>(items: T[], order: string[] | undefined): T[] {
  if (!order || order.length === 0) return items;
  const rank = new Map(order.map((id, i) => [id, i]));
  return [...items].sort((a, b) => {
    const ra = rank.has(a.id) ? rank.get(a.id)! : Number.MAX_SAFE_INTEGER;
    const rb = rank.has(b.id) ? rank.get(b.id)! : Number.MAX_SAFE_INTEGER;
    return ra - rb;
  });
}

// ───────────────────────────── Katalog UI ──────────────────────────────

export const BLOCK_LABELS: Record<BlockType, { label: string; description: string }> = {
  banner: { label: "Banner", description: "Slider banner dari menu Desain & Banner" },
  brands: { label: "Brand", description: "Daftar logo brand" },
  categories: { label: "Kategori", description: "Chip / ikon kategori produk" },
  parentCategories: { label: "Induk Kategori", description: "Kelompok kategori; klik → sub-kategori. Bisa sticky di app bar" },
  products: { label: "Produk", description: "Daftar produk dengan banyak gaya layout" },
  search: { label: "Kotak Pencarian", description: "Membuka katalog untuk mencari produk" },
  text: { label: "Teks", description: "Judul atau paragraf bebas" },
  image: { label: "Gambar", description: "Gambar promosi dengan link" },
  spacer: { label: "Jarak / Garis", description: "Ruang kosong atau garis pemisah" },
  button: { label: "Tombol", description: "Tombol dengan link" },
};

export const PRODUCT_LAYOUTS: { value: ProductLayout; label: string }[] = [
  { value: "twoColumn", label: "Dua Kolom" },
  { value: "threeColumn", label: "Tiga Kolom" },
  { value: "fourColumn", label: "Empat Kolom" },
  { value: "grid", label: "Grid" },
  { value: "staggered", label: "Staggered" },
  { value: "listTile", label: "List Tile" },
  { value: "simpleList", label: "Simple List" },
  { value: "largeCard", label: "Large Card" },
  { value: "carousel", label: "Carousel" },
  { value: "quilted", label: "Quilted" },
];

export const HORIZONTAL_LAYOUTS: ProductLayout[] = ["twoColumn", "threeColumn", "fourColumn"];

/** Pilihan layout untuk halaman katalog (subset vertikal dari PRODUCT_LAYOUTS). */
export const CATALOG_LAYOUTS: { value: ProductLayout; label: string }[] = PRODUCT_LAYOUTS.filter((o) =>
  CATALOG_LAYOUT_VALUES.has(o.value),
);

/** Jumlah maksimum kartu manual pada blok Kategori gaya "Gambar (geser)". */
export const CATEGORY_SLIDER_MAX = 8;

export const CARD_DESIGNS: { value: CardDesign; label: string }[] = [
  { value: "card", label: "Card" },
  { value: "glass", label: "Glass" },
  { value: "simpleCard", label: "Simple Card" },
  { value: "flat", label: "Flat" },
  { value: "flatSimple", label: "Flat Simple" },
];

export const PRODUCT_SOURCES: { value: ProductSource; label: string }[] = [
  { value: "trending", label: "Produk Trending" },
  { value: "promo", label: "Promo / Flash Sale aktif" },
  { value: "latest", label: "Baru Restock" },
  { value: "category", label: "Kategori tertentu" },
  { value: "brand", label: "Brand tertentu" },
];

export const SORT_OPTIONS: { value: ProductBlockConfig["sort"]; label: string }[] = [
  { value: "default", label: "Bawaan sumber" },
  { value: "priceAsc", label: "Harga termurah" },
  { value: "priceDesc", label: "Harga termahal" },
  { value: "nameAsc", label: "Nama A–Z" },
  { value: "stockDesc", label: "Stok terbanyak" },
];

export const FONT_OPTIONS = [
  "Poppins",
  "Roboto",
  "Inter",
  "Lato",
  "Montserrat",
  "Nunito",
  "Open Sans",
  "Raleway",
  "Rubik",
  "Quicksand",
  "Plus Jakarta Sans",
];

/** Link yang dikenali aplikasi (lihat `resolveAppLink` di Flutter). */
export const LINK_PRESETS: { value: string; label: string }[] = [
  { value: "/catalog", label: "Katalog" },
  { value: "/cart", label: "Keranjang" },
  { value: "/chat", label: "Chat Admin" },
  { value: "/profile", label: "Profil" },
  { value: "/collection?source=promo&title=Promo", label: "Semua Promo" },
  { value: "/collection?source=trending&title=Produk%20Trending", label: "Semua Trending" },
];
