import React, { useState, useEffect, useRef } from 'react';
import { Download, Upload, Plus, Trash2, Save, BarChart3, PieChart, LineChart, Table2, Sparkles, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface SpreadsheetEditorProps {
  data: string; // JSON string of workbook data or empty
  onSave: (data: string) => void;
  onAIAction: (action: string, context: string) => Promise<string>;
}

export function SpreadsheetEditor({ data, onSave, onAIAction }: SpreadsheetEditorProps) {
  const [workbook, setWorkbook] = useState<any[]>([]);
  const [activeSheet, setActiveSheet] = useState<number>(0);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isRecordingMacro, setIsRecordingMacro] = useState(false);
  const [macroActions, setMacroActions] = useState<any[]>([]);

  useEffect(() => {
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          setWorkbook(parsed);
        }
      } catch (e) {
        console.error("Failed to parse spreadsheet data", e);
        // Initialize empty
        setWorkbook([{ name: 'Sheet1', data: Array(20).fill(Array(10).fill('')) }]);
      }
    } else {
      setWorkbook([{ name: 'Sheet1', data: Array(20).fill(Array(10).fill('')) }]);
    }
  }, [data]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      
      const newWorkbook = wb.SheetNames.map(name => ({
        name,
        data: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 })
      }));
      
      setWorkbook(newWorkbook);
      setActiveSheet(0);
      onSave(JSON.stringify(newWorkbook));
    };
    reader.readAsBinaryString(file);
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    workbook.forEach(sheet => {
      const ws = XLSX.utils.aoa_to_sheet(sheet.data);
      XLSX.utils.book_append_sheet(wb, ws, sheet.name);
    });
    XLSX.writeFile(wb, 'export.xlsx');
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newWorkbook = [...workbook];
    const newData = [...newWorkbook[activeSheet].data];
    const newRow = [...(newData[rowIndex] || [])];
    newRow[colIndex] = value;
    newData[rowIndex] = newRow;
    newWorkbook[activeSheet] = { ...newWorkbook[activeSheet], data: newData };
    setWorkbook(newWorkbook);
  };

  const handleSave = () => {
    onSave(JSON.stringify(workbook));
    toast.success('Spreadsheet saved');
  };

  const handleAIAnalysis = async () => {
    if (!aiPrompt.trim()) return;
    setIsAIProcessing(true);
    try {
      const context = JSON.stringify(workbook[activeSheet].data.slice(0, 50)); // Send first 50 rows as context
      const result = await onAIAction(`Analyze this spreadsheet data and perform: ${aiPrompt}. Return the result as a JSON array of arrays representing the new sheet data. Only return the JSON.`, context);
      
      try {
        const newData = JSON.parse(result.replace(/```json|```/g, '').trim());
        if (Array.isArray(newData)) {
          const newWorkbook = [...workbook];
          newWorkbook.push({ name: `AI: ${aiPrompt.substring(0, 10)}`, data: newData });
          setWorkbook(newWorkbook);
          setActiveSheet(newWorkbook.length - 1);
          onSave(JSON.stringify(newWorkbook));
          
          if (isRecordingMacro) {
            setMacroActions(prev => [...prev, { type: 'aiAction', prompt: aiPrompt }]);
          }
          
          toast.success('AI Analysis complete');
        }
      } catch (e) {
        toast.error('Failed to parse AI response');
      }
    } catch (error) {
      toast.error('AI Analysis failed');
    } finally {
      setIsAIProcessing(false);
      setAiPrompt('');
    }
  };

  if (!workbook.length) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-400" /></div>;

  const currentData = workbook[activeSheet].data;

  return (
    <div className="flex flex-col h-full bg-white font-sans">
      {/* Toolbar */}
      <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
        <div className="flex items-center gap-2">
          <label className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-white rounded-xl transition-all cursor-pointer" title="Import XLSX">
            <Upload className="w-5 h-5" />
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
          </label>
          <button onClick={exportToExcel} className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-white rounded-xl transition-all" title="Export XLSX">
            <Download className="w-5 h-5" />
          </button>
          <button onClick={handleSave} className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-white rounded-xl transition-all" title="Save">
            <Save className="w-5 h-5" />
          </button>
          
          <div className="w-px h-6 bg-zinc-200 mx-2" />
          
          <button className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-white rounded-xl transition-all" title="Bar Chart (Coming Soon)"><BarChart3 className="w-5 h-5" /></button>
          <button className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-white rounded-xl transition-all" title="Pie Chart (Coming Soon)"><PieChart className="w-5 h-5" /></button>
          <button className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-white rounded-xl transition-all" title="Line Chart (Coming Soon)"><LineChart className="w-5 h-5" /></button>
          
          <div className="w-px h-6 bg-zinc-200 mx-2" />
          
          <button 
            onClick={() => {
              if (isRecordingMacro) {
                setIsRecordingMacro(false);
                toast.success(`Macro saved with ${macroActions.length} actions.`);
              } else {
                setIsRecordingMacro(true);
                setMacroActions([]);
                toast.info('Started recording macro...');
              }
            }}
            className={`p-2 rounded-xl transition-all flex items-center gap-2 ${isRecordingMacro ? "bg-red-500 text-white animate-pulse" : "text-zinc-400 hover:text-zinc-900 hover:bg-white"}`}
            title={isRecordingMacro ? "Stop Recording" : "Record Macro"}
          >
            <div className={`w-2 h-2 rounded-full ${isRecordingMacro ? "bg-white" : "bg-red-500"}`} />
            {isRecordingMacro && <span className="text-xs font-bold">REC</span>}
          </button>
          {!isRecordingMacro && macroActions.length > 0 && (
            <button 
              onClick={async () => {
                toast.info('Applying macro...');
                let currentWorkbook = [...workbook];
                for (const action of macroActions) {
                  if (action.type === 'aiAction') {
                    const context = JSON.stringify(currentWorkbook[activeSheet].data.slice(0, 50));
                    const result = await onAIAction(`Analyze this spreadsheet data and perform: ${action.prompt}. Return the result as a JSON array of arrays representing the new sheet data. Only return the JSON.`, context);
                    try {
                      const newData = JSON.parse(result.replace(/```json|```/g, '').trim());
                      if (Array.isArray(newData)) {
                        currentWorkbook.push({ name: `AI: ${action.prompt.substring(0, 10)}`, data: newData });
                      }
                    } catch (e) {
                      console.error('Failed to apply macro action', e);
                    }
                  }
                }
                setWorkbook(currentWorkbook);
                setActiveSheet(currentWorkbook.length - 1);
                onSave(JSON.stringify(currentWorkbook));
                toast.success('Macro applied successfully.');
              }}
              className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all"
              title="Apply Macro to Current Spreadsheet"
            >
              Apply Macro
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-zinc-200">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <input 
              type="text" 
              placeholder="Ask AI to analyze data..." 
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAIAnalysis()}
              className="bg-transparent border-none text-sm focus:outline-none w-64"
            />
            <button 
              onClick={handleAIAnalysis}
              disabled={isAIProcessing || !aiPrompt.trim()}
              className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg disabled:opacity-50"
            >
              {isAIProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Run'}
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto bg-zinc-50 p-4">
        <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden inline-block min-w-full">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-zinc-200 bg-zinc-100 w-10"></th>
                {Array.from({ length: Math.max(10, currentData[0]?.length || 0) }).map((_, i) => (
                  <th key={i} className="border border-zinc-200 bg-zinc-50 px-4 py-2 font-medium text-zinc-500 text-center min-w-[100px]">
                    {String.fromCharCode(65 + i)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentData.map((row: any[], rowIndex: number) => (
                <tr key={rowIndex}>
                  <td className="border border-zinc-200 bg-zinc-50 text-center text-xs font-medium text-zinc-400 py-2">
                    {rowIndex + 1}
                  </td>
                  {Array.from({ length: Math.max(10, currentData[0]?.length || 0) }).map((_, colIndex) => (
                    <td key={colIndex} className="border border-zinc-200 p-0 relative">
                      <input
                        type="text"
                        value={row[colIndex] || ''}
                        onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                        className="w-full h-full px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:z-10 relative bg-transparent"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sheet Tabs */}
      <div className="flex items-center gap-1 p-2 border-t border-zinc-200 bg-zinc-50 overflow-x-auto">
        {workbook.map((sheet, idx) => (
          <button
            key={idx}
            onClick={() => setActiveSheet(idx)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
              activeSheet === idx 
                ? 'border-indigo-500 text-indigo-600 bg-white' 
                : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            {sheet.name}
          </button>
        ))}
        <button 
          onClick={() => {
            const newWorkbook = [...workbook, { name: `Sheet${workbook.length + 1}`, data: Array(20).fill(Array(10).fill('')) }];
            setWorkbook(newWorkbook);
            setActiveSheet(newWorkbook.length - 1);
          }}
          className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 rounded-lg ml-2"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
