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

  const getInputPosition = (node: NodeData, inputIndex: number) => {
    const baseHeight = 48;
    const inputHeight = 12;
    const spacing = 8;
    const topMargin = 8;
    
    if (node.inputs.length === 1) {
      // Single input: center on triangle (positioned at left-[-15px] + 6px = -9px from node)
      return {
        x: node.x - 8,
        y: node.y + baseHeight / 2 - inputHeight / 2 + 6 // Match WorkflowNode calculation
      };
          } else {
        // Multiple inputs: center on triangles positioned from top margin (accounting for translateY(-6px))
        return {
          x: node.x - 8,
          y: node.y + topMargin + 2 + inputIndex * (inputHeight + spacing) + inputHeight / 2 - 2
        };
      }
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

  const handleAddInput = useCallback((nodeId: string) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId 
        ? {
            ...node,
            inputs: [...node.inputs, { id: `input-${Date.now()}`, connected: false }]
          }
        : node
    ));
  }, []);

  const isPointInNodeTapZone = (mouseX: number, mouseY: number, node: NodeData) => {
    const tapZoneSize = 72; // 1.5x the 48px node size
    const nodeHeight = calculateNodeHeight(node.inputs.length);
    
    return (
      mouseX >= node.x - tapZoneSize / 2 &&
      mouseX <= node.x + 48 + tapZoneSize / 2 &&
      mouseY >= node.y - tapZoneSize / 2 &&
      mouseY <= node.y + nodeHeight + tapZoneSize / 2
    );
  };

  const isPointInInputZone = (mouseX: number, mouseY: number, node: NodeData, inputIndex: number) => {
    const tapZoneSize = 72; // 1.5x the 48px node size
    const inputPos = getInputPosition(node, inputIndex);
    
    return (
      mouseX >= inputPos.x - tapZoneSize / 2 &&
      mouseX <= inputPos.x + tapZoneSize / 2 &&
      mouseY >= inputPos.y - tapZoneSize / 2 &&
      mouseY <= inputPos.y + tapZoneSize / 2
    );
  };

  const isPointInInputTapZone = (mouseX: number, mouseY: number, node: NodeData, inputIndex: number) => {
    // Tap zone for input connectors: +4pt padding on each side
    const tapZonePadding = 4;
    const inputPos = getInputPosition(node, inputIndex);
    const inputWidth = 12; // Width of input connector
    const inputHeight = 12; // Height of input connector
    
    return (
      mouseX >= inputPos.x - tapZonePadding &&
      mouseX <= inputPos.x + inputWidth + tapZonePadding &&
      mouseY >= inputPos.y - inputHeight/2 - tapZonePadding &&
      mouseY <= inputPos.y + inputHeight/2 + tapZonePadding
    );
  };

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
  }, [dragState.isDragging, dragState.fromNodeId, nodes]);

  const handleEndConnection = useCallback((event: React.MouseEvent) => {
    if (dragState.isDragging && dragState.fromNodeId && dragState.hoveredNodeId && dragState.isInTapZone) {
      if (dragState.canCreateNewInput) {
        // Create new input and connect to it
        const newInputId = `input-${Date.now()}`;
        
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
  }, [dragState]);

  const handleCanvasMouseUp = useCallback((event: React.MouseEvent) => {
    handleEndConnection(event);
  }, [handleEndConnection]);

  const getNodeById = (id: string) => nodes.find(n => n.id === id);

  const getConnectorPosition = (node: NodeData, type: 'output' | 'input', inputIndex?: number) => {
    if (type === 'output') {
      // Circle center calculation - now properly centered based on node height
      const nodeHeight = calculateNodeHeight(node.inputs.length);
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
  const getInputConnectionStates = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return [];
    
    // Check if all inputs are connected and we should show ADD
    const allInputsConnected = node.inputs.every(input => input.connected);
    const shouldShowAdd = dragState.isDragging && 
                         dragState.hoveredNodeId === nodeId && 
                         dragState.canCreateNewInput && 
                         allInputsConnected;
    
    const states = node.inputs.map((input, index) => ({
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
        isBeingHovered: true,
        isInTapZone: true,
        inputId: 'add-input',
        inputIndex: node.inputs.length,
        isAddInput: true,
        isDragging: dragState.isDragging
      } as any);
    }
    
    return states;
  };

  // Function to check if mouse is over input connector (for hover effects)
  const getInputHoverStates = (nodeId: string, mouseX: number, mouseY: number) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return [];
    
    return node.inputs.map((input, index) => ({
      inputId: input.id,
      isHovered: isPointInInputTapZone(mouseX, mouseY, node, index)
    }));
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
          
          const startPos = getConnectorPosition(fromNode, 'output');
          const toInputIndex = toNode.inputs.findIndex(input => input.id === conn.toInputId);
          const endPos = getConnectorPosition(toNode, 'input', toInputIndex);
          
          // Hide arrow if connecting to a triangle (connected input)
          const targetInput = toNode.inputs.find(input => input.id === conn.toInputId);
          const showArrow = !targetInput?.connected;
          
          return (
            <Connection
              key={conn.id}
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
          
          // Check if we should show ADD input (virtual input) and expand node
          const allInputsConnected = node.inputs.every(input => input.connected);
          const shouldShowAdd = dragState.isDragging && 
                               dragState.hoveredNodeId === node.id && 
                               dragState.canCreateNewInput && 
                               allInputsConnected;
          
          // Calculate height including virtual ADD input if shown
          const effectiveInputCount = shouldShowAdd ? node.inputs.length + 1 : node.inputs.length;
          const nodeHeight = calculateNodeHeight(effectiveInputCount);
          
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
              onAddInput={handleAddInput}
              inputConnectionStates={inputConnectionStates}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Canvas; 