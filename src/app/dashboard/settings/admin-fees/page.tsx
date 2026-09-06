"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Save, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n || 0);

export default function AdminFeesPage() {
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [adminFee, setAdminFee] = useState(0);
  const [serviceFeePercent, setServiceFeePercent] = useState(0);
  const [serviceFeeMax, setServiceFeeMax] = useState(0);

  const ref = () => doc(db, "settings", "admin_fees");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDoc(ref());
      if (snap.exists()) {
        const d = snap.data();
        setEnabled(d.enabled !== false);
        setAdminFee(Number(d.adminFee) || 0);
        setServiceFeePercent(Number(d.serviceFeePercent) || 0);
        setServiceFeeMax(Number(d.serviceFeeMax) || 0);
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Gagal memuat pengaturan biaya" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (serviceFeePercent < 0 || serviceFeePercent > 100) {
      toast({ variant: "destructive", title: "Persentase biaya layanan harus 0–100%" });
      return;
    }
    setSaving(true);
    try {
      await setDoc(
        ref(),
        {
          enabled,
          adminFee: Number(adminFee) || 0,
          serviceFeePercent: Number(serviceFeePercent) || 0,
          serviceFeeMax: Number(serviceFeeMax) || 0,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast({ title: "Pengaturan biaya disimpan" });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Gagal menyimpan" });
    } finally {
      setSaving(false);
    }
  };

  // Contoh perhitungan (subtotal Rp 250.000, di luar ongkir).
  const sampleSubtotal = 250000;
  const sampleService = serviceFeePercent > 0
    ? Math.min(
        Math.round((sampleSubtotal * serviceFeePercent) / 100),
        serviceFeeMax > 0 ? serviceFeeMax : Number.MAX_SAFE_INTEGER
      )
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/settings")}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Kembali ke Pengaturan</span>
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Biaya Admin</h1>
          <p className="text-sm text-muted-foreground">
            Biaya tambahan yang muncul di rincian biaya checkout reseller.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" /> Konfigurasi Biaya
              </CardTitle>
              <CardDescription>Diterapkan pada setiap checkout jika aktif.</CardDescription>
            </div>
            <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "Aktif" : "Nonaktif"}</Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-2">
              <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
              <Label htmlFor="enabled">Aktifkan biaya admin & layanan</Label>
            </div>

            {/* Biaya Admin (flat) */}
            <div className="space-y-2">
              <Label htmlFor="adminFee">Biaya Admin (flat, Rp)</Label>
              <Input
                id="adminFee"
                type="number"
                value={adminFee || ""}
                onChange={(e) => setAdminFee(Number(e.target.value))}
                placeholder="Contoh: 2000"
              />
              <p className="text-xs text-muted-foreground">
                Nominal tetap yang ditambahkan ke setiap pesanan.
              </p>
            </div>

            {/* Biaya Layanan (persen + cap) */}
            <div className="rounded-lg border p-4 space-y-4">
              <p className="text-sm font-medium">Biaya Layanan (persen, dengan batas maksimal)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serviceFeePercent">Persentase (%)</Label>
                  <Input
                    id="serviceFeePercent"
                    type="number"
                    value={serviceFeePercent || ""}
                    onChange={(e) => setServiceFeePercent(Number(e.target.value))}
                    placeholder="Contoh: 5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceFeeMax">Maks. Penambahan (Rp) — 0 = tanpa batas</Label>
                  <Input
                    id="serviceFeeMax"
                    type="number"
                    value={serviceFeeMax || ""}
                    onChange={(e) => setServiceFeeMax(Number(e.target.value))}
                    placeholder="Contoh: 7500"
                  />
                </div>
              </div>
              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Contoh perhitungan</p>
                <p>
                  Subtotal (di luar ongkir) {formatCurrency(sampleSubtotal)} ·
                  {" "}Biaya layanan {serviceFeePercent || 0}%
                  {serviceFeeMax > 0 ? ` (maks ${formatCurrency(serviceFeeMax)})` : ""}
                  {" "}→ ditambahkan <span className="font-semibold text-foreground">{formatCurrency(sampleService)}</span>
                  {serviceFeeMax > 0 && serviceFeePercent > 0 &&
                    Math.round((sampleSubtotal * serviceFeePercent) / 100) > serviceFeeMax
                    ? ` (dari ${formatCurrency(Math.round((sampleSubtotal * serviceFeePercent) / 100))}, dibatasi ke maks)`
                    : ""}
                  .
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan Pengaturan
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
