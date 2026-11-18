import React from 'react';
import Node from '../Node.jsx';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TransformNode = ({ node, onDragStart, onConfigChange, selected, onClick }) => {
  const operation = node.config?.operation || 'uppercase';
  const showValueInput = operation === 'addPrefix' || operation === 'addSuffix';

  return (
    <Node node={node} onDragStart={onDragStart} selected={selected} onClick={onClick}>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Operation</label>
        <Select
          value={operation}
          onValueChange={(value) => onConfigChange(node.id, { ...node.config, operation: value })}
        >
          <SelectTrigger className="text-sm bg-background text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="uppercase">Uppercase</SelectItem>
            <SelectItem value="lowercase">Lowercase</SelectItem>
            <SelectItem value="addPrefix">Add Prefix</SelectItem>
            <SelectItem value="addSuffix">Add Suffix</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {showValueInput && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            {operation === 'addPrefix' ? 'Prefix' : 'Suffix'}
          </label>
          <Input
            type="text"
            value={node.config?.value || ''}
            onChange={(e) => onConfigChange(node.id, { ...node.config, value: e.target.value })}
            placeholder={`Enter ${operation === 'addPrefix' ? 'prefix' : 'suffix'}`}
            className="text-sm bg-background text-foreground"
          />
        </div>
      )}
    </Node>
  );
};

export default TransformNode;