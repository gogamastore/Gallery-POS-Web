"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BadgeCheck, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  confirmWhatsappOtp,
  isValidWhatsappNumber,
  maskWhatsappNumber,
  normalizeWhatsappNumber,
  requestWhatsappOtp,
  whatsappErrorMessage,
  type WhatsappStatus,
} from "@/lib/whatsapp-verification";

type Props = {
  /** Nilai nomor pada form (dikontrol oleh halaman induk). */
  value: string;
  onChange: (value: string) => void;
  /** Status terkini dari dokumen `user/{uid}`. */
  status: WhatsappStatus | null;
  /** Nomor yang saat ini tersimpan & terverifikasi di Firestore. */
  verifiedNumber: string;
  disabled?: boolean;
};

/**
 * Kolom nomor WhatsApp lengkap dengan alur verifikasi OTP:
 * tombol "Verifikasi" → kotak kode + tombol "Konfirmasi" → centang biru.
 */
export default function WhatsappVerificationField({
  value,
  onChange,
  status,
  verifiedNumber,
  disabled,
}: Props) {
  const { toast } = useToast();
  const [otpOpen, setOtpOpen] = useState(false);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Nomor dianggap terverifikasi hanya bila statusnya 'verified' DAN yang
  // tertulis di kolom masih sama dengan nomor yang dulu diverifikasi.
  const isVerified =
    status === "verified" &&
    normalizeWhatsappNumber(value) === normalizeWhatsappNumber(verifiedNumber);

  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldown]);

  // Begitu status berubah menjadi 'verified', tutup kotak kode.
  useEffect(() => {
    if (isVerified) {
      setOtpOpen(false);
      setCode("");
    }
  }, [isVerified]);

  const handleSendOtp = async () => {
    if (!isValidWhatsappNumber(value)) {
      toast({
        variant: "destructive",
        title: "Nomor Tidak Valid",
        description: "Gunakan format 08xxxxxxxxxx atau 628xxxxxxxxxx.",
      });
      return;
    }

    setSending(true);
    try {
      const result = await requestWhatsappOtp(normalizeWhatsappNumber(value));
      setOtpOpen(true);
      setCode("");
      setCooldown(result.resendAfterSeconds ?? 60);
      toast({
        title: "Kode Terkirim",
        description: `Kami mengirim 6 digit kode ke WhatsApp ${result.phone}.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Gagal Mengirim Kode",
        description: whatsappErrorMessage(error),
      });
    } finally {
      setSending(false);
    }
  };

  const handleConfirm = async () => {
    if (code.length !== 6) {
      toast({
        variant: "destructive",
        title: "Kode Belum Lengkap",
        description: "Masukkan 6 digit kode yang dikirim ke WhatsApp Anda.",
      });
      return;
    }

    setConfirming(true);
    try {
      await confirmWhatsappOtp(code);
      setOtpOpen(false);
      setCode("");
      toast({
        title: "WhatsApp Terverifikasi",
        description: "Nomor WhatsApp Anda sudah aktif dan terverifikasi.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Verifikasi Gagal",
        description: whatsappErrorMessage(error),
      });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="whatsapp">Nomor WhatsApp</Label>
        {isVerified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <BadgeCheck className="h-3.5 w-3.5 fill-blue-500 text-white dark:text-blue-950" />
            Terverifikasi
          </span>
        )}
      </div>

      <div className="relative">
        <Input
          id="whatsapp"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Contoh: 628123456789"
          disabled={disabled}
          className={isVerified ? "pr-10" : undefined}
        />
        {isVerified && (
          <BadgeCheck className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 fill-blue-500 text-white dark:text-background" />
        )}
      </div>

      {isVerified ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
          Nomor {maskWhatsappNumber(value)} sudah terverifikasi.
        </p>
      ) : (
        <>
          <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500">
            <ShieldAlert className="h-3.5 w-3.5" />
            Nomor belum terverifikasi. Verifikasi diperlukan sebelum memesan.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSendOtp}
            disabled={sending || disabled || cooldown > 0}
          >
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {cooldown > 0
              ? `Kirim Ulang (${cooldown}s)`
              : otpOpen
                ? "Kirim Ulang Kode"
                : "Verifikasi"}
          </Button>
        </>
      )}

      {otpOpen && !isVerified && (
        <div className="mt-3 space-y-3 rounded-lg border bg-muted/40 p-4">
          <div className="space-y-1">
            <Label htmlFor="whatsapp-otp">Kode Verifikasi</Label>
            <p className="text-xs text-muted-foreground">
              Masukkan 6 digit kode yang dikirim ke WhatsApp{" "}
              {maskWhatsappNumber(value)}. Kode berlaku 5 menit.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="whatsapp-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="______"
              className="tracking-[0.5em] text-center font-mono text-lg sm:max-w-[180px]"
            />
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={confirming || code.length !== 6}
            >
              {confirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Konfirmasi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
