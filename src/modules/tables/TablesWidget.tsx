import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../core/storage/db';
import type { TableData } from '../../types';
import { 
  Table as TableIcon, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  Upload, 
  Filter, 
  Check, 
  Edit2, 
  PlusCircle, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';

interface TablesWidgetProps {
  widgetId: string;
  dataRef?: string; // Points to a specific Table ID, or undefined to show table selector
  isEditMode: boolean;
  showControls?: boolean;
}

export const TablesWidget: React.FC<TablesWidgetProps> = ({ dataRef, showControls = false }) => {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(dataRef || null);
  
  // Table state
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterQuery, setFilterQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // New Table Form States
  const [newTableName, setNewTableName] = useState('');
  const [newCols, setNewCols] = useState<{ key: string; name: string; type: any; options?: string }[]>([
    { key: 'item', name: 'Item', type: 'text' },
    { key: 'amount', name: 'Amount', type: 'number' }
  ]);

  // Editing States
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);
  const [editRowData, setEditRowData] = useState<Record<string, any>>({});

  const tables = useLiveQuery(() => db.customTables.toArray()) || [];
  const activeTable = tables.find((t: TableData) => t.id === selectedTableId);

  useEffect(() => {
    if (dataRef) {
      setSelectedTableId(dataRef);
    }
  }, [dataRef]);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;

    const id = `table-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    const formattedColumns = newCols.map(col => ({
      key: col.key.trim().toLowerCase().replace(/\s+/g, '_'),
      name: col.name,
      type: col.type,
      options: col.options ? col.options.split(',').map(o => o.trim()) : undefined
    }));

    const newTable: TableData = {
      id,
      name: newTableName,
      columns: formattedColumns,
      rows: [],
      createdAt: now,
      updatedAt: now,
    };

    await db.customTables.add(newTable);
    setNewTableName('');
    setSelectedTableId(id);
  };

  const handleAddColumnField = () => {
    setNewCols([...newCols, { key: `col_${newCols.length + 1}`, name: `Column ${newCols.length + 1}`, type: 'text' }]);
  };

  const handleAddRow = async () => {
    if (!activeTable) return;
    const newRow: Record<string, any> = {};
    activeTable.columns.forEach(col => {
      if (col.type === 'number') newRow[col.key] = 0;
      else if (col.type === 'boolean') newRow[col.key] = false;
      else newRow[col.key] = '';
    });

    const updatedRows = [...activeTable.rows, newRow];
    await db.customTables.update(activeTable.id, {
      rows: updatedRows,
      updatedAt: Date.now()
    });

    setEditingRowIdx(updatedRows.length - 1);
    setEditRowData(newRow);
  };

  const handleStartEditRow = (rowIdx: number, row: Record<string, any>) => {
    setEditingRowIdx(rowIdx);
    setEditRowData({ ...row });
  };

  const handleSaveRow = async (rowIdx: number) => {
    if (!activeTable) return;
    const updatedRows = [...activeTable.rows];
    updatedRows[rowIdx] = editRowData;

    await db.customTables.update(activeTable.id, {
      rows: updatedRows,
      updatedAt: Date.now()
    });
    setEditingRowIdx(null);
  };

  const handleDeleteRow = async (rowIdx: number) => {
    if (!activeTable) return;
    if (confirm('Delete this row?')) {
      const updatedRows = activeTable.rows.filter((_: unknown, idx: number) => idx !== rowIdx);
      await db.customTables.update(activeTable.id, {
        rows: updatedRows,
        updatedAt: Date.now()
      });
      setEditingRowIdx(null);
    }
  };

  // CSV Import
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeTable) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const newRows: Record<string, any>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row: Record<string, any> = {};
        activeTable.columns.forEach(col => {
          const headerIdx = headers.indexOf(col.key);
          const rawVal = headerIdx !== -1 ? values[headerIdx] : '';
          
          if (col.type === 'number') {
            row[col.key] = parseFloat(rawVal) || 0;
          } else if (col.type === 'boolean') {
            row[col.key] = rawVal.toLowerCase() === 'true';
          } else {
            row[col.key] = rawVal || '';
          }
        });
        newRows.push(row);
      }

      await db.customTables.update(activeTable.id, {
        rows: [...activeTable.rows, ...newRows],
        updatedAt: Date.now()
      });
      alert(`Imported ${newRows.length} rows successfully.`);
    } catch (err) {
      alert('Failed to parse CSV. Please check formatting.');
    }
  };

  // CSV Export
  const handleCSVExport = () => {
    if (!activeTable) return;
    const headers = activeTable.columns.map(col => col.key).join(',');
    const rows = activeTable.rows.map(row => 
      activeTable.columns.map(col => row[col.key] ?? '').join(',')
    ).join('\n');

    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTable.name.toLowerCase().replace(/\s+/g, '_')}_export.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Sort & Filter rows
  const getProcessedRows = () => {
    if (!activeTable) return [];
    let processed = [...activeTable.rows];

    // Filter
    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      processed = processed.filter(row => 
        Object.values(row).some(val => String(val).toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortKey) {
      processed.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return sortDirection === 'asc' 
          ? strA.localeCompare(strB) 
          : strB.localeCompare(strA);
      });
    }

    return processed;
  };

  const processedRows = getProcessedRows();
  
  // Pagination slice
  const paginatedRows = processedRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(processedRows.length / itemsPerPage) || 1;

  // Render Table Selector (when dataRef is undefined)
  if (!selectedTableId || !activeTable) {
    return (
      <div className="w-full h-full flex overflow-hidden text-xs text-primary-text bg-transparent p-4">
        
        {/* Left column: List of tables */}
        <div className="w-1/2 pr-3 border-r border-color-border-color flex flex-col gap-2 overflow-y-auto no-scrollbar">
          <span className="text-[10px] font-bold text-muted-text uppercase tracking-widest flex items-center gap-1.5 border-b border-color-border-color pb-1.5 mb-1.5">
            <TableIcon className="w-3.5 h-3.5" />
            <span>Select Workspace Table</span>
          </span>
          {tables.length === 0 ? (
            <div className="p-6 text-center italic text-muted-text">No tables created yet.</div>
          ) : (
            tables.map((t: TableData) => (
              <button
                key={t.id}
                onClick={() => setSelectedTableId(t.id)}
                className="w-full text-left p-3 rounded-xl border border-color-border-color bg-glass-bg/40 hover:bg-glass-bg transition-colors flex justify-between items-center cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-primary-text">{t.name}</div>
                  <div className="text-[9px] text-muted-text mt-0.5">{t.columns.length} columns &bull; {t.rows.length} records</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-text" />
              </button>
            ))
          )}
        </div>

        {/* Right column: Create table form */}
        <div className="w-1/2 pl-3 flex flex-col gap-2 overflow-y-auto no-scrollbar">
          <span className="text-[10px] font-bold text-muted-text uppercase tracking-widest flex items-center gap-1.5 border-b border-color-border-color pb-1.5 mb-1.5">
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Custom Table</span>
          </span>
          
          <form onSubmit={handleCreateTable} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted-text font-semibold uppercase">Table Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Asset Balance Sheet"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                className="px-3 py-1.5 rounded-lg glass-panel border border-color-border-color focus:outline-none focus:border-cyan-accent text-primary-text bg-transparent"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-muted-text font-semibold uppercase">Define Columns</label>
                <button
                  type="button"
                  onClick={handleAddColumnField}
                  className="text-[10px] text-cyan-accent font-bold hover:underline cursor-pointer"
                >
                  + Add Col
                </button>
              </div>

              <div className="space-y-1.5 max-h-[140px] overflow-y-auto no-scrollbar pr-0.5">
                {newCols.map((col, idx) => (
                  <div key={idx} className="flex gap-1.5 items-center">
                    <input
                      type="text"
                      required
                      placeholder="Key"
                      value={col.name}
                      onChange={(e) => {
                        const updated = [...newCols];
                        updated[idx].name = e.target.value;
                        updated[idx].key = e.target.value.toLowerCase().replace(/\s+/g, '_');
                        setNewCols(updated);
                      }}
                      className="w-1/2 px-2 py-1 rounded bg-secondary-bg/40 border border-color-border-color focus:outline-none focus:border-cyan-accent text-primary-text text-[10px]"
                    />
                    <select
                      value={col.type}
                      onChange={(e) => {
                        const updated = [...newCols];
                        updated[idx].type = e.target.value as any;
                        setNewCols(updated);
                      }}
                      className="w-1/2 px-2 py-1 rounded bg-secondary-bg border border-color-border-color text-primary-text text-[10px]"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="boolean">Boolean</option>
                      <option value="select">Dropdown</option>
                    </select>
                    {newCols.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setNewCols(newCols.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:bg-glass-bg p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-cyan-accent text-black font-bold rounded-xl mt-2 hover:opacity-90 transition-opacity cursor-pointer text-xs"
            >
              Generate Table Schema
            </button>
          </form>
        </div>

      </div>
    );
  }

  // Render Spreadsheets UI grid (when dataRef points to a valid Table)
  return (
    <div className="w-full h-full flex flex-col p-4 text-xs text-primary-text bg-transparent overflow-hidden">
      
      {/* Table Toolbar controls */}
      <div className="flex justify-between items-center gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          {/* Back button only if we are in selector mode */}
          {!dataRef && (
            <button
              onClick={() => setSelectedTableId(null)}
              className="text-muted-text hover:text-primary-text cursor-pointer mr-1.5"
            >
              &larr; Back
            </button>
          )}
          <span className="font-bold text-sm tracking-wide text-primary-text truncate max-w-xs">{activeTable.name}</span>
        </div>

        {/* Filters and CSV actions */}
        <div className="flex items-center gap-2">
          {showControls && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-color-border-color bg-glass-bg/40 focus-within:border-cyan-accent max-w-[140px]">
              <Filter className="w-3.5 h-3.5 text-muted-text" />
              <input
                type="text"
                placeholder="Filter spreadsheet..."
                value={filterQuery}
                onChange={(e) => { setFilterQuery(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-[10px] w-full focus:outline-none text-primary-text"
              />
            </div>
          )}

          {showControls && (
            <button
              onClick={handleAddRow}
              className="px-2 py-1 bg-cyan-accent text-black font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </button>
          )}

          {showControls && (
            <>
              {/* Export */}
              <button
                onClick={handleCSVExport}
                className="p-1.5 rounded-lg border border-color-border-color bg-glass-bg hover:border-cyan-accent hover:text-cyan-accent cursor-pointer"
                title="Export CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* Import */}
              <label className="p-1.5 rounded-lg border border-color-border-color bg-glass-bg hover:border-cyan-accent hover:text-cyan-accent cursor-pointer flex items-center justify-center">
                <Upload className="w-3.5 h-3.5" />
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  className="hidden"
                />
              </label>
            </>
          )}
        </div>
      </div>

      {/* Spreadsheet grid */}
      <div className="flex-1 w-full overflow-x-auto overflow-y-hidden border border-color-border-color rounded-xl bg-glass-bg/20 flex flex-col">
        <table className="w-full border-collapse text-left flex-1 flex flex-col overflow-hidden">
          
          {/* Header Row */}
          <thead className="block border-b border-color-border-color bg-secondary-bg/30">
            <tr className="flex w-full">
              {activeTable.columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => {
                    setSortKey(col.key);
                    setSortDirection(sortKey === col.key && sortDirection === 'asc' ? 'desc' : 'asc');
                  }}
                  className="flex-1 px-4 py-2.5 font-bold text-[10px] text-muted-text uppercase tracking-widest cursor-pointer select-none flex items-center gap-1.5 hover:text-primary-text"
                >
                  <span>{col.name}</span>
                  {sortKey === col.key ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-accent" /> : <ArrowDown className="w-3 h-3 text-cyan-accent" />
                  ) : null}
                </th>
              ))}
              {showControls && (
                <th className="w-16 px-4 py-2.5 text-[10px] text-muted-text uppercase tracking-widest text-center">Actions</th>
              )}
            </tr>
          </thead>

          {/* Body Rows */}
          <tbody className="block flex-1 overflow-y-auto no-scrollbar">
            {paginatedRows.length === 0 ? (
              <tr>
                <td className="p-8 text-center text-muted-text italic">No data entries. Click Add Row.</td>
              </tr>
            ) : (
              paginatedRows.map((row, rowIdx) => {
                // Calculate absolute index in array
                const absIdx = (currentPage - 1) * itemsPerPage + rowIdx;
                const isEditingThisRow = editingRowIdx === absIdx;

                return (
                  <tr
                    key={rowIdx}
                    className="flex w-full border-b border-color-border-color/50 hover:bg-glass-bg/10 items-center"
                  >
                    {activeTable.columns.map(col => (
                      <td key={col.key} className="flex-1 px-4 py-2 truncate text-xs text-secondary-text">
                        {isEditingThisRow ? (
                          col.type === 'boolean' ? (
                            <input
                              type="checkbox"
                              checked={!!editRowData[col.key]}
                              onChange={(e) => setEditRowData({ ...editRowData, [col.key]: e.target.checked })}
                              className="rounded accent-cyan-accent"
                            />
                          ) : col.type === 'select' ? (
                            <select
                              value={editRowData[col.key] || ''}
                              onChange={(e) => setEditRowData({ ...editRowData, [col.key]: e.target.value })}
                              className="w-full bg-secondary-bg border border-color-border-color rounded px-1.5 py-0.5 text-primary-text focus:outline-none"
                            >
                              <option value="">Select...</option>
                              {col.options?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={col.type === 'number' ? 'number' : 'text'}
                              value={editRowData[col.key] ?? ''}
                              onChange={(e) => {
                                const val = col.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
                                setEditRowData({ ...editRowData, [col.key]: val });
                              }}
                              className="w-full bg-secondary-bg border border-color-border-color rounded px-2 py-0.5 text-primary-text focus:outline-none focus:border-cyan-accent"
                            />
                          )
                        ) : col.type === 'boolean' ? (
                          <input type="checkbox" checked={!!row[col.key]} readOnly className="rounded opacity-70 pointer-events-none accent-cyan-accent" />
                        ) : (
                          String(row[col.key] ?? '')
                        )}
                      </td>
                    ))}

                    <td className="w-16 px-4 py-2 flex justify-center gap-1">
                      {isEditingThisRow ? (
                        <button
                          onClick={() => handleSaveRow(absIdx)}
                          className="p-1 rounded bg-cyan-accent text-black hover:opacity-90 cursor-pointer"
                          title="Save inline row"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartEditRow(absIdx, row)}
                          className="p-1 rounded hover:bg-glass-bg text-secondary-text hover:text-cyan-accent cursor-pointer"
                          title="Edit row"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDeleteRow(absIdx)}
                        className="p-1 rounded hover:bg-glass-bg text-secondary-text hover:text-red-500 cursor-pointer"
                        title="Delete row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

        </table>
      </div>

      {/* Pagination HUD */}
      {processedRows.length > itemsPerPage && (
        <div className="flex justify-between items-center border-t border-color-border-color pt-2.5 mt-2.5">
          <span className="text-[10px] text-muted-text">
            Showing {Math.min(processedRows.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(processedRows.length, currentPage * itemsPerPage)} of {processedRows.length} entries
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-color-border-color bg-glass-bg hover:border-cyan-accent cursor-pointer text-primary-text disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-primary-text font-bold">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-color-border-color bg-glass-bg hover:border-cyan-accent cursor-pointer text-primary-text disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
