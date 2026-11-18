import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Save, Play, FolderClosed, LogIn, LogOut, Workflow } from 'lucide-react';
import { useWorkflow } from '@/hooks/useWorkflow.js';
import SavedFlowsSidebar from './SavedFlowsSidebar.jsx';
import SaveFlowDialog from './SaveFlowDialog.jsx';
import LoginDialog from './LoginDialog.jsx';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';

const Header = ({ onSave, onLoad, onRun, nodes, connections }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  
  const { saveFlow, loading } = useWorkflow();

  useEffect(() => {
    // Listen for auth changes
    return pb.authStore.onChange((token, model) => {
      setIsAuthenticated(!!model);
    });
  }, []);

  const handleLogout = () => {
    pb.authStore.clear();
    setIsAuthenticated(false);
    toast.success('Logged out');
  };

  const handleManualSave = async (flowName) => {
    if (!isAuthenticated) {
      setSaveDialogOpen(false);
      setLoginDialogOpen(true);
      return;
    }
    
    try {
      await saveFlow(flowName, nodes, connections, false);
      setSaveDialogOpen(false);
      toast.success('Workflow saved successfully');
    } catch (err) {
      toast.error('Failed to save workflow');
    }
  };

  const handleRunExecution = () => {
    // Trigger onRun first to execute visual feedback
    onRun();
  };

  return (
    <header className="bg-[hsl(var(--node-bg))] border-b border-border px-6 py-4 flex items-center justify-between shadow-sm z-10 relative">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
          <Workflow className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">NodeFlow</h1>
      </div>

      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSidebarOpen(true)}
              className="bg-card hover:bg-muted"
            >
              <FolderClosed className="w-4 h-4 mr-2" />
              Saved Flows
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSaveDialogOpen(true)}
              className="bg-card hover:bg-muted"
            >
              <Save className="w-4 h-4 mr-2" />
              Save As
            </Button>

            <Button 
              onClick={handleRunExecution} 
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all active:scale-95"
            >
              <Play className="w-4 h-4 mr-2" />
              Run Automation
            </Button>

            <div className="h-6 w-px bg-border mx-2" />

            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </>
        ) : (
          <>
            <Button 
              onClick={handleRunExecution} 
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all active:scale-95"
            >
              <Play className="w-4 h-4 mr-2" />
              Run Automation
            </Button>
            
            <div className="h-6 w-px bg-border mx-2" />

            <Button onClick={() => setLoginDialogOpen(true)} variant="secondary" size="sm">
              <LogIn className="w-4 h-4 mr-2" />
              Login to Save
            </Button>
          </>
        )}
      </div>

      <SavedFlowsSidebar 
        open={sidebarOpen} 
        onOpenChange={setSidebarOpen} 
        onLoadFlow={onLoad} 
      />
      
      <SaveFlowDialog 
        open={saveDialogOpen} 
        onOpenChange={setSaveDialogOpen} 
        onSave={handleManualSave}
        loading={loading}
      />
      
      <LoginDialog 
        open={loginDialogOpen} 
        onOpenChange={setLoginDialogOpen} 
        onSuccess={() => setIsAuthenticated(true)}
      />
    </header>
  );
};

export default Header;