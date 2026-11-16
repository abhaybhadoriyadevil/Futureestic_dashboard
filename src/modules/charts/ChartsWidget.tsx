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
  XAxis, YAxis, Tooltip, Legend, CartesianGrid 
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
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
          if (parsed.chartType) {
            setChartType(parsed.chartType);
          }
          if (parsed.source && (parsed.source === 'habits' || parsed.source.startsWith('habits:'))) {
            setSelectedTableId(parsed.source);
            setHabitsMetric(parsed.metric || 'completion-rate');
          } else if (parsed.source) {
            setSelectedTableId(parsed.source);
          }
          if (parsed.xAxisKey) {
            setXAxisKey(parsed.xAxisKey);
          }
          if (parsed.yAxisKey) {
            setYAxisKey(parsed.yAxisKey);
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
    if (selectedTableId && (selectedTableId === 'habits' || selectedTableId.startsWith('habits:'))) {
      const habitsList: any[] = [];

      if (selectedTableId === 'habits' || selectedTableId === 'habits:all') {
        habitWidgets.forEach(w => {
          try {
            const parsed = JSON.parse(w.dataRef || '{}');
            if (parsed.habits && Array.isArray(parsed.habits)) {
              habitsList.push(...parsed.habits);
            }
          } catch (e) {}
        });
      } else {
        const targetId = selectedTableId.replace('habits:', '');
        const targetWidget = habitWidgets.find(w => w.id === targetId);
        if (targetWidget) {
          try {
            const parsed = JSON.parse(targetWidget.dataRef || '{}');
            if (parsed.habits && Array.isArray(parsed.habits)) {
              habitsList.push(...parsed.habits);
            }
          } catch (e) {}
        }
      }

      if (habitsList.length === 0) {
        return [{ label: 'No Habits Added', value: 0 }];
      }

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

  // Futuristic Cyberpunk Palette
  const cyberPalettes = [
    { id: 'cyan', start: '#00f5ff', end: '#0284c7', glow: 'rgba(0, 245, 255, 0.6)' },
    { id: 'purple', start: '#c084fc', end: '#6366f1', glow: 'rgba(192, 132, 252, 0.6)' },
    { id: 'emerald', start: '#10e29b', end: '#059669', glow: 'rgba(16, 226, 155, 0.6)' },
    { id: 'blue', start: '#38bdf8', end: '#1d4ed8', glow: 'rgba(56, 189, 248, 0.6)' },
    { id: 'pink', start: '#f43f5e', end: '#ec4899', glow: 'rgba(244, 63, 94, 0.6)' },
    { id: 'amber', start: '#fbbf24', end: '#ea580c', glow: 'rgba(251, 191, 36, 0.6)' },
  ];

  const totalValue = chartData.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  const activeItem = activeIndex !== null && chartData[activeIndex] ? chartData[activeIndex] : null;
  const activePercent = activeItem && totalValue > 0 ? Math.round((Number(activeItem.value) / totalValue) * 100) : 0;

  // Futuristic Cyber Tooltip
  const CustomCyberTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0];
    const itemLabel = data.name || data.payload?.label || 'METRIC';
    const itemValue = data.value;
    const percent = totalValue > 0 && typeof itemValue === 'number'
      ? Math.round((itemValue / totalValue) * 100)
      : null;

    return (
      <div className="relative rounded-xl bg-primary-bg/95 border border-cyan-500/40 p-2.5 shadow-[0_0_20px_rgba(6,182,212,0.3)] min-w-[120px] z-50 pointer-events-none backdrop-blur-md">
        {/* Cyber corner accents */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400 rounded-tl" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400 rounded-br" />

        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-color-border-color pb-1 mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#06b6d4]" />
            <span className="text-[9px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
              SYS.TELEMETRY
            </span>
          </div>
          {percent !== null && (
            <span className="text-[9px] font-mono text-cyan-400 font-semibold px-1 rounded bg-cyan-500/10 border border-cyan-500/30">
              {percent}%
            </span>
          )}
        </div>

        {/* Value row */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-mono font-medium text-primary-text truncate max-w-[100px]">
            {itemLabel}
          </span>
          <span className="text-xs font-mono font-bold text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]">
            {typeof itemValue === 'number' ? itemValue.toLocaleString() : itemValue}
          </span>
        </div>
      </div>
    );
  };

  // Futuristic Cyber Legend
  const CustomCyberLegend = ({ payload }: any) => {
    if (!payload || payload.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 px-1 max-h-[60px] overflow-y-auto no-scrollbar">
        {payload.map((entry: any, index: number) => {
          const itemVal = Number(entry.payload?.value ?? 0);
          const percent = totalValue > 0 ? Math.round((itemVal / totalValue) * 100) : 0;
          const pal = cyberPalettes[index % cyberPalettes.length];
          const isHovered = activeIndex === index;

          return (
            <div
              key={`legend-${index}`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border transition-all duration-200 cursor-pointer ${
                isHovered
                  ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)] scale-105'
                  : 'bg-glass-bg border-color-border-color hover:border-cyan-500/30'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: pal.start,
                  boxShadow: `0 0 6px ${pal.start}`
                }}
              />
              <span className="text-[10px] font-mono text-primary-text tracking-wide truncate max-w-[85px]">
                {entry.value}
              </span>
              <span
                className="text-[9px] font-mono px-1 rounded border"
                style={{
                  backgroundColor: `${pal.start}18`,
                  borderColor: `${pal.start}35`,
                  color: pal.start
                }}
              >
                {percent}%
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderChart = () => {
    if (chartData.length === 0) return <div className="p-8 text-center italic text-muted-text">No spreadsheet data to chart.</div>;

    switch (chartType) {
      case 'line':
        return (
          <LineChart data={chartData} margin={{ top: 15, right: 10, left: -15, bottom: 5 }}>
            <defs>
              <linearGradient id="cyberLineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#00f5ff" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#00f5ff" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} vertical={false} />
            <XAxis 
              dataKey="label" 
              stroke="#64748b" 
              fontSize={9} 
              fontFamily="JetBrains Mono"
              tickLine={false}
              axisLine={{ stroke: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={9} 
              fontFamily="JetBrains Mono"
              tickLine={false}
              axisLine={{ stroke: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
            />
            <Tooltip content={<CustomCyberTooltip />} />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="url(#cyberLineGrad)" 
              strokeWidth={3} 
              dot={{ r: 3.5, fill: '#050507', stroke: '#00f5ff', strokeWidth: 2 }} 
              activeDot={{ r: 6, fill: '#00f5ff', stroke: '#ffffff', strokeWidth: 2 }} 
              style={{ filter: 'drop-shadow(0 0 8px rgba(0, 245, 255, 0.6))' }}
            />
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={chartData} margin={{ top: 15, right: 10, left: -15, bottom: 5 }}>
            <defs>
              <linearGradient id="cyberAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00f5ff" stopOpacity={0.6} />
                <stop offset="40%" stopColor="#8b5cf6" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#050507" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} vertical={false} />
            <XAxis 
              dataKey="label" 
              stroke="#64748b" 
              fontSize={9} 
              fontFamily="JetBrains Mono"
              tickLine={false}
              axisLine={{ stroke: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={9} 
              fontFamily="JetBrains Mono"
              tickLine={false}
              axisLine={{ stroke: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
            />
            <Tooltip content={<CustomCyberTooltip />} />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#00f5ff" 
              strokeWidth={2.5}
              fillOpacity={1} 
              fill="url(#cyberAreaGrad)" 
              style={{ filter: 'drop-shadow(0 0 6px rgba(0, 245, 255, 0.4))' }}
            />
          </AreaChart>
        );
      case 'pie':
        return (
          <PieChart>
            <defs>
              {cyberPalettes.map((p, idx) => (
                <linearGradient key={`pie-grad-${idx}`} id={`cyber-pie-grad-${idx}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={p.start} />
                  <stop offset="100%" stopColor={p.end} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={chartData}
              cx="50%"
              cy="46%"
              innerRadius="54%"
              outerRadius="76%"
              paddingAngle={4}
              cornerRadius={5}
              stroke={theme === 'dark' ? '#090d16' : '#ffffff'}
              strokeWidth={2}
              dataKey="value"
              nameKey="label"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {chartData.map((_, index) => {
                const isHovered = activeIndex === index;
                const pal = cyberPalettes[index % cyberPalettes.length];
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(#cyber-pie-grad-${index % cyberPalettes.length})`}
                    stroke={isHovered ? pal.start : (theme === 'dark' ? '#090d16' : '#ffffff')}
                    strokeWidth={isHovered ? 2.5 : 2}
                    style={{
                      filter: isHovered ? `drop-shadow(0px 0px 8px ${pal.glow})` : undefined,
                      transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                      transformOrigin: 'center center',
                      transition: 'all 0.25s ease-out',
                      cursor: 'pointer'
                    }}
                  />
                );
              })}
            </Pie>
            <Tooltip content={<CustomCyberTooltip />} />
            <Legend content={<CustomCyberLegend />} />
          </PieChart>
        );
      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="68%" data={chartData}>
            <defs>
              <radialGradient id="cyberRadarGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10e29b" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#00f5ff" stopOpacity={0.1} />
              </radialGradient>
            </defs>
            <PolarGrid stroke={theme === 'dark' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(6, 182, 212, 0.15)'} strokeDasharray="3 3" />
            <PolarAngleAxis 
              dataKey="label" 
              stroke="#94a3b8" 
              tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'JetBrains Mono' }} 
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 'auto']} 
              stroke={theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'} 
              tick={{ fill: '#64748b', fontSize: 8, fontFamily: 'JetBrains Mono' }} 
            />
            <Radar 
              name="Telemetry" 
              dataKey="value" 
              stroke="#00f5ff" 
              strokeWidth={2}
              fill="url(#cyberRadarGrad)" 
              fillOpacity={0.6} 
            />
            <Tooltip content={<CustomCyberTooltip />} />
          </RadarChart>
        );
      case 'bar':
      default:
        return (
          <BarChart data={chartData} margin={{ top: 15, right: 10, left: -15, bottom: 5 }}>
            <defs>
              {cyberPalettes.map((p, idx) => (
                <linearGradient key={`bar-grad-${idx}`} id={`cyber-bar-grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={p.start} stopOpacity={1} />
                  <stop offset="65%" stopColor={p.end} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={p.end} stopOpacity={0.25} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} vertical={false} />
            <XAxis 
              dataKey="label" 
              stroke="#64748b" 
              fontSize={9} 
              fontFamily="JetBrains Mono"
              tickLine={false}
              axisLine={{ stroke: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={9} 
              fontFamily="JetBrains Mono"
              tickLine={false}
              axisLine={{ stroke: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
            />
            <Tooltip content={<CustomCyberTooltip />} cursor={{ fill: 'rgba(6, 182, 212, 0.05)' }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell 
                  key={`bar-cell-${index}`} 
                  fill={`url(#cyber-bar-grad-${index % cyberPalettes.length})`}
                  stroke={cyberPalettes[index % cyberPalettes.length].start}
                  strokeWidth={1}
                />
              ))}
            </Bar>
          </BarChart>
        );
    }
  };

  const handleSelectChartType = async (newType: 'line' | 'bar' | 'pie' | 'area' | 'radar') => {
    setChartType(newType);

    let config: Record<string, any> = {};
    if (dataRef && dataRef.startsWith('{')) {
      try {
        config = JSON.parse(dataRef);
      } catch (e) {
        config = {};
      }
    } else if (dataRef) {
      config = { source: dataRef };
    }

    config.chartType = newType;
    if (selectedTableId) {
      config.source = selectedTableId;
    }
    if (selectedTableId && (selectedTableId === 'habits' || selectedTableId.startsWith('habits:'))) {
      config.metric = habitsMetric;
    } else {
      if (xAxisKey) config.xAxisKey = xAxisKey;
      if (yAxisKey) config.yAxisKey = yAxisKey;
    }

    await commitWidgetUpdate(widgetId, {
      dataRef: JSON.stringify(config)
    });
  };

  const handleSaveConfig = async () => {
    let config: Record<string, any> = {};
    if (dataRef && dataRef.startsWith('{')) {
      try {
        config = JSON.parse(dataRef);
      } catch (e) {
        config = {};
      }
    } else if (dataRef) {
      config = { source: dataRef };
    }

    config.chartType = chartType;
    config.source = selectedTableId || '';
    if (selectedTableId && (selectedTableId === 'habits' || selectedTableId.startsWith('habits:'))) {
      config.metric = habitsMetric;
    } else {
      config.xAxisKey = xAxisKey;
      config.yAxisKey = yAxisKey;
    }

    await commitWidgetUpdate(widgetId, { dataRef: JSON.stringify(config) });
    setShowConfig(false);
  };

  return (
    <div className="w-full h-full flex flex-col p-4 text-xs text-primary-text bg-transparent overflow-hidden">
      
      {/* Top Controls */}
      {showControls && (
        <div className="flex justify-between items-center mb-3">
          <div className="flex rounded-xl bg-glass-bg border border-color-border-color p-0.5">
            <button
              onClick={() => handleSelectChartType('bar')}
              className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                chartType === 'bar' ? 'bg-cyan-accent text-black font-semibold shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'text-secondary-text hover:text-primary-text hover:bg-white/5'
              }`}
              title="Bar Chart"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSelectChartType('line')}
              className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                chartType === 'line' ? 'bg-cyan-accent text-black font-semibold shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'text-secondary-text hover:text-primary-text hover:bg-white/5'
              }`}
              title="Line Chart"
            >
              <LineChartIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSelectChartType('pie')}
              className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                chartType === 'pie' ? 'bg-cyan-accent text-black font-semibold shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'text-secondary-text hover:text-primary-text hover:bg-white/5'
              }`}
              title="Donut Chart"
            >
              <PieChartIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSelectChartType('area')}
              className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                chartType === 'area' ? 'bg-cyan-accent text-black font-semibold shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'text-secondary-text hover:text-primary-text hover:bg-white/5'
              }`}
              title="Area Chart"
            >
              <AreaChartIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSelectChartType('radar')}
              className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                chartType === 'radar' ? 'bg-cyan-accent text-black font-semibold shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'text-secondary-text hover:text-primary-text hover:bg-white/5'
              }`}
              title="Radar Chart"
            >
              <GitCommit className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Connected Data Source Badge */}
            {selectedTableId && (selectedTableId === 'habits' || selectedTableId.startsWith('habits:')) ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-accent/10 border border-cyan-accent/20 text-[10px] text-cyan-accent font-semibold truncate max-w-[170px]" title="Connected Habit Tracker">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-accent shrink-0 animate-pulse" />
                <span className="truncate">
                  {selectedTableId === 'habits' || selectedTableId === 'habits:all'
                    ? 'All Habits'
                    : habitWidgets.find(w => w.id === selectedTableId.replace('habits:', ''))?.title || 'Habit Tracker'}
                </span>
              </div>
            ) : activeTable ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-glass-bg border border-color-border-color text-[10px] text-secondary-text truncate max-w-[170px]" title="Connected Table">
                <span className="truncate">{activeTable.name}</span>
              </div>
            ) : null}

            {/* Configuration settings overlay trigger */}
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                showConfig ? 'border-cyan-accent bg-cyan-accent/5 text-cyan-accent' : 'border-color-border-color text-muted-text hover:text-primary-text'
              }`}
              title="Connect spreadsheet or habit tracker"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Chart container */}
      <div className="flex-1 w-full min-h-[140px] relative">
        {/* HUD Corner Accents */}
        <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-cyan-400/50 pointer-events-none z-10" />
        <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-cyan-400/50 pointer-events-none z-10" />
        <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-cyan-400/50 pointer-events-none z-10" />
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-cyan-400/50 pointer-events-none z-10" />

        {/* Live Telemetry Status Pill */}
        <div className="absolute top-1 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950/40 border border-cyan-500/20 text-[8px] font-mono text-cyan-400/90 pointer-events-none select-none z-10 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_4px_#06b6d4]" />
          <span>SYS.TELEMETRY // LIVE</span>
        </div>

        {/* Center Holographic HUD for Donut/Pie Chart */}
        {chartType === 'pie' && chartData.length > 0 && !showConfig && (
          <div className="absolute top-[46%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none text-center select-none z-0">
            {/* Spinning Radar Reticles */}
            <svg 
              className="absolute w-24 h-24 sm:w-28 sm:h-28 -z-10 animate-spin text-cyan-500/25" 
              style={{ animationDuration: '24s' }} 
              viewBox="0 0 100 100"
            >
              <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 5" />
            </svg>
            <svg 
              className="absolute w-18 h-18 sm:w-22 sm:h-22 -z-10 text-purple-500/30 animate-spin-reverse" 
              viewBox="0 0 100 100"
            >
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 6" />
              <line x1="50" y1="4" x2="50" y2="10" stroke="currentColor" strokeWidth="1.5" />
              <line x1="50" y1="90" x2="50" y2="96" stroke="currentColor" strokeWidth="1.5" />
              <line x1="4" y1="50" x2="10" y2="50" stroke="currentColor" strokeWidth="1.5" />
              <line x1="90" y1="50" x2="96" y2="50" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <div className="absolute w-12 h-12 rounded-full bg-cyan-500/10 blur-sm pointer-events-none -z-10" />

            {/* Dynamic Center Telemetry Content */}
            {activeItem ? (
              <div className="flex flex-col items-center px-1">
                <span className="text-[8px] font-mono tracking-widest uppercase text-cyan-400 font-bold truncate max-w-[85px] drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]">
                  {activeItem.label}
                </span>
                <span className="text-sm sm:text-base font-extrabold tracking-tight text-primary-text font-mono drop-shadow-[0_0_8px_rgba(255,255,255,0.7)] leading-tight">
                  {Number(activeItem.value).toLocaleString()}
                </span>
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-semibold mt-0.5">
                  {activePercent}%
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center px-1">
                <span className="text-[8px] font-mono tracking-widest uppercase text-muted-text font-semibold">
                  TOTAL
                </span>
                <span className="text-sm sm:text-base font-extrabold tracking-tight text-cyan-300 font-mono drop-shadow-[0_0_8px_rgba(6,182,212,0.6)] leading-tight">
                  {totalValue.toLocaleString()}
                </span>
                <span className="text-[8px] font-mono tracking-wider text-secondary-text uppercase mt-0.5">
                  {chartData.length} NODES
                </span>
              </div>
            )}
          </div>
        )}

        {showConfig ? (
          // Chart Database Configuration
          <div className="absolute inset-0 bg-primary-bg/95 border border-color-border-color rounded-xl p-4 flex flex-col gap-2 overflow-y-auto no-scrollbar z-10">
            <span className="text-[10px] font-bold text-muted-text uppercase tracking-widest border-b border-color-border-color pb-1 mb-1">
              Connect Table / Habit Analytics
            </span>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-muted-text uppercase font-semibold">Select Data Source</label>
              <select
                value={selectedTableId || ''}
                onChange={(e) => {
                  setSelectedTableId(e.target.value || null);
                  setXAxisKey('');
                  setYAxisKey('');
                }}
                className="px-3 py-1.5 rounded-lg border border-color-border-color bg-secondary-bg text-xs focus:outline-none text-primary-text"
              >
                <option value="">Manual Mock data (Seeded)</option>

                {habitWidgets.length > 0 && (
                  <optgroup label="Habit Trackers">
                    {habitWidgets.length > 1 && (
                      <option value="habits:all">All Habit Trackers (Combined)</option>
                    )}
                    {habitWidgets.map((hw, idx) => (
                      <option key={hw.id} value={`habits:${hw.id}`}>
                        {hw.title || `Habit Tracker ${idx + 1}`} (Widget {idx + 1})
                      </option>
                    ))}
                  </optgroup>
                )}

                {tables.length > 0 && (
                  <optgroup label="Spreadsheet Tables">
                    {tables.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {selectedTableId && (selectedTableId === 'habits' || selectedTableId.startsWith('habits:')) ? (
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
