import React from 'react';
import Node from '../Node.jsx';
import { Input } from '@/components/ui/input';

const LogNode = ({ node, onDragStart, onConfigChange, selected, onClick }) => {
  return (
    <Node node={node} onDragStart={onDragStart} selected={selected} onClick={onClick}>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Message</label>
        <Input
          type="text"
          value={node.config?.message || ''}
          onChange={(e) => onConfigChange(node.id, { message: e.target.value })}
          placeholder="Enter log message"
          className="text-sm bg-background text-foreground"
        />
      </div>
    </Node>
  );
};

export default LogNode;