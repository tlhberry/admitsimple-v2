import { useState } from "react";
import { useListInquiries } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Loader2, ClipboardList, ChevronRight, Globe } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn, getStatusColor, formatDate } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { CreateInquiryForm } from "@/components/CreateInquiryForm";

export default function InquiriesList() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useListInquiries({ search: search || undefined });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [, navigate] = useLocation();

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Inquiries</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage and track prospective patient leads.</p>
        </div>
        <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
          <SheetTrigger asChild>
            <Button className="h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Inquiry
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0 bg-card border-l border-border">
            <SheetHeader className="p-6 bg-muted border-b border-border sticky top-0 z-10">
              <SheetTitle className="text-xl text-foreground">Create New Inquiry</SheetTitle>
              <SheetDescription className="text-muted-foreground">Enter details manually or use AI to parse a document.</SheetDescription>
            </SheetHeader>
            <div className="p-6">
              <CreateInquiryForm onSuccess={() => setIsFormOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && data?.length === 0 && (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <ClipboardList className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No inquiries found</h3>
          <p className="text-muted-foreground mt-1 text-sm">Try adjusting your search or create a new inquiry.</p>
          <Button className="mt-4 rounded-xl" onClick={() => setIsFormOpen(true)}>Create Inquiry</Button>
        </div>
      )}

      {/* ── MOBILE: card list (no horizontal scroll) ── */}
      {!isLoading && (data?.length ?? 0) > 0 && (
        <div className="md:hidden flex flex-col gap-2">
          {data?.map((inq) => (
            <button
              key={inq.id}
              onClick={() => navigate(`/inquiries/${inq.id}`)}
              className="w-full text-left bg-card border border-border rounded-xl px-4 py-3.5 flex items-center gap-3 hover:border-primary/40 hover:bg-card/80 transition-all active:scale-[0.99]"
            >
              {/* Avatar initial */}
              <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                {inq.firstName?.charAt(0) ?? "?"}
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-foreground text-sm truncate">
                    {inq.firstName} {inq.lastName}
                  </span>
                  {inq.priority === "High" && (
                    <span className="shrink-0 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-rose-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      Urgent
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-semibold border", getStatusColor(inq.status))}>
                    {inq.status}
                  </span>
                  {inq.levelOfCare && (
                    <span className="text-[11px] text-muted-foreground font-medium">{inq.levelOfCare}</span>
                  )}
                  <span className="text-[11px] text-muted-foreground">{inq.phone || inq.email || "—"}</span>
                </div>
              </div>

              {/* Date + chevron */}
              <div className="shrink-0 text-right">
                <div className="text-xs text-muted-foreground">{formatDate(inq.createdAt)}</div>
                <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 ml-auto" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── DESKTOP: table (hidden on mobile) ── */}
      {!isLoading && (data?.length ?? 0) > 0 && (
        <div className="hidden md:block rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-muted-foreground border-b border-border">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Patient Name</th>
                <th className="px-6 py-3.5 font-semibold">Contact</th>
                <th className="px-6 py-3.5 font-semibold">Status</th>
                <th className="px-6 py-3.5 font-semibold">Level of Care</th>
                <th className="px-6 py-3.5 font-semibold">Referral Source</th>
                <th className="px-6 py-3.5 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {data?.map((inq) => (
                <tr
                  key={inq.id}
                  className="hover:bg-muted/30 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/inquiries/${inq.id}`)}
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">{inq.firstName} {inq.lastName}</div>
                    {inq.priority === "High" && (
                      <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Urgent
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    <div className="text-foreground">{inq.phone || "—"}</div>
                    <div className="text-xs text-muted-foreground">{inq.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border", getStatusColor(inq.status))}>
                      {inq.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-foreground font-medium">{inq.levelOfCare || "—"}</td>
                  <td className="px-6 py-4">
                    {(inq as any).referralSource === "Google PPC" || (inq as any).referralSource === "Google Organic" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                        <Globe className="w-3 h-3" />
                        {(inq as any).referralSource}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{formatDate(inq.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
