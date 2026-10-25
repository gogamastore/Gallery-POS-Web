import {
    MessageCircle,
    Instagram,
    Music2,
    Facebook,
    Youtube,
    Globe,
    ShoppingBag,
    MapPin,
    Mail,
    Phone,
    type LucideProps,
  } from "lucide-react";
  import type { ContactType } from "@/lib/contact-profile";
  
  const ICONS: Record<ContactType, React.ComponentType<LucideProps>> = {
    whatsapp: MessageCircle,
    instagram: Instagram,
    tiktok: Music2,
    facebook: Facebook,
    youtube: Youtube,
    website: Globe,
    shopee: ShoppingBag,
    maps: MapPin,
    email: Mail,
    phone: Phone,
  };
  
  export function ContactIcon({ type, ...props }: { type: ContactType } & LucideProps) {
    const Icon = ICONS[type] ?? Globe;
    return <Icon {...props} />;
  }
  