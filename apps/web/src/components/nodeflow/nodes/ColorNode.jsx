import React from 'react';
import Node from '../Node.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ColorNode = ({ node, onDragStart, onConfigChange, selected, onClick }) => {
  return (
    <Node node={node} onDragStart={onDragStart} selected={selected} onClick={onClick}>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Color</label>
        <input
          type="color"
          value={node.config?.color || '#10b981'}
          onChange={(e) => onConfigChange(node.id, { ...node.config, color: e.target.value })}
          className="w-full h-8 rounded cursor-pointer bg-background"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Target</label>
        <Select
          value={node.config?.target || 'text'}
          onValueChange={(value) => onConfigChange(node.id, { ...node.config, target: value })}
        >
          <SelectTrigger className="text-sm bg-background text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="background">Background</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Node>
  );
};

export default ColorNode;