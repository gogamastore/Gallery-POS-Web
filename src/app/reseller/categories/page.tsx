
"use client"

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This page is deprecated and now redirects to the main reseller page.
// The "Categories" functionality has been replaced by the "Trending" page.
export default function CategoriesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/reseller');
  }, [router]);

  return null; // Render nothing while redirecting
}
