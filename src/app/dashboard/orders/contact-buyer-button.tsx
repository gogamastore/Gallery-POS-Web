"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Headset, MessageSquare, Phone, Loader2 } from "lucide-react";

const formatRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

function statusLabel(status: string): string {
  const s = (status ?? "").toLowerCase();
  if (s === "pending") return "Menunggu Pembayaran";
  if (s === "processing") return "Perlu Dikirim";
  if (s === "shipped" || s === "dikirim") return "Dalam Pengiriman";
  if (s === "delivered" || s === "selesai") return "Pesanan Selesai";
  if (s === "cancelled" || s === "dibatalkan") return "Pesanan Dibatalkan";
  return status;
}

// Tombol "Hubungi" pembeli + popup pilihan Obrolan / WhatsApp.
// WhatsApp diambil dari profil user (user/{customerId}.whatsapp) yang sudah
// diverifikasi pembeli — BUKAN dari customerDetails pesanan.
export function ContactBuyerButton({
  orderId,
  customerId,
  buyerName,
  total,
  status,
  variant = "outline",
  size = "sm",
  className,
  label = "Hubungi",
}: {
  orderId: string;
  customerId?: string;
  buyerName: string;
  total: number;
  status: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const invalidBuyer = !customerId || customerId === "guest";

  function guardBuyer(): boolean {
    if (invalidBuyer) {
      toast({ title: "Pesanan tanpa akun pembeli (guest), tidak bisa dihubungi.", variant: "destructive" });
      return false;
    }
    return true;
  }

  function handleChat() {
    if (!guardBuyer()) return;
    setOpen(false);
    router.push(`/dashboard/chat?userId=${customerId}`);
  }

  async function handleWhatsapp() {
    if (busy || !guardBuyer()) return;
    setBusy(true);
    try {
      const snap = await getDoc(doc(db, "user", customerId!));
      const wa = snap.exists() ? (snap.data().whatsapp as string | undefined) : undefined;
      if (!wa) {
        toast({
          title: "Pembeli belum memiliki WhatsApp terverifikasi.",
          description: "Minta pembeli memverifikasi nomor WhatsApp di profil mereka.",
          variant: "destructive",
        });
        return;
      }
      const num = wa.replace(/[^0-9]/g, "");
      const shortId = orderId.substring(0, 8).toUpperCase();
      const text =
        `Halo ${buyerName}, ini admin Manafidh Store 👋\n\n` +
        `Kami menghubungi Anda terkait pesanan #${shortId}.\n` +
        `Total: ${formatRp(total)}\n` +
        `Status: ${statusLabel(status)}\n\n`;
      window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      setOpen(false);
    } catch {
      toast({ title: "Gagal memuat nomor WhatsApp pembeli.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Headset className="mr-2 h-4 w-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Hubungi Pembeli</DialogTitle>
            <DialogDescription>
              Hubungi {buyerName} tentang pesanan #{orderId.substring(0, 8).toUpperCase()}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start h-12" onClick={handleChat} disabled={busy}>
              <MessageSquare className="mr-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-medium leading-none">Obrolan</p>
                <p className="text-xs text-muted-foreground mt-0.5">Balas chat pembeli di aplikasi</p>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start h-12" onClick={handleWhatsapp} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              ) : (
                <Phone className="mr-3 h-5 w-5 text-green-600" />
              )}
              <div className="text-left">
                <p className="font-medium leading-none">WhatsApp</p>
                <p className="text-xs text-muted-foreground mt-0.5">Nomor WhatsApp terverifikasi pembeli</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
