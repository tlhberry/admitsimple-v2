import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReferralOption {
  name: string;
  type: "source" | "account" | "past";
  contact?: string;
  phone?: string;
}

function useReferralSuggestions() {
  return useQuery<ReferralOption[]>({
    queryKey: ["/api/referral-suggestions"],
    queryFn: async () => {
      const r = await fetch("/api/referral-suggestions", { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 60000,
  });
}

interface ReferralSourceInputProps {
  value: string;
  onChange: (name: string, option?: ReferralOption) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export function ReferralSourceInput({
  value,
  onChange,
  placeholder = "Type to search referral sources…",
  className,
  inputClassName,
}: ReferralSourceInputProps) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: options = [] } = useReferralSuggestions();

  useEffect(() => { setQuery(value || ""); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query.trim()
    ? options.filter(o => o.name.toLowerCase().includes(query.toLowerCase()))
    : options;

  const select = (opt: ReferralOption) => {
    setQuery(opt.name);
    onChange(opt.name, opt);
    setOpen(false);
  };

  const typeIcon = (t: ReferralOption["type"]) => {
    if (t === "account") return <Building2 className="w-3 h-3 text-violet-400 shrink-0" />;
    if (t === "source") return <span className="w-3 h-3 rounded-full bg-primary/60 shrink-0 inline-block" />;
    return <span className="w-3 h-3 rounded-full bg-muted-foreground/40 shrink-0 inline-block" />;
  };

  const typeLabel = (t: ReferralOption["type"]) =>
    t === "account" ? "BD Account" : t === "source" ? "Referral Source" : "Past";

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={cn("pl-9", inputClassName)}
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
          {filtered.map((opt, i) => (
            <button
              key={`${opt.name}-${i}`}
              type="button"
              onMouseDown={() => select(opt)}
              className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                {typeIcon(opt.type)}
                <span className="truncate">{opt.name}</span>
                {opt.contact && <span className="text-xs text-muted-foreground truncate hidden sm:inline">· {opt.contact}</span>}
              </div>
              <span className="text-[10px] text-muted-foreground font-medium shrink-0 opacity-60">{typeLabel(opt.type)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ReferralContactInputProps {
  value: string;
  onChange: (v: string) => void;
  referralSourceName?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export function ReferralContactInput({
  value,
  onChange,
  referralSourceName,
  placeholder = "Contact name…",
  className,
  inputClassName,
}: ReferralContactInputProps) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: contacts = [] } = useQuery<{ name: string; phone?: string }[]>({
    queryKey: ["/api/referral-contact-suggestions", referralSourceName],
    queryFn: async () => {
      if (!referralSourceName?.trim()) return [];
      const r = await fetch(`/api/referral-contact-suggestions?source=${encodeURIComponent(referralSourceName)}`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 60000,
    enabled: true,
  });

  useEffect(() => { setQuery(value || ""); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query.trim()
    ? contacts.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : contacts;

  const select = (c: { name: string; phone?: string }) => {
    setQuery(c.name);
    onChange(c.name);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => { if (contacts.length > 0) setOpen(true); }}
        placeholder={placeholder}
        className={inputClassName}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          {filtered.map((c, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => select(c)}
              className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors flex items-center justify-between"
            >
              <span>{c.name}</span>
              {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
