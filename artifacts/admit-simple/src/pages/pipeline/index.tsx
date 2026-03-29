import { useGetPipelineInquiries } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useState, useEffect } from "react";
import { Loader2, Brain, Clock, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStatusColor, cn } from "@/lib/utils";
import { useInquiriesMutations } from "@/hooks/use-inquiries";
import { PipelineColumn, PipelineCard } from "@workspace/api-client-react";

export default function Pipeline() {
  const { data, isLoading } = useGetPipelineInquiries();
  const { updateInquiry } = useInquiriesMutations();
  
  const [columns, setColumns] = useState<PipelineColumn[]>([]);

  useEffect(() => {
    if (data) setColumns(data);
  }, [data]);

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;

    // Optimistic UI update
    const sourceColIndex = columns.findIndex(c => c.stage.id.toString() === source.droppableId);
    const destColIndex = columns.findIndex(c => c.stage.id.toString() === destination.droppableId);
    
    const sourceCol = columns[sourceColIndex];
    const destCol = columns[destColIndex];
    
    const sourceItems = [...sourceCol.inquiries];
    const destItems = [...destCol.inquiries];
    
    const [movedItem] = sourceItems.splice(source.index, 1);
    // Update local status label for UI consistency immediately
    movedItem.status = destCol.stage.name; 
    destItems.splice(destination.index, 0, movedItem);

    const newCols = [...columns];
    newCols[sourceColIndex] = { ...sourceCol, inquiries: sourceItems };
    newCols[destColIndex] = { ...destCol, inquiries: destItems };
    
    setColumns(newCols);

    // Persist to API
    await updateInquiry.mutateAsync({ 
      id: parseInt(draggableId), 
      data: { status: destCol.stage.name } 
    });
  };

  if (isLoading) return <Layout><div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></Layout>;

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admissions Pipeline</h1>
          <p className="text-slate-500 mt-1">Drag and drop inquiries to update their status.</p>
        </div>
        <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl shadow-lg border-0 h-11 px-5 font-semibold">
          <Brain className="w-4 h-4 mr-2" /> AI Optimize
        </Button>
      </div>

      <div className="flex overflow-x-auto pb-8 pt-2 kanban-scroll gap-6 h-[calc(100vh-180px)] min-h-[600px]">
        <DragDropContext onDragEnd={onDragEnd}>
          {columns.map((col) => (
            <div key={col.stage.id} className="min-w-[320px] w-[320px] flex flex-col bg-slate-50 rounded-2xl border border-slate-200 kanban-col shadow-sm">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-100/50 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.stage.color || '#94A3B8' }} />
                  <h3 className="font-semibold text-slate-800">{col.stage.name}</h3>
                  <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                    {col.inquiries.length}
                  </span>
                </div>
                <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="w-5 h-5" /></button>
              </div>

              <Droppable droppableId={col.stage.id.toString()}>
                {(provided, snapshot) => (
                  <div 
                    ref={provided.innerRef} 
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 p-3 space-y-3 overflow-y-auto transition-colors",
                      snapshot.isDraggingOver ? "bg-slate-100/80" : ""
                    )}
                  >
                    {col.inquiries.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative",
                              snapshot.isDragging && "shadow-xl rotate-2 scale-105 z-50 border-primary/50 ring-1 ring-primary/20",
                              item.priority === 'High' && "border-l-4 border-l-rose-500"
                            )}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold text-slate-900 text-sm">{item.firstName} {item.lastName}</h4>
                              {item.priority === 'High' && <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">Urgent</span>}
                            </div>
                            
                            <div className="flex items-center justify-between mt-4">
                              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                                <Clock className="w-3.5 h-3.5" />
                                {item.daysInStage} days
                              </div>
                              {item.assignedToName && (
                                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold" title={item.assignedToName}>
                                  {item.assignedToName.charAt(0)}
                                </div>
                              )}
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
    </Layout>
  );
}
