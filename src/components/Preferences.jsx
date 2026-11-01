import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Trash2, 
  Plus, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  Sliders 
} from 'lucide-react';

export default function Preferences() {
  const [config, setConfig] = useState({
    useTrash: true,
    autoCleanSchedule: 'weekly',
    largeFileThresholdMb: 50,
    cleanOnQuit: false,
    whitelist: []
  });
  const [newWhitelistPath, setNewWhitelistPath] = useState('');
  const [savedMessage, setSavedMessage] = useState(null);

  useEffect(() => {
    async function fetchConfig() {
      if (window.cleanSweepAPI?.getConfig) {
        const c = await window.cleanSweepAPI.getConfig();
        setConfig(c);
      }
    }
    fetchConfig();
  }, []);

  const handleSave = async (updatedConfig) => {
    setConfig(updatedConfig);
    if (window.cleanSweepAPI?.updateConfig) {
      await window.cleanSweepAPI.updateConfig(updatedConfig);
      setSavedMessage('✓ Preferences saved successfully.');
      setTimeout(() => setSavedMessage(null), 3000);
    }
  };

  const handleAddWhitelist = () => {
    if (!newWhitelistPath.trim()) return;
    const updated = {
      ...config,
      whitelist: [...config.whitelist, newWhitelistPath.trim()]
    };
    setNewWhitelistPath('');
    handleSave(updated);
  };

  const handleRemoveWhitelist = (index) => {
    const updatedList = config.whitelist.filter((_, i) => i !== index);
    handleSave({ ...config, whitelist: updatedList });
  };

  const openSystemSettings = (pane) => {
    if (window.cleanSweepAPI?.openExternal) {
      // macOS x-apple.systempreferences URL schemes
      const urls = {
        privacy: 'x-apple.systempreferences:com.apple.preference.security?Privacy',
        fullDisk: 'x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles',
        spotlight: 'x-apple.systempreferences:com.apple.preference.spotlight'
      };
      window.cleanSweepAPI.openExternal(urls[pane] || urls.privacy);
    }
  };

  return (
    <div className="preferences-container">
      {/* Header */}
      <div className="summary-card">
        <div className="summary-left">
          <span className="summary-title">App Configuration &amp; Safety Rules</span>
          <div className="summary-number-row">
            <span className="summary-value text-accent">Preferences</span>
            <span className="summary-detail">
              Configure deletion behavior, automated background maintenance schedules, and protected directories.
            </span>
          </div>
        </div>
      </div>

      {savedMessage && (
        <div className="alert-banner">
          <CheckCircle2 size={16} className="text-success" />
          <span>{savedMessage}</span>
        </div>
      )}

      <div className="preferences-grid">
        {/* 1. Deletion & Safety */}
        <div className="card pref-card">
          <div className="card-header">
            <div className="card-title">
              <ShieldCheck size={18} className="text-accent" />
              <span>Safety &amp; Trash Deletion</span>
            </div>
          </div>
          <div className="pref-body">
            <label className="pref-toggle-row">
              <div className="pref-toggle-info">
                <strong>Move to macOS Trash by default</strong>
                <p>Ensures deleted files can always be recovered from your Trash bin.</p>
              </div>
              <input 
                type="checkbox" 
                checked={config.useTrash} 
                onChange={e => handleSave({ ...config, useTrash: e.target.checked })} 
              />
            </label>

            <label className="pref-toggle-row mt-3">
              <div className="pref-toggle-info">
                <strong>Clean caches automatically on quit</strong>
                <p>Silently clears user caches when closing CleanSweep.</p>
              </div>
              <input 
                type="checkbox" 
                checked={config.cleanOnQuit} 
                onChange={e => handleSave({ ...config, cleanOnQuit: e.target.checked })} 
              />
            </label>
          </div>
        </div>

        {/* 2. Automated Scheduling (PureMac parity) */}
        <div className="card pref-card">
          <div className="card-header">
            <div className="card-title">
              <Clock size={18} className="text-warning" />
              <span>Automated Maintenance Schedule</span>
            </div>
          </div>
          <div className="pref-body">
            <p className="text-sm text-secondary mb-3">
              Configure background maintenance reminders to keep your Mac fast and lightweight.
            </p>
            <div className="schedule-pills">
              {['off', 'daily', 'weekly', 'monthly'].map(s => (
                <button 
                  key={s} 
                  className={`category-tab ${config.autoCleanSchedule === s ? 'active' : ''}`}
                  onClick={() => handleSave({ ...config, autoCleanSchedule: s })}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Whitelist / Exclusion Paths (Mole parity) */}
        <div className="card pref-card full-width">
          <div className="card-header">
            <div className="card-title">
              <Sliders size={18} className="text-purple" />
              <span>Protected Folders &amp; Whitelist</span>
            </div>
          </div>
          <div className="pref-body">
            <p className="text-sm text-secondary mb-3">
              CleanSweep will strictly skip and never touch any files inside these whitelisted directories:
            </p>

            <div className="whitelist-input-row">
              <input 
                type="text" 
                placeholder="e.g. ~/Code/critical-project or ~/Documents/vault"
                value={newWhitelistPath}
                onChange={e => setNewWhitelistPath(e.target.value)}
                className="search-input full-width"
              />
              <button className="btn btn-secondary" onClick={handleAddWhitelist}>
                <Plus size={14} /> Add Path
              </button>
            </div>

            <div className="whitelist-items-list mt-3">
              {config.whitelist.map((p, i) => (
                <div key={i} className="whitelist-row">
                  <span className="whitelist-path">{p}</span>
                  <button className="btn-icon text-danger" onClick={() => handleRemoveWhitelist(i)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {config.whitelist.length === 0 && (
                <p className="text-xs text-muted">No custom folders whitelisted yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* 4. Native macOS System Settings Deep-Links (PureMac parity) */}
        <div className="card pref-card full-width">
          <div className="card-header">
            <div className="card-title">
              <ExternalLink size={18} className="text-accent" />
              <span>macOS System Settings Integrations</span>
            </div>
          </div>
          <div className="pref-body">
            <p className="text-sm text-secondary mb-3">
              Quickly configure native macOS permissions and privacy controls:
            </p>
            <div className="flex-row gap-2">
              <button className="btn btn-secondary btn-sm" onClick={() => openSystemSettings('fullDisk')}>
                <ExternalLink size={12} /> Full Disk Access Pane
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => openSystemSettings('privacy')}>
                <ExternalLink size={12} /> Privacy &amp; Security Pane
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => openSystemSettings('spotlight')}>
                <ExternalLink size={12} /> Spotlight Indexing Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
