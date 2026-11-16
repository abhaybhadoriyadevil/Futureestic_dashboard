import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useThemeStore } from '../stores/useThemeStore';
import { useDashboardStore } from '../stores/useDashboardStore';
import { useWidgetStore } from '../stores/useWidgetStore';
import { 
  X, 
  User, 
  Upload, 
  Palette, 
  Laptop, 
  Database, 
  RotateCcw, 
  Check, 
  Sun, 
  Moon, 
  Terminal, 
  ShieldCheck 
} from 'lucide-react';

const PRESET_ACCENTS = [
  { name: 'Cyber Cyan', value: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)' },
  { name: 'Neon Purple', value: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' },
  { name: 'Toxic Emerald', value: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
  { name: 'Electric Blue', value: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
  { name: 'Hot Laser Pink', value: '#ec4899', glow: 'rgba(236, 72, 153, 0.4)' },
  { name: 'Cyber Amber', value: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
  { name: 'Matrix Green', value: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)' },
  { name: 'Crimson Core', value: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' },
];

const PRESET_AVATARS = [
  { id: 'av1', label: 'Hacker', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80' },
  { id: 'av2', label: 'Cyberpunk', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=160&q=80' },
  { id: 'av3', label: 'Android', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80' },
  { id: 'av4', label: 'Pilot', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80' },
  { id: 'av5', label: 'AI Core', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=160&q=80' },
];

export const SettingsModal: React.FC = () => {
  const { 
    isSettingsOpen, 
    setSettingsOpen, 
    osName, 
    setOsName, 
    userName, 
    setUserName, 
    userRole, 
    setUserRole, 
    userAvatar, 
    setUserAvatar, 
    accentColor, 
    setAccentColor, 
    resetSettings,
    setCliOpen
  } = useSettingsStore();

  const { theme, setTheme } = useThemeStore();
  const { dashboards } = useDashboardStore();
  const { widgets } = useWidgetStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'system' | 'theme' | 'data'>('profile');
  const [tempOsName, setTempOsName] = useState(osName);
  const [tempUserName, setTempUserName] = useState(userName);
  const [tempUserRole, setTempUserRole] = useState(userRole);
  const [savedBadge, setSavedBadge] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when opening
  React.useEffect(() => {
    if (isSettingsOpen) {
      setTempOsName(osName);
      setTempUserName(userName);
      setTempUserRole(userRole);
    }
  }, [isSettingsOpen, osName, userName, userRole]);

  if (!isSettingsOpen) return null;

  const handleSaveProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setOsName(tempOsName);
    setUserName(tempUserName);
    setUserRole(tempUserRole);
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size exceeds 2MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setUserAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSettingsOpen(false)}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl bg-secondary-bg/95 border border-color-border-color rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-primary-text z-10"
        >
          {/* Cyber HUD Corner Brackets */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-accent/80 pointer-events-none" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-accent/80 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-accent/80 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-accent/80 pointer-events-none" />

          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-color-border-color bg-glass-bg">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-accent/10 border border-cyan-accent/30 flex items-center justify-center text-cyan-accent shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-wider uppercase font-mono text-primary-text flex items-center gap-2">
                  System Settings // {osName}
                  {savedBadge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                      Saved ✓
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-muted-text font-mono">
                  Personalize identity, OS branding, and cyber color matrix.
                </p>
              </div>
            </div>

            <button
              onClick={() => setSettingsOpen(false)}
              className="p-1.5 rounded-lg text-muted-text hover:text-primary-text hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-color-border-color bg-primary-bg/50 px-6 gap-2 pt-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'border-cyan-accent text-cyan-accent bg-cyan-accent/5'
                  : 'border-transparent text-secondary-text hover:text-primary-text'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>User Profile</span>
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
                activeTab === 'system'
                  ? 'border-cyan-accent text-cyan-accent bg-cyan-accent/5'
                  : 'border-transparent text-secondary-text hover:text-primary-text'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>OS Branding</span>
            </button>
            <button
              onClick={() => setActiveTab('theme')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
                activeTab === 'theme'
                  ? 'border-cyan-accent text-cyan-accent bg-cyan-accent/5'
                  : 'border-transparent text-secondary-text hover:text-primary-text'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Theme & Colors</span>
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
                activeTab === 'data'
                  ? 'border-cyan-accent text-cyan-accent bg-cyan-accent/5'
                  : 'border-transparent text-secondary-text hover:text-primary-text'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Telemetry</span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
            {/* 1. USER PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Profile Picture Header */}
                <div className="flex items-center gap-5 p-4 rounded-xl bg-glass-bg border border-color-border-color">
                  <div className="relative group shrink-0">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-cyan-accent shadow-[0_0_20px_rgba(6,182,212,0.3)] bg-primary-bg flex items-center justify-center">
                      {userAvatar ? (
                        <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-extrabold font-mono text-cyan-accent">
                          {tempUserName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 text-[10px] text-white transition-opacity cursor-pointer font-mono"
                    >
                      <Upload className="w-4 h-4 text-cyan-accent" />
                      <span>Change</span>
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-primary-text truncate">{tempUserName}</h3>
                    <p className="text-xs font-mono text-cyan-accent/80 truncate mb-3">{tempUserRole}</p>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-accent/10 border border-cyan-accent/30 text-cyan-accent text-xs font-semibold hover:bg-cyan-accent/20 cursor-pointer transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo</span>
                      </button>
                      {userAvatar && (
                        <button
                          onClick={() => setUserAvatar('')}
                          className="px-3 py-1.5 rounded-lg border border-color-border-color text-muted-text hover:text-red-400 hover:border-red-400/30 text-xs transition-colors cursor-pointer"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Preset Avatars */}
                <div>
                  <label className="text-[11px] font-mono font-semibold uppercase text-muted-text mb-2 block">
                    Or Choose Cyber Preset Avatar
                  </label>
                  <div className="grid grid-cols-5 gap-3">
                    {PRESET_AVATARS.map((av) => (
                      <button
                        key={av.id}
                        onClick={() => setUserAvatar(av.url)}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                          userAvatar === av.url
                            ? 'border-cyan-accent bg-cyan-accent/15 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                            : 'border-color-border-color bg-glass-bg hover:border-white/20'
                        }`}
                      >
                        <img src={av.url} alt={av.label} className="w-10 h-10 rounded-lg object-cover" />
                        <span className="text-[10px] font-mono text-secondary-text truncate">{av.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Profile Form Details */}
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-mono font-semibold uppercase text-muted-text block mb-1.5">
                        User Name
                      </label>
                      <input
                        type="text"
                        value={tempUserName}
                        onChange={(e) => setTempUserName(e.target.value)}
                        placeholder="Your Name"
                        className="w-full px-3.5 py-2 rounded-xl bg-primary-bg border border-color-border-color text-sm text-primary-text focus:outline-none focus:border-cyan-accent font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono font-semibold uppercase text-muted-text block mb-1.5">
                        User Role / Clearance
                      </label>
                      <input
                        type="text"
                        value={tempUserRole}
                        onChange={(e) => setTempUserRole(e.target.value)}
                        placeholder="e.g. System Architect"
                        className="w-full px-3.5 py-2 rounded-xl bg-primary-bg border border-color-border-color text-sm text-primary-text focus:outline-none focus:border-cyan-accent font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-cyan-accent text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
                    >
                      Save Profile
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 2. OS BRANDING TAB */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-primary-text mb-1">OS System Title & Branding</h3>
                  <p className="text-xs text-muted-text">
                    Change the global branding name from "PERSONAL OS" to any custom identity (e.g. "CYBER OS", "NEO MATRIX", "NEXUS SYSTEM").
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-glass-bg border border-color-border-color space-y-4">
                  <div>
                    <label className="text-[11px] font-mono font-semibold uppercase text-muted-text block mb-1.5">
                      OS System Name
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tempOsName}
                        onChange={(e) => setTempOsName(e.target.value)}
                        placeholder="e.g. CYBER OS"
                        className="flex-1 px-3.5 py-2 rounded-xl bg-primary-bg border border-color-border-color text-sm font-bold tracking-wider text-cyan-accent focus:outline-none focus:border-cyan-accent"
                      />
                      <button
                        onClick={handleSaveProfile}
                        className="px-4 py-2 rounded-xl bg-cyan-accent text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 cursor-pointer transition-all shrink-0"
                      >
                        Apply Name
                      </button>
                    </div>
                  </div>

                  {/* Live Branding Preview */}
                  <div className="pt-3 border-t border-color-border-color">
                    <span className="text-[10px] font-mono text-muted-text uppercase tracking-wider block mb-2">
                      Sidebar Header Live Preview:
                    </span>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary-bg border border-cyan-accent/20">
                      <span className="font-extrabold text-base tracking-wider bg-gradient-to-r from-blue-accent via-cyan-accent to-purple-accent bg-clip-text text-transparent">
                        {tempOsName || 'PERSONAL OS'}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-cyan-accent animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <label className="text-[11px] font-mono font-semibold uppercase text-muted-text mb-2 block">
                    Popular Cyber OS Presets
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['CYBER OS', 'NEO SYSTEM', 'NEXUS OS', 'DEVIL OS', 'MATRIX HUD', 'QUANTUM OS'].map((name) => (
                      <button
                        key={name}
                        onClick={() => {
                          setTempOsName(name);
                          setOsName(name);
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                          osName === name
                            ? 'border-cyan-accent bg-cyan-accent/10 text-cyan-accent font-bold'
                            : 'border-color-border-color text-secondary-text hover:text-primary-text'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. THEME & COLORS TAB */}
            {activeTab === 'theme' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-primary-text mb-1">Theme Mode & Cyber Color Matrix</h3>
                  <p className="text-xs text-muted-text">
                    Choose between light and dark modes and select your glowing neon accent color.
                  </p>
                </div>

                {/* Theme Mode Toggle */}
                <div>
                  <label className="text-[11px] font-mono font-semibold uppercase text-muted-text mb-2 block">
                    Interface Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                        theme === 'dark'
                          ? 'border-cyan-accent bg-cyan-accent/15 text-cyan-accent shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                          : 'border-color-border-color bg-glass-bg text-secondary-text hover:text-primary-text'
                      }`}
                    >
                      <Moon className="w-4 h-4" />
                      <span>Dark (Sci-Fi Void)</span>
                    </button>
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                        theme === 'light'
                          ? 'border-blue-accent bg-blue-accent/15 text-blue-accent shadow-[0_0_15px_rgba(37,99,235,0.2)]'
                          : 'border-color-border-color bg-glass-bg text-secondary-text hover:text-primary-text'
                      }`}
                    >
                      <Sun className="w-4 h-4" />
                      <span>Light (Clean Lab)</span>
                    </button>
                  </div>
                </div>

                {/* Accent Color Palette */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-mono font-semibold uppercase text-muted-text block">
                      Cyber Neon Accent Color
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-text">Custom:</span>
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border border-color-border-color bg-transparent p-0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2.5">
                    {PRESET_ACCENTS.map((item) => (
                      <button
                        key={item.value}
                        onClick={() => setAccentColor(item.value)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          accentColor.toLowerCase() === item.value.toLowerCase()
                            ? 'border-white/50 bg-white/10 shadow-lg scale-102'
                            : 'border-color-border-color bg-glass-bg hover:border-white/20'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                          style={{
                            backgroundColor: item.value,
                            boxShadow: `0 0 8px ${item.value}`
                          }}
                        />
                        <span className="text-[11px] font-mono text-primary-text truncate">{item.name}</span>
                        {accentColor.toLowerCase() === item.value.toLowerCase() && (
                          <Check className="w-3.5 h-3.5 ml-auto text-primary-text" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Color Sample Badges */}
                <div className="p-4 rounded-xl bg-glass-bg border border-color-border-color space-y-2">
                  <span className="text-[10px] font-mono text-muted-text uppercase tracking-wider block">
                    Accent Color Live Showcase:
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <button className="px-3 py-1.5 rounded-lg bg-cyan-accent text-black font-bold text-xs uppercase shadow-[0_0_12px_rgba(6,182,212,0.4)]">
                      Primary Button
                    </button>
                    <span className="px-2.5 py-1 rounded-full bg-cyan-accent/15 border border-cyan-accent text-cyan-accent text-xs font-mono font-semibold">
                      Live Telemetry // 100%
                    </span>
                    <span className="text-xs font-mono text-cyan-accent underline underline-offset-4">
                      Cyber Link
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. TELEMETRY & SYSTEM TAB */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-primary-text mb-1">System State & Mission Telemetry</h3>
                  <p className="text-xs text-muted-text">
                    Overview of active workspaces, database widgets, and system operations.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-glass-bg border border-color-border-color">
                    <span className="text-[10px] font-mono text-muted-text uppercase tracking-wider">Workspaces</span>
                    <div className="text-2xl font-extrabold font-mono text-cyan-accent mt-1">{dashboards.length}</div>
                    <span className="text-[11px] text-secondary-text">Active workspaces configured</span>
                  </div>
                  <div className="p-4 rounded-xl bg-glass-bg border border-color-border-color">
                    <span className="text-[10px] font-mono text-muted-text uppercase tracking-wider">Canvas Widgets</span>
                    <div className="text-2xl font-extrabold font-mono text-purple-accent mt-1">{widgets.length}</div>
                    <span className="text-[11px] text-secondary-text">Modular widgets rendered</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-glass-bg border border-color-border-color space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-primary-text">CLI Command Control Room</h4>
                      <p className="text-[11px] text-muted-text">Launch root terminal control console.</p>
                    </div>
                    <button
                      onClick={() => {
                        setSettingsOpen(false);
                        setCliOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-accent/10 border border-cyan-accent text-cyan-accent text-xs font-mono hover:bg-cyan-accent/20 cursor-pointer"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Launch CLI</span>
                    </button>
                  </div>

                  <div className="pt-3 border-t border-color-border-color flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-primary-text">Reset to Factory Defaults</h4>
                      <p className="text-[11px] text-muted-text">Restore original OS name, user profile, and cyan accent.</p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Reset user profile, OS branding, and accent color to default?')) {
                          resetSettings();
                          setTempOsName('PERSONAL OS');
                          setTempUserName('Abhay');
                          setTempUserRole('System Architect');
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
