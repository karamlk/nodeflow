import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet.jsx';
import { Button } from '@/components/ui/button.jsx';
import { FolderOpen, Download, Trash2, Clock, Workflow } from 'lucide-react';
import { useWorkflow } from '@/hooks/useWorkflow.js';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';

const SavedFlowsSidebar = ({ open, onOpenChange, onLoadFlow }) => {
  const [flows, setFlows] = useState([]);
  const { loadFlows, loadFlow, deleteFlow, loading } = useWorkflow();
  
  const user = pb.authStore.model;
  const folderName = user?.name || user?.email?.split('@')[0] || 'MyWorkflows';

  const fetchFlows = async () => {
    if (!open) return;
    try {
      const data = await loadFlows();
      setFlows(data);
    } catch (err) {
      toast.error('Failed to load saved flows');
    }
  };

  useEffect(() => {
    fetchFlows();
  }, [open]);

  const handleLoad = async (id) => {
    try {
      const workflow = await loadFlow(id);
      onLoadFlow(workflow);
      onOpenChange(false);
      toast.success(`Loaded workflow: ${workflow.flowName || workflow.name}`);
    } catch (err) {
      toast.error('Failed to load workflow');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this flow?')) return;
    try {
      await deleteFlow(id);
      toast.success('Flow deleted');
      fetchFlows(); // Refresh list
    } catch (err) {
      toast.error('Failed to delete workflow');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[400px] flex flex-col bg-card text-card-foreground border-r border-border p-0">
        <SheetHeader className="border-b border-border p-6 bg-muted/20">
          <SheetTitle className="flex items-center gap-3 text-2xl font-bold text-foreground">
            <FolderOpen className="w-7 h-7 text-primary flex-shrink-0" />
            <span>{folderName}'s Workspace</span>
          </SheetTitle>
          <p className="text-base text-foreground font-medium mt-2">Manage and restore your saved workflows.</p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && flows.length === 0 ? (
            <div className="text-center text-foreground py-8 font-semibold">Loading flows...</div>
          ) : flows.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/10">
              <Workflow className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-semibold text-foreground text-base">No saved flows yet</p>
              <p className="text-base text-muted-foreground mt-2">Save a workflow to see it here.</p>
            </div>
          ) : (
            flows.map((flow) => (
              <div 
                key={flow.id} 
                className="flex flex-col p-5 rounded-xl border border-border bg-background shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3 gap-4">
                  <h4 className="font-bold text-foreground text-lg leading-tight break-words">
                    {flow.flowName || flow.name}
                  </h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors h-9 w-9 font-semibold"
                    onClick={() => handleDelete(flow.id)}
                    title="Delete flow"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
                
                <div className="flex items-center text-base text-foreground font-medium mb-5">
                  <Clock className="w-5 h-5 mr-2 text-primary" />
                  {new Date(flow.timestamp || flow.created).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </div>

                <Button 
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold text-base"
                  onClick={() => handleLoad(flow.id)}
                >
                  <Download className="w-5 h-5 mr-2" />
                  Restore Flow
                </Button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SavedFlowsSidebar;