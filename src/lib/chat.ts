import { db, storage } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
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

// Tandai thread sudah dibaca untuk peran tertentu (reset unread).
export async function markThreadRead(userId: string, role: SenderRole): Promise<void> {
  const threadRef = doc(db, "chats", userId);
  await setDoc(
    threadRef,
    { [role === "admin" ? "unreadForAdmin" : "unreadForUser"]: 0 },
    { merge: true }
  );
}
