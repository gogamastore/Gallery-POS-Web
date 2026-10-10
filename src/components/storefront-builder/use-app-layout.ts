"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { type AppLayout, defaultLayout, normalizeLayout } from "@/components/app-builder/schema";

/**
 * Membaca dokumen `settings/app_layout` (hasil Publish App Builder) secara
 * real-time untuk mendorong tampilan beranda reseller web — sama dengan yang
 * dibaca aplikasi Flutter. Saat dokumen tidak ada / tidak valid / gagal, pakai
 * `defaultLayout()` sehingga beranda tetap tampil normal.
 */
interface AppLayoutState {
  layout: AppLayout;
  loading: boolean;
  /** true hanya bila dokumen `settings/app_layout` BENAR-BENAR ada (sudah
   *  di-Publish). Bila false, beranda reseller tetap memakai tampilan bawaan. */
  hasConfig: boolean;
}

export function useAppLayout(): AppLayoutState {
  const [state, setState] = useState<AppLayoutState>(() => ({
    layout: defaultLayout(),
    loading: true,
    hasConfig: false,
  }));

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "app_layout"),
      (snap) => {
        try {
          if (snap.exists()) {
            setState({ layout: normalizeLayout(snap.data()), loading: false, hasConfig: true });
          } else {
            setState({ layout: defaultLayout(), loading: false, hasConfig: false });
          }
        } catch {
          setState({ layout: defaultLayout(), loading: false, hasConfig: false });
        }
      },
      (err) => {
        console.error("Gagal memuat app_layout", err);
        setState({ layout: defaultLayout(), loading: false, hasConfig: false });
      },
    );
    return () => unsub();
  }, []);

  return state;
}
