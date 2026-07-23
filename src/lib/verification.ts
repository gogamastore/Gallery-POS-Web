import { getAuth, sendEmailVerification, type User } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { app, db } from "@/lib/firebase";

/**
 * Kirim email verifikasi dengan continue URL ke halaman login.
 *
 * Continue URL memakai origin halaman saat ini (`window.location.origin`)
 * sehingga selalu cocok dengan domain tempat app dilayani — origin sendiri
 * otomatis ter-allowlist di project-nya. Ini penting karena kode dipakai
 * lintas project (domain berbeda). Bila continue URL tetap ditolak
 * (`auth/unauthorized-continue-uri`), kita jatuh ke pengiriman biasa agar
 * pendaftaran tidak ikut gagal.
 */
export async function sendVerificationEmail(user: User): Promise<void> {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const settings = origin
    ? { url: `${origin}/login`, handleCodeInApp: false }
    : undefined;
  try {
    await sendEmailVerification(user, settings);
  } catch (error: any) {
    if (error?.code === "auth/unauthorized-continue-uri") {
      // Domain continue URL belum di-allowlist → kirim tanpa continue URL.
      await sendEmailVerification(user);
      return;
    }
    throw error;
  }
}

/**
 * Menentukan apakah pengguna boleh masuk berdasarkan field
 * `verificationStatus` di dokumen Firestore `user/{uid}`.
 *
 * - `verificationStatus == 'pending'` → wajib verifikasi email dulu.
 *   Bila email ternyata sudah terverifikasi, status di Firestore
 *   otomatis diperbarui menjadi 'verified' (self-healing).
 * - Field tidak ada / bukan 'pending' → dianggap 'verified'
 *   (akun lama tidak terkunci).
 */
export async function resolveVerificationStatus(
  user: User
): Promise<"verified" | "pending"> {
  const ref = doc(db, "user", user.uid);
  const snap = await getDoc(ref);
  const status = snap.exists()
    ? (snap.data().verificationStatus as string | undefined)
    : undefined;

  if (status !== "pending") return "verified";

  // Pending: cek apakah email sudah diverifikasi (self-heal).
  try {
    await user.reload();
  } catch {
    // abaikan; pakai status saat ini
  }
  const refreshed = getAuth(app).currentUser;
  if (refreshed?.emailVerified) {
    await updateDoc(ref, { verificationStatus: "verified" });
    return "verified";
  }
  return "pending";
}
