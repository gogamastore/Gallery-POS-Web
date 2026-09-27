"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { readWhatsappStatus, type WhatsappStatus } from "@/lib/whatsapp-verification";

type UseWhatsappStatus = {
  status: WhatsappStatus | null;
  whatsapp: string;
  loading: boolean;
};

/**
 * Memantau field `whatsappStatus` pada dokumen `user/{uid}` secara realtime,
 * sehingga centang biru langsung muncul begitu Cloud Function menandai
 * nomor sebagai 'verified' — tanpa perlu refresh halaman.
 */
export function useWhatsappStatus(): UseWhatsappStatus {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<WhatsappStatus | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStatus(null);
      setWhatsapp("");
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, "user", user.uid),
      (snap) => {
        const data = snap.exists() ? snap.data() : null;
        setStatus(readWhatsappStatus(data));
        setWhatsapp((data?.whatsapp as string | undefined) ?? "");
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsubscribe();
  }, [user, authLoading]);

  return { status, whatsapp, loading };
}
