import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Rect, Circle, Transformer, Text, Image as KonvaImage } from 'react-konva';
import { Square, Circle as CircleIcon, Type, MousePointer2, Pencil, Eraser, Trash2, Download, Undo2, Redo2, Minus, Plus, FileType } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSocket } from '../contexts/SocketContext';

interface CanvasProps {
  data: any;
  onSave: (data: any) => void;
  sessionId: string;
}

const COLORS = [
  '#18181b', // Zinc 900
  '#ef4444', // Red 500
  '#f97316', // Orange 500
  '#eab308', // Yellow 500
  '#22c55e', // Green 500
  '#3b82f6', // Blue 500
  '#a855f7', // Purple 500
];

export function Canvas({ data, onSave, sessionId }: CanvasProps) {
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#18181b');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [lines, setLines] = useState<any[]>(data?.lines || []);
  const [shapes, setShapes] = useState<any[]>(data?.shapes || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<any[]>([]);
  
  const { socket, isConnected } = useSocket();
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const isDrawing = useRef(false);

  // Socket listeners
  useEffect(() => {
    if (socket && isConnected) {
      socket.on('canvas-sync', (elements: any) => {
        setLines(elements.lines || []);
        setShapes(elements.shapes || []);
      });

      socket.on('cursor-update', (cursor: any) => {
        if (!cursor.position) return;
        setRemoteCursors(prev => {
          const index = prev.findIndex(c => c.uid === cursor.uid);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = cursor;
            return updated;
          }
          return [...prev, cursor];
        });
      });

      socket.on('presence-update', (users: any[]) => {
        // Filter out self and users not in this session
        setRemoteCursors(prev => prev.filter(c => users.some(u => u.uid === c.uid)));
      });

      return () => {
        socket.off('canvas-sync');
        socket.off('cursor-update');
        socket.off('presence-update');
      };
    }
  }, [socket, isConnected]);

  const emitCanvasUpdate = useCallback((newLines: any[], newShapes: any[]) => {
    if (socket && isConnected) {
      socket.emit('canvas-update', { roomId: sessionId, elements: { lines: newLines, shapes: newShapes } });
    }
  }, [socket, isConnected, sessionId]);

  const saveToHistory = useCallback(() => {
    setHistory(prev => [...prev, { lines: [...lines], shapes: [...shapes] }]);
    setRedoStack([]);
  }, [lines, shapes]);

  const undo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack(prev => [...prev, { lines: [...lines], shapes: [...shapes] }]);
    setLines(previous.lines);
    setShapes(previous.shapes);
    setHistory(prev => prev.slice(0, -1));
    onSave(previous);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory(prev => [...prev, { lines: [...lines], shapes: [...shapes] }]);
    setLines(next.lines);
    setShapes(next.shapes);
    setRedoStack(prev => prev.slice(0, -1));
    onSave(next);
  };

  const handleMouseDown = (e: any) => {
    if (tool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedId(null);
      }
      return;
    }

    saveToHistory();
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    
    if (tool === 'pencil' || tool === 'eraser') {
      const newLines = [...lines, { 
        id: Date.now().toString(),
        tool, 
        points: [pos.x, pos.y], 
        stroke: tool === 'eraser' ? '#ffffff' : color, 
        strokeWidth 
      }];
      setLines(newLines);
      emitCanvasUpdate(newLines, shapes);
    } else if (tool === 'rect') {
      const newShapes = [...shapes, { 
        id: Date.now().toString(), 
        type: 'rect', 
        x: pos.x, 
        y: pos.y, 
        width: 0, 
        height: 0, 
        fill: 'transparent', 
        stroke: color,
        strokeWidth
      }];
      setShapes(newShapes);
      emitCanvasUpdate(lines, newShapes);
    } else if (tool === 'circle') {
      const newShapes = [...shapes, { 
        id: Date.now().toString(), 
        type: 'circle', 
        x: pos.x, 
        y: pos.y, 
        radius: 0, 
        fill: 'transparent', 
        stroke: color,
        strokeWidth
      }];
      setShapes(newShapes);
      emitCanvasUpdate(lines, newShapes);
    } else if (tool === 'text') {
      const text = window.prompt('Enter text:');
      if (text) {
        const newShapes = [...shapes, {
          id: Date.now().toString(),
          type: 'text',
          x: pos.x,
          y: pos.y,
          text,
          fontSize: 20,
          fill: color
        }];
        setShapes(newShapes);
        isDrawing.current = false;
        onSave({ lines, shapes: newShapes });
        emitCanvasUpdate(lines, newShapes);
      }
    }
  };

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    // Emit cursor move
    if (socket && isConnected) {
      socket.emit('cursor-move', { roomId: sessionId, position: point });
    }

    if (!isDrawing.current) return;

    if (tool === 'pencil' || tool === 'eraser') {
      let lastLine = { ...lines[lines.length - 1] };
      lastLine.points = lastLine.points.concat([point.x, point.y]);
      const newLines = [...lines];
      newLines[newLines.length - 1] = lastLine;
      setLines(newLines);
      emitCanvasUpdate(newLines, shapes);
    } else if (tool === 'rect') {
      let lastShape = { ...shapes[shapes.length - 1] };
      lastShape.width = point.x - lastShape.x;
      lastShape.height = point.y - lastShape.y;
      const newShapes = [...shapes];
      newShapes[newShapes.length - 1] = lastShape;
      setShapes(newShapes);
      emitCanvasUpdate(lines, newShapes);
    } else if (tool === 'circle') {
      let lastShape = { ...shapes[shapes.length - 1] };
      const dx = point.x - lastShape.x;
      const dy = point.y - lastShape.y;
      lastShape.radius = Math.sqrt(dx * dx + dy * dy);
      const newShapes = [...shapes];
      newShapes[newShapes.length - 1] = lastShape;
      setShapes(newShapes);
      emitCanvasUpdate(lines, newShapes);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing.current) {
      isDrawing.current = false;
      onSave({ lines, shapes });
    }
  };

  const handleShapeClick = (id: string) => {
    if (tool === 'select') {
      setSelectedId(id);
    }
  };

  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const selectedNode = stageRef.current.findOne('#' + selectedId);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId]);

  const downloadCanvas = () => {
    const uri = stageRef.current.toDataURL();
    const link = document.createElement('a');
    link.download = 'central-space-canvas.png';
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [window.innerWidth, window.innerHeight]
      });
      
      const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
      doc.addImage(uri, 'PNG', 0, 0, window.innerWidth, window.innerHeight);
      doc.save(`canvas-${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error("Failed to export to PDF:", error);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-50 relative overflow-hidden font-sans">
      {/* Toolbar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4">
        <div className="flex items-center gap-1 p-1.5 bg-white/80 backdrop-blur-xl border border-zinc-200 rounded-2xl shadow-2xl">
          {[
            { id: 'select', icon: MousePointer2, label: 'Select' },
            { id: 'pencil', icon: Pencil, label: 'Pencil' },
            { id: 'eraser', icon: Eraser, label: 'Eraser' },
            { id: 'rect', icon: Square, label: 'Rectangle' },
            { id: 'circle', icon: CircleIcon, label: 'Circle' },
            { id: 'text', icon: Type, label: 'Text' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={cn(
                "p-2.5 rounded-xl transition-all duration-200",
                tool === t.id ? "bg-zinc-900 text-white shadow-lg scale-105" : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
              )}
              title={t.label}
            >
              <t.icon className="w-5 h-5" />
            </button>
          ))}
          <div className="w-px h-8 bg-zinc-200 mx-2" />
          <button 
            onClick={undo} 
            disabled={history.length === 0}
            className="p-2.5 text-zinc-400 hover:text-zinc-900 rounded-xl hover:bg-zinc-100 disabled:opacity-20 transition-colors" 
            title="Undo"
          >
            <Undo2 className="w-5 h-5" />
          </button>
          <button 
            onClick={redo} 
            disabled={redoStack.length === 0}
            className="p-2.5 text-zinc-400 hover:text-zinc-900 rounded-xl hover:bg-zinc-100 disabled:opacity-20 transition-colors" 
            title="Redo"
          >
            <Redo2 className="w-5 h-5" />
          </button>
          <div className="w-px h-8 bg-zinc-200 mx-2" />
          <button onClick={() => { setLines([]); setShapes([]); onSave({ lines: [], shapes: [] }); }} className="p-2.5 text-zinc-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors" title="Clear All">
            <Trash2 className="w-5 h-5" />
          </button>
          <button onClick={downloadCanvas} className="p-2.5 text-zinc-400 hover:text-zinc-900 rounded-xl hover:bg-zinc-100 transition-colors" title="Download PNG">
            <Download className="w-5 h-5" />
          </button>
          <button onClick={exportToPDF} className="p-2.5 text-zinc-400 hover:text-zinc-900 rounded-xl hover:bg-zinc-100 transition-colors" title="Export as PDF">
            <FileType className="w-5 h-5" />
          </button>
        </div>

        {/* Style Bar */}
        <div className="flex items-center gap-4 p-2 bg-white/80 backdrop-blur-xl border border-zinc-200 rounded-2xl shadow-xl animate-in">
          <div className="flex items-center gap-1.5 px-2">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                  color === c ? "border-zinc-900 scale-110" : "border-transparent"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="w-px h-6 bg-zinc-200" />
          <div className="flex items-center gap-2 px-2">
            <button onClick={() => setStrokeWidth(Math.max(1, strokeWidth - 1))} className="p-1 text-zinc-400 hover:text-zinc-900"><Minus className="w-4 h-4" /></button>
            <span className="text-[10px] font-bold w-4 text-center">{strokeWidth}</span>
            <button onClick={() => setStrokeWidth(Math.min(20, strokeWidth + 1))} className="p-1 text-zinc-400 hover:text-zinc-900"><Plus className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white">
        <Stage
          width={window.innerWidth}
          height={window.innerHeight}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          ref={stageRef}
          className="bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]"
        >
          <Layer>
            {shapes.map((shape) => (
              <React.Fragment key={shape.id}>
                {shape.type === 'rect' && (
                  <Rect
                    id={shape.id}
                    {...shape}
                    draggable={tool === 'select'}
                    onClick={() => handleShapeClick(shape.id)}
                    onDragEnd={(e) => {
                      const newShapes = shapes.map(s => s.id === shape.id ? { ...s, x: e.target.x(), y: e.target.y() } : s);
                      setShapes(newShapes);
                      onSave({ lines, shapes: newShapes });
                      emitCanvasUpdate(lines, newShapes);
                    }}
                  />
                )}
                {shape.type === 'circle' && (
                  <Circle
                    id={shape.id}
                    {...shape}
                    draggable={tool === 'select'}
                    onClick={() => handleShapeClick(shape.id)}
                    onDragEnd={(e) => {
                      const newShapes = shapes.map(s => s.id === shape.id ? { ...s, x: e.target.x(), y: e.target.y() } : s);
                      setShapes(newShapes);
                      onSave({ lines, shapes: newShapes });
                      emitCanvasUpdate(lines, newShapes);
                    }}
                  />
                )}
                {shape.type === 'text' && (
                  <Text
                    id={shape.id}
                    {...shape}
                    draggable={tool === 'select'}
                    onClick={() => handleShapeClick(shape.id)}
                    onDragEnd={(e) => {
                      const newShapes = shapes.map(s => s.id === shape.id ? { ...s, x: e.target.x(), y: e.target.y() } : s);
                      setShapes(newShapes);
                      onSave({ lines, shapes: newShapes });
                      emitCanvasUpdate(lines, newShapes);
                    }}
                  />
                )}
              </React.Fragment>
            ))}
            {lines.map((line) => (
              <Line
                key={line.id}
                points={line.points}
                stroke={line.stroke}
                strokeWidth={line.strokeWidth}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  line.tool === 'eraser' ? 'destination-out' : 'source-over'
                }
              />
            ))}
            
            {/* Remote Cursors */}
            {remoteCursors.map((cursor) => (
              <React.Fragment key={cursor.uid}>
                <Circle
                  x={cursor.position.x}
                  y={cursor.position.y}
                  radius={4}
                  fill={cursor.color || "#ef4444"}
                  opacity={0.6}
                />
                <Text 
                  x={cursor.position.x + 8}
                  y={cursor.position.y - 8}
                  text={cursor.displayName}
                  fontSize={10}
                  fill={cursor.color || "#ef4444"}
                />
              </React.Fragment>
            ))}
            {selectedId && tool === 'select' && (
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 5 || newBox.height < 5) return oldBox;
                  return newBox;
                }}
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
