"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Loader2,
  ImagePlus,
  Type as TypeIcon,
  Image as ImageIcon,
  Power,
  PowerOff,
  UploadCloud,
} from "lucide-react";
import { useRouter } from "next/navigation";

type PopupType = "text" | "image";

export default function NotificationPopupPage() {
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<PopupType>("text");
  const [enabled, setEnabled] = useState(false);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const configRef = () => doc(db, "settings", "popup_notification");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDoc(configRef());
      if (snap.exists()) {
        const d = snap.data();
        setType(d.type === "image" ? "image" : "text");
        setEnabled(!!d.enabled);
        setTitle(d.title || "");
        setSubject(d.subject || "");
        setBody(d.body || "");
        setImageUrl(d.imageUrl || "");
        setImagePreview(d.imageUrl || null);
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Gagal memuat pengaturan notifikasi" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImageIfNeeded = async (): Promise<string> => {
    if (imageFile) {
      const storageRef = ref(
        storage,
        `popup_notifications/${Date.now()}_${imageFile.name}`
      );
      await uploadBytes(storageRef, imageFile);
      return await getDownloadURL(storageRef);
    }
    return imageUrl;
  };

  // Simpan config. `nextEnabled` menentukan status aktif/nonaktif.
  const save = async (nextEnabled: boolean) => {
    // Validasi hanya saat mengaktifkan.
    if (nextEnabled) {
      if (type === "text" && !title.trim() && !body.trim()) {
        toast({
          variant: "destructive",
          title: "Isi judul atau pesan dulu",
          description: "Notifikasi teks butuh minimal judul atau isi pesan.",
        });
        return;
      }
      if (type === "image" && !imageFile && !imageUrl) {
        toast({
          variant: "destructive",
          title: "Pilih gambar dulu",
          description: "Notifikasi gambar butuh sebuah gambar untuk ditampilkan.",
        });
        return;
      }
    }
    setSaving(true);
    try {
      let finalImageUrl = imageUrl;
      if (type === "image") {
        finalImageUrl = await uploadImageIfNeeded();
      }
      await setDoc(
        configRef(),
        {
          enabled: nextEnabled,
          type,
          title: title.trim(),
          subject: subject.trim(),
          body: body.trim(),
          imageUrl: finalImageUrl,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setEnabled(nextEnabled);
      setImageUrl(finalImageUrl);
      setImageFile(null);
      toast({
        title: nextEnabled ? "Notifikasi diaktifkan" : "Perubahan disimpan",
        description: nextEnabled
          ? "Popup akan tampil di halaman reseller."
          : "Notifikasi popup dinonaktifkan / disimpan sebagai draf.",
      });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Gagal menyimpan" });
    } finally {
      setSaving(false);
    }
  };

  const TypeButton = ({ value, icon: Icon, label }: { value: PopupType; icon: any; label: string }) => (
    <Button
      type="button"
      variant={type === value ? "default" : "outline"}
      className="flex-1"
      onClick={() => setType(value)}
    >
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/dashboard/settings")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Kembali ke Pengaturan</span>
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Notifikasi Popup</h1>
          <p className="text-sm text-muted-foreground">
            Pesan sambutan / iklan yang muncul di halaman reseller saat pertama membuka aplikasi.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Konfigurasi</CardTitle>
              <CardDescription>
                Pilih jenis notifikasi, isi kontennya, lalu aktifkan.
              </CardDescription>
            </div>
            <Badge variant={enabled ? "default" : "secondary"}>
              {enabled ? "Aktif" : "Nonaktif"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Pemilih jenis */}
            <div className="space-y-2">
              <Label>Jenis Notifikasi</Label>
              <div className="flex gap-2">
                <TypeButton value="text" icon={TypeIcon} label="Teks" />
                <TypeButton value="image" icon={ImageIcon} label="Gambar" />
              </div>
            </div>

            {type === "text" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Judul Notifikasi</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Selamat Datang! 🎉"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subjek Pesan</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Contoh: Promo Spesial Hari Ini"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">Isi Pesan</Label>
                  <Textarea
                    id="body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={4}
                    placeholder="Tulis pesan ramah Anda di sini..."
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Gambar Notifikasi (disarankan 650×1000px)</Label>
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    {imagePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-[130px] rounded-md border object-contain"
                        style={{ aspectRatio: "650 / 1000" }}
                      />
                    ) : (
                      <div
                        className="w-[130px] bg-muted rounded-md flex items-center justify-center"
                        style={{ aspectRatio: "650 / 1000" }}
                      >
                        <ImagePlus className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <Input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                      <p className="text-xs text-muted-foreground">
                        Pilih gambar dari galeri, lalu tekan Unggah untuk menyimpan
                        atau langsung Aktifkan.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => save(enabled)}
                        disabled={saving || (!imageFile && !imageUrl)}
                      >
                        {saving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <UploadCloud className="mr-2 h-4 w-4" />
                        )}
                        Unggah
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
            <Button onClick={() => save(true)} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Power className="mr-2 h-4 w-4" />
              )}
              Aktifkan Notifikasi
            </Button>
            {enabled && (
              <Button
                variant="outline"
                onClick={() => save(false)}
                disabled={saving}
              >
                <PowerOff className="mr-2 h-4 w-4" />
                Nonaktifkan
              </Button>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
