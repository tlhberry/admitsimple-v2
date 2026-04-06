import { useGetPipelineInquiries } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useState, useEffect, useRef } from "react";
import { Loader2, Clock, MoreHorizontal, ExternalLink, Plus, CalendarCheck, Phone, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CreateInquiryForm } from "@/components/CreateInquiryForm";
import { cn } from "@/lib/utils";
import { useInquiriesMutations } from "@/hooks/use-inquiries";
import { PipelineColumn } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

async function logContact(inquiryId: number, type: "phone_call" | "sms") {
  await fetch("/api/activities", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inquiryId,
      type,
      subject: type === "phone_call" ? "Called from pipeline" : "Texted from pipeline",
      completedAt: new Date().toISOString(),
    }),
  });
}

export default function Pipeline() {
  const { data, isLoading, isError, refetch } = useGetPipelineInquiries();
  const { updateInquiry } = useInquiriesMutations();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const justDragged = useRef(false);
  // localColumns tracks drag-and-drop optimistic updates; null means "not overridden yet"
  const [localColumns, setLocalColumns] = useState<PipelineColumn[] | null>(null);
  // Sync localColumns when fresh server data arrives (resets any stale local state)
  const [showCreate, setShowCreate] = useState(false);

  const handleContact = async (e: React.MouseEvent, item: any, type: "phone_call" | "sms") => {
    e.stopPropagation();
    const phone = (item as any).phone;
    if (!phone) {
      toast({ title: "No phone number on file", variant: "destructive" });
      return;
    }
    if (type === "phone_call") {
      window.location.href = `tel:${phone}`;
    } else {
      navigate(`/active-calls?sms=${encodeURIComponent(phone)}`);
    }
    try {
      await logContact(item.id, type);
    } catch {
      // log silently — don't block the user
    }
    toast({
      title: type === "phone_call" ? `Calling ${item.firstName} ${item.lastName}` : `Texting ${item.firstName} ${item.lastName}`,
      description: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    });
  };

  // Sync from server data; also reset local state after a successful refetch
  useEffect(() => {
    if (data) setLocalColumns(data);
  }, [data]);

  // Derive the active column list: prefer local (drag-optimistic) state,
  // but fall back to server data directly so the board renders immediately
  // on the first successful fetch (before the effect above has a chance to run).
  const columns: PipelineColumn[] = localColumns ?? data ?? [];

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
    setLocalColumns(newCols);

    justDragged.current = true;
    setTimeout(() => { justDragged.current = false; }, 200);

    await updateInquiry.mutateAsync({ id: parseInt(draggableId), data: { status: destCol.stage.name } });
  };

  const handleCardClick = (id: number) => {
    if (justDragged.current) return;
    navigate(`/inquiries/${id}?from=pipeline`);
  };

  if (isLoading) return <Layout><div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></Layout>;

  if (isError) return (
    <Layout>
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-center">
        <div>
          <p className="font-semibold text-foreground">Could not load pipeline</p>
          <p className="text-sm text-muted-foreground mt-1">Check your connection and try again.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="rounded-xl">
          Try Again
        </Button>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-bold text-foreground tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground mt-1 text-sm hidden sm:block">Drag and drop inquiries to update their status.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="h-9 px-4 rounded-xl gap-1.5 font-semibold shadow-md flex-shrink-0">
          <Plus className="w-4 h-4" /> New Inquiry
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:overflow-x-auto pb-6 pt-2 gap-4 md:h-[calc(100vh-230px)] md:min-h-[500px]">
        <DragDropContext onDragEnd={onDragEnd}>
          {columns.map((col) => (
            <div key={col.stage.id} className="w-full md:min-w-[300px] md:w-[300px] flex flex-col bg-muted/40 rounded-2xl border border-border kanban-col">
              {/* Column header */}
              <div className="p-4 border-b border-border flex justify-between items-center bg-muted/60 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.stage.color || "#5BC8DC" }} />
                  <h3 className="font-semibold text-foreground text-sm">{col.stage.name}</h3>
                  <span className="bg-muted text-muted-foreground text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                    {col.inquiries.length}
                  </span>
                </div>
                <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="w-4 h-4" /></button>
              </div>

              <Droppable droppableId={col.stage.id.toString()}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 p-3 space-y-3 md:overflow-y-auto transition-colors min-h-[80px]",
                      snapshot.isDraggingOver ? "bg-primary/5" : ""
                    )}
                  >
                    {col.inquiries.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => handleCardClick(item.id)}
                            className={cn(
                              "bg-card p-4 rounded-xl border border-border hover:border-primary/40 transition-all cursor-pointer group relative",
                              snapshot.isDragging && "shadow-xl rotate-1 scale-105 z-50 border-primary/50 ring-1 ring-primary/20",
                              item.priority === "High" && "border-l-4 border-l-rose-500"
                            )}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                                {item.firstName} {item.lastName}
                              </h4>
                              <div className="flex items-center gap-1.5">
                                {item.priority === "High" && (
                                  <span className="bg-rose-500/20 text-rose-300 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Urgent</span>
                                )}
                                <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-colors" />
                              </div>
                            </div>
                            {(item as any).appointmentDate && (
                              <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary/10 px-2 py-1 rounded-md mb-2">
                                <CalendarCheck className="w-3 h-3 flex-shrink-0" />
                                {new Date((item as any).appointmentDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                {" · "}
                                {new Date((item as any).appointmentDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/60 px-2 py-1 rounded-md">
                                <Clock className="w-3 h-3" />
                                {item.daysInStage}d
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => handleContact(e, item, "phone_call")}
                                  title="Call"
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => handleContact(e, item, "sms")}
                                  title="Text"
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 transition-colors"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                                {item.assignedToName && (
                                  <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold border border-primary/20 ml-0.5" title={item.assignedToName}>
                                    {item.assignedToName.charAt(0)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </DragDropContext>
      </div>

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
