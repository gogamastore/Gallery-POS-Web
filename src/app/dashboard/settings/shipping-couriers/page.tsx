"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Save, Truck, AlertCircle, RefreshCw } from "lucide-react";

interface BiteshipCourier {
  courierCode: string;
  courierName: string;
  serviceCode: string;
  serviceName: string;
  serviceType: string;
  shippingType: string;
  description: string;
}

const getBiteshipCouriersFn = httpsCallable<Record<string, never>, { couriers: BiteshipCourier[] }>(
  functions,
  "getBiteshipCouriers",
);

/** Kunci unik per layanan kurir. */
const svcKey = (c: BiteshipCourier) => `${c.courierCode}:${c.serviceCode}`;

export default function ShippingCouriersSettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [couriers, setCouriers] = useState<BiteshipCourier[]>([]);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, cfgSnap] = await Promise.all([
        getBiteshipCouriersFn({}),
        getDoc(doc(db, "settings", "shipping_couriers")),
      ]);
      const list = (res.data.couriers ?? []).filter((c) => c.courierCode && c.serviceCode);
      setCouriers(list);
      const saved = (cfgSnap.exists() ? cfgSnap.data().services : {}) as Record<string, boolean>;
      // Default: aktif, kecuali admin menonaktifkan secara eksplisit.
      const map: Record<string, boolean> = {};
      for (const c of list) {
        const k = svcKey(c);
        map[k] = saved?.[k] === undefined ? true : saved[k] === true;
      }
      setEnabled(map);
    } catch (e: unknown) {
      console.error("Gagal memuat kurir Biteship", e);
      setError(e instanceof Error ? e.message : "Gagal memuat daftar kurir dari Biteship.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Kelompokkan layanan per kurir.
  const grouped = useMemo(() => {
    const m = new Map<string, { name: string; services: BiteshipCourier[] }>();
    for (const c of couriers) {
      const g = m.get(c.courierCode) ?? { name: c.courierName, services: [] };
      g.services.push(c);
      m.set(c.courierCode, g);
    }
    return Array.from(m.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [couriers]);

  const activeCount = useMemo(
    () => couriers.filter((c) => enabled[svcKey(c)]).length,
    [couriers, enabled],
  );

  const toggle = (key: string, value: boolean) => setEnabled((p) => ({ ...p, [key]: value }));

  const toggleCourier = (services: BiteshipCourier[], value: boolean) =>
    setEnabled((p) => {
      const next = { ...p };
      services.forEach((s) => (next[svcKey(s)] = value));
      return next;
    });

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, "settings", "shipping_couriers"),
        { services: enabled, updatedAt: serverTimestamp() },
        { merge: true },
      );
      toast({ title: "Pengaturan pengiriman disimpan." });
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
            <Truck className="h-5 w-5" /> Pengaturan Pengiriman
          </h1>
          <p className="text-sm text-muted-foreground">
            Layanan diambil langsung dari akun Biteship-mu. Aktifkan hanya layanan yang ingin muncul di checkout pembeli.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || loading || !!error}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Simpan
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="max-w-md text-sm">{error}</p>
            <Button variant="outline" onClick={load}>
              <RefreshCw className="mr-2 h-4 w-4" /> Coba lagi
            </Button>
          </CardContent>
        </Card>
      ) : couriers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Belum ada kurir aktif di akun Biteship. Aktifkan kurir di dashboard Biteship terlebih dahulu.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {activeCount} dari {couriers.length} layanan aktif.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {grouped.map(([code, group]) => {
              const allOn = group.services.every((s) => enabled[svcKey(s)]);
              return (
                <Card key={code}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <div>
                      <CardTitle className="text-base">{group.name}</CardTitle>
                      <CardDescription className="uppercase">{code}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Semua</span>
                      <Switch checked={allOn} onCheckedChange={(v) => toggleCourier(group.services, v)} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {group.services.map((s) => {
                      const k = svcKey(s);
                      return (
                        <div key={k} className="flex items-center justify-between gap-3 rounded-md border p-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{s.serviceName}</p>
                            {s.description && (
                              <p className="truncate text-xs text-muted-foreground">{s.description}</p>
                            )}
                          </div>
                          <Switch checked={!!enabled[k]} onCheckedChange={(v) => toggle(k, v)} />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
