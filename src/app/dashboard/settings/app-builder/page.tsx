"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { DragDropContext, Draggable, Droppable, type DropResult } from "react-beautiful-dnd";
import {
  ArrowLeft,
  BadgeCheck,
  Copy,
  Eye,
  EyeOff,
  GalleryHorizontal,
  GripVertical,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  MousePointerClick,
  Palette,
  Redo2,
  RotateCcw,
  Rocket,
  Save,
  Search,
  SeparatorHorizontal,
  ShoppingBag,
  Trash2,
  Type,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  BLOCK_LABELS,
  createBlock,
  defaultLayout,
  newBlockId,
  normalizeLayout,
  type AppLayout,
  type BlockType,
  type HomeBlock,
} from "@/components/app-builder/schema";
import { PhonePreview } from "@/components/app-builder/preview";
import { BlockSettings, CatalogSettings, DesignSettings } from "@/components/app-builder/block-settings";
import { usePreviewData } from "@/components/app-builder/preview-data";

const LIVE_DOC = () => doc(db, "settings", "app_layout");
const DRAFT_DOC = () => doc(db, "settings", "app_layout_draft");

const BLOCK_ICONS: Record<BlockType, LucideIcon> = {
  banner: GalleryHorizontal,
  brands: BadgeCheck,
  categories: LayoutGrid,
  products: ShoppingBag,
  search: Search,
  text: Type,
  image: ImageIcon,
  spacer: SeparatorHorizontal,
  button: MousePointerClick,
};

const ADDABLE: BlockType[] = ["products", "banner", "categories", "brands", "search", "image", "text", "button", "spacer"];

// Firestore menolak `undefined`; JSON round-trip sekaligus membuat salinan bersih.
const toFirestore = (layout: AppLayout) => JSON.parse(JSON.stringify(layout)) as AppLayout;

// react-beautiful-dnd belum mendukung StrictMode React 18+ tanpa trik ini.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StrictDroppable = ({ children, ...props }: any) => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);
  if (!enabled) return null;
  // React 19 mengabaikan defaultProps, jadi default react-beautiful-dnd harus diisi manual.
  return (
    <Droppable
      type="DEFAULT"
      mode="standard"
      direction="vertical"
      isDropDisabled={false}
      isCombineEnabled={false}
      ignoreContainerClipping={false}
      renderClone={null}
      getContainerForClone={() => document.body}
      {...props}
    >
      {children}
    </Droppable>
  );
};

interface History {
  past: AppLayout[];
  present: AppLayout;
  future: AppLayout[];
}

export default function AppBuilderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const previewData = usePreviewData();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [history, setHistory] = useState<History>({ past: [], present: defaultLayout(), future: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedJson, setSavedJson] = useState("");
  const [liveJson, setLiveJson] = useState("");
  const lastChange = useRef(0);

  const layout = history.present;
  const currentJson = useMemo(() => JSON.stringify(layout), [layout]);
  const unsaved = !loading && currentJson !== savedJson;
  const unpublished = !loading && currentJson !== liveJson;
  const selectedBlock = layout.blocks.find((b) => b.id === selectedId) ?? null;

  // ─── Muat draft (bila ada) atau versi live ────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [liveSnap, draftSnap] = await Promise.all([getDoc(LIVE_DOC()), getDoc(DRAFT_DOC())]);
        const live = liveSnap.exists() ? normalizeLayout(liveSnap.data()) : defaultLayout();
        const start = draftSnap.exists() ? normalizeLayout(draftSnap.data()) : live;
        const liveStr = JSON.stringify(live);
        setLiveJson(liveSnap.exists() ? liveStr : "");
        setSavedJson(draftSnap.exists() ? JSON.stringify(start) : liveStr);
        setHistory({ past: [], present: start, future: [] });
      } catch (e) {
        console.error(e);
        toast({ variant: "destructive", title: "Gagal memuat desain aplikasi" });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  // ─── Riwayat (undo/redo) ──────────────────────────────────────────────
  const update = useCallback((next: (prev: AppLayout) => AppLayout) => {
    // Perubahan beruntun cepat (mis. menggeser slider) digabung jadi satu
    // langkah undo.
    const now = Date.now();
    const merge = now - lastChange.current < 600;
    lastChange.current = now;
    setHistory((h) => ({
      past: merge ? h.past : [...h.past.slice(-49), h.present],
      present: next(h.present),
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    lastChange.current = 0;
    setHistory((h) =>
      h.past.length
        ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] }
        : h,
    );
  }, []);

  const redo = useCallback(() => {
    lastChange.current = 0;
    setHistory((h) =>
      h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h,
    );
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable=true]")) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  // ─── Operasi blok ─────────────────────────────────────────────────────
  const setBlocks = (fn: (blocks: HomeBlock[]) => HomeBlock[]) =>
    update((l) => ({ ...l, blocks: fn(l.blocks) }));

  const addBlock = (type: BlockType) => {
    const block = createBlock(type);
    setBlocks((blocks) => {
      const at = blocks.findIndex((b) => b.id === selectedId);
      const next = [...blocks];
      next.splice(at >= 0 ? at + 1 : next.length, 0, block);
      return next;
    });
    lastChange.current = 0;
    setSelectedId(block.id);
  };

  const updateBlock = (block: HomeBlock) => setBlocks((blocks) => blocks.map((b) => (b.id === block.id ? block : b)));

  const duplicateBlock = (id: string) => {
    const source = layout.blocks.find((b) => b.id === id);
    if (!source) return;
    const copy: HomeBlock = { ...structuredClone(source), id: newBlockId(source.type) };
    lastChange.current = 0;
    setBlocks((blocks) => {
      const next = [...blocks];
      next.splice(blocks.findIndex((b) => b.id === id) + 1, 0, copy);
      return next;
    });
    setSelectedId(copy.id);
  };

  const removeBlock = (id: string) => {
    lastChange.current = 0;
    setBlocks((blocks) => blocks.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const toggleBlock = (id: string) => {
    lastChange.current = 0;
    setBlocks((blocks) => blocks.map((b) => (b.id === id ? { ...b, enabled: !b.enabled } : b)));
  };

  const onDragEnd = ({ source, destination }: DropResult) => {
    if (!destination || destination.index === source.index) return;
    lastChange.current = 0;
    setBlocks((blocks) => {
      const next = [...blocks];
      const [moved] = next.splice(source.index, 1);
      next.splice(destination.index, 0, moved);
      return next;
    });
  };

  // ─── Simpan & publish ─────────────────────────────────────────────────
  const save = async (publish: boolean) => {
    if (publish && !confirm("Publish desain ini? Aplikasi semua pengguna akan langsung berubah.")) return;
    setSaving(publish ? "publish" : "draft");
    try {
      const data = toFirestore(layout);
      const batch = writeBatch(db);
      batch.set(DRAFT_DOC(), { ...data, updatedAt: serverTimestamp() });
      if (publish) batch.set(LIVE_DOC(), { ...data, publishedAt: serverTimestamp() });
      await batch.commit();
      setSavedJson(currentJson);
      if (publish) setLiveJson(currentJson);
      toast({
        title: publish ? "Desain dipublish" : "Draft disimpan",
        description: publish
          ? "Aplikasi akan memuat tampilan baru secara otomatis."
          : "Belum tampil di aplikasi sampai Anda menekan Publish.",
      });
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: publish ? "Gagal publish" : "Gagal menyimpan draft",
        description: "Periksa koneksi dan izin Firestore untuk koleksi settings.",
      });
    } finally {
      setSaving(null);
    }
  };

  const restoreLive = () => {
    if (!confirm("Buang perubahan dan kembali ke versi yang sedang live?")) return;
    lastChange.current = 0;
    update(() => (liveJson ? normalizeLayout(JSON.parse(liveJson)) : defaultLayout()));
    setSelectedId(null);
  };

  const resetDefault = () => {
    if (!confirm("Ganti semua blok & desain dengan susunan bawaan?")) return;
    lastChange.current = 0;
    update(() => defaultLayout());
    setSelectedId(null);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat App Builder...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/settings")}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Kembali ke Pengaturan</span>
        </Button>
        <div className="mr-auto">
          <h1 className="text-xl font-bold md:text-2xl">App Builder</h1>
          <p className="text-xs text-muted-foreground">
            Atur tampilan beranda aplikasi Android. Setelah Publish, aplikasi berubah tanpa perlu update.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {unsaved ? (
            <Badge variant="secondary">Belum disimpan</Badge>
          ) : unpublished ? (
            <Badge variant="secondary">Draft belum dipublish</Badge>
          ) : (
            <Badge>Sesuai versi live</Badge>
          )}
          <Button variant="ghost" size="icon" onClick={undo} disabled={!history.past.length} title="Undo (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={redo} disabled={!history.future.length} title="Redo (Ctrl+Y)">
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={restoreLive} disabled={!unpublished} title="Kembali ke versi live">
            <RotateCcw className="mr-1.5 h-4 w-4" /> Versi Live
          </Button>
          <Button variant="outline" size="sm" onClick={resetDefault}>
            Reset Default
          </Button>
          <Button variant="outline" size="sm" onClick={() => save(false)} disabled={!!saving || !unsaved}>
            {saving === "draft" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Simpan Draft
          </Button>
          <Button size="sm" onClick={() => save(true)} disabled={!!saving || !unpublished}>
            {saving === "publish" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="mr-1.5 h-4 w-4" />
            )}
            Publish
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[260px_minmax(400px,1fr)] xl:grid-cols-[260px_minmax(400px,1fr)_360px]">
        {/* ── Kiri: tambah blok + susunan ── */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <div className="rounded-lg border bg-card p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tambah Blok</p>
            <div className="grid grid-cols-3 gap-1.5">
              {ADDABLE.map((type) => {
                const Icon = BLOCK_ICONS[type];
                return (
                  <button
                    key={type}
                    type="button"
                    title={BLOCK_LABELS[type].description}
                    onClick={() => addBlock(type)}
                    className="flex flex-col items-center gap-1 rounded-md border p-2 text-[11px] leading-tight hover:border-primary hover:bg-primary/5"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-center">{BLOCK_LABELS[type].label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-3">
            <div className="mb-2 flex items-center justify-between gap-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Susunan</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className={cn(
                    "flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]",
                    selectedId === null ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Palette className="h-3.5 w-3.5" /> Desain
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedId("__catalog__")}
                  className={cn(
                    "flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]",
                    selectedId === "__catalog__" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Katalog
                </button>
              </div>
            </div>
            {layout.blocks.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Belum ada blok.</p>
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>
                <StrictDroppable droppableId="blocks">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(provided: any) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
                      {layout.blocks.map((block, index) => {
                        const Icon = BLOCK_ICONS[block.type];
                        return (
                          <Draggable key={block.id} draggableId={block.id} index={index}>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {(drag: any) => (
                              <div
                                ref={drag.innerRef}
                                {...drag.draggableProps}
                                onClick={() => setSelectedId(block.id)}
                                className={cn(
                                  "group flex cursor-pointer items-center gap-1.5 rounded-md border bg-background px-1.5 py-1.5",
                                  selectedId === block.id && "border-primary ring-1 ring-primary",
                                  !block.enabled && "opacity-50",
                                )}
                              >
                                <span {...drag.dragHandleProps} className="cursor-grab text-muted-foreground">
                                  <GripVertical className="h-4 w-4" />
                                </span>
                                <Icon className="h-4 w-4 shrink-0 text-primary" />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium">{BLOCK_LABELS[block.type].label}</p>
                                  {block.title && (
                                    <p className="truncate text-[11px] text-muted-foreground">{block.title}</p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  title={block.enabled ? "Sembunyikan" : "Tampilkan"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleBlock(block.id);
                                  }}
                                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                                >
                                  {block.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  title="Duplikat"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    duplicateBlock(block.id);
                                  }}
                                  className="hidden rounded p-1 text-muted-foreground hover:bg-muted group-hover:block"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Hapus"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeBlock(block.id);
                                  }}
                                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </StrictDroppable>
              </DragDropContext>
            )}
          </div>
        </aside>

        {/* ── Tengah: preview ── */}
        <section className="min-w-0 rounded-lg border bg-muted/40 py-6">
          <PhonePreview layout={layout} data={previewData} selectedId={selectedId} onSelect={setSelectedId} />
          <p className="mt-3 px-4 text-center text-[11px] text-muted-foreground">
            Preview memakai data asli dari Firestore. Klik blok untuk mengedit; klik app bar untuk desain global.
          </p>
        </section>

        {/* ── Kanan: pengaturan ── */}
        <aside className="lg:col-span-2 xl:sticky xl:top-4 xl:col-span-1 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto">
          <div className="rounded-lg border bg-card p-3">
            {selectedId === "__catalog__" ? (
              <CatalogSettings catalog={layout.catalog} onChange={(catalog) => update((l) => ({ ...l, catalog }))} />
            ) : selectedBlock ? (
              <BlockSettings block={selectedBlock} onChange={updateBlock} data={previewData} />
            ) : (
              <DesignSettings design={layout.design} onChange={(design) => update((l) => ({ ...l, design }))} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
