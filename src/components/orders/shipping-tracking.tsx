"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { biteshipStatusDesc, biteshipStatusLabel, formatTrackTime } from "@/lib/biteship-status";

interface TrackingHistoryItem {
  timestamp: string;
  status: string;
  note: string;
}

interface TrackingResult {
  hasDelivery: boolean;
  status?: string;
  courierName?: string;
  driverName?: string;
  driverPhone?: string;
  trackingUrl?: string;
  waybillId?: string;
  proofImageUrl?: string;
  proofReceiverName?: string;
  history?: TrackingHistoryItem[];
}

const trackBiteshipOrderFn = httpsCallable<{ orderId: string }, TrackingResult>(
  functions,
  "trackBiteshipOrder",
);

/**
 * Kartu "Lacak Pengiriman" yang dipakai bersama di detail pesanan reseller &
 * admin. Riwayat tracking dimuat OTOMATIS saat dibuka (tak perlu klik), dengan
 * riwayat lengkap dibungkus dropdown. Menampilkan foto bukti pengiriman (POD)
 * dari kurir bila tersedia.
 */
export default function ShippingTracking({
  orderId,
  deliveryTrackingUrl,
}: {
  orderId: string;
  deliveryTrackingUrl?: string;
}) {
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await trackBiteshipOrderFn({ orderId });
      setResult(res.data);
    } catch (err) {
      setError((err as Error)?.message ?? "Gagal mengambil data tracking.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // Muat otomatis sekali saat komponen tampil.
  const didLoad = useRef(false);
  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    load();
  }, [load]);

  const liveUrl = deliveryTrackingUrl || result?.trackingUrl;
  const openLive = () => liveUrl && window.open(liveUrl, "_blank");

  // Biteship mengirim riwayat terlama→terbaru. Urutkan DESC (terbaru lebih
  // dulu) agar ringkasan & item teratas = status TERAKHIR, bukan awal.
  const history = useMemo(() => {
    const arr = [...(result?.history ?? [])];
    arr.sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      if (isNaN(ta) || isNaN(tb)) return 0;
      return tb - ta;
    });
    return arr;
  }, [result]);
  const latest = history[0];

  return (
    <div className="space-y-2">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && !result && (
        <div className="flex items-center gap-2 rounded-xl border p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat status pengiriman…
        </div>
      )}

      {result?.hasDelivery && (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
            <p className="text-sm font-semibold">Lacak Pengiriman</p>
            <div className="flex items-center gap-1.5">
              {result.status && (
                <Badge variant="secondary" className="text-xs">
                  {biteshipStatusLabel(result.status)}
                </Badge>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load} disabled={loading} title="Muat ulang">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </Button>
              {liveUrl && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={openLive} title="Lacak langsung (peta)">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2 px-4 py-4">
            {result.courierName && (
              <p className="text-xs text-muted-foreground">Kurir: {result.courierName}</p>
            )}
            {result.driverName && (
              <p className="text-xs text-muted-foreground">
                Driver: {result.driverName}
                {result.driverPhone ? ` (${result.driverPhone})` : ""}
              </p>
            )}

            {/* Foto bukti pengiriman (POD) — bila kurir menyediakannya */}
            {result.proofImageUrl && (
              <div className="space-y-1 pt-1">
                <p className="text-xs font-medium">Foto Bukti Pengiriman</p>
                <a href={result.proofImageUrl} target="_blank" rel="noreferrer">
                  <img
                    src={result.proofImageUrl}
                    alt="Bukti pengiriman"
                    className="h-40 w-40 rounded-md border object-cover"
                  />
                </a>
                {result.proofReceiverName && (
                  <p className="text-xs text-muted-foreground">Diterima oleh: {result.proofReceiverName}</p>
                )}
              </div>
            )}

            {/* Riwayat pengiriman — dropdown */}
            {history.length > 0 ? (
              <>
                <Separator className="my-2" />
                <button
                  type="button"
                  onClick={() => setShowHistory((v) => !v)}
                  className="flex w-full items-center justify-between text-sm font-medium"
                >
                  <span>Riwayat Pengiriman ({history.length})</span>
                  {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {!showHistory && latest && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {biteshipStatusLabel(latest.status)} · {formatTrackTime(latest.timestamp)}
                  </p>
                )}

                {showHistory && (
                  <div className="mt-2 space-y-3">
                    {history.map((h, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${i === 0 ? "bg-blue-500" : "bg-gray-300"}`} />
                          {i < history.length - 1 && <div className="mt-1 w-px flex-1 bg-gray-200" />}
                        </div>
                        <div className="pb-2">
                          <p className="text-sm font-medium">{biteshipStatusLabel(h.status)}</p>
                          <p className="text-xs text-muted-foreground">{h.note || biteshipStatusDesc(h.status)}</p>
                          <p className="text-xs text-muted-foreground">{formatTrackTime(h.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Belum ada riwayat pergerakan paket.</p>
            )}
          </div>
        </div>
      )}

      {result && !result.hasDelivery && (
        <div className="rounded-xl border p-4 text-sm text-muted-foreground">
          Belum ada data pengiriman untuk pesanan ini.
        </div>
      )}
    </div>
  );
}
