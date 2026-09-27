import { db, storage } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export type SenderRole = "user" | "admin";

// Ringkasan order yang bisa disematkan ke dalam pesan (dibangun kemudian).
export interface ChatOrderRef {
  orderId: string;
  shortId: string;
  total?: number;
  status?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: SenderRole;
  text: string;
  imageUrl?: string;
  orderRef?: ChatOrderRef;
  createdAt?: Timestamp | null;
}

export interface ChatThread {
  id: string; // = userId (satu thread per pengguna)
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhotoURL?: string;
  lastMessage?: string;
  lastMessageAt?: Timestamp | null;
  lastSenderRole?: SenderRole;
  unreadForAdmin?: number;
  unreadForUser?: number;
}

export interface ChatUserInfo {
  name?: string;
  email?: string;
  photoURL?: string;
}

// Upload gambar chat ke Storage, kembalikan URL unduhan.
export async function uploadChatImage(userId: string, file: File): Promise<string> {
  const storageRef = ref(storage, `chat_images/${userId}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

// Kirim pesan: tambah ke subcollection + perbarui dokumen thread (ringkasan + unread).
export async function sendChatMessage(opts: {
  userId: string; // pemilik thread (pembeli/reseller)
  senderId: string;
  senderRole: SenderRole;
  text: string;
  imageUrl?: string;
  orderRef?: ChatOrderRef;
  userInfo?: ChatUserInfo;
}): Promise<void> {
  const { userId, senderId, senderRole, text, imageUrl, orderRef, userInfo } = opts;
  const trimmed = text.trim();
  if (!trimmed && !imageUrl && !orderRef) return;

  const threadRef = doc(db, "chats", userId);
  const messagesRef = collection(threadRef, "messages");

  await addDoc(messagesRef, {
    senderId,
    senderRole,
    text: trimmed,
    ...(imageUrl ? { imageUrl } : {}),
    ...(orderRef ? { orderRef } : {}),
    createdAt: serverTimestamp(),
  });

  const preview = trimmed || (imageUrl ? "📷 Foto" : orderRef ? "📦 Pesanan" : "");

  await setDoc(
    threadRef,
    {
      userId,
      ...(userInfo?.name ? { userName: userInfo.name } : {}),
      ...(userInfo?.email ? { userEmail: userInfo.email } : {}),
      ...(userInfo?.photoURL ? { userPhotoURL: userInfo.photoURL } : {}),
      lastMessage: preview,
      lastMessageAt: serverTimestamp(),
      lastSenderRole: senderRole,
      unreadForAdmin: senderRole === "user" ? increment(1) : increment(0),
      unreadForUser: senderRole === "admin" ? increment(1) : increment(0),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// Pastikan dokumen thread memakai NAMA PROFIL pembeli (user/{uid}.name) sebagai
// kartu nama, bukan userId. Dipanggil saat admin membuka thread. Aman dipanggil
// berulang; hanya menulis bila profil punya data.
export async function ensureThreadProfile(userId: string): Promise<void> {
  if (!userId || userId === "guest") return;
  try {
    const uSnap = await getDoc(doc(db, "user", userId));
    if (!uSnap.exists()) return;
    const u = uSnap.data() as Record<string, any>;
    const name = (u.name ?? u.displayName ?? "").toString();
    const email = (u.email ?? "").toString();
    const photoURL = (u.photoURL ?? "").toString();
    const updates: Record<string, unknown> = {};
    if (name) updates.userName = name;
    if (email) updates.userEmail = email;
    if (photoURL) updates.userPhotoURL = photoURL;
    if (Object.keys(updates).length === 0) return;
    updates.userId = userId;
    await setDoc(doc(db, "chats", userId), updates, { merge: true });
  } catch {
    /* abaikan — tampilan tetap pakai data thread yang ada */
  }
}

// Tandai thread sudah dibaca untuk peran tertentu (reset unread).
export async function markThreadRead(userId: string, role: SenderRole): Promise<void> {
  const threadRef = doc(db, "chats", userId);
  await setDoc(
    threadRef,
    { [role === "admin" ? "unreadForAdmin" : "unreadForUser"]: 0 },
    { merge: true }
  );
}
