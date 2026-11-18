import React from 'react';
import Node from '../Node.jsx';
import { Input } from '@/components/ui/input';

const DelayNode = ({ node, onDragStart, onConfigChange, selected, onClick }) => {
  return (
    <Node node={node} onDragStart={onDragStart} selected={selected} onClick={onClick}>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Delay (ms)</label>
        <Input
          type="number"
          value={node.config?.milliseconds || '1000'}
          onChange={(e) => onConfigChange(node.id, { milliseconds: e.target.value })}
          placeholder="1000"
          min="0"
          className="text-sm bg-background text-foreground"
        />
      </div>
    </Node>
  );
};

export default DelayNode;