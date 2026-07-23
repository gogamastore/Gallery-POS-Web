
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  type ChatMessage,
  sendChatMessage,
  markThreadRead,
  uploadChatImage,
} from "@/lib/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ImageIcon, Loader2, Send, X, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ResellerChatPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Redirect kalau belum login
  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user, router]);

  // Subscribe pesan realtime + tandai sudah dibaca
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "chats", user.uid, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage)));
      markThreadRead(user.uid, "user").catch(() => {});
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handlePickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (!user || sending) return;
    if (!text.trim() && !imageFile) return;
    setSending(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) imageUrl = await uploadChatImage(user.uid, imageFile);
      await sendChatMessage({
        userId: user.uid,
        senderId: user.uid,
        senderRole: "user",
        text,
        imageUrl,
        userInfo: {
          name: user.displayName || undefined,
          email: user.email || undefined,
          photoURL: user.photoURL || undefined,
        },
      });
      setText("");
      clearImage();
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ variant: "destructive", title: "Gagal mengirim pesan" });
    } finally {
      setSending(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col md:h-[calc(100dvh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <p className="font-semibold leading-tight">Chat dengan Admin</p>
          <p className="text-xs text-muted-foreground">Gogama Store</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12" />
            <p className="mt-3 font-medium">Belum ada pesan</p>
            <p className="text-sm">Kirim pesan untuk mulai mengobrol dengan admin.</p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.senderRole === "user";
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                    mine
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-card"
                  )}
                >
                  {m.imageUrl && (
                    <a href={m.imageUrl} target="_blank" rel="noopener noreferrer">
                      <Image
                        src={m.imageUrl}
                        alt="Lampiran"
                        width={220}
                        height={220}
                        className="mb-1 max-h-60 w-auto rounded-lg object-cover"
                      />
                    </a>
                  )}
                  {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-card p-3">
        {imagePreview && (
          <div className="relative mb-2 inline-block">
            <Image
              src={imagePreview}
              alt="Preview"
              width={80}
              height={80}
              className="h-20 w-20 rounded-md border object-cover"
            />
            <button
              onClick={clearImage}
              className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePickImage}
          />
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
          >
            <ImageIcon className="h-5 w-5" />
          </Button>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ketik pesan..."
            className="flex-1"
            disabled={sending}
          />
          <Button
            size="icon"
            className="shrink-0"
            onClick={handleSend}
            disabled={sending || (!text.trim() && !imageFile)}
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
