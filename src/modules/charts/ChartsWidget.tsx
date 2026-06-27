import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../core/storage/db';
import { 
  ResponsiveContainer, 
  LineChart, Line, 
  BarChart, Bar, 
  PieChart, Pie, Cell,
  AreaChart, Area, 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, Tooltip, Legend 
} from 'recharts';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, AreaChart as AreaChartIcon, Settings, GitCommit } from 'lucide-react';
import { useThemeStore } from '../../stores/useThemeStore';
import { useWidgetStore } from '../../stores/useWidgetStore';

interface ChartsWidgetProps {
  widgetId: string;
  dataRef?: string; // Points to a Table ID to pull data from
  isEditMode: boolean;
  showControls?: boolean;
}

export const ChartsWidget: React.FC<ChartsWidgetProps> = ({ widgetId, dataRef, showControls = false }) => {
  const { theme } = useThemeStore();
  const { commitWidgetUpdate } = useWidgetStore();
  const [chartType, setChartType] = useState<'line' | 'bar' | 'pie' | 'area' | 'radar'>('bar');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(dataRef || null);
  const [habitsMetric, setHabitsMetric] = useState<'completion-rate' | 'total-checkins' | 'daily-trend'>('completion-rate');
  const [xAxisKey, setXAxisKey] = useState<string>('');
  const [yAxisKey, setYAxisKey] = useState<string>('');
  const [showConfig, setShowConfig] = useState(false);

  // Fetch all tables from IndexedDB
  const tables = useLiveQuery(() => db.customTables.toArray()) || [];
  const activeTable = tables.find(t => t.id === selectedTableId);
  const habitWidgets = useLiveQuery(() => db.widgets.where('moduleType').equals('habits').toArray()) || [];

  // Parse configuration from dataRef
  useEffect(() => {
    if (dataRef) {
      if (dataRef.startsWith('{')) {
        try {
          const parsed = JSON.parse(dataRef);
          if (parsed.source === 'habits') {
            setSelectedTableId('habits');
            setHabitsMetric(parsed.metric || 'completion-rate');
          }
        } catch (e) {
          console.error('Failed to parse charts dataRef', e);
        }
      } else {
        setSelectedTableId(dataRef);
      }
    } else {
      setSelectedTableId(null);
    }
  }, [dataRef]);

  // Helpers for Habits calculations
  const isDayValidForHabit = (habit: any, date: Date) => {
    const day = date.getDay();
    if (habit.repeatType === 'everyday') return true;
    if (habit.repeatType === 'weekdays') return day >= 1 && day <= 5;
    if (habit.repeatType === 'weekends') return day === 0 || day === 6;
    if (habit.repeatType === 'custom') return habit.customDays?.includes(day);
    return false;
  };

  const formatDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getPast7Days = () => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d);
    }
    return dates;
  };

  // Default seeded chart data if no table is selected or empty
  const defaultChartData = [
    { label: 'Jan', value: 400 },
    { label: 'Feb', value: 600 },
    { label: 'Mar', value: 500 },
    { label: 'Apr', value: 900 },
    { label: 'May', value: 800 },
    { label: 'Jun', value: 1100 }
  ];

  // Map database tables data
  const getChartData = () => {
    if (selectedTableId === 'habits') {
      const habitsList: any[] = [];
      habitWidgets.forEach(w => {
        try {
          const parsed = JSON.parse(w.dataRef || '{}');
          if (parsed.habits && Array.isArray(parsed.habits)) {
            habitsList.push(...parsed.habits);
          }
        } catch (e) {}
      });

      if (habitsMetric === 'daily-trend') {
        const past7Days = getPast7Days();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return past7Days.map(date => {
          const dateStr = formatDate(date);
          let completionsCount = 0;
          habitsList.forEach(habit => {
            if (habit.history && habit.history[dateStr]) {
              completionsCount++;
            }
          });
          return {
            label: `${dayNames[date.getDay()]} (${date.getDate()})`,
            value: completionsCount
          };
        });
      }

      return habitsList.map(habit => {
        if (habitsMetric === 'total-checkins') {
          const totalCheckins = Object.values(habit.history || {}).filter(v => v).length;
          return {
            label: habit.title,
            value: totalCheckins
          };
        } else {
          // completion-rate
          let checkinsInWindow = 0;
          let validDaysCount = 0;
          const d = new Date();
          const creationTime = habit.createdAt ? new Date(habit.createdAt).getTime() : 0;
          for (let i = 0; i < 30; i++) {
            const checkDate = new Date(d);
            checkDate.setDate(checkDate.getDate() - i);
            if (creationTime && checkDate.getTime() < new Date(creationTime).setHours(0,0,0,0)) {
              break;
            }
            const dateStr = formatDate(checkDate);
            if (isDayValidForHabit(habit, checkDate)) {
              validDaysCount++;
              if (habit.history && habit.history[dateStr]) {
                checkinsInWindow++;
              }
            }
          }
          const rate = validDaysCount > 0 ? Math.round((checkinsInWindow / validDaysCount) * 100) : 0;
          return {
            label: habit.title,
            value: rate
          };
        }
      });
    }

    if (!activeTable || activeTable.rows.length === 0) return defaultChartData;
    
    // Fallback keys if not specified
    const xKey = xAxisKey || activeTable.columns[0]?.key || 'label';
    const yKey = yAxisKey || activeTable.columns.find(c => c.type === 'number')?.key || 'value';

    return activeTable.rows.map(row => ({
      label: String(row[xKey] ?? ''),
      value: parseFloat(row[yKey]) || 0
    }));
  };

  const chartData = getChartData();

  // Futuristic theme colors mapping
  const neonBlue = '#3b82f6';
  const neonPurple = '#8b5cf6';
  const neonCyan = '#06b6d4';
  const neonGreen = '#10b981';
  
  const colors = [neonBlue, neonCyan, neonPurple, neonGreen, '#6366f1', '#a855f7'];

  // Tooltip custom style
  const customTooltipStyle = {
    background: theme === 'dark' ? 'rgba(10, 10, 14, 0.9)' : 'rgba(255, 255, 255, 0.9)',
    border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '12px',
    fontSize: '10px',
    color: theme === 'dark' ? '#fff' : '#000',
  };

  const renderChart = () => {
    if (chartData.length === 0) return <div className="p-8 text-center italic">No spreadsheet data to chart.</div>;

    switch (chartType) {
      case 'line':
        return (
          <LineChart data={chartData}>
            <XAxis dataKey="label" stroke="#737373" fontSize={9} />
            <YAxis stroke="#737373" fontSize={9} />
            <Tooltip contentStyle={customTooltipStyle} />
            <Line type="monotone" dataKey="value" stroke={neonCyan} strokeWidth={2} activeDot={{ r: 6 }} />
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={neonPurple} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={neonPurple} stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="label" stroke="#737373" fontSize={9} />
            <YAxis stroke="#737373" fontSize={9} />
            <Tooltip contentStyle={customTooltipStyle} />
            <Area type="monotone" dataKey="value" stroke={neonPurple} fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={4}
              dataKey="value"
              nameKey="label"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={customTooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '10px' }} />
          </PieChart>
        );
      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid stroke="#404040" />
            <PolarAngleAxis dataKey="label" stroke="#737373" fontSize={8} />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="#737373" fontSize={8} />
            <Radar name="Value" dataKey="value" stroke={neonGreen} fill={neonGreen} fillOpacity={0.3} />
            <Tooltip contentStyle={customTooltipStyle} />
          </RadarChart>
        );
      case 'bar':
      default:
        return (
          <BarChart data={chartData}>
            <XAxis dataKey="label" stroke="#737373" fontSize={9} />
            <YAxis stroke="#737373" fontSize={9} />
            <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Bar dataKey="value" fill={neonBlue} radius={[4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        );
    }
  };

  const handleSaveConfig = async () => {
    let newDataRef = '';
    if (selectedTableId === 'habits') {
      newDataRef = JSON.stringify({ source: 'habits', metric: habitsMetric });
    } else if (selectedTableId) {
      newDataRef = selectedTableId;
    }
    
    await commitWidgetUpdate(widgetId, { dataRef: newDataRef });
    setShowConfig(false);
  };

  return (
    <div className="w-full h-full flex flex-col p-4 text-xs text-primary-text bg-transparent overflow-hidden">
      
      {/* Top Controls */}
      {showControls && (
        <div className="flex justify-between items-center mb-3">
          <div className="flex rounded-xl bg-glass-bg border border-color-border-color p-0.5">
            <button
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                chartType === 'bar' ? 'bg-cyan-accent text-black font-semibold' : 'text-secondary-text hover:text-primary-text'
              }`}
              title="Bar Chart"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                chartType === 'line' ? 'bg-cyan-accent text-black font-semibold' : 'text-secondary-text hover:text-primary-text'
              }`}
              title="Line Chart"
            >
              <LineChartIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                chartType === 'pie' ? 'bg-cyan-accent text-black font-semibold' : 'text-secondary-text hover:text-primary-text'
              }`}
              title="Donut Chart"
            >
              <PieChartIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                chartType === 'area' ? 'bg-cyan-accent text-black font-semibold' : 'text-secondary-text hover:text-primary-text'
              }`}
              title="Area Chart"
            >
              <AreaChartIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('radar')}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                chartType === 'radar' ? 'bg-cyan-accent text-black font-semibold' : 'text-secondary-text hover:text-primary-text'
              }`}
              title="Radar Chart"
            >
              <GitCommit className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Configuration settings overlay trigger */}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
              showConfig ? 'border-cyan-accent bg-cyan-accent/5 text-cyan-accent' : 'border-color-border-color text-muted-text hover:text-primary-text'
            }`}
            title="Connect spreadsheet database"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Chart container */}
      <div className="flex-1 w-full min-h-[140px] relative">
        {showConfig ? (
          // Chart Database Configuration
          <div className="absolute inset-0 bg-primary-bg/95 border border-color-border-color rounded-xl p-4 flex flex-col gap-2 overflow-y-auto no-scrollbar z-10">
            <span className="text-[10px] font-bold text-muted-text uppercase tracking-widest border-b border-color-border-color pb-1 mb-1">
              Connect Table Analytics
            </span>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-muted-text uppercase font-semibold">Select Spreadsheet</label>
              <select
                value={selectedTableId || ''}
                onChange={(e) => {
                  setSelectedTableId(e.target.value || null);
                  setXAxisKey('');
                  setYAxisKey('');
                }}
                className="px-3 py-1.5 rounded-lg border border-color-border-color bg-secondary-bg text-xs focus:outline-none"
              >
                <option value="">Manual Mock data (Seeded)</option>
                <option value="habits">Habit Tracker Data (All Workspaces)</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {selectedTableId === 'habits' ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-muted-text uppercase font-semibold">Habits Analysis Metric</label>
                <select
                  value={habitsMetric}
                  onChange={(e) => setHabitsMetric(e.target.value as any)}
                  className="px-3 py-1.5 rounded-lg border border-color-border-color bg-secondary-bg text-xs focus:outline-none text-primary-text"
                >
                  <option value="completion-rate">Completion Rate (%) [Last 30 Days]</option>
                  <option value="total-checkins">Total Check-ins (All-time)</option>
                  <option value="daily-trend">Daily Completion Trend (Last 7 Days)</option>
                </select>
              </div>
            ) : activeTable ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-muted-text uppercase font-semibold">X-Axis Column (Label)</label>
                  <select
                    value={xAxisKey}
                    onChange={(e) => setXAxisKey(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-color-border-color bg-secondary-bg text-xs focus:outline-none"
                  >
                    <option value="">Select label...</option>
                    {activeTable.columns.map(col => (
                      <option key={col.key} value={col.key}>{col.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-muted-text uppercase font-semibold">Y-Axis Column (Value)</label>
                  <select
                    value={yAxisKey}
                    onChange={(e) => setYAxisKey(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-color-border-color bg-secondary-bg text-xs focus:outline-none"
                  >
                    <option value="">Select value...</option>
                    {activeTable.columns.filter(c => c.type === 'number').map(col => (
                      <option key={col.key} value={col.key}>{col.name}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : null}

            <button
              onClick={handleSaveConfig}
              className="mt-2.5 w-full py-1.5 rounded-lg bg-cyan-accent text-black font-semibold cursor-pointer"
            >
              Verify Connections
            </button>
          </div>
        ) : null}

        {/* Recharts Wrapper */}
        <div className="w-full h-full pr-4 pb-2">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
