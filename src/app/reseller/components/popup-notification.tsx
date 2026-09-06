"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface PopupConfig {
  enabled?: boolean;
  type?: "text" | "image";
  title?: string;
  subject?: string;
  body?: string;
  imageUrl?: string;
  updatedAt?: { toMillis?: () => number; seconds?: number } | null;
}

/**
 * Popup notifikasi/iklan yang muncul di halaman reseller saat pertama membuka
 * aplikasi. Hanya tampil bila admin mengaktifkannya (settings/popup_notification).
 * Tampil sekali per sesi browser per versi konten (updatedAt). Bisa ditutup
 * lewat tombol ✕ (bawaan Dialog) atau klik area luar.
 */
export default function PopupNotification() {
  const [config, setConfig] = useState<PopupConfig | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "popup_notification"));
        if (!active || !snap.exists()) return;
        const d = snap.data() as PopupConfig;
        if (!d.enabled) return;

        // Versi konten: pakai updatedAt agar konten baru tampil lagi walau
        // sudah pernah dilihat di sesi ini.
        const version =
          d.updatedAt?.toMillis?.() ?? d.updatedAt?.seconds ?? 0;
        const key = `promo_popup_seen_${version}`;
        if (sessionStorage.getItem(key)) return;

        setConfig(d);
        setOpen(true);
        sessionStorage.setItem(key, "1");
      } catch {
        // diamkan — jangan ganggu halaman jika config gagal dimuat
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!config) return null;

  if (config.type === "image") {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-0 bg-transparent p-0 shadow-none w-[58vw] max-w-[240px]">
          <DialogTitle className="sr-only">{config.title || "Promo"}</DialogTitle>
          {config.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={config.imageUrl}
              alt={config.title || "Promo"}
              className="mx-auto w-full rounded-xl object-contain"
              style={{ maxHeight: "60vh" }}
            />
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <div className="space-y-3 py-2 text-center">
          {config.title && (
            <DialogTitle className="text-2xl font-bold">
              {config.title}
            </DialogTitle>
          )}
          {config.subject && (
            <p className="text-base font-semibold text-primary">
              {config.subject}
            </p>
          )}
          {config.body && (
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {config.body}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
