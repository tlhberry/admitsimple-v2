import { useGetPipelineInquiries } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Loader2, Clock, MoreHorizontal, ExternalLink, Plus, CalendarCheck,
  Phone, MessageSquare, ChevronRight, UserCheck, ClipboardCheck,
  XCircle, Eye, ArrowRight, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CreateInquiryForm } from "@/components/CreateInquiryForm";
import { cn } from "@/lib/utils";
import { useInquiriesMutations } from "@/hooks/use-inquiries";
import { PipelineColumn } from "@workspace/api-client-react";
import { useLocation } from "wouter";

// ── Stage → contextual action mapping ─────────────────────────────────────────
const STAGE_CONTEXT: Record<string, {
  label: string;
  buttonText: string;
  buttonIcon: React.ReactNode;
  buttonAction: "call" | "navigate" | "sms";
  buttonStyle: string;
}> = {
  "New Inquiry": {
    label: "New Lead",
    buttonText: "Call Now",
    buttonIcon: <Phone className="w-3.5 h-3.5" />,
    buttonAction: "call",
    buttonStyle: "bg-emerald-500 hover:bg-emerald-600 text-white",
  },
  "Initial Contact": {
    label: "Needs Follow-Up",
    buttonText: "Call Back",
    buttonIcon: <Phone className="w-3.5 h-3.5" />,
    buttonAction: "call",
    buttonStyle: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  "Insurance Verification": {
    label: "Needs Insurance Verification",
    buttonText: "Verify Insurance",
    buttonIcon: <ClipboardCheck className="w-3.5 h-3.5" />,
    buttonAction: "navigate",
    buttonStyle: "bg-violet-500 hover:bg-violet-600 text-white",
  },
  "Pre-Assessment": {
    label: "Admission Scheduled",
    buttonText: "Confirm Arrival",
    buttonIcon: <CalendarCheck className="w-3.5 h-3.5" />,
    buttonAction: "navigate",
    buttonStyle: "bg-primary hover:bg-primary/90 text-primary-foreground",
  },
  "Scheduled to Admit": {
    label: "Ready to Admit",
    buttonText: "Admit Client",
    buttonIcon: <UserCheck className="w-3.5 h-3.5" />,
    buttonAction: "navigate",
    buttonStyle: "bg-primary hover:bg-primary/90 text-primary-foreground",
  },
  "Admitted": {
    label: "Admitted",
    buttonText: "View Details",
    buttonIcon: <Eye className="w-3.5 h-3.5" />,
    buttonAction: "navigate",
    buttonStyle: "bg-muted hover:bg-muted/80 text-foreground border border-border",
  },
  "Discharged": {
    label: "Discharged",
    buttonText: "View Details",
    buttonIcon: <Eye className="w-3.5 h-3.5" />,
    buttonAction: "navigate",
    buttonStyle: "bg-muted hover:bg-muted/80 text-foreground border border-border",
  },
  "Did Not Admit": {
    label: "Lost Lead",
    buttonText: "Refer Out",
    buttonIcon: <XCircle className="w-3.5 h-3.5" />,
    buttonAction: "navigate",
    buttonStyle: "bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30",
  },
};

const getStageContext = (stageName: string) =>
  STAGE_CONTEXT[stageName] ?? {
    label: stageName,
    buttonText: "View Details",
    buttonIcon: <Eye className="w-3.5 h-3.5" />,
    buttonAction: "navigate" as const,
    buttonStyle: "bg-muted hover:bg-muted/80 text-foreground border border-border",
  };

// ── Swipeable mobile card ─────────────────────────────────────────────────────
interface MobileCardProps {
  item: any;
  stageName: string;
  stageColor: string;
  stages: PipelineColumn[];
  onNavigate: (id: number) => void;
  onMoveStage: (id: number, stageName: string) => void;
}

function MobileCard({ item, stageName, stageColor, stages, onNavigate, onMoveStage }: MobileCardProps) {
  const ctx = getStageContext(stageName);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeAction, setSwipeAction] = useState<"call" | "text" | null>(null);
  const touchStartX = useRef<number | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showMoveStage, setShowMoveStage] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setSwipeOffset(0);
    setSwipeAction(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    const clamped = Math.max(-120, Math.min(120, diff));
    setSwipeOffset(clamped);
    if (clamped > 50) setSwipeAction("call");
    else if (clamped < -50) setSwipeAction("text");
    else setSwipeAction(null);
  };

  const handleTouchEnd = () => {
    if (swipeAction === "call" && item.phone) {
      window.location.href = `tel:${item.phone}`;
    } else if (swipeAction === "text" && item.phone) {
      window.location.href = `sms:${item.phone}`;
    }
    setSwipeOffset(0);
    setSwipeAction(null);
    touchStartX.current = null;
  };

  const handlePrimaryAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ctx.buttonAction === "call" && item.phone) {
      window.location.href = `tel:${item.phone}`;
    } else {
      onNavigate(item.id);
    }
  };

  const timeAgo = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Swipe hint backgrounds */}
      <div className={cn(
        "absolute inset-0 flex items-center px-5 transition-opacity duration-150",
        swipeAction === "call" ? "opacity-100" : "opacity-0"
      )}>
        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
          <Phone className="w-4 h-4" /> Call
        </div>
      </div>
      <div className={cn(
        "absolute inset-0 flex items-center justify-end px-5 transition-opacity duration-150",
        swipeAction === "text" ? "opacity-100" : "opacity-0"
      )}>
        <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
          Text <MessageSquare className="w-4 h-4" />
        </div>
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => onNavigate(item.id)}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        className={cn(
          "bg-card border border-border rounded-2xl p-4 transition-transform duration-100 active:scale-[0.99] relative",
          item.priority === "High" && "border-l-4 border-l-rose-500"
        )}
      >
        {/* Top row: name + menu */}
        <div className="flex items-start justify-between mb-2.5">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground text-sm leading-tight">
              {item.firstName} {item.lastName}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">{ctx.label}</p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {item.priority === "High" && (
              <span className="bg-rose-500/20 text-rose-400 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">Urgent</span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stage badge + time */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: stageColor }} />
            <span className="text-[11px] font-medium text-muted-foreground">{stageName}</span>
          </div>
          <span className="text-muted-foreground/40">·</span>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            {timeAgo(item.updatedAt || item.createdAt)}
          </div>
          {item.assignedToName && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold">
                {item.assignedToName.charAt(0)}
              </div>
            </>
          )}
        </div>

        {/* Appointment pill */}
        {item.appointmentDate && (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-lg mb-3 w-fit">
            <CalendarCheck className="w-3 h-3 flex-shrink-0" />
            {new Date(item.appointmentDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {" · "}
            {new Date(item.appointmentDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </div>
        )}

        {/* Primary action button */}
        <button
          onClick={handlePrimaryAction}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95",
            ctx.buttonStyle
          )}
        >
          {ctx.buttonIcon}
          {ctx.buttonText}
        </button>

        {/* Swipe hint text */}
        {item.phone && (
          <div className="flex items-center justify-between mt-2.5 px-1">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
              <ArrowRight className="w-2.5 h-2.5" /> Call
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
              Text <ArrowLeft className="w-2.5 h-2.5" />
            </div>
          </div>
        )}
      </div>

      {/* "..." dropdown menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-3 top-10 z-50 bg-card border border-border rounded-xl shadow-xl py-1 w-44 overflow-hidden">
            {item.phone && (
              <>
                <a
                  href={`tel:${item.phone}`}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  onClick={() => setShowMenu(false)}
                >
                  <Phone className="w-4 h-4 text-emerald-400" /> Call
                </a>
                <a
                  href={`sms:${item.phone}`}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  onClick={() => setShowMenu(false)}
                >
                  <MessageSquare className="w-4 h-4 text-sky-400" /> Text
                </a>
              </>
            )}
            <button
              onClick={() => { setShowMenu(false); onNavigate(item.id); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Eye className="w-4 h-4 text-muted-foreground" /> View Details
            </button>
            <div className="border-t border-border my-1" />
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowMoveStage(true); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" /> Move Stage
            </button>
          </div>
        </>
      )}

      {/* Move Stage sheet */}
      <Sheet open={showMoveStage} onOpenChange={setShowMoveStage}>
        <SheetContent side="bottom" className="rounded-t-2xl bg-card border-t border-border pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-foreground text-left">Move {item.firstName} {item.lastName}</SheetTitle>
          </SheetHeader>
          <div className="space-y-1">
            {stages.map(col => (
              <button
                key={col.stage.id}
                onClick={() => { onMoveStage(item.id, col.stage.name); setShowMoveStage(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors",
                  col.stage.name === stageName
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: col.stage.color || "#5BC8DC" }} />
                {col.stage.name}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Main Pipeline component ────────────────────────────────────────────────────
export default function Pipeline() {
  const { data, isLoading, refetch } = useGetPipelineInquiries();
  const { updateInquiry } = useInquiriesMutations();
  const [, navigate] = useLocation();
  const justDragged = useRef(false);
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (data) setColumns(data);
  }, [data]);

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;

    const sourceColIndex = columns.findIndex(c => c.stage.id.toString() === source.droppableId);
    const destColIndex   = columns.findIndex(c => c.stage.id.toString() === destination.droppableId);
    const sourceCol = columns[sourceColIndex];
    const destCol   = columns[destColIndex];
    const sourceItems = [...sourceCol.inquiries];
    const destItems   = [...destCol.inquiries];
    const [movedItem] = sourceItems.splice(source.index, 1);
    movedItem.status = destCol.stage.name;
    destItems.splice(destination.index, 0, movedItem);

    const newCols = [...columns];
    newCols[sourceColIndex] = { ...sourceCol, inquiries: sourceItems };
    newCols[destColIndex]   = { ...destCol,   inquiries: destItems };
    setColumns(newCols);

    justDragged.current = true;
    setTimeout(() => { justDragged.current = false; }, 200);

    await updateInquiry.mutateAsync({ id: parseInt(draggableId), data: { status: destCol.stage.name } });
  };

  const handleCardClick = (id: number) => {
    if (justDragged.current) return;
    navigate(`/inquiries/${id}?from=pipeline`);
  };

  const handleMoveStage = useCallback(async (inquiryId: number, newStageName: string) => {
    await updateInquiry.mutateAsync({ id: inquiryId, data: { status: newStageName } });
    refetch();
  }, [updateInquiry, refetch]);

  if (isLoading) return <Layout><div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></Layout>;

  // Flatten all inquiries for mobile list, preserving stage info
  const allMobileItems = columns.flatMap(col =>
    col.inquiries.map(inq => ({ ...inq, stageName: col.stage.name, stageColor: col.stage.color || "#5BC8DC" }))
  );

  return (
    <Layout>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground mt-0.5 text-sm hidden md:block">Drag and drop inquiries to update their status.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="h-9 px-4 rounded-xl gap-1.5 font-semibold text-sm">
          <Plus className="w-4 h-4" /> New
        </Button>
      </div>

      {/* ── MOBILE: contextual action list ─────────────────────────────────── */}
      <div className="md:hidden space-y-3 pb-24">
        {allMobileItems.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-base font-medium">No active inquiries</p>
            <p className="text-sm mt-1">Tap New to add your first lead</p>
          </div>
        ) : (
          <>
            {/* Group by stage */}
            {columns.map(col => {
              const items = allMobileItems.filter(i => i.stageName === col.stage.name);
              if (items.length === 0) return null;
              return (
                <div key={col.stage.id}>
                  <div className="flex items-center gap-2 px-1 mb-2 mt-4 first:mt-0">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.stage.color || "#5BC8DC" }} />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{col.stage.name}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full font-bold">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map(item => (
                      <MobileCard
                        key={item.id}
                        item={item}
                        stageName={item.stageName}
                        stageColor={item.stageColor}
                        stages={columns}
                        onNavigate={(id) => navigate(`/inquiries/${id}?from=pipeline`)}
                        onMoveStage={handleMoveStage}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* ── DESKTOP: Kanban board ───────────────────────────────────────────── */}
      <div className="hidden md:flex md:overflow-x-auto pb-6 pt-2 gap-4 md:h-[calc(100vh-230px)] md:min-h-[500px]">
        <DragDropContext onDragEnd={onDragEnd}>
          {columns.map((col) => (
            <div key={col.stage.id} className="min-w-[280px] w-[280px] flex flex-col bg-muted/40 rounded-2xl border border-border">
              <div className="p-4 border-b border-border flex justify-between items-center bg-muted/60 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.stage.color || "#5BC8DC" }} />
                  <h3 className="font-semibold text-foreground text-sm">{col.stage.name}</h3>
                  <span className="bg-muted text-muted-foreground text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                    {col.inquiries.length}
                  </span>
                </div>
              </div>

              <Droppable droppableId={col.stage.id.toString()}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 p-3 space-y-3 overflow-y-auto transition-colors min-h-[80px]",
                      snapshot.isDraggingOver ? "bg-primary/5" : ""
                    )}
                  >
                    {col.inquiries.map((item, index) => {
                      const ctx = getStageContext(col.stage.name);
                      return (
                        <Draggable key={item.id} draggableId={item.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => handleCardClick(item.id)}
                              className={cn(
                                "bg-card p-3.5 rounded-xl border border-border hover:border-primary/40 transition-all cursor-pointer group relative",
                                snapshot.isDragging && "shadow-xl rotate-1 scale-105 z-50 border-primary/50 ring-1 ring-primary/20",
                                item.priority === "High" && "border-l-4 border-l-rose-500"
                              )}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors leading-tight">
                                  {item.firstName} {item.lastName}
                                </h4>
                                <div className="flex items-center gap-1.5">
                                  {item.priority === "High" && (
                                    <span className="bg-rose-500/20 text-rose-300 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">!</span>
                                  )}
                                  <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                                </div>
                              </div>
                              <p className="text-[11px] text-muted-foreground mb-2">{ctx.label}</p>
                              {(item as any).appointmentDate && (
                                <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary/10 px-2 py-1 rounded-md mb-2">
                                  <CalendarCheck className="w-3 h-3 flex-shrink-0" />
                                  {new Date((item as any).appointmentDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {item.daysInStage}d
                                </div>
                                {item.assignedToName && (
                                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold border border-primary/20">
                                    {item.assignedToName.charAt(0)}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </DragDropContext>
      </div>

      {/* Create Inquiry Sheet */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0 bg-card border-l border-border">
          <SheetHeader className="p-6 bg-muted border-b border-border sticky top-0 z-10">
            <SheetTitle className="text-xl text-foreground">Create New Inquiry</SheetTitle>
            <SheetDescription className="text-muted-foreground">Enter details manually or use AI to parse a document.</SheetDescription>
          </SheetHeader>
          <CreateInquiryForm onSuccess={() => { setShowCreate(false); refetch(); }} />
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
