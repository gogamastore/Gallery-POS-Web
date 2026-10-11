"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Save, CreditCard, Landmark, Wallet, QrCode } from "lucide-react";
import {
  PAYMENT_CATEGORIES,
  PAYMENT_CHANNELS,
  normalizePaymentConfig,
  type PaymentCategory,
  type PaymentMethodsConfig,
} from "@/lib/payment-channels";

const CATEGORY_ICON: Record<PaymentCategory, typeof Landmark> = {
  bank: Landmark,
  ewallet: Wallet,
  qris: QrCode,
};

const rupiah = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v);

export default function PaymentMethodsSettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [config, setConfig] = useState<PaymentMethodsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "payment_methods"));
        setConfig(normalizePaymentConfig(snap.exists() ? snap.data() : null));
      } catch (e) {
        console.error("Gagal memuat pengaturan pembayaran", e);
        setConfig(normalizePaymentConfig(null));
        toast({ variant: "destructive", title: "Gagal memuat pengaturan pembayaran." });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const byCategory = useMemo(() => {
    return PAYMENT_CATEGORIES.map((cat) => ({
      ...cat,
      channels: PAYMENT_CHANNELS.filter((c) => c.category === cat.id),
    }));
  }, []);

  const setChannel = (id: string, value: boolean) =>
    setConfig((p) => (p ? { ...p, enabled: { ...p.enabled, [id]: value } } : p));

  const setFee = (cat: PaymentCategory, value: number) =>
    setConfig((p) => (p ? { ...p, fees: { ...p.fees, [cat]: Math.max(0, Math.round(value || 0)) } } : p));

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "settings", "payment_methods"),
        { enabled: config.enabled, fees: config.fees, updatedAt: serverTimestamp() },
        { merge: true },
      );
      toast({ title: "Pengaturan pembayaran disimpan." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Gagal menyimpan pengaturan." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/settings")}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Kembali</span>
        </Button>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-xl font-bold md:text-2xl">
            <CreditCard className="h-5 w-5" /> Pengaturan Pembayaran
          </h1>
          <p className="text-sm text-muted-foreground">
            Aktifkan metode pembayaran Midtrans yang muncul di checkout, dan atur biaya layanan tiap kategori.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || loading}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Simpan
        </Button>
      </div>

      {loading || !config ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {byCategory.map((cat) => {
            const Icon = CATEGORY_ICON[cat.id];
            const fee = config.fees[cat.id] ?? 0;
            return (
              <Card key={cat.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4" /> {cat.label}
                  </CardTitle>
                  <CardDescription>{cat.hint}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {cat.channels.map((ch) => (
                      <div key={ch.id} className="flex items-center justify-between gap-3 rounded-md border p-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{ch.name}</p>
                          {ch.id === "ovo" && (
                            <p className="text-[11px] text-amber-600">Diproses via QRIS Midtrans</p>
                          )}
                        </div>
                        <Switch
                          checked={config.enabled[ch.id] === true}
                          onCheckedChange={(v) => setChannel(ch.id, v)}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5 border-t pt-3">
                    <Label htmlFor={`fee-${cat.id}`}>Biaya Layanan (Rp)</Label>
                    <Input
                      id={`fee-${cat.id}`}
                      type="number"
                      min={0}
                      step={500}
                      value={fee}
                      onChange={(e) => setFee(cat.id, Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      {fee > 0 ? `Ditambahkan ke total: ${rupiah(fee)}` : "Rp 0 → tampil “Gratis Fee” di checkout."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
