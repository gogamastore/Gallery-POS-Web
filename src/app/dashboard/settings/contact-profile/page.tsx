"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, Save, GripVertical } from "lucide-react";
import { ContactIcon } from "@/components/contact-profile-icon";
import {
  CONTACT_TYPES,
  DEFAULT_CONTACT_ITEMS,
  sanitizeContactItems,
  type ContactItem,
  type ContactType,
} from "@/lib/contact-profile";

const DOC_REF = () => doc(db, "settings", "contact_profile");

export default function ContactProfilePage() {
  const { toast } = useToast();
  const [items, setItems] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(DOC_REF());
        const existing = snap.exists() ? sanitizeContactItems(snap.data().items) : [];
        // Pra-isi dengan default bila belum pernah dikonfigurasi, agar admin
        // tinggal menyesuaikan (dan pembeli tetap melihat kontak yang sama).
        setItems(existing.length > 0 ? existing : [...DEFAULT_CONTACT_ITEMS]);
      } catch (e) {
        console.error("Gagal memuat Contact Profil:", e);
        setItems([...DEFAULT_CONTACT_ITEMS]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = (i: number, patch: Partial<ContactItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const remove = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const move = (i: number, dir: -1 | 1) =>
    setItems((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const addItem = () => {
    // Pakai section terakhir sebagai default agar mudah menambah dalam 1 grup.
    const lastSection = items.length > 0 ? items[items.length - 1].section : "Kontak";
    setItems((prev) => [...prev, { section: lastSection, type: "whatsapp", label: "", url: "" }]);
  };

  const save = async () => {
    const cleaned = sanitizeContactItems(items);
    setSaving(true);
    try {
      await setDoc(
        DOC_REF(),
        { items: cleaned, updatedAt: serverTimestamp() },
        { merge: true },
      );
      setItems(cleaned);
      toast({ title: "Tersimpan", description: "Contact Profil berhasil diperbarui." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Gagal menyimpan", description: String(e) });
    } finally {
      setSaving(false);
    }
  };

  // Daftar section unik untuk saran cepat (datalist).
  const sectionSuggestions = Array.from(new Set(items.map((i) => i.section).filter(Boolean)));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contact Profil</CardTitle>
          <CardDescription>
            Kelola kontak publik toko (WhatsApp, media sosial, marketplace, lokasi). Perubahan
            langsung tampil di menu <strong>Contact</strong> aplikasi pembeli &amp; halaman{" "}
            <strong>Hubungi Kami</strong> web reseller.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              <datalist id="contact-sections">
                {sectionSuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>

              {items.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center border rounded-lg">
                  Belum ada kontak. Klik &quot;Tambah Kontak&quot; untuk memulai.
                </p>
              )}

              {items.map((item, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr_1.4fr_auto] gap-2 items-end rounded-lg border p-3"
                >
                  <div className="hidden md:flex flex-col items-center pb-1 text-muted-foreground">
                    <button type="button" onClick={() => move(i, -1)} className="hover:text-foreground" aria-label="Naik">▲</button>
                    <GripVertical className="h-4 w-4" />
                    <button type="button" onClick={() => move(i, 1)} className="hover:text-foreground" aria-label="Turun">▼</button>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Grup / Section</Label>
                    <Input
                      list="contact-sections"
                      value={item.section}
                      onChange={(e) => update(i, { section: e.target.value })}
                      placeholder="Akun Official Kami"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Jenis</Label>
                    <Select value={item.type} onValueChange={(v) => update(i, { type: v as ContactType })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTACT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            <span className="flex items-center gap-2">
                              <ContactIcon type={t.value} className="h-4 w-4" />
                              {t.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={item.label}
                      onChange={(e) => update(i, { label: e.target.value })}
                      placeholder="mis. Admin Grosir 1"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="space-y-1 flex-1">
                      <Label className="text-xs">URL / Tautan</Label>
                      <Input
                        value={item.url}
                        onChange={(e) => update(i, { url: e.target.value })}
                        placeholder="http://wa.me/628... atau https://..."
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive shrink-0"
                      onClick={() => remove(i)}
                      aria-label="Hapus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button type="button" variant="outline" onClick={addItem}>
                  <Plus className="mr-2 h-4 w-4" /> Tambah Kontak
                </Button>
                <Button type="button" onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Simpan Perubahan
                </Button>
              </div>

              <p className="text-xs text-muted-foreground pt-1">
                Tips: isi <strong>Grup</strong> sama untuk mengelompokkan kontak dalam satu judul.
                Untuk WhatsApp gunakan format <code>http://wa.me/628xxxx</code>, email{" "}
                <code>mailto:nama@email.com</code>, telepon <code>tel:+628xxxx</code>.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
