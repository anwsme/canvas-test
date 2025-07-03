'use client';

import React, { useState, useCallback, useRef } from 'react';
import WorkflowNode from './WorkflowNode';
import Connection from './Connection';

interface NodeInput {
  id: string;
  connected: boolean;
}

interface NodeData {
  id: string;
  x: number;
  y: number;
  title: string;
  description: string;
  inputs: NodeInput[];
}

interface ConnectionData {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  toInputId: string;
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

const Canvas: React.FC = () => {
  const [nodes, setNodes] = useState<NodeData[]>([
    { 
      id: '1', 
      x: 150, 
      y: 100,
      title: 'Code',
      description: 'Change flight sheet',
      inputs: [{ id: 'input-1', connected: false }]
    },
    { 
      id: '2', 
      x: 400, 
      y: 300,
      title: 'Code', 
      description: 'LTC',
      inputs: [{ id: 'input-1', connected: true }]
    },
    { 
      id: '3', 
      x: 700, 
      y: 200,
      title: 'Code', 
      description: 'BTC',
      inputs: [
        { id: 'input-1', connected: false },
        { id: 'input-2', connected: false },
        { id: 'input-3', connected: false },
        { id: 'input-4', connected: false }
      ]
    },
  ]);

  const [connections, setConnections] = useState<ConnectionData[]>([
    { id: 'conn1', fromNodeId: '1', toNodeId: '2', toInputId: 'input-1' }
  ]);

  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    fromNodeId: string | null;
    currentX: number;
    currentY: number;
    hoveredNodeId: string | null;
    hoveredInputId: string | null;
    isInTapZone: boolean;
    isDisconnecting: boolean;
    disconnectedConnectionId: string | null;
    canCreateNewInput: boolean;
  }>({
    isDragging: false,
    fromNodeId: null,
    currentX: 0,
    currentY: 0,
    hoveredNodeId: null,
    hoveredInputId: null,
    isInTapZone: false,
    isDisconnecting: false,
    disconnectedConnectionId: null,
    canCreateNewInput: false
  });

  const canvasRef = useRef<HTMLDivElement>(null);

  const updateNodePosition = (id: string, x: number, y: number) => {
    setNodes(prev => prev.map(node => 
      node.id === id ? { ...node, x, y } : node
    ));
  };

  const calculateNodeHeight = (inputCount: number) => {
    const baseHeight = 48; // 48px base button height
    if (inputCount <= 1) return baseHeight;
    
    // For multiple inputs: 8pt top margin + inputs with 8pt spacing + 8pt bottom margin
    const inputHeight = 12; // Each input connector is 12px
    const spacing = 8; // 8pt spacing between inputs
    const margins = 16; // 8pt top + 8pt bottom
    
    return Math.max(baseHeight, (inputCount * inputHeight) + ((inputCount - 1) * spacing) + margins);
  };

  // Centralized function to get the effective height for a node given current drag state
  const getNodeHeight = (node: NodeData) => {
    const allInputsConnected = node.inputs.every(input => input.connected);
    const shouldShowAdd = dragState.isDragging && 
                         dragState.hoveredNodeId === node.id && 
                         dragState.canCreateNewInput && 
                         allInputsConnected;
    const effectiveInputCount = shouldShowAdd ? node.inputs.length + 1 : node.inputs.length;
    return calculateNodeHeight(effectiveInputCount);
  };

  const getInputPosition = (node: NodeData, inputIndex: number) => {
    const inputHeight = 12;
    const spacing = 8;
    
    // Keep existing inputs in their original positions when ADD appears
    const originalInputCount = node.inputs.length;
    
    let relativeTop;
    if (inputIndex >= originalInputCount) {
      // This is the ADD input - position it after existing inputs
      if (originalInputCount === 0) {
        // First input (becoming ADD): center it in expanded node
        const expandedHeight = getNodeHeight(node);
        relativeTop = expandedHeight / 2 - inputHeight / 2;
      } else {
        // Position ADD input after existing inputs based on their original positions
        const originalHeight = calculateNodeHeight(originalInputCount);
        const originalGroupHeight = (originalInputCount * inputHeight) + ((originalInputCount - 1) * spacing);
        const originalGroupStartY = originalInputCount === 1 
          ? originalHeight / 2 - inputHeight / 2  // Single input was centered in original height
          : (originalHeight - originalGroupHeight) / 2;  // Multiple inputs were centered in original height
        
        relativeTop = originalGroupStartY + originalInputCount * (inputHeight + spacing);
      }
    } else {
      // This is an existing input - keep it in original position based on original height
      const originalHeight = calculateNodeHeight(originalInputCount);
      
      if (originalInputCount === 1) {
        // Single input: center vertically in the original node height
        relativeTop = originalHeight / 2 - inputHeight / 2;
      } else {
        // Multiple inputs: center the original group vertically in the original node height
        const originalGroupHeight = (originalInputCount * inputHeight) + ((originalInputCount - 1) * spacing);
        const originalGroupStartY = (originalHeight - originalGroupHeight) / 2;
        
        relativeTop = originalGroupStartY + inputIndex * (inputHeight + spacing);
      }
    }
    
    // Convert to absolute coordinates (matching WorkflowNode's triangle positioning)
    return {
      x: node.x - 8,
      y: node.y + relativeTop + inputHeight / 2  // Add inputHeight/2 to get center of triangle
    };
  };

  const handleStartConnection = useCallback((nodeId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDragState({
        isDragging: true,
        fromNodeId: nodeId,
        currentX: event.clientX - rect.left,
        currentY: event.clientY - rect.top,
        hoveredNodeId: null,
        hoveredInputId: null,
        isInTapZone: false,
        isDisconnecting: false,
        disconnectedConnectionId: null,
        canCreateNewInput: false
      });
    }
  }, []);

  const handleStartDisconnection = useCallback((nodeId: string, inputId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      // Find the connection that ends at this specific input
      const connectionToRemove = connections.find(conn => conn.toNodeId === nodeId && conn.toInputId === inputId);
      
      if (connectionToRemove) {
        // Mark the input as disconnected
        setNodes(prev => prev.map(node => 
          node.id === nodeId 
            ? {
                ...node,
                inputs: node.inputs.map(input => 
                  input.id === inputId ? { ...input, connected: false } : input
                )
              }
            : node
        ));
        
        // Remove the connection immediately
        setConnections(prev => prev.filter(conn => conn.id !== connectionToRemove.id));
        
        // Start dragging from the original source node
        setDragState({
          isDragging: true,
          fromNodeId: connectionToRemove.fromNodeId,
          currentX: event.clientX - rect.left,
          currentY: event.clientY - rect.top,
          hoveredNodeId: null,
          hoveredInputId: null,
          isInTapZone: false,
          isDisconnecting: true,
          disconnectedConnectionId: connectionToRemove.id,
          canCreateNewInput: false
        });
      }
    }
  }, [connections]);

  const handleRemoveInput = useCallback((nodeId: string, inputId: string) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId 
        ? {
            ...node,
            inputs: node.inputs.filter(input => input.id !== inputId)
          }
        : node
    ));
    
    // Remove any connections to this input
    setConnections(prev => prev.filter(conn => !(conn.toNodeId === nodeId && conn.toInputId === inputId)));
  }, []);



  const isPointInNodeTapZone = useCallback((mouseX: number, mouseY: number, node: NodeData) => {
    // Use centralized height calculation
    const nodeHeight = getNodeHeight(node);
    
    const horizontalZoneWidth = 120; // Extended horizontal zone
    const verticalZoneHeight = 16; // Thin vertical zone
    
    return (
      mouseX >= node.x - horizontalZoneWidth &&
      mouseX <= node.x + 48 + horizontalZoneWidth &&
      mouseY >= node.y - verticalZoneHeight / 2 &&
      mouseY <= node.y + nodeHeight + verticalZoneHeight / 2
    );
  }, [dragState]);

  const isPointInInputZone = useCallback((mouseX: number, mouseY: number, node: NodeData, inputIndex: number) => {
    const inputPos = getInputPosition(node, inputIndex);
    const horizontalZoneWidth = 120; // Extended horizontal zone for easier targeting
    const verticalZoneHeight = 16; // Thin vertical zone around input
    
    return (
      mouseX >= node.x - horizontalZoneWidth &&
      mouseX <= node.x + 48 + horizontalZoneWidth &&
      mouseY >= inputPos.y - verticalZoneHeight / 2 &&
      mouseY <= inputPos.y + verticalZoneHeight / 2
    );
  }, [dragState]);



  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (dragState.isDragging) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Check which input is being hovered
        let hoveredNodeId = null;
        let hoveredInputId = null;
        let isInTapZone = false;
        let canCreateNewInput = false;
        
        for (const node of nodes) {
          if (node.id !== dragState.fromNodeId) {
            // First check for available inputs
            for (let i = 0; i < node.inputs.length; i++) {
              const input = node.inputs[i];
              if (!input.connected && isPointInInputZone(mouseX, mouseY, node, i)) {
                hoveredNodeId = node.id;
                hoveredInputId = input.id;
                isInTapZone = true;
                break;
              }
            }
            
            // If no available input found, check if we can create a new one
            if (!isInTapZone && isPointInNodeTapZone(mouseX, mouseY, node)) {
              const allInputsConnected = node.inputs.every(input => input.connected);
              if (allInputsConnected) {
                hoveredNodeId = node.id;
                canCreateNewInput = true;
                isInTapZone = true;
              }
            }
            
            if (isInTapZone) break;
          }
        }
        
        setDragState(prev => ({
          ...prev,
          currentX: mouseX,
          currentY: mouseY,
          hoveredNodeId,
          hoveredInputId,
          isInTapZone,
          canCreateNewInput
        }));
      }
    }
  }, [dragState.isDragging, dragState.fromNodeId, nodes, isPointInInputZone, isPointInNodeTapZone]);

  const handleEndConnection = useCallback(() => {
    if (dragState.isDragging && dragState.fromNodeId && dragState.hoveredNodeId && dragState.isInTapZone) {
      if (dragState.canCreateNewInput) {
        // Create new input and connect to it
        const newInputId = `input-${Date.now()}`;
        const targetNode = nodes.find(n => n.id === dragState.hoveredNodeId);
        
        // Special handling for when this will be the second input (transition from 1 to 2)
        if (targetNode && targetNode.inputs.length === 1) {
          // First, update the node to have 2 inputs to trigger repositioning animation
          setNodes(prev => prev.map(node => 
            node.id === dragState.hoveredNodeId 
              ? {
                  ...node,
                  inputs: [...node.inputs, { id: newInputId, connected: true }]
                }
              : node
          ));
          
          // Create connection to new input
          const newConnection: ConnectionData = {
            id: `conn_${Date.now()}`,
            fromNodeId: dragState.fromNodeId,
            toNodeId: dragState.hoveredNodeId,
            toInputId: newInputId
          };
          
          setConnections(prev => [...prev, newConnection]);
        } else {
          // Standard behavior for nodes with multiple inputs already
          setNodes(prev => prev.map(node => 
            node.id === dragState.hoveredNodeId 
              ? {
                  ...node,
                  inputs: [...node.inputs, { id: newInputId, connected: true }]
                }
              : node
          ));
          
          // Create connection to new input
          const newConnection: ConnectionData = {
            id: `conn_${Date.now()}`,
            fromNodeId: dragState.fromNodeId,
            toNodeId: dragState.hoveredNodeId,
            toInputId: newInputId
          };
          
          setConnections(prev => [...prev, newConnection]);
        }
      } else if (dragState.hoveredInputId) {
        // Connect to existing input
        const newConnection: ConnectionData = {
          id: `conn_${Date.now()}`,
          fromNodeId: dragState.fromNodeId,
          toNodeId: dragState.hoveredNodeId,
          toInputId: dragState.hoveredInputId
        };
        
        setConnections(prev => [...prev, newConnection]);
        
        // Mark the input as connected
        setNodes(prev => prev.map(node => 
          node.id === dragState.hoveredNodeId 
            ? {
                ...node,
                inputs: node.inputs.map(input => 
                  input.id === dragState.hoveredInputId ? { ...input, connected: true } : input
                )
              }
            : node
        ));
      }
    }
    
    setDragState({
      isDragging: false,
      fromNodeId: null,
      currentX: 0,
      currentY: 0,
      hoveredNodeId: null,
      hoveredInputId: null,
      isInTapZone: false,
      isDisconnecting: false,
      disconnectedConnectionId: null,
      canCreateNewInput: false
    });
  }, [dragState, nodes]);

  const handleCanvasMouseUp = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    handleEndConnection();
  }, [handleEndConnection]);

  const getNodeById = (id: string) => nodes.find(n => n.id === id);

  const getConnectorPosition = (node: NodeData, type: 'output' | 'input', inputIndex?: number) => {
    if (type === 'output') {
      // Circle center calculation - use centralized height calculation
      const nodeHeight = getNodeHeight(node);
      
      return {
        x: node.x + 42 + 6, // Center of the 12px circle
        y: node.y + nodeHeight / 2  // Centered vertically in the node
      };
    } else {
      // Input position calculation
      return getInputPosition(node, inputIndex || 0);
    }
  };

  // Get connection state for inputs
  const getInputConnectionStates = (nodeId: string): InputConnectionState[] => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return [];
    
    // Check if all inputs are connected and we should show ADD
    const allInputsConnected = node.inputs.every(input => input.connected);
    const shouldShowAdd = dragState.isDragging && 
                         dragState.hoveredNodeId === nodeId && 
                         dragState.canCreateNewInput && 
                         allInputsConnected;
    
    const states: InputConnectionState[] = node.inputs.map((input, index) => ({
      hasIncomingConnection: input.connected,
      isBeingHovered: dragState.isDragging && dragState.hoveredNodeId === nodeId && dragState.hoveredInputId === input.id,
      isInTapZone: dragState.isDragging && dragState.hoveredNodeId === nodeId && dragState.hoveredInputId === input.id && dragState.isInTapZone,
      inputId: input.id,
      inputIndex: index,
      isDragging: dragState.isDragging
    }));
    
    // Add virtual ADD input if needed
    if (shouldShowAdd) {
      states.push({
        hasIncomingConnection: false,
        isBeingHovered: dragState.isDragging && dragState.hoveredNodeId === nodeId && dragState.canCreateNewInput,
        isInTapZone: dragState.isDragging && dragState.hoveredNodeId === nodeId && dragState.canCreateNewInput && dragState.isInTapZone,
        inputId: 'add-input',
        inputIndex: node.inputs.length,
        isAddInput: true,
        isDragging: dragState.isDragging
      });
    }
    
    return states;
  };



  return (
    <div 
      ref={canvasRef}
      className="relative w-full h-screen bg-gray-50 overflow-hidden select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleCanvasMouseUp}
    >
      {/* Canvas Grid Background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Canvas Content */}
      <div className="relative z-10">
        {/* Render established connections */}
        {connections.map(conn => {
          const fromNode = getNodeById(conn.fromNodeId);
          const toNode = getNodeById(conn.toNodeId);
          
          if (!fromNode || !toNode) return null;
          
          // Recalculate positions on every render when drag state changes
          const startPos = getConnectorPosition(fromNode, 'output');
          const toInputIndex = toNode.inputs.findIndex(input => input.id === conn.toInputId);
          const endPos = getConnectorPosition(toNode, 'input', toInputIndex);
          
          // Hide arrow if connecting to a triangle (connected input)
          const targetInput = toNode.inputs.find(input => input.id === conn.toInputId);
          const showArrow = !targetInput?.connected;
          
          return (
            <Connection
              key={`${conn.id}-${dragState.hoveredNodeId}-${dragState.canCreateNewInput}`}
              startX={startPos.x}
              startY={startPos.y}
              endX={endPos.x}
              endY={endPos.y}
              isDragging={false}
              showArrow={showArrow}
            />
          );
        })}

        {/* Render dragging connection preview */}
        {dragState.isDragging && dragState.fromNodeId && (
          (() => {
            const fromNode = getNodeById(dragState.fromNodeId);
            if (!fromNode) return null;
            
            const startPos = getConnectorPosition(fromNode, 'output');
            

            
            return (
              <Connection
                startX={startPos.x}
                startY={startPos.y}
                endX={dragState.currentX}
                endY={dragState.currentY}
                isDragging={true}
                showArrow={true}
              />
            );
          })()
        )}

        {/* Render nodes */}
        {nodes.map(node => {
          const inputConnectionStates = getInputConnectionStates(node.id);
          
          // Use centralized height calculation
          const nodeHeight = getNodeHeight(node);
          
          return (
            <WorkflowNode
              key={node.id}
              id={node.id}
              title={node.title}
              description={node.description}
              x={node.x}
              y={node.y}
              height={nodeHeight}
              inputs={node.inputs}
              onDrag={updateNodePosition}
              onStartConnection={handleStartConnection}
              onStartDisconnection={handleStartDisconnection}
              onRemoveInput={handleRemoveInput}
              inputConnectionStates={inputConnectionStates}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Canvas; 