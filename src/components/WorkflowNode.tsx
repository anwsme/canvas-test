'use client';

import React, { useRef, useState } from 'react';
import Draggable, { DraggableEvent, DraggableData } from 'react-draggable';

interface NodeInput {
  id: string;
  connected: boolean;
}

interface InputConnectionState {
  hasIncomingConnection: boolean;
  isBeingHovered: boolean;
  isInTapZone: boolean;
  inputId: string;
  inputIndex: number;
  isAddInput?: boolean;
  isDragging?: boolean;
}

interface WorkflowNodeProps {
  id: string;
  title: string;
  description?: string;
  x: number;
  y: number;
  height: number;
  inputs: NodeInput[];
  onDrag: (id: string, x: number, y: number) => void;
  onStartConnection?: (nodeId: string, event: React.MouseEvent) => void;
  onStartDisconnection?: (nodeId: string, inputId: string, event: React.MouseEvent) => void;
  onRemoveInput?: (nodeId: string, inputId: string) => void;
  inputConnectionStates: InputConnectionState[];
}

const WorkflowNode: React.FC<WorkflowNodeProps> = ({
  id,
  title,
  description = "Node description",
  x,
  y,
  height,
  inputs,
  onDrag,
  onStartConnection,
  onStartDisconnection,
  onRemoveInput,
  inputConnectionStates,
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [hoveredInputId, setHoveredInputId] = useState<string | null>(null);

  const handleDrag = (_e: DraggableEvent, data: DraggableData) => {
    onDrag(id, data.x, data.y);
  };

  const handleCircleMouseDown = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onStartConnection) {
      onStartConnection(id, event);
    }
  };

  const handleTriangleMouseDown = (inputId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onStartDisconnection) {
      onStartDisconnection(id, inputId, event);
    }
  };

  const handleInputRemove = (inputId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onRemoveInput) {
      onRemoveInput(id, inputId);
    }
  };

  const getInputPosition = (inputIndex: number) => {
    const baseHeight = 48;
    const inputHeight = 12;
    const spacing = 8;
    const topMargin = 8;
    
    // For ADD input, position it after all existing inputs
    const totalInputs = inputIndex >= inputs.length ? inputs.length + 1 : inputs.length;
    
    if (totalInputs === 1) {
      // Single input: center vertically in base node height
      return {
        top: baseHeight / 2 - inputHeight / 2 + 2
      };
    } else {
      // Multiple inputs: start from top margin (accounting for translateY(-6px))
      // Always position based on the final layout, not transitional states
      const startY = topMargin + 2; // Add 6px to account for translateY(-6px) to get visual 8pt top padding
      
      return {
        top: startY + inputIndex * (inputHeight + spacing)
      };
    }
  };

  const calculateNodePosition = () => {
    // Calculate the text position based on node height
    const textTop = Math.max(height + 16, 64); // At least 64px from top, or 16px below node
    return { textTop };
  };

  const { textTop } = calculateNodePosition();

  const renderInputConnector = (connectionState: InputConnectionState) => {
    const { hasIncomingConnection, isInTapZone, isBeingHovered, inputId, inputIndex, isAddInput, isDragging } = connectionState;
    const inputPos = getInputPosition(inputIndex);
    const isHovered = hoveredInputId === inputId;
    const tapZonePadding = 4; // +4pt padding on each side

    // Handle ADD input (virtual input when all are connected)
    if (isAddInput) {
      const isActive = isInTapZone || isBeingHovered || isHovered;
      const rectWidth = isActive ? 12 : 6; // Grow on tap zone, connection hover, OR direct hover
      const rectHeight = 12; // Fixed height to match other inputs
      
      return (
        <div 
          key={inputId}
          className="absolute left-[-8px] z-[-2] flex items-center transition-all duration-300 ease-in-out"
          style={{ 
            top: inputPos.top,
            padding: `${tapZonePadding}px`,
            opacity: isActive ? 1 : 0.8, // Slightly fade in when becoming active
            transform: isActive ? 'translateX(0)' : 'translateX(-2px)' // Slide in slightly when active
          }}
        >
          {/* Rectangle connector - blue for ADD, grows to the left with smooth animation */}
          <div 
            className="transition-all duration-300 ease-in-out bg-blue-500 cursor-pointer"
            style={{
              width: `${rectWidth}px`,
              height: `${rectHeight}px`, // Fixed height to match other inputs
              marginLeft: isActive ? '-6px' : '0px', // Grow 6px to the left when active (from 6px to 12px width)
              borderRadius: '1px',
              transform: 'translateY(-6px)',
            }}
            onMouseEnter={() => setHoveredInputId(inputId)}
            onMouseLeave={() => setHoveredInputId(null)}
          ></div>
          
          {/* ADD text - slide in animation */}
          <div 
            className={`absolute right-[20px] top-[0px] text-blue-500 text-[10px] font-medium font-['IBM_Plex_Mono'] leading-[10px] uppercase tracking-wide cursor-pointer select-none whitespace-nowrap transition-all duration-300 ease-in-out ${
              isActive
                ? 'opacity-100 translate-x-0' 
                : 'opacity-0 translate-x-2 pointer-events-none'
            }`}
          >
            Add
          </div>
        </div>
      );
    }

    

    if (hasIncomingConnection) {
      // Show triangle when connected - but transform to rectangle if we're dragging and in tap zone
      const shouldShowRectangle = isDragging && isInTapZone;
      
      if (shouldShowRectangle) {
        // Show rectangle instead of triangle when dragging connection over it
        const rectWidth = 12;
        const rectHeight = 12;
        
        return (
          <div 
            key={inputId}
            className="absolute left-[-8px] z-[-2] flex items-center transition-all duration-200 ease-in-out"
            style={{ 
              top: inputPos.top,
              padding: `${tapZonePadding}px`
            }}
            onMouseDown={(e) => handleTriangleMouseDown(inputId, e)}
          >
            {/* Rectangle connector - blue when dragging over it */}
            <div 
              className="transition-all duration-200 ease-in-out cursor-pointer bg-blue-500"
              style={{
                width: `${rectWidth}px`,
                height: `${rectHeight}px`,
                marginLeft: '-3px',
                borderRadius: '1px',
                transform: 'translateY(-6px)',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)' // Add shadow for better visual feedback
              }}
            ></div>
            {/* No text when showing rectangle for existing connection */}
          </div>
        );
      } else {
        // Show normal triangle with enhanced hover animation
        return (
          <div 
            key={inputId}
            className="absolute left-[-15px] z-[-2] cursor-pointer transition-all duration-200 ease-in-out"
            style={{ 
              top: inputPos.top,
              padding: `${tapZonePadding}px` // Add tap zone padding
            }}
            onMouseDown={(e) => handleTriangleMouseDown(inputId, e)}
          >
            <div 
              className="transition-all duration-200 hover:brightness-110"
              style={{
                width: '12px',
                height: '12px',
                transform: 'translateY(-6px)',
                clipPath: 'polygon(33% 0%, 33% 100%, 100% 50%)',
                backgroundColor: isBeingHovered ? "#3b82f6" : "#6b7280",
                borderRadius: '4px 0 0 4px',
                boxShadow: isBeingHovered ? '0 2px 4px rgba(59, 130, 246, 0.3)' : 'none'
              }}
            ></div>
          </div>
        );
      }
    } else {
      // Show rectangle with delete functionality - enhanced animations
      // Rectangle grows from 6 to 12 when: in tap zone OR being hovered during drag OR directly hovered
      const rectWidth = (isInTapZone || isBeingHovered || isHovered) ? 12 : 6;
      const rectHeight = 12; // Match triangle height
      const shouldShowDelete = isHovered && !isDragging; // Only show delete when directly hovered and not during drag
      
      return (
        <div 
          key={inputId}
          className="absolute left-[-8px] z-[-2] flex items-center transition-all duration-200 ease-in-out"
          style={{ 
            top: inputPos.top,
            padding: `${tapZonePadding}px` // Add tap zone padding
          }}
        >
          {/* Rectangle connector with enhanced visual feedback */}
          <div 
            className={`transition-all duration-200 ease-in-out cursor-pointer ${
              shouldShowDelete ? 'bg-red-600' : (isBeingHovered ? 'bg-blue-500' : 'bg-muted-foreground')
            }`}
            style={{
              width: `${rectWidth}px`,
              height: `${rectHeight}px`,
              marginLeft: (isInTapZone || isBeingHovered || isHovered) ? '-3px' : '0px', // Adjusted for new width on any growth condition
              borderRadius: '1px',
              transform: 'translateY(-6px)', // Center the rectangle (adjusted for 12px height)
            }}
            onMouseEnter={() => setHoveredInputId(inputId)}
            onMouseLeave={() => setHoveredInputId(null)}
            onClick={(e) => handleInputRemove(inputId, e)}
          ></div>
          
          {/* Delete text - enhanced slide in animation */}
          <div 
            className={`absolute right-[20px] top-[0px] text-red-600 text-[10px] font-medium font-['IBM_Plex_Mono'] leading-[10px] uppercase tracking-wide cursor-pointer select-none whitespace-nowrap transition-all duration-200 ease-in-out ${
              shouldShowDelete
                ? 'opacity-100 translate-x-0' 
                : 'opacity-0 translate-x-3 pointer-events-none'
            }`}
            onClick={(e) => handleInputRemove(inputId, e)}
          >
            Delete
          </div>
        </div>
      );
    }
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      defaultPosition={{ x, y }}
      onDrag={handleDrag}
      handle=".node-handle"
    >
      <div ref={nodeRef} className="absolute">
        <div className="relative inline-flex justify-start items-start">
          {/* Dynamic Input Connectors */}
          {inputConnectionStates.map((connectionState) => renderInputConnector(connectionState))}
          
          {/* Internal Container */}
          <div className="w-12 relative inline-flex justify-end items-start">
            {/* Circle Output Connector (Right Side) - 12x12px - FIXED VERTICAL CENTERING with smooth transitions */}
            <div 
              className="absolute inline-flex flex-col justify-center items-start gap-3 transition-all duration-200 ease-in-out z-10"
              style={{
                left: '42px',
                top: `${height / 2 - 6}px` // Center vertically based on node height
              }}
            >
              <div className="h-3 inline-flex justify-start items-center gap-2">
                <div 
                  className="w-3 h-3 relative  cursor-pointer hover:brightness-110 transition-all"
                  onMouseDown={handleCircleMouseDown}
                >
                  <div className="w-[12.5px] h-[12.5px] left-[-0.25px] top-[-0.25px] absolute bg-muted-foreground rounded-full"></div>
                  <div className="w-1.5 h-1.5 left-[3px] top-[3px] absolute overflow-hidden">
                    <div className="w-[5px] h-[5px] left-[0.5px] top-[0.5px] absolute bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Main Button - Dynamic Height with smooth transition */}
            <div 
              className="node-handle bg-white rounded-lg shadow-[0px_2px_4px_0px_rgba(0,0,0,0.05)] border border-gray-200 inline-flex justify-center items-center cursor-move hover:bg-gray-50 transition-all duration-200 ease-in-out"
              style={{
                width: '48px',
                height: `${height}px`
              }}
            >
              <div className="w-6 h-6 relative overflow-hidden">
                <div className="w-[20px] h-[20px] left-[2px] top-[2px] absolute border-2 border-gray-700 rounded"></div>
              </div>
            </div>
          </div>
          
          {/* Centered Text Below Button */}
          <div 
            className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-1"
            style={{ top: `${textTop}px` }}
          >
            {/* Node Title */}
            <div className="text-center text-gray-900 text-sm font-medium font-['Geist'] leading-none whitespace-nowrap select-none">
              {title}
            </div>
            
            {/* Node Description */}
            <div className="text-center text-muted-foreground text-xs font-normal font-['Geist'] leading-4 whitespace-nowrap select-none">
              {description}
            </div>
          </div>
        </div>
      </div>
    </Draggable>
  );
};

export default WorkflowNode; 