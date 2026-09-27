"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useWhatsappStatus } from "@/hooks/use-whatsapp-status";

/**
 * Peringatan yang muncul di beranda reseller ketika dokumen `user/{uid}`
 * masih berstatus `whatsappStatus: 'unverified'`. Tombol utama mengarahkan
 * pembeli ke Profil Saya, tempat tombol "Verifikasi" berada.
 */
export default function WhatsappVerificationPopup() {
  const { user, loading: authLoading } = useAuth();
  const { status, loading } = useWhatsappStatus();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (authLoading || loading || !user) return;
    setOpen(status === "unverified");
  }, [authLoading, loading, user, status]);

  const goToProfile = () => {
    setOpen(false);
    router.push("/reseller/profile/settings");
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
            <ShieldAlert className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <AlertDialogTitle className="text-center font-headline">
            Verifikasi WhatsApp
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Nomor WhatsApp Anda belum terverifikasi. Silakan{" "}
            <strong>Verifikasi WhatsApp</strong> Anda sebelum melakukan pemesanan
            agar kami dapat menghubungi Anda terkait status pesanan dan
            pengiriman.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel>Nanti Saja</AlertDialogCancel>
          <AlertDialogAction onClick={goToProfile}>
            Verifikasi Sekarang
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
