"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Megaphone } from "lucide-react";

/**
 * Overlay pemberitahuan "Libur Toko" untuk halaman reseller.
 *
 * - Mendengarkan `settings/operational` secara real-time.
 * - Saat `isClosed == true`, menampilkan dialog yang TIDAK bisa ditutup
 *   (tanpa tombol close, tanpa klik-luar, tanpa Escape) berisi pesan admin.
 * - Hilang otomatis begitu admin menonaktifkan Libur (`isClosed == false`).
 */
export default function StoreClosedOverlay() {
  const [isClosed, setIsClosed] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "operational"),
      (snap) => {
        const data = snap.data();
        setIsClosed(Boolean(data?.isClosed));
        setMessage((data?.message as string) ?? "");
      },
      (err) => {
        // Bila gagal membaca, jangan blokir pengguna.
        console.error("Gagal memantau status operasional:", err);
        setIsClosed(false);
      }
    );
    return () => unsub();
  }, []);

  // Cegah scroll latar saat overlay aktif.
  useEffect(() => {
    if (!isClosed) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isClosed]);

  if (!isClosed) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Toko sedang libur"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-xl border bg-background shadow-2xl">
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Megaphone className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Toko Sedang Libur</h2>
          {message ? (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {message}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Toko sedang tidak beroperasi untuk sementara waktu.
            </p>
          )}
          <p className="text-xs text-muted-foreground/70">
            Anda dapat berbelanja kembali setelah toko dibuka.
          </p>
        </div>
      </div>
    </div>
  );
}
