import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  FolderOpen, 
  CheckCircle2, 
  RotateCcw,
  Package,
  Layers,
  ShieldAlert
} from 'lucide-react';

export default function AppUninstaller() {
  const [subTab, setSubTab] = useState('apps'); // 'apps' | 'orphans'
  const [loading, setLoading] = useState(false);
  const [appsData, setAppsData] = useState(null);
  const [orphansData, setOrphansData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAppId, setExpandedAppId] = useState(null);
  const [selectedOrphanPaths, setSelectedOrphanPaths] = useState(new Set());
  const [confirmUninstallApp, setConfirmUninstallApp] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const loadApps = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      if (window.cleanSweepAPI?.scanApps) {
        const data = await window.cleanSweepAPI.scanApps();
        setAppsData(data);
      }
    } catch (err) {
      console.error('Failed to scan apps:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrphans = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      if (window.cleanSweepAPI?.scanOrphans) {
        const data = await window.cleanSweepAPI.scanOrphans();
        setOrphansData(data);
        setSelectedOrphanPaths(new Set(data.orphans.map(o => o.path)));
      }
    } catch (err) {
      console.error('Failed to scan orphans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === 'apps' && !appsData) {
      loadApps();
    } else if (subTab === 'orphans' && !orphansData) {
      loadOrphans();
    }
  }, [subTab, appsData, orphansData]);

  const handleReveal = (itemPath) => {
    if (window.cleanSweepAPI?.revealInFinder) {
      window.cleanSweepAPI.revealInFinder(itemPath);
    }
  };

  const handleExecuteUninstall = async (app) => {
    setLoading(true);
    try {
      const associatedPaths = app.associatedFiles.map(f => f.path);
      const res = await window.cleanSweepAPI.uninstallApp(app.appPath, associatedPaths, { useTrash: true });
      setActionMessage(`✓ Successfully moved ${app.name} and ${res.cleanedCount} associated items to Trash.`);
      setConfirmUninstallApp(null);
      await loadApps();
    } catch (err) {
      setActionMessage(`Error uninstalling: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanOrphans = async () => {
    if (selectedOrphanPaths.size === 0) return;
    setLoading(true);
    try {
      const res = await window.cleanSweepAPI.cleanOrphans(Array.from(selectedOrphanPaths), { useTrash: true });
      setActionMessage(`✓ Cleaned ${res.cleanedCount} orphaned leftover file(s).`);
      await loadOrphans();
    } catch (err) {
      setActionMessage(`Error cleaning orphans: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredApps = appsData?.apps?.filter(app => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return app.name.toLowerCase().includes(q) || (app.bundleId && app.bundleId.toLowerCase().includes(q));
  }) || [];

  return (
    <div className="uninstaller-container">
      {/* Sub-tab Navigation */}
      <div className="subnav-row">
        <div className="tab-pill-group">
          <button 
            className={`tab-pill ${subTab === 'apps' ? 'active' : ''}`}
            onClick={() => setSubTab('apps')}
          >
            <Package size={15} /> Installed Apps {appsData ? `(${appsData.totalCount})` : ''}
          </button>
          <button 
            className={`tab-pill ${subTab === 'orphans' ? 'active' : ''}`}
            onClick={() => setSubTab('orphans')}
          >
            <Layers size={15} /> Orphaned Leftovers {orphansData ? `(${orphansData.totalCount})` : ''}
          </button>
        </div>

        <div className="subnav-actions">
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={subTab === 'apps' ? loadApps : loadOrphans} 
            disabled={loading}
          >
            <RotateCcw size={14} /> Refresh
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="alert-banner">
          <CheckCircle2 size={16} className="text-success" />
          <span>{actionMessage}</span>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="loader"></div>
          <p>{subTab === 'apps' ? 'Discovering installed applications & tracking leftovers...' : 'Locating leftover caches and abandoned preferences...'}</p>
        </div>
      )}

      {/* 1. Installed Applications Tab */}
      {!loading && subTab === 'apps' && (
        <div className="apps-view">
          <div className="apps-header-bar">
            <div className="search-input-wrapper">
              <Search size={14} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search installed applications..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="text-secondary text-sm">
              Total Application Footprint: <strong>{appsData?.totalFormatted || '0 B'}</strong>
            </div>
          </div>

          <div className="apps-list">
            {filteredApps.map(app => {
              const isExpanded = expandedAppId === app.id;
              return (
                <div key={app.id} className="app-card">
                  <div className="app-row" onClick={() => setExpandedAppId(isExpanded ? null : app.id)}>
                    <div className="app-icon-wrapper">
                      {app.iconDataUrl ? (
                        <img src={app.iconDataUrl} alt={app.name} className="app-icon-img" />
                      ) : (
                        <Package size={32} className="text-accent" />
                      )}
                    </div>

                    <div className="app-main-info">
                      <div className="app-name-row">
                        <span className="app-title">{app.name}</span>
                        <span className="app-version">v{app.version}</span>
                        {app.isAppleSystemApp && (
                          <span className="badge badge-system">macOS System</span>
                        )}
                      </div>
                      <div className="app-sub-info">
                        <span>{app.bundleId || app.appPath}</span>
                        {app.associatedFiles.length > 0 && (
                          <span className="text-accent">
                            • {app.associatedFiles.length} leftover location(s) ({app.associatedFormatted})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="app-size-action">
                      <div className="app-size-display">
                        <strong>{app.totalFormatted}</strong>
                        <span className="text-xs text-secondary">total</span>
                      </div>

                      <button 
                        className="btn btn-danger btn-sm"
                        disabled={app.isAppleSystemApp}
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmUninstallApp(app);
                        }}
                        title={app.isAppleSystemApp ? 'macOS system application cannot be uninstalled' : 'Completely uninstall app and associated files'}
                      >
                        <Trash2 size={13} /> Uninstall
                      </button>

                      <div className="expand-chevron">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Associated Files Dropdown */}
                  {isExpanded && (
                    <div className="app-associated-container">
                      <div className="associated-header">
                        <span>Associated Files &amp; Leftover Directories</span>
                        <span className="text-secondary">{app.associatedFiles.length + 1} items</span>
                      </div>

                      <div className="associated-list">
                        <div className="associated-item">
                          <span className="badge badge-accent">App Bundle</span>
                          <span className="associated-path" title={app.appPath}>{app.appPath}</span>
                          <button className="btn-icon" onClick={() => handleReveal(app.appPath)} title="Reveal in Finder">
                            <FolderOpen size={12} />
                          </button>
                          <span className="associated-size">{app.appSizeFormatted}</span>
                        </div>

                        {app.associatedFiles.map((f, i) => (
                          <div key={i} className="associated-item">
                            <span className="badge badge-category">{f.type}</span>
                            <span className="associated-path" title={f.path}>{f.path}</span>
                            <button className="btn-icon" onClick={() => handleReveal(f.path)} title="Reveal in Finder">
                              <FolderOpen size={12} />
                            </button>
                            <span className="associated-size">{f.sizeFormatted}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Uninstall Confirmation Modal */}
          {confirmUninstallApp && (
            <div className="modal-backdrop">
              <div className="modal-dialog">
                <div className="modal-header">
                  <ShieldAlert size={28} className="text-danger" />
                  <h3>Uninstall {confirmUninstallApp.name}?</h3>
                </div>
                <div className="modal-body">
                  <p>
                    This will move the main application bundle and 
                    <strong> {confirmUninstallApp.associatedFiles.length} associated preference and cache files</strong> 
                    ({confirmUninstallApp.totalFormatted}) to your macOS Trash bin.
                  </p>
                  <div className="modal-notice">
                    <p>✅ All items will be safely sent to Trash, allowing you to restore them if needed.</p>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setConfirmUninstallApp(null)}>
                    Cancel
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => handleExecuteUninstall(confirmUninstallApp)}
                  >
                    Move to Trash &amp; Uninstall
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Orphaned Leftovers Tab */}
      {!loading && subTab === 'orphans' && (
        <div className="orphans-view">
          <div className="summary-card">
            <div className="summary-left">
              <span className="summary-title">Residual Application Data</span>
              <div className="summary-number-row">
                <span className="summary-value text-accent">{orphansData?.totalFormatted || '0 B'}</span>
                <span className="summary-detail">
                  ({orphansData?.totalCount || 0} orphaned preferences and cache folders from previously deleted apps)
                </span>
              </div>
            </div>
            <div className="summary-right">
              <button 
                className="btn btn-danger" 
                disabled={!orphansData || orphansData.orphans.length === 0}
                onClick={handleCleanOrphans}
              >
                <Trash2 size={16} /> Clean All Leftovers ({orphansData?.totalFormatted || '0 B'})
              </button>
            </div>
          </div>

          <div className="orphans-list">
            {orphansData?.orphans?.map(item => (
              <div key={item.id} className="orphan-row">
                <div className="orphan-badge-col">
                  <span className="badge badge-category">{item.type}</span>
                </div>
                <div className="orphan-info-col">
                  <div className="orphan-name">{item.name}</div>
                  <div className="orphan-path" title={item.path}>
                    <span>{item.path}</span>
                    <button className="btn-icon" onClick={() => handleReveal(item.path)} title="Reveal in Finder">
                      <FolderOpen size={12} />
                    </button>
                  </div>
                </div>
                <div className="orphan-size-col">
                  <strong>{item.sizeFormatted}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
