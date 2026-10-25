"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  Ticket,
  Percent,
  Banknote,
} from "lucide-react";
import { useRouter } from "next/navigation";

type DiscountType = "fixed" | "percentage";
// perDay  = batas berlaku per 24 jam (default lama)
// perEvent = batas berlaku sekali untuk SELURUH periode event
type LimitType = "perDay" | "perEvent";

interface Voucher {
  id: string;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number; // cap untuk persentase (0 = tanpa batas)
  minPurchase: number;
  isActive: boolean;
  startDate?: any; // Timestamp — awal masa berlaku
  endDate?: any; // Timestamp — akhir masa berlaku
  dailyLimitPerUser: number; // jumlah maksimal pemakaian per user (0 = tanpa batas)
  limitType?: LimitType; // cakupan batas: per hari / per event
  createdAt?: any;
}

// Timestamp → "YYYY-MM-DD" untuk input tanggal.
const tsToInput = (ts: any): string => {
  const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
  if (!d || isNaN(d.getTime())) return "";
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n || 0);

const emptyForm = {
  code: "",
  description: "",
  discountType: "fixed" as DiscountType,
  discountValue: 0,
  maxDiscount: 0,
  minPurchase: 0,
  isActive: true,
  startDate: "",
  endDate: "",
  dailyLimitPerUser: 1,
  limitType: "perDay" as LimitType,
};

export default function VouchersPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "vouchers"), orderBy("createdAt", "desc"))
      );
      setVouchers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Voucher)));
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Gagal memuat voucher" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const openDialog = (v: Voucher | null = null) => {
    if (v) {
      setEditing(v);
      setForm({
        code: v.code,
        description: v.description,
        discountType: v.discountType,
        discountValue: v.discountValue,
        maxDiscount: v.maxDiscount || 0,
        minPurchase: v.minPurchase || 0,
        isActive: v.isActive,
        startDate: tsToInput(v.startDate),
        endDate: tsToInput(v.endDate),
        dailyLimitPerUser: v.dailyLimitPerUser ?? 1,
        limitType: v.limitType ?? "perDay",
      });
    } else {
      setEditing(null);
      setForm(emptyForm);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const code = form.code.trim().toUpperCase();
    if (!code) {
      toast({ variant: "destructive", title: "Kode voucher wajib diisi" });
      return;
    }
    if (form.discountValue <= 0) {
      toast({ variant: "destructive", title: "Nilai diskon harus lebih dari 0" });
      return;
    }
    if (form.discountType === "percentage" && form.discountValue > 100) {
      toast({ variant: "destructive", title: "Persentase maksimal 100%" });
      return;
    }
    const startTs = form.startDate
      ? Timestamp.fromDate(new Date(`${form.startDate}T00:00:00`))
      : null;
    const endTs = form.endDate
      ? Timestamp.fromDate(new Date(`${form.endDate}T23:59:59`))
      : null;
    if (startTs && endTs && endTs.toMillis() < startTs.toMillis()) {
      toast({ variant: "destructive", title: "Tanggal berakhir sebelum tanggal mulai" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code,
        description: form.description.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue) || 0,
        maxDiscount: Number(form.maxDiscount) || 0,
        minPurchase: Number(form.minPurchase) || 0,
        isActive: form.isActive,
        startDate: startTs,
        endDate: endTs,
        dailyLimitPerUser: Number(form.dailyLimitPerUser) || 0,
        limitType: form.limitType,
      };
      if (editing) {
        await updateDoc(doc(db, "vouchers", editing.id), payload);
        toast({ title: "Voucher diperbarui" });
      } else {
        await addDoc(collection(db, "vouchers"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast({ title: "Voucher ditambahkan" });
      }
      setDialogOpen(false);
      fetchVouchers();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Gagal menyimpan voucher" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus voucher ini?")) return;
    try {
      await deleteDoc(doc(db, "vouchers", id));
      toast({ title: "Voucher dihapus" });
      fetchVouchers();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Gagal menghapus voucher" });
    }
  };

  const discountLabel = (v: Voucher) =>
    v.discountType === "percentage"
      ? `${v.discountValue}%${v.maxDiscount ? ` (maks ${formatCurrency(v.maxDiscount)})` : ""}`
      : formatCurrency(v.discountValue);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/settings")}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Kembali ke Pengaturan</span>
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Voucher Diskon</h1>
          <p className="text-sm text-muted-foreground">
            Kelola voucher yang muncul di halaman checkout reseller.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Daftar Voucher</CardTitle>
            <CardDescription>Tambah, edit, atau hapus voucher belanja.</CardDescription>
          </div>
          <Button onClick={() => openDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Voucher
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : vouchers.length > 0 ? (
            <div className="space-y-3">
              {vouchers.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      {v.discountType === "percentage" ? <Percent className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold tracking-wide">{v.code}</p>
                        <Badge variant={v.isActive ? "default" : "secondary"}>
                          {v.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Potongan {discountLabel(v)}
                        {v.minPurchase ? ` · min. ${formatCurrency(v.minPurchase)}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {v.startDate || v.endDate
                          ? `Berlaku ${tsToInput(v.startDate) || "—"} s/d ${tsToInput(v.endDate) || "—"}`
                          : "Tanpa batas waktu"}
                        {v.dailyLimitPerUser
                          ? ` · ${v.dailyLimitPerUser}×/user/${v.limitType === "perEvent" ? "event" : "hari"}`
                          : " · pakai tanpa batas"}
                      </p>
                      {v.description && (
                        <p className="text-xs text-muted-foreground">{v.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(v)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
              <Ticket className="mx-auto h-12 w-12" />
              <p className="mt-2">Belum ada voucher.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Voucher" : "Tambah Voucher"}</DialogTitle>
            <DialogDescription>Isi detail voucher belanja.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="code">Kode Voucher</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="Contoh: HEMAT10"
              />
            </div>
            <div className="space-y-2">
              <Label>Jenis Diskon</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={form.discountType === "fixed" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setForm({ ...form, discountType: "fixed" })}
                >
                  <Banknote className="mr-2 h-4 w-4" /> Nominal (Rp)
                </Button>
                <Button
                  type="button"
                  variant={form.discountType === "percentage" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setForm({ ...form, discountType: "percentage" })}
                >
                  <Percent className="mr-2 h-4 w-4" /> Persen (%)
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountValue">
                {form.discountType === "percentage" ? "Persentase Diskon (%)" : "Nominal Diskon (Rp)"}
              </Label>
              <Input
                id="discountValue"
                type="number"
                value={form.discountValue || ""}
                onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
              />
            </div>
            {form.discountType === "percentage" && (
              <div className="space-y-2">
                <Label htmlFor="maxDiscount">Maks. Potongan (Rp) — 0 = tanpa batas</Label>
                <Input
                  id="maxDiscount"
                  type="number"
                  value={form.maxDiscount || ""}
                  onChange={(e) => setForm({ ...form, maxDiscount: Number(e.target.value) })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="minPurchase">Min. Belanja (Rp) — 0 = tanpa syarat</Label>
              <Input
                id="minPurchase"
                type="number"
                value={form.minPurchase || ""}
                onChange={(e) => setForm({ ...form, minPurchase: Number(e.target.value) })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">Berlaku Dari</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Sampai</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              Kosongkan tanggal untuk berlaku tanpa batas waktu.
            </p>
            <div className="space-y-2">
              <Label>Cakupan Batas Pakai</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={form.limitType === "perDay" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setForm({ ...form, limitType: "perDay" })}
                >
                  Per Hari
                </Button>
                <Button
                  type="button"
                  variant={form.limitType === "perEvent" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setForm({ ...form, limitType: "perEvent" })}
                >
                  Per Event
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailyLimit">
                {form.limitType === "perEvent"
                  ? "Batas pakai per user / seluruh event — 0 = tanpa batas"
                  : "Batas pakai per user / 24 jam — 0 = tanpa batas"}
              </Label>
              <Input
                id="dailyLimit"
                type="number"
                value={form.dailyLimitPerUser || ""}
                onChange={(e) => setForm({ ...form, dailyLimitPerUser: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                {form.limitType === "perEvent"
                  ? "Contoh: 1 = tiap user hanya boleh pakai voucher ini 1× selama seluruh periode event (bukan per hari)."
                  : "Contoh: 1 = tiap user boleh pakai voucher ini 1× per hari selama masa berlaku."}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (opsional)</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(c) => setForm({ ...form, isActive: c })}
              />
              <Label htmlFor="isActive">Aktifkan voucher ini</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
