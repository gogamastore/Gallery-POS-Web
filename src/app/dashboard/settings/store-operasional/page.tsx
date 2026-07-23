"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Megaphone, Save, Power } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// Dokumen tunggal: settings/operational = { isClosed, message, updatedAt }
const OPERATIONAL_DOC = doc(db, "settings", "operational");

export default function StoreOperationalPage() {
  const { toast } = useToast();

  const [isClosed, setIsClosed] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Muat data awal
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(OPERATIONAL_DOC);
        if (snap.exists()) {
          const data = snap.data();
          setIsClosed(Boolean(data.isClosed));
          setMessage((data.message as string) ?? "");
        }
      } catch (e) {
        console.error("Gagal memuat pengaturan operasional:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = async (closed: boolean, msg: string) => {
    await setDoc(
      OPERATIONAL_DOC,
      { isClosed: closed, message: msg, updatedAt: serverTimestamp() },
      { merge: true }
    );
  };

  // Aktif/nonaktifkan "Libur" — langsung tersimpan agar popup reseller
  // bereaksi real-time.
  const handleToggle = async (checked: boolean) => {
    if (checked && !message.trim()) {
      toast({
        variant: "destructive",
        title: "Isi pemberitahuan dulu",
        description: "Tulis pesan libur sebelum mengaktifkan.",
      });
      return;
    }
    setSaving(true);
    try {
      await persist(checked, message);
      setIsClosed(checked);
      toast({
        title: checked ? "Toko ditandai LIBUR" : "Toko dibuka kembali",
        description: checked
          ? "Reseller akan melihat pemberitahuan libur."
          : "Pemberitahuan libur telah dihapus dari halaman reseller.",
      });
    } catch (e) {
      console.error("Gagal menyimpan status operasional:", e);
      toast({ variant: "destructive", title: "Gagal menyimpan. Coba lagi." });
    } finally {
      setSaving(false);
    }
  };

  // Simpan perubahan teks pemberitahuan (berlaku live jika sedang libur).
  const handleSaveMessage = async () => {
    setSaving(true);
    try {
      await persist(isClosed, message);
      toast({ title: "Pemberitahuan disimpan." });
    } catch (e) {
      console.error("Gagal menyimpan pemberitahuan:", e);
      toast({ variant: "destructive", title: "Gagal menyimpan. Coba lagi." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Operasional Toko</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aktifkan mode <strong>Libur Toko</strong> untuk menampilkan
          pemberitahuan yang tidak bisa ditutup di halaman reseller.
        </p>
      </div>

      {/* Toggle Libur */}
      <Card className={isClosed ? "border-destructive/40 bg-destructive/5" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="h-5 w-5" />
            Libur Toko
          </CardTitle>
          <CardDescription>
            Saat aktif, semua reseller akan melihat popup pemberitahuan libur dan
            tidak dapat menutupnya sampai Anda menonaktifkannya.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="libur-switch" className="text-base">
                  Status Toko
                </Label>
                {isClosed ? (
                  <Badge variant="destructive">LIBUR</Badge>
                ) : (
                  <Badge className="bg-green-600 hover:bg-green-600">BUKA</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {isClosed
                  ? "Toko sedang libur. Reseller melihat pemberitahuan."
                  : "Toko beroperasi normal."}
              </p>
            </div>
            <Switch
              id="libur-switch"
              checked={isClosed}
              disabled={saving}
              onCheckedChange={handleToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pemberitahuan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Pemberitahuan Libur
          </CardTitle>
          <CardDescription>
            Isi pesan yang akan ditampilkan ke reseller saat toko libur
            (mis. tanggal buka kembali, alasan libur).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">Isi Pemberitahuan</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Contoh: Toko libur dalam rangka Idul Fitri. Kami buka kembali tanggal 15 April 2026. Terima kasih."
              rows={5}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveMessage} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Simpan Pemberitahuan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
