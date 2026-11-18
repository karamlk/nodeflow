import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/nodeflow/Header.jsx';
import Canvas from '@/components/nodeflow/Canvas.jsx';
import ExecutionPanel from '@/components/nodeflow/ExecutionPanel.jsx';
import EditorChat from '@/components/nodeflow/EditorChat.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Plus, Trash2, TerminalSquare, Palette, Type, Filter, Clock } from 'lucide-react';
import { NodeFlowEngine } from '@/lib/NodeFlowEngine.js';
import { toast } from 'sonner';

const HANDOFF_KEY = 'nf_editor_handoff_v1';

const NodeFlowPage = () => {
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [executionLog, setExecutionLog] = useState([]);
  const [panelWidth, setPanelWidth] = useState(384); // w-96 = 24rem = 384px
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(HANDOFF_KEY);
      if (!raw) return;
      sessionStorage.removeItem(HANDOFF_KEY);
      const parsed = JSON.parse(raw);
      const wf = parsed && parsed.workflow;
      if (wf && Array.isArray(wf.nodes) && wf.nodes.length) {
        setNodes(wf.nodes);
        setConnections(Array.isArray(wf.connections) ? wf.connections : []);
        setSelectedNode(null);
        toast.success('Workflow loaded from chat');
      }
    } catch {
      /* noop */
    }
  }, []);

  const addNode = (type) => {
    const newNode = {
      id: `node-${Date.now()}`,
      type,
      position: { x: 100 + nodes.length * 50, y: 100 + nodes.length * 50 },
      config: {}
    };
    setNodes([...nodes, newNode]);
  };

  const deleteNode = () => {
    if (!selectedNode) return;
    setNodes(nodes.filter(n => n.id !== selectedNode));
    setConnections(connections.filter(c => 
      c.fromNodeId !== selectedNode && c.toNodeId !== selectedNode
    ));
    setSelectedNode(null);
  };

  const handleLoad = (workflow) => {
    setNodes(workflow.nodes || []);
    setConnections(workflow.connections || []);
    setSelectedNode(null);
  };

  const handleRun = async (override) => {
    const wf = override || { nodes, connections };
    if (!wf.nodes || wf.nodes.length === 0) {
      toast.error('Add some nodes first');
      return null;
    }

    const engine = new NodeFlowEngine(wf.nodes, wf.connections || []);
    const log = await engine.run();
    setExecutionLog(log);
    toast.success('Workflow executed');
    return log;
  };

  const handleApplyWorkflow = (wf) => {
    setNodes(Array.isArray(wf?.nodes) ? wf.nodes : []);
    setConnections(Array.isArray(wf?.connections) ? wf.connections : []);
    setSelectedNode(null);
  };

  const handleClearCanvas = () => {
    if (!window.confirm("Clear entire canvas?")) return;
    setNodes([]);
    setConnections([]);
    setSelectedNode(null);
  };

  const handleClearConsole = () => {
    setExecutionLog([]);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      setPanelWidth(Math.max(200, Math.min(newWidth, 600)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <>
      <Helmet>
        <title>Node Editor - NodeFlow</title>
        <meta name="description" content="Visual automation platform with drag-and-drop node editor and real-time execution" />
      </Helmet>

      <div className="h-screen flex flex-col bg-background overflow-hidden">
        <Header
          onLoad={handleLoad}
          onRun={handleRun}
          nodes={nodes}
          connections={connections}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Tools */}
          <div className="w-72 bg-[hsl(var(--node-bg))] border-r border-border p-5 flex flex-col overflow-y-auto">
            <h3 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-5">Node Library</h3>
            <div className="space-y-3 flex-1">
              <Button
                variant="outline"
                className="w-full h-auto py-3 px-4 justify-start bg-card hover:bg-accent border-border transition-all text-left group"
                onClick={() => addNode('log')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-md group-hover:bg-primary/20 transition-colors">
                    <TerminalSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm">Log Output</div>
                    <div className="text-xs text-muted-foreground font-normal mt-0.5">Print message to console</div>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full h-auto py-3 px-4 justify-start bg-card hover:bg-accent border-border transition-all text-left group"
                onClick={() => addNode('color')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#10b981]/10 rounded-md group-hover:bg-[#10b981]/20 transition-colors">
                    <Palette className="w-5 h-5 text-[#10b981]" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm">Color Style</div>
                    <div className="text-xs text-muted-foreground font-normal mt-0.5">Apply text/bg colors</div>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full h-auto py-3 px-4 justify-start bg-card hover:bg-accent border-border transition-all text-left group"
                onClick={() => addNode('transform')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-md group-hover:bg-blue-500/20 transition-colors">
                    <Type className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm">Transform Text</div>
                    <div className="text-xs text-muted-foreground font-normal mt-0.5">Modify string format</div>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full h-auto py-3 px-4 justify-start bg-card hover:bg-accent border-border transition-all text-left group"
                onClick={() => addNode('filter')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-md group-hover:bg-orange-500/20 transition-colors">
                    <Filter className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm">Condition Filter</div>
                    <div className="text-xs text-muted-foreground font-normal mt-0.5">Block/pass execution</div>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full h-auto py-3 px-4 justify-start bg-card hover:bg-accent border-border transition-all text-left group"
                onClick={() => addNode('delay')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-md group-hover:bg-purple-500/20 transition-colors">
                    <Clock className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm">Time Delay</div>
                    <div className="text-xs text-muted-foreground font-normal mt-0.5">Pause execution flow</div>
                  </div>
                </div>
              </Button>
            </div>

            <div className="pt-6 border-t border-border mt-6 space-y-3">
              <Button
                variant="destructive"
                className="w-full justify-start font-medium"
                onClick={deleteNode}
                disabled={!selectedNode}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-foreground font-medium"
                onClick={handleClearCanvas}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Canvas
              </Button>
            </div>
          </div>

          <div className="flex-1 relative">
            <Canvas
              nodes={nodes}
              connections={connections}
              onNodesChange={setNodes}
              onConnectionsChange={setConnections}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
            />
          </div>

          <div
            className="w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors active:bg-primary"
            onMouseDown={() => setIsResizing(true)}
          />

          <div style={{ width: `${panelWidth}px` }} className="border-l border-border z-10 shadow-xl bg-card flex flex-col">
            <ExecutionPanel
              executionLog={executionLog}
              onClear={handleClearConsole}
            />
          </div>
        </div>

        <EditorChat
          workflow={{ nodes, connections }}
          onApplyWorkflow={handleApplyWorkflow}
          onRun={handleRun}
        />
      </div>
    </>
  );
};

export default NodeFlowPage;