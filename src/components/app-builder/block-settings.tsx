"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ColorField,
  ImageField,
  Section,
  SelectField,
  SliderField,
  SwitchField,
  TextField,
} from "./controls";
import {
  BLOCK_LABELS,
  CARD_DESIGNS,
  CATALOG_LAYOUTS,
  CATEGORY_SLIDER_MAX,
  FONT_OPTIONS,
  HORIZONTAL_LAYOUTS,
  LINK_PRESETS,
  orderParents,
  PRODUCT_LAYOUTS,
  PRODUCT_SOURCES,
  SORT_OPTIONS,
  type AppDesign,
  type BlockConfigMap,
  type BlockStyle,
  type BlockType,
  type CardDesign,
  type CatalogConfig,
  type CategorySliderItem,
  type HomeBlock,
  type ProductCardStyle,
  type ProductLayout,
} from "./schema";
import type { PreviewData, PreviewParent } from "./preview-data";

// ─────────────────── Pengurutan induk kategori (App Bar) ────────────────

/**
 * Daftar induk kategori yang bisa diubah urutannya (naik/turun). Urutan disimpan
 * sebagai array id ke `config.order`; induk baru otomatis ikut muncul di akhir.
 */
function ParentOrderList({
  parents,
  order,
  onReorder,
}: {
  parents: PreviewParent[];
  order: string[];
  onReorder: (order: string[]) => void;
}) {
  const ordered = orderParents(parents.filter((p) => p.name), order);
  if (ordered.length === 0) {
    return (
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Belum ada induk kategori. Tambahkan dulu di Pengaturan Kategori Produk.
      </p>
    );
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= ordered.length) return;
    const ids = ordered.map((p) => p.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    onReorder(ids);
  };

  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-muted-foreground">Urutan Tampil</p>
      <div className="rounded-md border">
        {ordered.map((p, i) => (
          <div key={p.id} className="flex items-center gap-2 border-b px-2 py-1.5 last:border-b-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <span className="text-xs font-bold text-primary">{p.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className="min-w-0 flex-1 truncate text-xs">{p.name}</span>
            <button
              type="button"
              disabled={i === 0}
              onClick={() => move(i, i - 1)}
              className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
              aria-label="Naikkan"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={i === ordered.length - 1}
              onClick={() => move(i, i + 1)}
              className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
              aria-label="Turunkan"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────── Ikon layout mini ──────────────────────────

const box = "rounded-[2px] bg-current";

function LayoutGlyph({ layout }: { layout: ProductLayout }) {
  const cols = (n: number) => (
    <div className="flex h-full w-full gap-0.5">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={cn(box, "flex-1")} />
      ))}
      <div className={cn(box, "w-1 opacity-40")} />
    </div>
  );
  switch (layout) {
    case "twoColumn":
      return cols(2);
    case "threeColumn":
      return cols(3);
    case "fourColumn":
      return cols(4);
    case "grid":
      return (
        <div className="grid h-full w-full grid-cols-2 gap-0.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={box} />
          ))}
        </div>
      );
    case "staggered":
      return (
        <div className="flex h-full w-full gap-0.5">
          <div className="flex flex-1 flex-col gap-0.5">
            <div className={cn(box, "flex-[2]")} />
            <div className={cn(box, "flex-1")} />
          </div>
          <div className="flex flex-1 flex-col gap-0.5">
            <div className={cn(box, "flex-1")} />
            <div className={cn(box, "flex-[2]")} />
          </div>
        </div>
      );
    case "listTile":
      return (
        <div className="flex h-full w-full flex-col gap-0.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-1 gap-0.5">
              <div className={cn(box, "w-2.5")} />
              <div className={cn(box, "flex-1 opacity-50")} />
            </div>
          ))}
        </div>
      );
    case "simpleList":
      return (
        <div className="flex h-full w-full flex-col justify-between py-0.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cn(box, "h-0.5")} />
          ))}
        </div>
      );
    case "largeCard":
      return (
        <div className="flex h-full w-full gap-0.5">
          <div className={cn(box, "flex-[4]")} />
          <div className={cn(box, "flex-1 opacity-40")} />
        </div>
      );
    case "carousel":
      return (
        <div className="flex h-full w-full items-center gap-0.5">
          <div className={cn(box, "h-3/4 flex-1 opacity-40")} />
          <div className={cn(box, "h-full flex-[3]")} />
          <div className={cn(box, "h-3/4 flex-1 opacity-40")} />
        </div>
      );
    case "quilted":
      return (
        <div className="flex h-full w-full gap-0.5">
          <div className={cn(box, "flex-1")} />
          <div className="flex flex-1 flex-col gap-0.5">
            <div className={cn(box, "flex-1")} />
            <div className={cn(box, "flex-1")} />
          </div>
        </div>
      );
  }
}

function TilePicker<T extends string>({
  value,
  options,
  onChange,
  glyph,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  glyph?: (v: T) => React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-lg border p-2 text-[10px] font-medium uppercase leading-tight transition-colors",
            value === o.value
              ? "border-primary bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {glyph && <div className="h-7 w-10">{glyph(o.value)}</div>}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function LinkField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <TextField
        label={label}
        value={value}
        onChange={onChange}
        placeholder="/catalog"
        hint="Contoh: /catalog, /product/ID_PRODUK, /collection?source=category&category=Nama, atau https://…"
      />
      <div className="flex flex-wrap gap-1">
        {LINK_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px]",
              value === p.value ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────── Konten per tipe ──────────────────────────

type ConfigSetter<T extends BlockType> = (patch: Partial<BlockConfigMap[T]>) => void;

function ProductsSettings({
  block,
  set,
  data,
}: {
  block: HomeBlock<"products">;
  set: ConfigSetter<"products">;
  data: PreviewData;
}) {
  const c = block.config;
  const setCard = (patch: Partial<ProductCardStyle>) => set({ card: { ...c.card, ...patch } });
  const card = c.card;

  return (
    <>
      <Section title="Tipe Layout">
        <TilePicker
          value={c.layout}
          options={PRODUCT_LAYOUTS}
          onChange={(layout) => set({ layout })}
          glyph={(v) => <LayoutGlyph layout={v} />}
        />
        {HORIZONTAL_LAYOUTS.includes(c.layout) && (
          <SliderField label="Jumlah Baris" value={c.rows} min={1} max={3} onChange={(rows) => set({ rows })} />
        )}
        {c.layout === "grid" && (
          <SliderField
            label="Jumlah Kolom"
            value={c.gridColumns}
            min={1}
            max={4}
            onChange={(gridColumns) => set({ gridColumns })}
          />
        )}
        {c.layout === "staggered" && (
          <SliderField
            label="Jumlah Kolom"
            value={Math.min(3, Math.max(2, c.gridColumns))}
            min={2}
            max={3}
            onChange={(gridColumns) => set({ gridColumns })}
          />
        )}
        {c.layout === "carousel" && (
          <SwitchField label="Geser Otomatis" checked={c.autoSlide} onChange={(autoSlide) => set({ autoSlide })} />
        )}
        <SliderField label="Jarak Antar Kartu" value={c.spacing} min={0} max={32} onChange={(spacing) => set({ spacing })} />
      </Section>

      <Section title="Data">
        <SelectField label="Sumber Produk" value={c.source} options={PRODUCT_SOURCES} onChange={(source) => set({ source })} />
        {c.source === "category" && (
          <SelectField
            label="Kategori"
            value={c.category}
            placeholder="Pilih kategori"
            options={data.categories.map((n) => ({ value: n, label: n }))}
            onChange={(category) => set({ category })}
          />
        )}
        {c.source === "brand" && (
          <SelectField
            label="Brand"
            value={c.brandId}
            placeholder="Pilih brand"
            options={data.brands.map((b) => ({ value: b.id, label: b.name || b.id }))}
            onChange={(brandId) => set({ brandId })}
          />
        )}
        {c.source === "trending" && (
          <p className="text-[11px] text-muted-foreground">
            Daftar diatur di{" "}
            <Link href="/dashboard/settings/trending-products" className="underline">
              Produk Trending
            </Link>
            .
          </p>
        )}
        {c.source === "promo" && (
          <p className="text-[11px] text-muted-foreground">
            Menampilkan produk dengan promo yang sedang berjalan (
            <Link href="/dashboard/settings/promo" className="underline">
              Promo
            </Link>
            ).
          </p>
        )}
        <SliderField label="Jumlah Produk" value={c.limit} min={1} max={50} onChange={(limit) => set({ limit })} />
        <SelectField label="Urutkan" value={c.sort} options={SORT_OPTIONS} onChange={(sort) => set({ sort })} />
        <SwitchField
          label="Sembunyikan Stok Habis"
          checked={c.hideOutOfStock}
          onChange={(hideOutOfStock) => set({ hideOutOfStock })}
        />
      </Section>

      <CardSettings card={card} onChange={setCard} />
    </>
  );
}

/** Kontrol gaya "Kartu Produk" + "Bayangan Kartu". Dipakai ulang oleh blok
 *  Produk beranda dan oleh pengaturan Katalog. */
function CardSettings({
  card,
  onChange,
}: {
  card: ProductCardStyle;
  onChange: (patch: Partial<ProductCardStyle>) => void;
}) {
  const setCard = onChange;
  return (
    <>
      <Section title="Kartu Produk">
        <TilePicker<CardDesign> value={card.design} options={CARD_DESIGNS} onChange={(design) => setCard({ design })} />
        <SliderField label="Radius Kartu" value={card.radius} min={0} max={40} onChange={(radius) => setCard({ radius })} />
        <SliderField
          label="Rasio Gambar"
          hint="Lebar ÷ tinggi. 1 = persegi, < 1 = potret."
          value={card.imageRatio}
          min={0.5}
          max={2}
          step={0.05}
          onChange={(imageRatio) => setCard({ imageRatio })}
        />
        <SelectField
          label="Image BoxFit"
          value={card.imageFit}
          options={[
            { value: "cover", label: "Cover (penuh, terpotong)" },
            { value: "contain", label: "Contain (utuh)" },
          ]}
          onChange={(imageFit) => setCard({ imageFit })}
        />
        <SwitchField
          label="Gambar Bersudut Bulat"
          checked={card.imageRounded}
          onChange={(imageRounded) => setCard({ imageRounded })}
        />
        <SwitchField label="Tampilkan Nama" checked={card.showTitle} onChange={(showTitle) => setCard({ showTitle })} />
        {card.showTitle && (
          <SliderField
            label="Maks. Baris Nama"
            value={card.titleMaxLines}
            min={1}
            max={4}
            onChange={(titleMaxLines) => setCard({ titleMaxLines })}
          />
        )}
        <SwitchField label="Tampilkan Kategori" checked={card.showCategory} onChange={(showCategory) => setCard({ showCategory })} />
        <SwitchField label="Tampilkan Harga" checked={card.showPrice} onChange={(showPrice) => setCard({ showPrice })} />
        <SwitchField label="Tampilkan Stok" checked={card.showStock} onChange={(showStock) => setCard({ showStock })} />
        <SwitchField
          label="Badge Diskon (-%)"
          checked={card.showDiscountBadge}
          onChange={(showDiscountBadge) => setCard({ showDiscountBadge })}
        />
        <SwitchField
          label="Tombol Keranjang"
          hint="Tambah 1 item langsung dari kartu"
          checked={card.showCartButton}
          onChange={(showCartButton) => setCard({ showCartButton })}
        />
        <ColorField
          label="Warna Kartu"
          value={card.cardColor}
          allowEmpty
          emptyLabel="Putih"
          onChange={(cardColor) => setCard({ cardColor })}
        />
      </Section>

      <Section title="Bayangan Kartu" defaultOpen={false}>
        <SwitchField label="Aktifkan Bayangan" checked={card.shadowEnabled} onChange={(shadowEnabled) => setCard({ shadowEnabled })} />
        {card.shadowEnabled && (
          <>
            <SliderField label="Blur" value={card.shadowBlur} min={0} max={40} onChange={(shadowBlur) => setCard({ shadowBlur })} />
            <SliderField label="Offset X" value={card.shadowOffsetX} min={-20} max={20} onChange={(shadowOffsetX) => setCard({ shadowOffsetX })} />
            <SliderField label="Offset Y" value={card.shadowOffsetY} min={-20} max={20} onChange={(shadowOffsetY) => setCard({ shadowOffsetY })} />
            <SliderField
              label="Ketebalan"
              value={card.shadowOpacity}
              min={0}
              max={1}
              step={0.01}
              onChange={(shadowOpacity) => setCard({ shadowOpacity })}
            />
          </>
        )}
      </Section>
    </>
  );
}

/** Pengaturan halaman Katalog: HANYA tipe layout + kartu produk
 *  (tanpa kategori / tombol / sumber data). */
export function CatalogSettings({
  catalog,
  onChange,
}: {
  catalog: CatalogConfig;
  onChange: (next: CatalogConfig) => void;
}) {
  const set = (patch: Partial<CatalogConfig>) => onChange({ ...catalog, ...patch });
  const setCard = (patch: Partial<ProductCardStyle>) => set({ card: { ...catalog.card, ...patch } });

  return (
    <div className="space-y-4">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Mengatur tampilan daftar produk di halaman <strong>Katalog Produk</strong> (web &amp; aplikasi).
        Kategori, pencarian, dan tombol tetap mengikuti bawaan halaman.
      </p>
      <Section title="Tipe Layout">
        <TilePicker
          value={catalog.layout}
          options={CATALOG_LAYOUTS}
          onChange={(layout) => set({ layout })}
          glyph={(v) => <LayoutGlyph layout={v} />}
        />
        {(catalog.layout === "grid" || catalog.layout === "staggered") && (
          <SliderField
            label="Jumlah Kolom"
            hint="Di layar lebar kolom bisa bertambah otomatis."
            value={catalog.layout === "staggered" ? Math.min(3, Math.max(2, catalog.gridColumns)) : catalog.gridColumns}
            min={catalog.layout === "staggered" ? 2 : 1}
            max={catalog.layout === "staggered" ? 3 : 4}
            onChange={(gridColumns) => set({ gridColumns })}
          />
        )}
        <SliderField label="Jarak Antar Kartu" value={catalog.spacing} min={0} max={32} onChange={(spacing) => set({ spacing })} />
      </Section>

      <CardSettings card={catalog.card} onChange={setCard} />
    </div>
  );
}

function ContentSettings({ block, onChange, data }: { block: HomeBlock; onChange: (b: HomeBlock) => void; data: PreviewData }) {
  const set = (patch: object) => onChange({ ...block, config: { ...block.config, ...patch } } as HomeBlock);

  const header = block.type !== "spacer" && (
    <Section title="Judul Seksi">
      <TextField
        label="Judul"
        value={block.title}
        placeholder="(tanpa judul)"
        onChange={(title) => onChange({ ...block, title })}
      />
      {(block.type === "products" || block.type === "brands" || block.type === "categories") && (
        <SwitchField
          label='Tampilkan "Lihat Semua"'
          checked={block.showSeeAll}
          onChange={(showSeeAll) => onChange({ ...block, showSeeAll })}
        />
      )}
    </Section>
  );

  let body: React.ReactNode = null;
  switch (block.type) {
    case "products":
      body = <ProductsSettings block={block as HomeBlock<"products">} set={set} data={data} />;
      break;
    case "banner": {
      const c = (block as HomeBlock<"banner">).config;
      body = (
        <Section title="Banner">
          <p className="text-[11px] text-muted-foreground">
            Gambar & urutan banner diatur di{" "}
            <Link href="/dashboard/settings/design" className="underline">
              Desain & Banner
            </Link>
            .
          </p>
          <SliderField label="Tinggi" value={c.height} min={80} max={400} onChange={(height) => set({ height })} />
          <SliderField
            label="Lebar Halaman"
            hint="1 = penuh; < 1 = banner berikutnya mengintip"
            value={c.viewportFraction}
            min={0.5}
            max={1}
            step={0.05}
            onChange={(viewportFraction) => set({ viewportFraction })}
          />
          <SliderField label="Jarak Antar Banner" value={c.itemMarginH} min={0} max={24} onChange={(itemMarginH) => set({ itemMarginH })} />
          <SliderField label="Radius" value={c.radius} min={0} max={40} onChange={(radius) => set({ radius })} />
          <SliderField
            label="Geser Otomatis (detik)"
            hint="0 = nonaktif"
            value={c.autoplaySeconds}
            min={0}
            max={15}
            onChange={(autoplaySeconds) => set({ autoplaySeconds })}
          />
          <SwitchField label="Indikator Titik" checked={c.showIndicator} onChange={(showIndicator) => set({ showIndicator })} />
          <SwitchField label="Judul & Deskripsi" checked={c.showText} onChange={(showText) => set({ showText })} />
        </Section>
      );
      break;
    }
    case "brands": {
      const c = (block as HomeBlock<"brands">).config;
      body = (
        <Section title="Brand">
          <SelectField
            label="Gaya"
            value={c.style}
            options={[
              { value: "card", label: "Kartu" },
              { value: "circle", label: "Lingkaran" },
            ]}
            onChange={(style) => set({ style })}
          />
          <SliderField label="Ukuran" value={c.itemSize} min={40} max={140} onChange={(itemSize) => set({ itemSize })} />
        </Section>
      );
      break;
    }
    case "categories": {
      const c = (block as HomeBlock<"categories">).config;
      const items: CategorySliderItem[] = Array.isArray(c.items) ? c.items : [];
      const slotCount = Math.min(Math.max(c.limit, 1), CATEGORY_SLIDER_MAX);
      const setItem = (i: number, patch: Partial<CategorySliderItem>) => {
        const next = [...items];
        while (next.length <= i) next.push({ name: "", category: "", imageUrl: "" });
        next[i] = { ...next[i], ...patch };
        set({ items: next });
      };
      body = (
        <Section title="Kategori">
          <SelectField
            label="Gaya"
            value={c.style}
            options={[
              { value: "chip", label: "Chip (geser)" },
              { value: "circle", label: "Ikon bulat (geser)" },
              { value: "grid", label: "Grid ikon" },
              { value: "imageSlider", label: "Gambar (geser)" },
            ]}
            onChange={(style) => set({ style })}
          />
          {c.style === "grid" && (
            <SliderField label="Kolom" value={c.columns} min={2} max={6} onChange={(columns) => set({ columns })} />
          )}
          {c.style === "imageSlider" ? (
            <>
              <SliderField label="Ukuran Kartu" value={c.itemSize} min={56} max={140} onChange={(itemSize) => set({ itemSize })} />
              <SliderField
                label="Jumlah Item"
                value={slotCount}
                min={1}
                max={CATEGORY_SLIDER_MAX}
                onChange={(limit) => set({ limit })}
              />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Isi tiap kartu secara manual (urutan sesuai daftar, bukan otomatis): nama, kategori
                tujuan, dan gambar (disarankan PNG transparan).
              </p>
              {Array.from({ length: slotCount }, (_, i) => {
                const item = items[i] ?? { name: "", category: "", imageUrl: "" };
                return (
                  <div key={i} className="space-y-2 rounded-lg border bg-muted/20 p-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Kartu {i + 1}
                    </p>
                    <TextField label="Nama" value={item.name} onChange={(name) => setItem(i, { name })} />
                    <SelectField
                      label="Kategori Ditautkan"
                      value={item.category}
                      placeholder="Pilih kategori"
                      options={data.categories.map((n) => ({ value: n, label: n }))}
                      onChange={(category) => setItem(i, { category })}
                    />
                    <ImageField label="Gambar" value={item.imageUrl} onChange={(imageUrl) => setItem(i, { imageUrl })} />
                  </div>
                );
              })}
            </>
          ) : (
            <SliderField label="Jumlah Maks." value={c.limit} min={1} max={50} onChange={(limit) => set({ limit })} />
          )}
        </Section>
      );
      break;
    }
    case "parentCategories": {
      const c = (block as HomeBlock<"parentCategories">).config;
      body = (
        <Section title="Induk Kategori">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Menampilkan induk kategori dari{" "}
            <Link href="/dashboard/settings/product-categories" className="underline">
              Pengaturan Kategori Produk
            </Link>
            . Klik induk → halaman sub-kategorinya.
          </p>
          <SelectField
            label="Gaya"
            value={c.style}
            options={[
              { value: "circle", label: "Ikon bulat (geser)" },
              { value: "image", label: "Gambar (geser)" },
              { value: "chip", label: "Chip (geser)" },
              { value: "grid", label: "Grid ikon" },
            ]}
            onChange={(style) => set({ style })}
          />
          {c.style === "image" && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Menampilkan gambar PNG datar (tanpa lingkaran) dari gambar yang diunggah di tiap induk kategori.
            </p>
          )}
          {c.style === "grid" && (
            <SliderField label="Kolom" value={c.columns} min={2} max={6} onChange={(columns) => set({ columns })} />
          )}
          {(c.style === "image" || c.style === "circle") && (
            <SliderField label="Ukuran Ikon" value={c.itemSize} min={36} max={140} onChange={(itemSize) => set({ itemSize })} />
          )}
          <SliderField label="Jumlah Maks." value={c.limit} min={1} max={50} onChange={(limit) => set({ limit })} />
          <ParentOrderList
            parents={data.parents}
            order={c.order}
            onReorder={(order) => set({ order })}
          />
          <SwitchField
            label="Sematkan di App Bar (sticky)"
            hint="Blok menempel di bawah app bar saat halaman di-scroll."
            checked={c.pinned}
            onChange={(pinned) => set({ pinned })}
          />
          <SwitchField
            label="Tampilkan di halaman Katalog"
            hint="Muncul sebagai bar menempel di app bar halaman Katalog Produk."
            checked={c.showInCatalog}
            onChange={(showInCatalog) => set({ showInCatalog })}
          />
        </Section>
      );
      break;
    }
    case "search": {
      const c = (block as HomeBlock<"search">).config;
      body = (
        <Section title="Kotak Pencarian">
          <TextField label="Placeholder" value={c.placeholder} onChange={(placeholder) => set({ placeholder })} />
          <SliderField label="Radius" value={c.radius} min={0} max={30} onChange={(radius) => set({ radius })} />
          <ColorField label="Warna Latar" value={c.bgColor} onChange={(bgColor) => set({ bgColor })} />
          <ColorField label="Warna Garis" value={c.borderColor} onChange={(borderColor) => set({ borderColor })} />
        </Section>
      );
      break;
    }
    case "text": {
      const c = (block as HomeBlock<"text">).config;
      body = (
        <Section title="Teks">
          <TextField label="Isi Teks" value={c.text} multiline onChange={(text) => set({ text })} />
          <SliderField label="Ukuran Huruf" value={c.fontSize} min={8} max={48} onChange={(fontSize) => set({ fontSize })} />
          <SwitchField label="Tebal" checked={c.bold} onChange={(bold) => set({ bold })} />
          <SelectField
            label="Perataan"
            value={c.align}
            options={[
              { value: "left", label: "Kiri" },
              { value: "center", label: "Tengah" },
              { value: "right", label: "Kanan" },
            ]}
            onChange={(align) => set({ align })}
          />
          <ColorField label="Warna" value={c.color} onChange={(color) => set({ color })} />
        </Section>
      );
      break;
    }
    case "image": {
      const c = (block as HomeBlock<"image">).config;
      body = (
        <Section title="Gambar">
          <ImageField label="Gambar" value={c.imageUrl} onChange={(imageUrl) => set({ imageUrl })} />
          <SwitchField
            label="Lebar Penuh Halaman"
            hint="Gambar membentang penuh seperti banner (abaikan padding samping)."
            checked={c.fullWidth}
            onChange={(fullWidth) => set({ fullWidth })}
          />
          <SliderField
            label="Tinggi (px)"
            hint="0 = otomatis mengikuti Rasio. > 0 = tinggi tetap seperti banner."
            value={c.height}
            min={0}
            max={500}
            onChange={(height) => set({ height })}
          />
          {(!c.height || c.height <= 0) && (
            <SliderField
              label="Rasio (lebar ÷ tinggi)"
              value={c.aspectRatio}
              min={0.5}
              max={4}
              step={0.05}
              onChange={(aspectRatio) => set({ aspectRatio })}
            />
          )}
          <SliderField label="Radius" value={c.radius} min={0} max={40} onChange={(radius) => set({ radius })} />
          <SelectField
            label="BoxFit"
            value={c.fit}
            options={[
              { value: "cover", label: "Cover" },
              { value: "contain", label: "Contain" },
            ]}
            onChange={(fit) => set({ fit })}
          />
          <LinkField label="Link saat diketuk" value={c.link} onChange={(link) => set({ link })} />
        </Section>
      );
      break;
    }
    case "spacer": {
      const c = (block as HomeBlock<"spacer">).config;
      body = (
        <Section title="Jarak / Garis">
          <SliderField label="Tinggi" value={c.height} min={0} max={200} onChange={(height) => set({ height })} />
          <SwitchField label="Tampilkan Garis" checked={c.showDivider} onChange={(showDivider) => set({ showDivider })} />
          {c.showDivider && (
            <ColorField label="Warna Garis" value={c.dividerColor} onChange={(dividerColor) => set({ dividerColor })} />
          )}
        </Section>
      );
      break;
    }
    case "button": {
      const c = (block as HomeBlock<"button">).config;
      body = (
        <Section title="Tombol">
          <TextField label="Teks Tombol" value={c.label} onChange={(label) => set({ label })} />
          <LinkField label="Link" value={c.link} onChange={(link) => set({ link })} />
          <SelectField
            label="Gaya"
            value={c.style}
            options={[
              { value: "filled", label: "Penuh" },
              { value: "outlined", label: "Garis tepi" },
            ]}
            onChange={(style) => set({ style })}
          />
          <ColorField
            label="Warna"
            value={c.color}
            allowEmpty
            emptyLabel="Tombol utama"
            onChange={(color) => set({ color })}
          />
          <SliderField label="Tinggi" value={c.height} min={32} max={80} onChange={(height) => set({ height })} />
          <SliderField label="Radius" value={c.radius} min={0} max={40} onChange={(radius) => set({ radius })} />
          <SwitchField label="Ikon Toko" checked={c.showIcon} onChange={(showIcon) => set({ showIcon })} />
        </Section>
      );
      break;
    }
  }

  return (
    <div className="space-y-3">
      {header}
      {body}
    </div>
  );
}

function StyleSettings({ style, onChange }: { style: BlockStyle; onChange: (s: BlockStyle) => void }) {
  const set = (patch: Partial<BlockStyle>) => onChange({ ...style, ...patch });
  return (
    <div className="space-y-3">
      <Section title="Jarak">
        <SliderField label="Margin Atas" value={style.marginTop} min={0} max={80} onChange={(marginTop) => set({ marginTop })} />
        <SliderField label="Margin Bawah" value={style.marginBottom} min={0} max={80} onChange={(marginBottom) => set({ marginBottom })} />
        <SliderField label="Margin Samping" value={style.marginH} min={0} max={40} onChange={(marginH) => set({ marginH })} />
        <SliderField label="Padding Samping" value={style.paddingH} min={0} max={40} onChange={(paddingH) => set({ paddingH })} />
        <SliderField label="Padding Atas/Bawah" value={style.paddingV} min={0} max={40} onChange={(paddingV) => set({ paddingV })} />
      </Section>
      <Section title="Latar Belakang">
        <ColorField label="Warna" value={style.bgColor} allowEmpty emptyLabel="Transparan" onChange={(bgColor) => set({ bgColor })} />
        <ImageField label="Gambar Latar" value={style.bgImageUrl} onChange={(bgImageUrl) => set({ bgImageUrl })} />
        <SliderField label="Radius" value={style.radius} min={0} max={40} onChange={(radius) => set({ radius })} />
      </Section>
    </div>
  );
}

export function BlockSettings({
  block,
  onChange,
  data,
}: {
  block: HomeBlock;
  onChange: (b: HomeBlock) => void;
  data: PreviewData;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Blok</p>
        <p className="font-semibold">{BLOCK_LABELS[block.type].label}</p>
      </div>
      <Tabs defaultValue="content" key={block.id}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="content">Konten</TabsTrigger>
          <TabsTrigger value="style">Gaya</TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="mt-3">
          <ContentSettings block={block} onChange={onChange} data={data} />
        </TabsContent>
        <TabsContent value="style" className="mt-3">
          <StyleSettings style={block.style} onChange={(style) => onChange({ ...block, style })} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function DesignSettings({ design, onChange }: { design: AppDesign; onChange: (d: AppDesign) => void }) {
  const set = (patch: Partial<AppDesign>) => onChange({ ...design, ...patch });
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aplikasi</p>
        <p className="font-semibold">Desain Global</p>
        <p className="text-xs text-muted-foreground">Klik salah satu blok di preview untuk mengatur blok tersebut.</p>
      </div>
      <Section title="App Bar">
        <TextField label="Judul Aplikasi" value={design.appTitle} onChange={(appTitle) => set({ appTitle })} />
        <SwitchField label="Pakai Logo" checked={design.showLogo} onChange={(showLogo) => set({ showLogo })} />
        {design.showLogo && <ImageField label="Logo" value={design.logoUrl} onChange={(logoUrl) => set({ logoUrl })} />}
        <SwitchField label="Judul di Tengah" checked={design.centerTitle} onChange={(centerTitle) => set({ centerTitle })} />
        <ColorField label="Warna App Bar" value={design.appBarColor} onChange={(appBarColor) => set({ appBarColor })} />
        <ColorField label="Warna Teks App Bar" value={design.appBarTextColor} onChange={(appBarTextColor) => set({ appBarTextColor })} />
      </Section>
      <Section title="Tema">
        <SelectField
          label="Font"
          value={design.fontFamily}
          options={FONT_OPTIONS.map((f) => ({ value: f, label: f }))}
          onChange={(fontFamily) => set({ fontFamily })}
        />
        <ColorField label="Warna Utama" value={design.seedColor} onChange={(seedColor) => set({ seedColor })} />
        <p className="-mt-1 text-[11px] text-muted-foreground">
          Aplikasi menurunkan palet Material 3 dari warna ini, jadi nadanya bisa sedikit berbeda dari preview.
        </p>
        <ColorField label="Warna Tombol" value={design.buttonColor} onChange={(buttonColor) => set({ buttonColor })} />
        <ColorField label="Latar Halaman" value={design.backgroundColor} onChange={(backgroundColor) => set({ backgroundColor })} />
        <ColorField
          label="Warna Harga"
          value={design.priceColor}
          allowEmpty
          emptyLabel="Warna utama"
          onChange={(priceColor) => set({ priceColor })}
        />
        <ColorField
          label="Menu Bawah Aktif"
          value={design.navSelectedColor}
          allowEmpty
          emptyLabel="Warna utama"
          onChange={(navSelectedColor) => set({ navSelectedColor })}
        />
      </Section>
    </div>
  );
}
