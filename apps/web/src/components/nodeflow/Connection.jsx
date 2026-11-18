import React from 'react';

const Connection = ({ fromNode, toNode, onDelete, overrideColor }) => {
  if (!fromNode || !toNode) return null;

  const fromX = fromNode.position.x + 200;
  const fromY = fromNode.position.y + 60;
  const toX = toNode.position.x;
  const toY = toNode.position.y + 60;

  const midX = (fromX + toX) / 2;
  const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
  
  // Use custom color if connected to/from a color node, otherwise default
  const strokeColor = overrideColor || "hsl(var(--connection-line))";

  return (
    <g className={!overrideColor ? "connection-glow" : ""}>
      <path
        d={path}
        stroke={strokeColor}
        strokeWidth="3"
        fill="none"
        className="cursor-pointer hover:stroke-[hsl(var(--connection-line))/0.7] hover:stroke-[4px] transition-all duration-200"
        onClick={onDelete}
        style={{ filter: overrideColor ? `drop-shadow(0 0 4px ${overrideColor})` : 'none' }}
      />
      <circle
        cx={fromX}
        cy={fromY}
        r="5"
        fill={strokeColor}
        className="transition-colors duration-200"
      />
      <circle
        cx={toX}
        cy={toY}
        r="5"
        fill={strokeColor}
        className="transition-colors duration-200"
      />
    </g>
  );
};

export default Connection;