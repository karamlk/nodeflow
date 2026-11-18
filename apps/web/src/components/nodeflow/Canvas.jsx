import React, { useRef, useState, useEffect } from 'react';
import Connection from './Connection.jsx';
import LogNode from './nodes/LogNode.jsx';
import ColorNode from './nodes/ColorNode.jsx';
import TransformNode from './nodes/TransformNode.jsx';
import FilterNode from './nodes/FilterNode.jsx';
import DelayNode from './nodes/DelayNode.jsx';

const Canvas = ({ nodes, connections, onNodesChange, onConnectionsChange, selectedNode, onSelectNode }) => {
  const canvasRef = useRef(null);
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  const handleNodeDragStart = (e, nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setDraggingNode(nodeId);
    setDragOffset({
      x: e.clientX - node.position.x,
      y: e.clientY - node.position.y
    });
  };

  const handleMouseMove = (e) => {
    if (draggingNode) {
      const newNodes = nodes.map(node => {
        if (node.id === draggingNode) {
          return {
            ...node,
            position: {
              x: e.clientX - dragOffset.x,
              y: e.clientY - dragOffset.y
            }
          };
        }
        return node;
      });
      onNodesChange(newNodes);
    }

    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingNode(null);
    setIsPanning(false);
  };

  const handlePortClick = (e) => {
    const port = e.target.dataset.port;
    const nodeId = e.target.dataset.nodeId;

    if (!port || !nodeId) return;

    if (port === 'output') {
      setConnectingFrom(nodeId);
    } else if (port === 'input' && connectingFrom) {
      if (connectingFrom === nodeId) return; // Prevent self connection
      
      const newConnection = {
        id: `conn-${Date.now()}`,
        fromNodeId: connectingFrom,
        toNodeId: nodeId
      };
      onConnectionsChange([...connections, newConnection]);
      setConnectingFrom(null);
    }
  };

  const handleConnectionDelete = (connectionId) => {
    onConnectionsChange(connections.filter(c => c.id !== connectionId));
  };

  const handleWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) return; // Only zoom with modifier key to allow trackpad scrolling
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(Math.max(prev * delta, 0.5), 2));
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingNode, dragOffset, isPanning, panStart, nodes]);

  const renderNode = (node) => {
    const props = {
      key: node.id,
      node,
      onDragStart: handleNodeDragStart,
      onConfigChange: (nodeId, config) => {
        const newNodes = nodes.map(n => 
          n.id === nodeId ? { ...n, config: { ...n.config, ...config } } : n
        );
        onNodesChange(newNodes);
      },
      selected: selectedNode === node.id,
      onClick: onSelectNode
    };

    switch (node.type) {
      case 'log': return <LogNode {...props} />;
      case 'color': return <ColorNode {...props} />;
      case 'transform': return <TransformNode {...props} />;
      case 'filter': return <FilterNode {...props} />;
      case 'delay': return <DelayNode {...props} />;
      default: return null;
    }
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full bg-background overflow-hidden outline-none focus:outline-none"
      onClick={handlePortClick}
      onWheel={handleWheel}
      style={{ cursor: isPanning ? 'grabbing' : 'default' }}
      onMouseDown={(e) => {
        if (e.button === 1 || e.button === 0 && e.target === canvasRef.current) {
          setIsPanning(true);
          setPanStart({
            x: e.clientX - panOffset.x,
            y: e.clientY - panOffset.y
          });
        }
      }}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1.5" fill="hsl(var(--muted-foreground))" opacity="0.15" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      <div
        className="absolute inset-0 origin-top-left transition-transform duration-75"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`
        }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-auto" style={{ overflow: 'visible' }}>
          {connections.map(conn => {
            const fromNode = nodes.find(n => n.id === conn.fromNodeId);
            const toNode = nodes.find(n => n.id === conn.toNodeId);
            
            // If connection originates or targets a color node, extract color
            let overrideColor = null;
            if (fromNode?.type === 'color' && fromNode.config?.color) {
              overrideColor = fromNode.config.color;
            } else if (toNode?.type === 'color' && toNode.config?.color) {
              overrideColor = toNode.config.color;
            }

            return (
              <Connection
                key={conn.id}
                fromNode={fromNode}
                toNode={toNode}
                onDelete={() => handleConnectionDelete(conn.id)}
                overrideColor={overrideColor}
              />
            );
          })}
        </svg>

        {nodes.map(renderNode)}
      </div>

      {connectingFrom && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-pulse">
          Select an input port to connect
        </div>
      )}
    </div>
  );
};

export default Canvas;