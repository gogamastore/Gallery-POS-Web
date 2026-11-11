"use client";

// Dialog "Hubungi Admin" bersama: opsi Obrolan (chat aplikasi) + DAFTAR semua
// kontak WhatsApp dari koleksi whatsapp_contacts (tiap kontak = satu pilihan,
// menampilkan NAMA kontak yang admin tambahkan). Dipakai di detail produk,
// detail pesanan, dan tombol chat di appbar.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, MessageCircleMore, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchAdminContacts, openAdminWhatsapp, type AdminContact } from "@/lib/contact-admin";

export function ContactAdminDialog({
  open,
  onOpenChange,
  description = "Pilih cara menghubungi admin.",
  onChat,
  buildWhatsappMessage,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  description?: string;
  /** Aksi "Obrolan" (chat aplikasi). Bila tidak diberikan, opsi Obrolan disembunyikan. */
  onChat?: () => void;
  /** Pesan WhatsApp sesuai konteks (nama admin diisi dari kontak terpilih). */
  buildWhatsappMessage: (adminName: string) => string;
}) {
  const [contacts, setContacts] = useState<AdminContact[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    fetchAdminContacts()
      .then((c) => { if (active) setContacts(c); })
      .catch(() => { if (active) toast({ variant: "destructive", title: "Gagal memuat kontak admin" }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Hubungi Admin</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {onChat && (
            <Button variant="outline" className="w-full justify-start h-12" onClick={onChat}>
              <MessageCircleMore className="mr-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-medium leading-none">Obrolan</p>
                <p className="text-xs text-muted-foreground mt-0.5">Chat di aplikasi</p>
              </div>
            </Button>
          )}
          {loading ? (
            <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat kontak…
            </div>
          ) : contacts.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">Belum ada kontak WhatsApp admin.</p>
          ) : (
            contacts.map((c) => (
              <Button
                key={c.id}
                variant="outline"
                className="w-full justify-start h-12"
                onClick={() => {
                  openAdminWhatsapp(c, buildWhatsappMessage(c.name));
                  onOpenChange(false);
                }}
              >
                <Phone className="mr-3 h-5 w-5 shrink-0 text-green-600" />
                <div className="min-w-0 text-left">
                  <p className="truncate font-medium leading-none">{c.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">WhatsApp</p>
                </div>
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
