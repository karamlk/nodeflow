import React from 'react';
import { GripVertical } from 'lucide-react';

const Node = ({ node, onDragStart, onConfigChange, children, selected, onClick }) => {
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
      return;
    }
    if (e.target.closest('[data-port]')) {
      return;
    }
    e.preventDefault();
    onDragStart(e, node.id);
  };

  // Determine if this is a color node to highlight the ports
  const isColorNode = node.type === 'color';
  const customColor = isColorNode ? node.config?.color : null;
  const portColor = customColor || "hsl(var(--port-color))";

  return (
    <div
      className={`absolute cursor-move bg-[hsl(var(--node-bg))] border-2 rounded-xl p-4 w-[200px] node-shadow transition-all duration-200 ${
        selected ? 'border-primary ring-2 ring-primary/20 scale-[1.02]' : 'border-[hsl(var(--node-border))]'
      }`}
      style={{
        left: `${node.position.x}px`,
        top: `${node.position.y}px`
      }}
      onMouseDown={handleMouseDown}
      onClick={() => onClick(node.id)}
    >
      <div className="flex items-center gap-2 mb-3 pointer-events-none">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">{node.type.toUpperCase()}</span>
      </div>

      <div className="space-y-2 pointer-events-auto">
        {children}
      </div>

      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-background cursor-pointer hover:scale-150 transition-transform duration-200 shadow-sm"
        style={{ backgroundColor: portColor }}
        data-port="input"
        data-node-id={node.id}
      />
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-background cursor-pointer hover:scale-150 transition-transform duration-200 shadow-sm"
        style={{ backgroundColor: portColor }}
        data-port="output"
        data-node-id={node.id}
      />
    </div>
  );
};

export default Node;