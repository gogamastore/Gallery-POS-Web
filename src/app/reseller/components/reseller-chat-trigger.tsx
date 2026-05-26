"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MessageSquare, X, Send, Loader2, AlertCircle } from 'lucide-react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface AdminContact {
  id: string;
  name: string;
  whatsapp: string;
}

function ContactList() {
    const [contacts, setContacts] = useState<AdminContact[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContacts = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, "whatsapp_contacts"), orderBy("createdAt", "asc"));
                const querySnapshot = await getDocs(q);
                const fetchedContacts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminContact));
                setContacts(fetchedContacts);
            } catch (error) {
                console.error("Error fetching contacts:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchContacts();
    }, []);

    const handleContactClick = (whatsappNumber: string) => {
        const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
        const message = "Halo Admin, saya ingin bertanya...";
        const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (contacts.length === 0) {
        return (
            <div className="text-center text-muted-foreground p-8">
                <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                <p className="text-sm">Tidak ada kontak admin yang tersedia saat ini.</p>
            </div>
        )
    }

    return (
        <div className="space-y-3 p-4">
            {contacts.map(contact => (
                <button
                    key={contact.id}
                    onClick={() => handleContactClick(contact.whatsapp)}
                    className="w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors hover:bg-muted"
                >
                    <Avatar className="h-10 w-10">
                        <AvatarFallback>{contact.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <p className="font-semibold">{contact.name}</p>
                        <p className="text-xs text-muted-foreground">Klik untuk memulai chat</p>
                    </div>
                    <Send className="h-4 w-4 text-primary"/>
                </button>
            ))}
        </div>
    )
}


export default function ResellerChatTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  useEffect(() => {
    const savedPos = localStorage.getItem('chat-trigger-pos');
    if (savedPos) {
      setPosition(JSON.parse(savedPos));
    } else {
        const defaultX = window.innerWidth - 64 - 24; 
        const defaultY = window.innerHeight - 64 - 80;
        setPosition({ x: defaultX, y: defaultY });
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (triggerRef.current) {
      setIsDragging(true);
      hasMoved.current = false;
      const rect = triggerRef.current.getBoundingClientRect();
      offsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (triggerRef.current) {
        setIsDragging(true);
        hasMoved.current = false;
        const touch = e.touches[0];
        const rect = triggerRef.current.getBoundingClientRect();
        offsetRef.current = {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
        };
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && triggerRef.current) {
        hasMoved.current = true;
        e.preventDefault();
        const newX = e.clientX - offsetRef.current.x;
        const newY = e.clientY - offsetRef.current.y;
        setPosition({ x: newX, y: newY });
    }
  }, [isDragging]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isDragging && triggerRef.current) {
        hasMoved.current = true;
        e.preventDefault();
        const touch = e.touches[0];
        const newX = touch.clientX - offsetRef.current.x;
        const newY = touch.clientY - offsetRef.current.y;
        setPosition({ x: newX, y: newY });
    }
  }, [isDragging]);
  
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
        setIsDragging(false);
        localStorage.setItem('chat-trigger-pos', JSON.stringify(position));
    }
  }, [isDragging, position]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  const toggleOpen = () => {
      // Only toggle if we haven't dragged
      if (!hasMoved.current) {
          setIsOpen(prev => !prev);
      }
  }


  return (
    <div
      ref={triggerRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: 50,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {isOpen && (
        <Card className="w-80 h-[500px] shadow-2xl rounded-xl mb-2 flex flex-col overflow-hidden animate-in fade-in-50 slide-in-from-bottom-5">
          <CardHeader className="flex flex-row items-center justify-between bg-card p-4 border-b">
            <CardTitle className="text-lg font-bold">Hubungi Admin</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-y-auto">
            <ContactList />
          </CardContent>
        </Card>
      )}
      <Button
        onClick={toggleOpen}
        className="h-16 w-16 rounded-full shadow-lg flex items-center justify-center"
        aria-label="Hubungi Admin"
        style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
      >
        {isOpen ? <X className="h-8 w-8" /> : <MessageSquare className="h-8 w-8" />}
      </Button>
    </div>
  );
}
