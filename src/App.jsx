import { useState, useEffect, useCallback } from 'react';
import { 
  Monitor, 
  Sparkles, 
  Trash2, 
  Files, 
  Zap, 
  Rocket, 
  Activity, 
  ShieldCheck,
  FolderArchive,
  Copy,
  Scissors,
  History,
  Settings
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import SmartClean from './components/SmartClean';
import AppUninstaller from './components/AppUninstaller';
import LargeFiles from './components/LargeFiles';
import Optimizer from './components/Optimizer';
import StartupItems from './components/StartupItems';
import ActivityMonitor from './components/ActivityMonitor';
import ProjectPurger from './components/ProjectPurger';
import DuplicateFinder from './components/DuplicateFinder';
import AppSlimmer from './components/AppSlimmer';
import HistoryLog from './components/HistoryLog';
import Preferences from './components/Preferences';
import './index.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState(null);
  const [optimizing, setOptimizing] = useState(false);

  // Smart Clean State
  const [scanStatus, setScanStatus] = useState('idle'); // idle | scanning | result | cleaning | done
  const [scanData, setScanData] = useState(null);
  const [scanProgress, setScanProgress] = useState(null);
  const [cleanResult, setCleanResult] = useState(null);

  const fetchMetrics = useCallback(async () => {
    try {
      if (window.cleanSweepAPI?.getSystemMetrics) {
        const data = await window.cleanSweepAPI.getSystemMetrics();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Failed to fetch system metrics:', err);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  // Subscribe to scanning progress events
  useEffect(() => {
    if (window.cleanSweepAPI?.onScanProgress) {
      const unsub = window.cleanSweepAPI.onScanProgress((prog) => {
        setScanProgress(prog);
      });
      return () => unsub();
    }
  }, []);

  const handleStartScan = async () => {
    setActiveTab('smart-clean');
    setScanStatus('scanning');
    setScanProgress(null);
    try {
      if (window.cleanSweepAPI?.scanSystem) {
        const data = await window.cleanSweepAPI.scanSystem();
        setScanData(data);
        setScanStatus('result');
      } else {
        alert("Cannot connect to backend API. Ensure CleanSweep is running via Electron.");
        setScanStatus('idle');
      }
    } catch (err) {
      console.error('Scan error:', err);
      alert(err.message || 'Scan failed.');
      setScanStatus('idle');
    }
  };

  const handleExecuteClean = async (selectedItems, options) => {
    setScanStatus('cleaning');
    try {
      if (window.cleanSweepAPI?.cleanSystem) {
        const res = await window.cleanSweepAPI.cleanSystem(selectedItems, options);
        setCleanResult(res);
        setScanStatus('done');
        fetchMetrics();
      }
    } catch (err) {
      console.error('Clean error:', err);
      setScanStatus('result');
    }
  };

  const handleResetScan = () => {
    setScanStatus('idle');
    setScanData(null);
    setScanProgress(null);
    setCleanResult(null);
  };

  const handleRunQuickOptimize = async (taskId) => {
    setOptimizing(true);
    try {
      if (window.cleanSweepAPI?.runOptimization) {
        await window.cleanSweepAPI.runOptimization(taskId);
        fetchMetrics();
      }
    } catch (err) {
      console.error('Quick optimization error:', err);
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="app-layout">
      {/* Draggable Titlebar Region for macOS Window Traffic Lights */}
      <div className="titlebar">
        <span className="titlebar-title">CleanSweep</span>
      </div>

      {/* macOS Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <Sparkles size={18} className="text-accent" />
          </div>
          <div className="brand-text">
            <strong>CleanSweep</strong>
            <span className="brand-sub">macOS Optimizer</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Monitor size={16} />
            <span>Overview</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'smart-clean' ? 'active' : ''}`}
            onClick={() => setActiveTab('smart-clean')}
          >
            <Sparkles size={16} />
            <span>Smart Clean</span>
            {scanData && scanStatus === 'result' && (
              <span className="nav-badge">{scanData.totalFormatted}</span>
            )}
          </div>

          <div 
            className={`nav-item ${activeTab === 'uninstaller' ? 'active' : ''}`}
            onClick={() => setActiveTab('uninstaller')}
          >
            <Trash2 size={16} />
            <span>App Uninstaller</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'purger' ? 'active' : ''}`}
            onClick={() => setActiveTab('purger')}
          >
            <FolderArchive size={16} />
            <span>Project Artifacts</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'duplicates' ? 'active' : ''}`}
            onClick={() => setActiveTab('duplicates')}
          >
            <Copy size={16} />
            <span>Duplicate Finder</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'large-files' ? 'active' : ''}`}
            onClick={() => setActiveTab('large-files')}
          >
            <Files size={16} />
            <span>Large &amp; Old Files</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'optimizer' ? 'active' : ''}`}
            onClick={() => setActiveTab('optimizer')}
          >
            <Zap size={16} />
            <span>Maintenance</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'startup' ? 'active' : ''}`}
            onClick={() => setActiveTab('startup')}
          >
            <Rocket size={16} />
            <span>Startup Items</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            <Activity size={16} />
            <span>Activity Monitor</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'slimmer' ? 'active' : ''}`}
            onClick={() => setActiveTab('slimmer')}
          >
            <Scissors size={16} />
            <span>App Slimmer</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={16} />
            <span>Cleanup History</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            <Settings size={16} />
            <span>Preferences</span>
          </div>
        </nav>

        {/* Sidebar Footer with Telemetry Privacy Indicator */}
        <div className="sidebar-footer">
          <div className="privacy-pill">
            <ShieldCheck size={14} className="text-success" />
            <span>Zero Telemetry</span>
          </div>
          <span className="version-caption">v1.1.0 Production</span>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="content">
        <header className="content-header">
          <div className="header-titles">
            <h1>
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'smart-clean' && 'Smart System & Developer Clean'}
              {activeTab === 'uninstaller' && 'App Uninstaller & Orphan Finder'}
              {activeTab === 'purger' && 'Developer Project Artifacts Purger'}
              {activeTab === 'duplicates' && 'Cryptographic Duplicate Finder'}
              {activeTab === 'large-files' && 'Large & Old Files Explorer'}
              {activeTab === 'optimizer' && 'System Maintenance & Optimization'}
              {activeTab === 'startup' && 'Startup & Background Launch Items'}
              {activeTab === 'activity' && 'Real-Time Activity Monitor'}
              {activeTab === 'slimmer' && 'App Localization Slimmer'}
              {activeTab === 'history' && 'Cleanup History & Lifetime Statistics'}
              {activeTab === 'preferences' && 'CleanSweep Preferences & Safety Rules'}
            </h1>
            <p>
              {activeTab === 'dashboard' && 'Monitor health and clean system junk with zero telemetry'}
              {activeTab === 'smart-clean' && 'Reclaim gigabytes from caches, logs, browsers, developer and AI models'}
              {activeTab === 'uninstaller' && 'Completely uninstall apps and track down hidden leftover files'}
              {activeTab === 'purger' && 'Reclaim gigabytes of rebuildable node_modules, target, and virtualenvs across your code repositories'}
              {activeTab === 'duplicates' && 'Find and remove identical duplicate files using high-speed SHA-256 matching'}
              {activeTab === 'large-files' && 'Surface and manage multi-gigabyte or aged files across your drive'}
              {activeTab === 'optimizer' && 'Flush DNS, purge RAM, rebuild services, and fix macOS performance issues'}
              {activeTab === 'startup' && 'Manage background LaunchAgents and daemons to boost boot speed'}
              {activeTab === 'activity' && 'Live CPU, memory pressure, disk I/O and battery telemetry'}
              {activeTab === 'slimmer' && 'Strip unneeded language localization files (.lproj) from applications to save storage'}
              {activeTab === 'history' && 'View your lifetime reclaimed disk storage and detailed operation audit logs'}
              {activeTab === 'preferences' && 'Manage deletion safety, background schedules, and protected folder whitelists'}
            </p>
          </div>
        </header>

        <div className="main-scroll-body">
          {activeTab === 'dashboard' && (
            <Dashboard 
              metrics={metrics} 
              onStartScan={handleStartScan}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onRunQuickOptimize={handleRunQuickOptimize}
              optimizing={optimizing}
              refreshMetrics={fetchMetrics}
            />
          )}

          {activeTab === 'smart-clean' && (
            <SmartClean 
              scanStatus={scanStatus}
              scanData={scanData}
              scanProgress={scanProgress}
              onStartScan={handleStartScan}
              onClean={handleExecuteClean}
              cleanResult={cleanResult}
              onReset={handleResetScan}
            />
          )}

          {activeTab === 'uninstaller' && (
            <AppUninstaller />
          )}

          {activeTab === 'purger' && (
            <ProjectPurger />
          )}

          {activeTab === 'duplicates' && (
            <DuplicateFinder />
          )}

          {activeTab === 'large-files' && (
            <LargeFiles />
          )}

          {activeTab === 'optimizer' && (
            <Optimizer />
          )}

          {activeTab === 'startup' && (
            <StartupItems />
          )}

          {activeTab === 'activity' && (
            <ActivityMonitor 
              metrics={metrics} 
              refreshMetrics={fetchMetrics} 
            />
          )}

          {activeTab === 'slimmer' && (
            <AppSlimmer />
          )}

          {activeTab === 'history' && (
            <HistoryLog />
          )}

          {activeTab === 'preferences' && (
            <Preferences />
          )}
        </div>
      </main>
    </div>
  );
}
