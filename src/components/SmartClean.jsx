import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Trash2, 
  Sparkles, 
  FolderOpen, 
  Search, 
  RotateCcw,
  CheckSquare,
  Square,
  ShieldAlert
} from 'lucide-react';

export default function SmartClean({
  scanStatus,
  scanData,
  scanProgress,
  onStartScan,
  onClean,
  cleanResult,
  onReset
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [useTrash, setUseTrash] = useState(true);
  const [dryRun, setDryRun] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Initialize selection when scanData arrives
  React.useEffect(() => {
    if (scanData && scanData.items) {
      const initial = new Set(scanData.items.filter(i => i.defaultChecked).map(i => i.id));
      setSelectedIds(initial);
    }
  }, [scanData]);

  const toggleItem = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (filteredItems) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredItems.forEach(i => next.add(i.id));
      return next;
    });
  };

  const deselectAll = (filteredItems) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredItems.forEach(i => next.delete(i.id));
      return next;
    });
  };

  const handleReveal = (itemPath) => {
    if (window.cleanSweepAPI?.revealInFinder) {
      window.cleanSweepAPI.revealInFinder(itemPath);
    }
  };

  const categories = [
    'All',
    'System & App Junk',
    'Browsers',
    'Developer & Build',
    'AI & Local Models',
    'Containers & Virtual Disks',
    'Backups & Mail'
  ];

  // Filtering
  const items = scanData?.items || [];
  const filteredItems = items.filter(item => {
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.path.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const selectedItems = items.filter(i => selectedIds.has(i.id));
  const selectedBytes = selectedItems.reduce((sum, i) => sum + (i.sizeBytes || 0), 0);

  function formatBytes(bytes) {
    if (!+bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  const selectedFormatted = formatBytes(selectedBytes);

  return (
    <div className="smart-clean-container">
      {/* 1. Idle State */}
      {scanStatus === 'idle' && (
        <div className="empty-state">
          <div className="empty-state-badge">
            <Sparkles size={40} className="text-accent" />
          </div>
          <h2>Smart Clean Analysis</h2>
          <p>
            Scan for system caches, user logs, browser data, developer build folders 
            (Xcode, Homebrew, npm, pip, uv, cargo, gradle), local AI models (Ollama, LM Studio), 
            and container virtual disks.
          </p>
          <button className="btn btn-primary btn-lg" onClick={onStartScan}>
            <Sparkles size={18} /> Start System Scan
          </button>
        </div>
      )}

      {/* 2. Scanning Progress State */}
      {scanStatus === 'scanning' && (
        <div className="loading-state">
          <div className="loader"></div>
          <h2>Scanning Storage Directories...</h2>
          <p className="loading-sub">
            {scanProgress ? `Scanning ${scanProgress.current}/${scanProgress.total}: ${scanProgress.item}` : 'Inspecting user Library and developer caches...'}
          </p>
        </div>
      )}

      {/* 3. Scan Results State */}
      {scanStatus === 'result' && scanData && (
        <div className="results-view">
          {/* Top Summary Banner */}
          <div className="summary-card">
            <div className="summary-left">
              <span className="summary-title">Selected for Cleanup</span>
              <div className="summary-number-row">
                <span className="summary-value text-accent">{selectedFormatted}</span>
                <span className="summary-detail">
                  ({selectedItems.length} of {items.length} targets selected • Total detected: {scanData.totalFormatted})
                </span>
              </div>
            </div>

            <div className="summary-right">
              <div className="clean-options-row">
                <label className="toggle-label" title="Move files to macOS Trash instead of permanent rm for safe recovery">
                  <input 
                    type="checkbox" 
                    checked={useTrash} 
                    onChange={e => setUseTrash(e.target.checked)} 
                  />
                  <span>Move to Trash (Safe)</span>
                </label>
                <label className="toggle-label" title="Simulate the cleanup without deleting anything">
                  <input 
                    type="checkbox" 
                    checked={dryRun} 
                    onChange={e => setDryRun(e.target.checked)} 
                  />
                  <span>Dry Run</span>
                </label>
              </div>

              <div className="flex-row gap-2">
                <button className="btn btn-secondary btn-sm" onClick={onReset}>
                  <RotateCcw size={14} /> Rescan
                </button>
                <button 
                  className="btn btn-danger" 
                  disabled={selectedItems.length === 0}
                  onClick={() => setConfirmModalOpen(true)}
                >
                  <Trash2 size={16} /> Clean Selected ({selectedFormatted})
                </button>
              </div>
            </div>
          </div>

          {/* Filtering and Controls Bar */}
          <div className="filter-controls-bar">
            <div className="category-tabs">
              {categories.map(cat => {
                const count = cat === 'All' 
                  ? items.length 
                  : items.filter(i => i.category === cat).length;
                if (cat !== 'All' && count === 0) return null;
                return (
                  <button 
                    key={cat} 
                    className={`category-tab ${categoryFilter === cat ? 'active' : ''}`}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat}
                    <span className="category-tab-count">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="search-and-select">
              <div className="search-input-wrapper">
                <Search size={14} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Filter targets..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="select-buttons">
                <button className="btn btn-ghost btn-sm" onClick={() => selectAll(filteredItems)}>
                  <CheckSquare size={14} /> Select All
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => deselectAll(filteredItems)}>
                  <Square size={14} /> Deselect
                </button>
              </div>
            </div>
          </div>

          {/* Table of Scanned Items */}
          <div className="results-list">
            {filteredItems.map(item => {
              const isChecked = selectedIds.has(item.id);
              return (
                <div 
                  key={item.id} 
                  className={`result-item-card ${isChecked ? 'selected' : ''}`}
                  onClick={() => toggleItem(item.id)}
                >
                  <div className="result-item-checkbox" onClick={e => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={() => toggleItem(item.id)}
                    />
                  </div>

                  <div className="result-item-info">
                    <div className="result-item-header">
                      <span className="result-item-name">{item.name}</span>
                      <span className="badge badge-category">{item.category}</span>
                      {!item.defaultChecked && (
                        <span className="badge badge-optional">Optional</span>
                      )}
                    </div>
                    <div className="result-item-desc">{item.description}</div>
                    <div className="result-item-path" title={item.path}>
                      <span>{item.path}</span>
                      <button 
                        className="btn-icon" 
                        title="Reveal in Finder" 
                        onClick={(e) => { e.stopPropagation(); handleReveal(item.path); }}
                      >
                        <FolderOpen size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="result-item-size">
                    <strong>{item.sizeFormatted}</strong>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Confirmation Modal */}
          {confirmModalOpen && (
            <div className="modal-backdrop">
              <div className="modal-dialog">
                <div className="modal-header">
                  <ShieldAlert size={28} className="text-warning" />
                  <h3>Confirm Cleanup</h3>
                </div>
                <div className="modal-body">
                  <p>
                    You are about to clean <strong>{selectedItems.length} item(s)</strong> totaling <strong>{selectedFormatted}</strong>.
                  </p>
                  <div className="modal-notice">
                    {useTrash ? (
                      <p>✅ <strong>Safe mode enabled:</strong> Items will be moved to your macOS Trash bin so you can easily restore them if needed.</p>
                    ) : (
                      <p>⚠️ <strong>Permanent deletion:</strong> Items will be deleted directly to immediately free up physical disk space.</p>
                    )}
                    {dryRun && (
                      <p>🔍 <strong>Dry run active:</strong> No files will actually be modified or deleted.</p>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setConfirmModalOpen(false)}>
                    Cancel
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => {
                      setConfirmModalOpen(false);
                      onClean(selectedItems, { useTrash, dryRun });
                    }}
                  >
                    Confirm &amp; Clean
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Cleaning Progress State */}
      {scanStatus === 'cleaning' && (
        <div className="loading-state">
          <div className="loader danger-loader"></div>
          <h2>Cleaning System Files...</h2>
          <p className="loading-sub">Removing temporary caches and reclaiming storage space...</p>
        </div>
      )}

      {/* 5. Completed Done State */}
      {scanStatus === 'done' && (
        <div className="empty-state">
          <div className="empty-state-badge success-badge">
            <CheckCircle2 size={44} className="text-success" />
          </div>
          <h2>Optimization Finished</h2>
          <p>
            Reclaimed <strong>{cleanResult?.cleanedFormatted || selectedFormatted}</strong> across {cleanResult?.cleanedCount || selectedItems.length} items.
          </p>
          {cleanResult?.skippedCount > 0 && (
            <div className="info-notice">
              <strong>ℹ️ Note on macOS System Integrity Protection:</strong> {cleanResult.skippedCount} file(s) or active caches were skipped because they are in-use or protected by macOS. Grant <em>Full Disk Access</em> in macOS System Settings for deepest access.
            </div>
          )}
          <div className="flex-row gap-2 mt-4">
            <button className="btn btn-secondary" onClick={onReset}>
              Run Another Scan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
