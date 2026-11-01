import React from 'react';
import { 
  HardDrive, 
  Cpu, 
  Layers, 
  Battery, 
  BatteryCharging, 
  Zap, 
  Trash2, 
  Sparkles, 
  ShieldCheck, 
  ChevronRight,
  RefreshCw
} from 'lucide-react';

export default function Dashboard({ 
  metrics, 
  onStartScan, 
  onNavigateTab, 
  onRunQuickOptimize,
  optimizing,
  refreshMetrics 
}) {
  const disk = metrics?.disk || { capacityPercent: 0, usedFormatted: '0 B', availableFormatted: '0 B', totalFormatted: '0 B' };
  const memory = metrics?.memory || { usedPercent: 0, usedFormatted: '0 B', totalFormatted: '0 B', activeFormatted: '0 B', wiredFormatted: '0 B' };
  const cpu = metrics?.cpu || { percentage: 0, model: 'Apple Silicon', cores: 8 };
  const battery = metrics?.battery || { hasBattery: false, percent: 100, status: 'Connected' };

  return (
    <div className="dashboard-container">
      {/* Welcome & System Banner */}
      <div className="welcome-banner">
        <div className="welcome-text">
          <h2>Mac Overview</h2>
          <p className="welcome-sub">
            {cpu.model} • {cpu.cores} Cores • {metrics?.platform || 'macOS'} (Darwin {metrics?.release || ''})
          </p>
        </div>
        <div className="welcome-actions">
          <button className="btn btn-secondary btn-sm" onClick={refreshMetrics} title="Refresh System Metrics">
            <RefreshCw size={14} /> Refresh
          </button>
          <div className="telemetry-badge">
            <ShieldCheck size={14} className="text-success" /> Zero Telemetry
          </div>
        </div>
      </div>

      {/* Main Storage & Health Cards */}
      <div className="dashboard-grid">
        {/* Storage Card */}
        <div className="card storage-card">
          <div className="card-header">
            <div className="card-title">
              <HardDrive size={18} className="text-accent" />
              <span>Primary Storage</span>
            </div>
            <span className="badge badge-accent">{disk.capacityPercent}% Used</span>
          </div>

          <div className="storage-meter-wrapper">
            <div className="storage-bar-bg">
              <div 
                className="storage-bar-fill" 
                style={{ width: `${Math.min(100, Math.max(5, disk.capacityPercent))}%` }}
              ></div>
            </div>
            <div className="storage-stats-row">
              <div>
                <span className="stat-label">Used Space</span>
                <span className="stat-value text-accent">{disk.usedFormatted}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="stat-label">Free Available</span>
                <span className="stat-value text-success">{disk.availableFormatted}</span>
              </div>
            </div>
            <p className="stat-caption">Total Volume Capacity: {disk.totalFormatted}</p>
          </div>

          <div className="card-action-footer">
            <button className="btn btn-primary btn-full" onClick={() => onStartScan()}>
              <Sparkles size={16} /> Run Smart System Scan
            </button>
          </div>
        </div>

        {/* Live Performance Card */}
        <div className="card performance-card">
          <div className="card-header">
            <div className="card-title">
              <Cpu size={18} className="text-warning" />
              <span>Hardware Health</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigateTab('activity')}>
              Details <ChevronRight size={14} />
            </button>
          </div>

          <div className="perf-meters-grid">
            <div className="perf-item">
              <div className="perf-label-row">
                <span>CPU Load</span>
                <strong>{cpu.percentage}%</strong>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill warning-fill" style={{ width: `${cpu.percentage}%` }}></div>
              </div>
            </div>

            <div className="perf-item">
              <div className="perf-label-row">
                <span>Memory ({memory.usedFormatted} / {memory.totalFormatted})</span>
                <strong>{memory.usedPercent}%</strong>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill accent-fill" style={{ width: `${memory.usedPercent}%` }}></div>
              </div>
              <div className="perf-sub-metrics">
                <span>Active: {memory.activeFormatted}</span>
                <span>Wired: {memory.wiredFormatted}</span>
              </div>
            </div>

            {battery.hasBattery && (
              <div className="perf-item">
                <div className="perf-label-row">
                  <span className="flex-center gap-1">
                    {battery.isCharging ? <BatteryCharging size={14} className="text-success" /> : <Battery size={14} />}
                    Battery ({battery.status})
                  </span>
                  <strong>{battery.percent}%</strong>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill success-fill" style={{ width: `${battery.percent}%` }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Utilities Row */}
      <div className="section-title">Quick System Optimizations</div>
      <div className="quick-actions-grid">
        <div className="quick-action-card" onClick={() => onRunQuickOptimize('flush-dns')}>
          <div className="quick-action-icon bg-blue-tint">
            <Zap size={20} className="text-accent" />
          </div>
          <div className="quick-action-text">
            <strong>Flush DNS Cache</strong>
            <span>Resolve slow web lookups & stale IP routing</span>
          </div>
          <button className="btn btn-secondary btn-sm" disabled={optimizing}>Run</button>
        </div>

        <div className="quick-action-card" onClick={() => onRunQuickOptimize('purge-ram')}>
          <div className="quick-action-icon bg-orange-tint">
            <Layers size={20} className="text-warning" />
          </div>
          <div className="quick-action-text">
            <strong>Purge Inactive RAM</strong>
            <span>Reclaim unneeded disk cache into free memory</span>
          </div>
          <button className="btn btn-secondary btn-sm" disabled={optimizing}>Purge</button>
        </div>

        <div className="quick-action-card" onClick={() => onNavigateTab('uninstaller')}>
          <div className="quick-action-icon bg-red-tint">
            <Trash2 size={20} className="text-danger" />
          </div>
          <div className="quick-action-text">
            <strong>App Uninstaller & Leftovers</strong>
            <span>Remove apps along with hidden preference files</span>
          </div>
          <button className="btn btn-secondary btn-sm">Open</button>
        </div>
      </div>
    </div>
  );
}
