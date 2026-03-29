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
