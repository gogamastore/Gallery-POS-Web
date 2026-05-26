
import Link from "next/link";
import { Facebook, Twitter, Instagram } from "lucide-react";
import Image from "next/image";

export default function Footer() {
  const logoUrl = "https://firebasestorage.googleapis.com/v0/b/orderflow-r7jsk.firebasestorage.app/o/ic_gogama_logo.png?alt=media&token=c7caf8ae-553a-4cf8-a4ae-bce1446b599c";

  return (
    <footer className="w-full border-t bg-card">
      <div className="container mx-auto max-w-screen-2xl px-4 py-10 md:px-6">
        <div className="flex flex-col items-center text-center md:items-start md:text-left space-y-4">
          <Link href="/" className="flex items-center space-x-2">
            <Image src={logoUrl} alt="Gogama Logo" width={32} height={32} className="h-8 w-8" />
            <span className="text-xl font-bold font-headline">Gogama Store</span>
          </Link>
          <p className="text-sm text-muted-foreground max-w-md">
            Toko Grosir terpercaya dengan berbagai pilihan produk berkualitas.
          </p>
          <div className="flex space-x-4">
            <Link href="#" aria-label="Facebook">
              <Facebook className="h-5 w-5 text-muted-foreground hover:text-primary" />
            </Link>
            <Link href="#" aria-label="Twitter">
              <Twitter className="h-5 w-5 text-muted-foreground hover:text-primary" />
            </Link>
            <Link href="#" aria-label="Instagram">
              <Instagram className="h-5 w-5 text-muted-foreground hover:text-primary" />
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t">
        <div className="container mx-auto flex max-w-screen-2xl items-center justify-center px-4 py-4 md:px-6">
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Gogama Store. Semua hak dilindungi.</p>
        </div>
      </div>
    </footer>
  );
}
