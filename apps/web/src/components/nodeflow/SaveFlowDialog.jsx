import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Folder } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';

const SaveFlowDialog = ({ open, onOpenChange, onSave, loading }) => {
  const [flowName, setFlowName] = useState('');

  const user = pb.authStore.model;
  const folderName = user?.name || user?.email?.split('@')[0] || 'MyWorkflows';

  const handleSave = () => {
    if (flowName.trim()) {
      onSave(flowName);
      setFlowName('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-2xl font-bold text-foreground">Save Workflow</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-6">
          <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground block">Destination Folder</Label>
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 rounded-lg border border-border text-base text-foreground font-medium">
              <Folder className="w-5 h-5 text-primary flex-shrink-0" />
              <span>{folderName}</span>
            </div>
            <p className="text-sm text-muted-foreground font-normal">Flows are saved to your personal workspace.</p>
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="flowName" className="text-base font-semibold text-foreground block">Flow Name</Label>
            <Input
              id="flowName"
              placeholder="e.g., Data Processor Pipeline"
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              className="bg-background text-foreground border-input placeholder:text-muted-foreground/50 focus-visible:ring-primary text-base"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0 border-t border-border pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-foreground font-semibold border-border hover:bg-muted">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !flowName.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
            {loading ? 'Saving...' : 'Save Workflow'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveFlowDialog;