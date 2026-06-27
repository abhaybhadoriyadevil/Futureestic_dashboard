import React, { useState, useRef, useEffect } from 'react';
import { useWidgetStore } from '../../stores/useWidgetStore';
import { Plus, Trash2, GitPullRequest, Check } from 'lucide-react';

interface MindNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
}

interface Connection {
  from: string;
  to: string;
}

interface MindMapWidgetProps {
  widgetId: string;
  dataRef?: string; // Stores JSON string: { nodes: MindNode[], connections: Connection[] }
  isEditMode: boolean;
  showControls?: boolean;
}

export const MindMapWidget: React.FC<MindMapWidgetProps> = ({ widgetId, dataRef, showControls = false }) => {
  const { commitWidgetUpdate } = useWidgetStore();

  const [nodes, setNodes] = useState<MindNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  
  // Interactive nodes editing
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editLabelText, setEditLabelText] = useState('');

  // Node connection modes
  const [connectionSourceId, setConnectionSourceId] = useState<string | null>(null);
  const [isConnectMode, setIsConnectMode] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);

  // Load board from dataRef
  useEffect(() => {
    if (dataRef) {
      try {
        const parsed = JSON.parse(dataRef);
        if (parsed.nodes && parsed.connections) {
          setNodes(parsed.nodes);
          setConnections(parsed.connections);
        }
      } catch (e) {
        console.error('Failed to parse Mindmap dataRef', e);
      }
    }
  }, [dataRef]);

  const saveMap = async (newNodes: MindNode[], newConns: Connection[]) => {
    setNodes(newNodes);
    setConnections(newConns);
    await commitWidgetUpdate(widgetId, {
      dataRef: JSON.stringify({ nodes: newNodes, connections: newConns })
    });
  };

  const handleAddNode = () => {
    const id = `node-${Math.random().toString(36).substr(2, 9)}`;
    
    // Default place in the middle of canvas (roughly 200, 150)
    const newNode: MindNode = {
      id,
      label: 'New Node',
      x: 180 + Math.random() * 60,
      y: 130 + Math.random() * 60,
      color: '#3b82f6'
    };

    const updatedNodes = [...nodes, newNode];
    saveMap(updatedNodes, connections);
    setSelectedNodeId(id);
    setEditLabelText('New Node');
  };

  const handleDeleteNode = (id: string) => {
    const updatedNodes = nodes.filter(n => n.id !== id);
    // Delete any connection attached to this node
    const updatedConns = connections.filter(c => c.from !== id && c.to !== id);
    saveMap(updatedNodes, updatedConns);
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  // Node Dragging pointer handlers
  const handleNodePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    
    if (isConnectMode) {
      // Connect nodes flow
      if (!connectionSourceId) {
        setConnectionSourceId(id);
      } else if (connectionSourceId !== id) {
        // Add connection
        const exists = connections.some(
          c => (c.from === connectionSourceId && c.to === id) || (c.from === id && c.to === connectionSourceId)
        );
        if (!exists) {
          const updatedConns = [...connections, { from: connectionSourceId, to: id }];
          saveMap(nodes, updatedConns);
        }
        setConnectionSourceId(null);
        setIsConnectMode(false);
      }
      return;
    }

    const node = nodes.find(n => n.id === id);
    if (!node) return;

    setDraggingNodeId(id);
    setSelectedNodeId(id);
    setEditLabelText(node.label);
    
    // Calculate offsets
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;
      setDragOffset({
        x: pointerX - node.x,
        y: pointerY - node.y
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingNodeId || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    const targetX = Math.max(20, Math.min(rect.width - 20, pointerX - dragOffset.x));
    const targetY = Math.max(20, Math.min(rect.height - 20, pointerY - dragOffset.y));

    setNodes(nodes.map(n => n.id === draggingNodeId ? { ...n, x: targetX, y: targetY } : n));
  };

  const handlePointerUp = () => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
      saveMap(nodes, connections);
    }
  };

  const handleSaveLabel = () => {
    if (!selectedNodeId) return;
    const updated = nodes.map(n => n.id === selectedNodeId ? { ...n, label: editLabelText } : n);
    saveMap(updated, connections);
  };

  // Find node by ID
  const getNode = (id: string) => nodes.find(n => n.id === id);

  return (
    <div 
      className="w-full h-full flex flex-col p-4 text-xs text-primary-text bg-transparent overflow-hidden"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* HUD Toolbar */}
      {showControls && (
        <div className="flex justify-between items-center mb-3">
          <div className="flex gap-2">
            <button
              onClick={handleAddNode}
              className="px-2.5 py-1 bg-cyan-accent text-black font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Idea</span>
            </button>
            
            <button
              onClick={() => {
                setIsConnectMode(!isConnectMode);
                setConnectionSourceId(null);
              }}
              className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 cursor-pointer transition-colors ${
                isConnectMode
                  ? 'border-cyan-accent bg-cyan-accent/15 text-cyan-accent shadow-[0_0_8px_rgba(6,182,212,0.15)] animate-pulse'
                  : 'border-color-border-color bg-glass-bg text-secondary-text hover:text-primary-text hover:border-cyan-accent'
              }`}
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>{isConnectMode ? 'Link Mode Active' : 'Link Nodes'}</span>
            </button>
          </div>
          
          {isConnectMode && (
            <span className="text-[10px] text-cyan-accent font-bold animate-[pulse_2s_infinite]">
              {connectionSourceId ? 'Select second node to link...' : 'Select source node to link...'}
            </span>
          )}
        </div>
      )}

      {/* SVG Canvas Board */}
      <div className="flex-1 rounded-xl border border-color-border-color bg-glass-bg/10 relative overflow-hidden">
        
        {/* Draw node lines and circles */}
        <svg 
          ref={svgRef}
          className="w-full h-full absolute inset-0 touch-none"
        >
          {/* 1. Connections Lines */}
          {connections.map((c, idx) => {
            const fromNode = getNode(c.from);
            const toNode = getNode(c.to);
            if (!fromNode || !toNode) return null;

            return (
              <line
                key={idx}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                className="stroke-cyan-accent"
                strokeWidth="3"
                strokeDasharray="5 5"
                strokeLinecap="round"
                opacity="0.8"
              />
            );
          })}

          {/* 2. Nodes Circles Groups */}
          {nodes.map(node => {
            const isSelected = selectedNodeId === node.id;
            const isConnectingSource = connectionSourceId === node.id;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                className="cursor-grab active:cursor-grabbing group/node"
              >
                {/* Invisible hit area for easier clicking/linking */}
                <circle r="32" fill="transparent" />
                
                {/* Neon shadow circle indicator */}
                <circle
                  r={isSelected ? "12" : "8"}
                  fill={isConnectingSource ? "#06b6d4" : node.color}
                  className={`transition-all duration-300 opacity-60 ${
                    isSelected ? 'filter drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : ''
                  }`}
                />
                
                {/* Node Label Text */}
                <text
                  y="-16"
                  textAnchor="middle"
                  className="fill-current text-white font-semibold text-[10px] filter drop-shadow-md select-none"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Node detail and edit popover panel */}
        {showControls && selectedNodeId && getNode(selectedNodeId) && (
          <div className="absolute bottom-3 left-3 right-3 glass-panel rounded-xl px-3 py-2 border border-color-border-color flex justify-between items-center gap-4 z-10 shadow-xl animate-[fadeIn_0.15s_ease-out]">
            <div className="flex-1 flex gap-2 items-center">
              <input
                type="text"
                value={editLabelText}
                onChange={(e) => setEditLabelText(e.target.value)}
                onBlur={handleSaveLabel}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveLabel()}
                className="flex-1 bg-secondary-bg/50 border border-color-border-color rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-accent text-primary-text"
              />
              <button
                onClick={handleSaveLabel}
                className="p-1 rounded bg-cyan-accent text-black hover:opacity-90"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="flex gap-1">
              {/* Color selectors */}
              {['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981'].map(color => (
                <button
                  key={color}
                  onClick={() => {
                    const updated = nodes.map(n => n.id === selectedNodeId ? { ...n, color } : n);
                    saveMap(updated, connections);
                  }}
                  style={{ backgroundColor: color }}
                  className={`w-4 h-4 rounded-full border ${
                    getNode(selectedNodeId)?.color === color ? 'border-white' : 'border-transparent'
                  }`}
                />
              ))}
              
              <div className="w-[1px] h-4 bg-color-border-color mx-1.5 self-center" />
              
              <button
                onClick={() => handleDeleteNode(selectedNodeId)}
                className="p-1.5 text-muted-text hover:text-red-500 rounded hover:bg-glass-bg cursor-pointer"
                title="Delete node"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
