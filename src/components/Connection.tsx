'use client';

import React from 'react';

interface ConnectionProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isDragging?: boolean;
  showArrow?: boolean;
}

const Connection: React.FC<ConnectionProps> = ({ 
  startX, 
  startY, 
  endX, 
  endY, 
  isDragging = false, 
  showArrow = true 
}) => {
  // Calculate the path with proper curve direction
  const generatePath = () => {
    const horizontalDistance = Math.abs(endX - startX);
    const isUpward = endY < startY;
    const cornerRadius = 8;
    
    // Calculate the turn point (50% of horizontal distance)
    const turnX = startX + horizontalDistance * 0.5;
    
    if (isUpward) {
      // For upward connections: go right, curve up, go up, curve right, go right
      return `
        M ${startX} ${startY}
        L ${turnX - cornerRadius} ${startY}
        Q ${turnX} ${startY} ${turnX} ${startY - cornerRadius}
        L ${turnX} ${endY + cornerRadius}
        Q ${turnX} ${endY} ${turnX + cornerRadius} ${endY}
        L ${endX} ${endY}
      `;
    } else {
      // For downward connections: go right, curve down, go down, curve right, go right
      return `
        M ${startX} ${startY}
        L ${turnX - cornerRadius} ${startY}
        Q ${turnX} ${startY} ${turnX} ${startY + cornerRadius}
        L ${turnX} ${endY - cornerRadius}
        Q ${turnX} ${endY} ${turnX + cornerRadius} ${endY}
        L ${endX} ${endY}
      `;
    }
  };

  const strokeColor = isDragging ? "#3b82f6" : "#6b7280";

  return (
    <svg 
      className="absolute top-0 left-0 w-full h-full pointer-events-none" 
      style={{ overflow: 'visible', zIndex: 1 }}
    >
      {showArrow && (
        <defs>
          <marker
            id={`arrowhead-${isDragging ? 'blue' : 'gray'}`}
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            {/* Triangle shape matching node triangles - scaled to proper size */}
            <path
              d="M 2 0 L 2 6 L 6 3 Z"
              fill={strokeColor}
            />
          </marker>
        </defs>
      )}
      
      <path
        d={generatePath()}
        stroke={strokeColor}
        strokeWidth="2"
        strokeOpacity="0.8"
        fill="none"
        strokeLinecap="round"
        markerEnd={showArrow ? `url(#arrowhead-${isDragging ? 'blue' : 'gray'})` : undefined}
      />
    </svg>
  );
};

export default Connection; 