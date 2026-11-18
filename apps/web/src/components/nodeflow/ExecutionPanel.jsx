import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Trash2, Terminal } from 'lucide-react';

const ExecutionPanel = ({ executionLog, onClear }) => {
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [executionLog]);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--node-bg))] border-l border-border">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Execution Console</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm">
        {executionLog.length === 0 ? (
          <div className="text-muted-foreground text-center py-12 px-4 border-2 border-dashed border-border rounded-xl">
            Waiting for execution... <br/>Run a workflow to see the pipeline results.
          </div>
        ) : (
          executionLog.map((log, index) => {
            const hasCustomStyle = log.style !== null && log.style !== undefined;
            const customStyles = hasCustomStyle ? log.style : {};

            return (
              <div
                key={index}
                className={`execution-log-entry py-2 flex items-start ${log.type}`}
              >
                <span className="text-muted-foreground/60 text-xs mr-3 mt-[2px] whitespace-nowrap">
                  {formatTimestamp(log.timestamp)}
                </span>
                <span 
                  className={`flex-1 break-words transition-all duration-200
                    ${log.type === 'success' && !hasCustomStyle ? 'text-[hsl(var(--success))]' : ''}
                    ${log.type === 'error' && !hasCustomStyle ? 'text-[hsl(var(--error))]' : ''}
                    ${log.type === 'warning' && !hasCustomStyle ? 'text-[hsl(var(--warning))]' : ''}
                    ${log.type === 'info' && !hasCustomStyle ? 'text-foreground' : ''}
                  `}
                  style={customStyles}
                >
                  {log.message}
                </span>
              </div>
            );
          })
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default ExecutionPanel;