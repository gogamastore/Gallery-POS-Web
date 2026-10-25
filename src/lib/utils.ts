import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Ringkas jumlah terjual: 999 → "999", 1.200 → "1,2rb", 12.000 → "12rb". */
export function formatSold(n: number): string {
  const v = Math.max(0, Math.floor(n || 0));
  if (v < 1000) return `${v}`;
  const rb = v / 1000;
  const s = rb >= 100 ? Math.round(rb).toString() : rb.toFixed(1).replace(".", ",").replace(/,0$/, "");
  return `${s}rb`;
}
