import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  ChevronDown, 
  ChevronRight, 
  FolderOpen, 
  CheckCircle2, 
  RotateCcw, 
  Globe,
  Sparkles
} from 'lucide-react';

export default function AppSlimmer() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [selectedAppPaths, setSelectedAppPaths] = useState(new Set());
  const [expandedAppPath, setExpandedAppPath] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const loadSlimmables = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      if (window.cleanSweepAPI?.scanSlimmableApps) {
        const res = await window.cleanSweepAPI.scanSlimmableApps();
        setData(res);
        // Safe default: leave unchecked so user must explicitly choose which apps to slim
        setSelectedAppPaths(new Set());
      }
    } catch (err) {
      console.error('Failed to scan slimmable apps:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlimmables();
  }, []);

  const handleReveal = (p) => {
    if (window.cleanSweepAPI?.revealInFinder) {
      window.cleanSweepAPI.revealInFinder(p);
    }
  };

  const toggleSelect = (p) => {
    setSelectedAppPaths(prev => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const handleSlimApps = async () => {
    if (selectedAppPaths.size === 0) return;
    setLoading(true);
    try {
      const appsToSlim = data.apps.filter(a => selectedAppPaths.has(a.appPath));
      let totalCleaned = 0;
      for (const a of appsToSlim) {
        const localePaths = a.locales.map(l => l.path);
        const res = await window.cleanSweepAPI.slimApp(localePaths, { useTrash: true });
        totalCleaned += res.cleanedCount;
      }
      setActionMessage(`✓ Successfully removed ${totalCleaned} unused localization files from ${appsToSlim.length} applications.`);
      await loadSlimmables();
    } catch (err) {
      setActionMessage(`Error slimming: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const apps = data?.apps || [];
  const selectedApps = apps.filter(a => selectedAppPaths.has(a.appPath));
  const selectedBytes = selectedApps.reduce((sum, a) => sum + a.totalSlimBytes, 0);

  function formatBytes(bytes) {
    if (!+bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  return (
    <div className="slimmer-container">
      {/* Top Banner */}
      <div className="summary-card">
        <div className="summary-left">
          <span className="summary-title">App Localization Slimmer</span>
          <div className="summary-number-row">
            <span className="summary-value text-accent">{data ? data.grandTotalFormatted : '0 B'}</span>
            <span className="summary-detail">
              ({data ? data.totalApps : 0} applications with unneeded language packs and localization folders)
            </span>
          </div>
        </div>
        <div className="summary-right">
          <button 
            className="btn btn-danger" 
            disabled={selectedAppPaths.size === 0 || loading}
            onClick={handleSlimApps}
          >
            <Scissors size={15} /> Slim Selected ({formatBytes(selectedBytes)})
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="alert-banner">
          <CheckCircle2 size={16} className="text-success" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Control Bar */}
      <div className="filter-controls-bar">
        <div className="flex-row gap-2">
          <span className="text-sm text-secondary">
            Keeps English &amp; Base locales automatically. Code-signed apps are automatically re-sealed to preserve macOS Gatekeeper integrity.
          </span>
        </div>

        <div className="select-buttons">
          <button className="btn btn-secondary btn-sm" onClick={loadSlimmables} disabled={loading}>
            <RotateCcw size={14} /> Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loader"></div>
          <p>Analyzing application bundles for unused language localizations...</p>
        </div>
      )}

      {/* App Slimmer List */}
      {!loading && (
        <div className="slimmer-list">
          {apps.map(app => {
            const isChecked = selectedAppPaths.has(app.appPath);
            const isExpanded = expandedAppPath === app.appPath;

            return (
              <div key={app.appPath} className="app-card">
                <div className="app-row" onClick={() => setExpandedAppPath(isExpanded ? null : app.appPath)}>
                  <div className="app-icon-wrapper" onClick={e => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={() => toggleSelect(app.appPath)}
                    />
                  </div>

                  <div className="app-main-info">
                    <div className="app-name-row">
                      <span className="app-title">{app.appName}</span>
                      <span className="badge badge-category">
                        <Globe size={11} /> {app.localesCount} languages to strip
                      </span>
                    </div>
                    <div className="app-sub-info">
                      <span>{app.appPath}</span>
                    </div>
                  </div>

                  <div className="app-size-action">
                    <div className="app-size-display">
                      <strong className="text-accent">{app.totalSlimFormatted}</strong>
                      <span className="text-xs text-secondary">savings</span>
                    </div>

                    <div className="expand-chevron">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="app-associated-container">
                    <div className="associated-header">
                      <span>Languages Identified for Removal</span>
                      <span className="text-secondary">{app.locales.length} files</span>
                    </div>
                    <div className="associated-list">
                      {app.locales.slice(0, 15).map(l => (
                        <div key={l.path} className="associated-item">
                          <span className="badge badge-optional">{l.name}</span>
                          <span className="associated-path" title={l.path}>{l.path}</span>
                          <button className="btn-icon" onClick={() => handleReveal(l.path)} title="Reveal in Finder">
                            <FolderOpen size={12} />
                          </button>
                          <span className="associated-size">{l.sizeFormatted}</span>
                        </div>
                      ))}
                      {app.locales.length > 15 && (
                        <div className="text-xs text-muted mt-2">
                          ...and {app.locales.length - 15} more language packs.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {apps.length === 0 && (
            <div className="empty-substate">
              <Sparkles size={32} className="text-success" />
              <p>All applications are already slimmed down. No extra language packs detected!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
