import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useDashboardStore } from '../stores/useDashboardStore';
import { useThemeStore } from '../stores/useThemeStore';
import { useUIStore } from '../stores/useUIStore';
import { 
  Home, 
  Briefcase, 
  TrendingUp, 
  GitBranch, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Layout
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { dashboards, activeDashboardId, setActiveDashboardId, deleteDashboard } = useDashboardStore();
  const { theme } = useThemeStore();
  const { setCreateWorkspaceModal } = useUIStore();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingDashId, setEditingDashId] = useState<string | null>(null);
  const [editDashName, setEditDashName] = useState('');

  const handleEditSubmit = (dashId: string) => {
    if (editDashName.trim()) {
      useDashboardStore.getState().updateDashboard(dashId, { name: editDashName.trim() });
    }
    setEditingDashId(null);
  };

  // Map icon strings to Lucide components
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Home': return <Home className="w-5 h-5" />;
      case 'Briefcase': return <Briefcase className="w-5 h-5" />;
      case 'TrendingUp': return <TrendingUp className="w-5 h-5" />;
      case 'GitBranch': return <GitBranch className="w-5 h-5" />;
      default: return <Layout className="w-5 h-5" />;
    }
  };


  return (
    <div 
      className={`relative h-full flex flex-col glass-panel select-none transition-all duration-300 z-30 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-color-border-color">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-blue-accent via-cyan-accent to-purple-accent bg-clip-text text-transparent">
              PERSONAL OS
            </span>
            <span className="w-2 h-2 rounded-full bg-cyan-accent animate-pulse" />
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-tr from-blue-accent to-purple-accent text-white font-bold text-sm mx-auto">
            OS
          </div>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 w-6 h-6 rounded-full glass-panel border border-color-border-color flex items-center justify-center hover:bg-glass-bg cursor-pointer text-primary-text"
        >
          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </div>

      {/* Navigation Workspaces */}
      <div className="flex-1 py-4 overflow-y-auto px-2 space-y-1 no-scrollbar">
        <div className={`px-2 pb-2 text-xs font-semibold uppercase tracking-widest text-muted-text ${isCollapsed ? 'text-center' : ''}`}>
          {isCollapsed ? 'WK' : 'Workspaces'}
        </div>

        {dashboards.map((dash, index) => {
          const isActive = dash.id === activeDashboardId;
          return (
            <motion.div
              key={dash.id}
              className="group relative flex items-center justify-between"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <button
                onClick={() => setActiveDashboardId(dash.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? theme === 'dark'
                      ? 'bg-glass-bg text-cyan-accent border border-cyan-accent/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                      : 'bg-blue-accent/10 text-blue-accent border-l-4 border-blue-accent rounded-l-none'
                    : 'text-secondary-text hover:text-primary-text hover:bg-glass-bg border border-transparent'
                }`}
                title={dash.name}
              >
                {getIcon(dash.icon)}
                {!isCollapsed && (
                  <div className="flex flex-col items-start truncate flex-1 min-w-0">
                    {editingDashId === dash.id ? (
                      <input
                        type="text"
                        value={editDashName}
                        onChange={(e) => setEditDashName(e.target.value)}
                        onBlur={() => handleEditSubmit(dash.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditSubmit(dash.id);
                          if (e.key === 'Escape') setEditingDashId(null);
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-transparent border-b border-cyan-accent outline-none text-sm text-primary-text font-semibold px-0 py-0"
                      />
                    ) : (
                      <span 
                        className="truncate w-full text-left"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingDashId(dash.id);
                          setEditDashName(dash.name);
                        }}
                        title="Double click to rename"
                      >
                        {dash.name}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-text capitalize">{dash.layoutType}</span>
                  </div>
                )}
              </button>

              {/* Delete workspace, prevent deleting the last workspace */}
              {!isCollapsed && dashboards.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete workspace "${dash.name}"? This deletes all widgets in it.`)) {
                      deleteDashboard(dash.id);
                    }
                  }}
                  className="absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 text-muted-text hover:text-red-500 rounded-lg hover:bg-glass-bg/50 cursor-pointer transition-opacity z-10 bg-primary-bg shadow-sm"
                  title="Delete workspace"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Add Workspace Footer */}
      <div className="p-3 border-t border-color-border-color">
        {isCollapsed ? (
          <button 
            onClick={() => setCreateWorkspaceModal(true)}
            className="w-10 h-10 rounded-xl bg-glass-bg border border-color-border-color flex items-center justify-center hover:border-cyan-accent cursor-pointer hover:bg-cyan-accent/5 transition-colors mx-auto text-primary-text"
          >
            <Plus className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => setCreateWorkspaceModal(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-color-border-color hover:border-cyan-accent hover:bg-cyan-accent/5 cursor-pointer text-sm font-medium transition-all text-primary-text"
          >
            <Plus className="w-4 h-4" />
            <span>Create Space</span>
          </button>
        )}
      </div>


    </div>
  );
};
