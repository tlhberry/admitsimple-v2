import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  try {
    return format(parseISO(dateString), "MMM d, yyyy");
  } catch (e) {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  try {
    return format(parseISO(dateString), "MMM d, yyyy h:mm a");
  } catch (e) {
    return dateString;
  }
}

export const statusColors: Record<string, string> = {
  New: "bg-[hsl(var(--status-new-bg))] text-[hsl(var(--status-new-text))]",
  Contacted: "bg-[hsl(var(--status-contacted-bg))] text-[hsl(var(--status-contacted-text))]",
  Qualified: "bg-[hsl(var(--status-qualified-bg))] text-[hsl(var(--status-qualified-text))]",
  Admitted: "bg-[hsl(var(--status-admitted-bg))] text-[hsl(var(--status-admitted-text))]",
  Declined: "bg-[hsl(var(--status-declined-bg))] text-[hsl(var(--status-declined-text))]",
  Lost: "bg-[hsl(var(--status-lost-bg))] text-[hsl(var(--status-lost-text))]",
};

export function getStatusColor(status: string) {
  return statusColors[status] || "bg-slate-100 text-slate-700";
}

export function getDayLabel(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return "Unknown Date";
  try {
    const d = new Date(typeof dateValue === "string" ? dateValue : dateValue.toISOString());
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return format(d, "EEE, MMM d, yyyy");
  } catch {
    return "Unknown Date";
  }
}

export function groupByDay<T extends { createdAt: any }>(items: T[]): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = [];
  for (const item of items) {
    const label = getDayLabel(item.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }
  return groups;
}
