
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  type ChatMessage,
  type ChatThread,
  sendChatMessage,
  markThreadRead,
  uploadChatImage,
  ensureThreadProfile,
} from "@/lib/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, ImageIcon, Loader2, Send, X, MessageSquare, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { id as dateFnsLocaleId } from "date-fns/locale";

export default function AdminChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const preselectedRef = useRef(false);

  // Inbox: semua percakapan
  useEffect(() => {
    const q = query(collection(db, "chats"), orderBy("lastMessageAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setThreads(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatThread)));
    });
    return () => unsub();
  }, []);

  // Buka langsung thread pembeli dari tombol "Hubungi" (?userId=<uid>).
  useEffect(() => {
    if (preselectedRef.current) return;
    const uid = searchParams.get("userId");
    if (uid) {
      setSelectedId(uid);
      preselectedRef.current = true;
    }
  }, [searchParams]);

  // Pesan pada thread terpilih
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, "chats", selectedId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage)));
      markThreadRead(selectedId, "admin").catch(() => {});
    });
    return () => unsub();
  }, [selectedId]);

  // Kartu nama obrolan = nama profil pembeli (user/{uid}.name), bukan userId.
  useEffect(() => {
    if (selectedId) ensureThreadProfile(selectedId).catch(() => {});
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedThread = threads.find((t) => t.id === selectedId);

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
    if (!user || !selectedId || sending) return;
    if (!text.trim() && !imageFile) return;
    setSending(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) imageUrl = await uploadChatImage(selectedId, imageFile);
      await sendChatMessage({
        userId: selectedId,
        senderId: user.uid,
        senderRole: "admin",
        text,
        imageUrl,
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

  const threadTitle = (t: ChatThread) => t.userName || t.userEmail || t.userId.slice(0, 8);

  return (
    <div className="flex h-[calc(100dvh-8rem)] gap-4">
      {/* Inbox */}
      <div
        className={cn(
          "flex w-full flex-col rounded-lg border bg-card md:w-80 md:shrink-0",
          selectedId && "hidden md:flex"
        )}
      >
        <div className="flex items-center gap-2 border-b p-4">
          <Inbox className="h-5 w-5" />
          <h2 className="font-semibold">Kotak Masuk</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Belum ada percakapan masuk.
            </p>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={cn(
                  "flex w-full items-center gap-3 border-b p-3 text-left transition-colors hover:bg-muted",
                  selectedId === t.id && "bg-muted"
                )}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={t.userPhotoURL || ""} />
                  <AvatarFallback>
                    {(threadTitle(t)[0] || "?").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{threadTitle(t)}</p>
                    {t.lastMessageAt?.toDate && (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatDistanceToNow(t.lastMessageAt.toDate(), {
                          addSuffix: false,
                          locale: dateFnsLocaleId,
                        })}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {t.lastSenderRole === "admin" ? "Anda: " : ""}
                    {t.lastMessage || "—"}
                  </p>
                </div>
                {(t.unreadForAdmin || 0) > 0 && (
                  <Badge className="h-5 min-w-5 shrink-0 justify-center p-0 px-1">
                    {t.unreadForAdmin}
                  </Badge>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Thread */}
      <div
        className={cn(
          "flex flex-1 flex-col rounded-lg border bg-card",
          !selectedId && "hidden md:flex"
        )}
      >
        {!selectedId ? (
          <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="h-12 w-12" />
            <p className="mt-3">Pilih percakapan untuk membalas.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b p-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSelectedId(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-9 w-9">
                <AvatarImage src={selectedThread?.userPhotoURL || ""} />
                <AvatarFallback>
                  {(selectedThread ? threadTitle(selectedThread)[0] : "?").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold leading-tight">
                  {selectedThread ? threadTitle(selectedThread) : ""}
                </p>
                {selectedThread?.userEmail && (
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedThread.userEmail}
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">
              {messages.map((m) => {
                const mine = m.senderRole === "admin";
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
              })}
              <div ref={bottomRef} />
            </div>

            <div className="border-t p-3">
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
                  placeholder="Ketik balasan..."
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
          </>
        )}
      </div>
    </div>
  );
}
