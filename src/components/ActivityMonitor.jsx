import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Layers, 
  HardDrive, 
  Battery, 
  BatteryCharging, 
  RefreshCw 
} from 'lucide-react';

export default function ActivityMonitor({ metrics, refreshMetrics }) {
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (refreshMetrics) refreshMetrics();
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshMetrics]);

  const cpu = metrics?.cpu || { percentage: 0, model: 'Apple Silicon', cores: 8 };
  const memory = metrics?.memory || { 
    usedPercent: 0, 
    usedFormatted: '0 B', 
    totalFormatted: '0 B', 
    freeFormatted: '0 B',
    activeFormatted: '0 B',
    wiredFormatted: '0 B',
    inactiveFormatted: '0 B',
    compressedFormatted: '0 B'
  };
  const disk = metrics?.disk || { 
    capacityPercent: 0, 
    usedFormatted: '0 B', 
    availableFormatted: '0 B', 
    totalFormatted: '0 B' 
  };
  const battery = metrics?.battery || { hasBattery: false, percent: 100, status: 'Connected' };

  const formatUptime = (seconds) => {
    if (!seconds) return '0m';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    return `${h}h ${m}m`;
  };

  return (
    <div className="activity-container">
      {/* Header Banner */}
      <div className="summary-card">
        <div className="summary-left">
          <span className="summary-title">Hardware &amp; Performance Telemetry</span>
          <div className="summary-number-row">
            <span className="summary-value text-accent">Activity Monitor</span>
            <span className="summary-detail">
              Live macOS system metrics polled locally with zero network calls or analytics.
            </span>
          </div>
        </div>
        <div className="summary-right">
          <label className="toggle-label mr-2">
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={e => setAutoRefresh(e.target.checked)} 
            />
            <span>Auto Refresh (3s)</span>
          </label>
          <button className="btn btn-secondary btn-sm" onClick={refreshMetrics}>
            <RefreshCw size={14} /> Refresh Now
          </button>
        </div>
      </div>

      {/* Main Gauges Grid */}
      <div className="activity-grid">
        {/* 1. CPU Gauge */}
        <div className="card activity-card">
          <div className="card-header">
            <div className="card-title">
              <Cpu size={18} className="text-warning" />
              <span>Processor (CPU)</span>
            </div>
            <span className="badge badge-warning">{cpu.percentage}% Load</span>
          </div>

          <div className="activity-gauge-body">
            <div className="gauge-number-hero">
              <strong>{cpu.percentage}%</strong>
              <span className="text-secondary text-sm">utilization</span>
            </div>
            <div className="progress-bar-bg mt-3">
              <div 
                className="progress-bar-fill warning-fill" 
                style={{ width: `${Math.min(100, Math.max(2, cpu.percentage))}%` }}
              ></div>
            </div>
            <div className="activity-meta-list mt-3">
              <div className="activity-meta-item">
                <span>Chip Architecture:</span>
                <strong>{cpu.model}</strong>
              </div>
              <div className="activity-meta-item">
                <span>Core Count:</span>
                <strong>{cpu.cores} Physical &amp; Efficiency Cores</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Memory Gauge */}
        <div className="card activity-card">
          <div className="card-header">
            <div className="card-title">
              <Layers size={18} className="text-accent" />
              <span>Unified Memory (RAM)</span>
            </div>
            <span className="badge badge-accent">{memory.usedPercent}% Used</span>
          </div>

          <div className="activity-gauge-body">
            <div className="gauge-number-hero">
              <strong>{memory.usedFormatted}</strong>
              <span className="text-secondary text-sm">of {memory.totalFormatted}</span>
            </div>
            <div className="progress-bar-bg mt-3">
              <div 
                className="progress-bar-fill accent-fill" 
                style={{ width: `${Math.min(100, Math.max(2, memory.usedPercent))}%` }}
              ></div>
            </div>
            <div className="activity-meta-list mt-3">
              <div className="activity-meta-item">
                <span>Active Memory:</span>
                <strong>{memory.activeFormatted}</strong>
              </div>
              <div className="activity-meta-item">
                <span>Wired Memory:</span>
                <strong>{memory.wiredFormatted}</strong>
              </div>
              <div className="activity-meta-item">
                <span>Compressed Memory:</span>
                <strong>{memory.compressedFormatted}</strong>
              </div>
              <div className="activity-meta-item">
                <span>Inactive &amp; Free:</span>
                <strong className="text-success">{memory.freeFormatted}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Disk Gauge */}
        <div className="card activity-card">
          <div className="card-header">
            <div className="card-title">
              <HardDrive size={18} className="text-success" />
              <span>Internal APFS Storage (/)</span>
            </div>
            <span className="badge badge-success">{disk.capacityPercent}% Capacity</span>
          </div>

          <div className="activity-gauge-body">
            <div className="gauge-number-hero">
              <strong>{disk.availableFormatted}</strong>
              <span className="text-secondary text-sm">available space</span>
            </div>
            <div className="progress-bar-bg mt-3">
              <div 
                className="progress-bar-fill success-fill" 
                style={{ width: `${Math.min(100, Math.max(2, disk.capacityPercent))}%` }}
              ></div>
            </div>
            <div className="activity-meta-list mt-3">
              <div className="activity-meta-item">
                <span>Allocated Disk:</span>
                <strong>{disk.usedFormatted}</strong>
              </div>
              <div className="activity-meta-item">
                <span>Total SSD Volume:</span>
                <strong>{disk.totalFormatted}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Battery / System Specs */}
        <div className="card activity-card">
          <div className="card-header">
            <div className="card-title">
              {battery.isCharging ? <BatteryCharging size={18} className="text-success" /> : <Battery size={18} />}
              <span>Power &amp; System Specs</span>
            </div>
            <span className="badge badge-category">{battery.status}</span>
          </div>

          <div className="activity-gauge-body">
            {battery.hasBattery && (
              <>
                <div className="gauge-number-hero">
                  <strong>{battery.percent}%</strong>
                  <span className="text-secondary text-sm">battery level</span>
                </div>
                <div className="progress-bar-bg mt-3">
                  <div 
                    className="progress-bar-fill success-fill" 
                    style={{ width: `${battery.percent}%` }}
                  ></div>
                </div>
              </>
            )}
            <div className="activity-meta-list mt-3">
              <div className="activity-meta-item">
                <span>Operating System:</span>
                <strong>macOS ({metrics?.arch || 'arm64'})</strong>
              </div>
              <div className="activity-meta-item">
                <span>Kernel Release:</span>
                <strong>Darwin {metrics?.release || ''}</strong>
              </div>
              <div className="activity-meta-item">
                <span>System Uptime:</span>
                <strong>{formatUptime(metrics?.uptimeSeconds)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
