import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { db, functions } from "@/lib/firebase";

export type WhatsappStatus = "verified" | "unverified";

/**
 * Membaca status verifikasi WhatsApp dari data dokumen `user/{uid}`.
 *
 * Field kanonik adalah `whatsappStatus` (camelCase, mengikuti konvensi
 * `verificationStatus` di proyek ini). Ejaan `WhatsappStatus` ikut dibaca
 * supaya dokumen yang terlanjur dibuat manual lewat Firebase Console tetap
 * dikenali. Apa pun selain 'verified' dianggap 'unverified' — akun lama yang
 * belum punya field ini wajib melakukan verifikasi.
 */
export function readWhatsappStatus(
  data: Record<string, any> | undefined | null
): WhatsappStatus {
  const raw = data?.whatsappStatus ?? data?.WhatsappStatus;
  return raw === "verified" ? "verified" : "unverified";
}

export async function fetchWhatsappStatus(uid: string): Promise<WhatsappStatus> {
  const snap = await getDoc(doc(db, "user", uid));
  return readWhatsappStatus(snap.exists() ? snap.data() : null);
}

/**
 * Normalisasi nomor Indonesia ke format 62xxxxxxxxxx (tanpa '+').
 * Server melakukan normalisasi yang sama — ini hanya untuk tampilan
 * dan validasi awal di sisi klien.
 */
export function normalizeWhatsappNumber(raw: string): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("620")) return "62" + digits.slice(3);
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}

export function isValidWhatsappNumber(raw: string): boolean {
  return /^628\d{7,12}$/.test(normalizeWhatsappNumber(raw));
}

export function maskWhatsappNumber(raw: string): string {
  const phone = normalizeWhatsappNumber(raw);
  if (phone.length < 6) return phone;
  return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
}

type SendOtpResult = {
  success: boolean;
  phone: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
};

type VerifyOtpResult = {
  success: boolean;
  whatsappStatus: WhatsappStatus;
  phone: string;
};

/** Minta Cloud Function mengirim kode OTP ke WhatsApp pengguna. */
export async function requestWhatsappOtp(phone?: string): Promise<SendOtpResult> {
  const callable = httpsCallable<{ phone?: string }, SendOtpResult>(
    functions,
    "sendWhatsappOtp"
  );
  const result = await callable(phone ? { phone } : {});
  return result.data;
}

/** Konfirmasi kode OTP yang diterima pengguna. */
export async function confirmWhatsappOtp(code: string): Promise<VerifyOtpResult> {
  const callable = httpsCallable<{ code: string }, VerifyOtpResult>(
    functions,
    "verifyWhatsappOtp"
  );
  const result = await callable({ code });
  return result.data;
}

/** Pesan error yang ramah dibaca pembeli dari FunctionsError. */
export function whatsappErrorMessage(error: any): string {
  const message = error?.message as string | undefined;
  if (message && !message.startsWith("INTERNAL")) return message;
  return "Terjadi kesalahan. Silakan coba lagi.";
}
