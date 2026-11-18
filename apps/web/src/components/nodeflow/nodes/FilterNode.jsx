import React from 'react';
import Node from '../Node.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Label } from '@/components/ui/label.jsx';

const FilterNode = ({ node, onDragStart, onConfigChange, selected, onClick }) => {
  const conditionType = node.config?.conditionType || 'contains';
  const conditionValue = node.config?.conditionValue || '';

  const handleTypeChange = (value) => {
    onConfigChange(node.id, { ...node.config, conditionType: value });
  };

  const handleValueChange = (e) => {
    onConfigChange(node.id, { ...node.config, conditionValue: e.target.value });
  };

  return (
    <Node node={node} onDragStart={onDragStart} selected={selected} onClick={onClick}>
      <div className="space-y-4 mt-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Condition Type</Label>
          <Select value={conditionType} onValueChange={handleTypeChange}>
            <SelectTrigger className="h-8 text-xs bg-background text-foreground border-input focus:ring-primary">
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equals" className="text-xs">Equals</SelectItem>
              <SelectItem value="contains" className="text-xs">Contains</SelectItem>
              <SelectItem value="starts_with" className="text-xs">Starts with</SelectItem>
              <SelectItem value="ends_with" className="text-xs">Ends with</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Condition Value</Label>
          <Input
            type="text"
            value={conditionValue}
            onChange={handleValueChange}
            placeholder="Enter word to match"
            className="h-8 text-xs bg-background text-foreground border-input placeholder:text-muted-foreground/50 focus-visible:ring-primary"
          />
        </div>
      </div>
    </Node>
  );
};

export default FilterNode;