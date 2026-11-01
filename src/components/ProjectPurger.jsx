import React, { useState, useEffect } from 'react';
import { 
  FolderArchive, 
  Trash2, 
  FolderOpen, 
  CheckCircle2, 
  RotateCcw, 
  Search, 
  CheckSquare, 
  Square,
  Sparkles
} from 'lucide-react';

export default function ProjectPurger() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [selectedPaths, setSelectedPaths] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState(null);

  const loadProjects = async (customPath = null) => {
    setLoading(true);
    setActionMessage(null);
    try {
      if (window.cleanSweepAPI?.scanProjectArtifacts) {
        const res = await window.cleanSweepAPI.scanProjectArtifacts(customPath);
        setData(res);
        // Default select all detected build artifacts
        setSelectedPaths(new Set(res.artifacts.map(a => a.path)));
      }
    } catch (err) {
      console.error('Failed to scan dev artifacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleReveal = (p) => {
    if (window.cleanSweepAPI?.revealInFinder) {
      window.cleanSweepAPI.revealInFinder(p);
    }
  };

  const toggleSelect = (p) => {
    setSelectedPaths(prev => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const selectAll = (filteredList) => {
    setSelectedPaths(prev => {
      const next = new Set(prev);
      filteredList.forEach(item => next.add(item.path));
      return next;
    });
  };

  const deselectAll = () => {
    setSelectedPaths(new Set());
  };

  const handlePurge = async () => {
    if (selectedPaths.size === 0) return;
    setLoading(true);
    try {
      const res = await window.cleanSweepAPI.purgeArtifacts(Array.from(selectedPaths), { useTrash: true });
      setActionMessage(`✓ Successfully purged ${res.cleanedCount} rebuildable project folder(s) to Trash.`);
      await loadProjects();
    } catch (err) {
      setActionMessage(`Error purging: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const artifacts = data?.artifacts || [];
  const filteredArtifacts = artifacts.filter(art => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return art.projectName.toLowerCase().includes(q) || 
      art.artifactType.toLowerCase().includes(q) ||
      art.path.toLowerCase().includes(q);
  });

  const selectedBytes = filteredArtifacts
    .filter(a => selectedPaths.has(a.path))
    .reduce((sum, a) => sum + a.sizeBytes, 0);

  function formatBytes(bytes) {
    if (!+bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  return (
    <div className="purger-container">
      {/* Top Banner and Summary */}
      <div className="summary-card">
        <div className="summary-left">
          <span className="summary-title">Project Build Artifacts Purger</span>
          <div className="summary-number-row">
            <span className="summary-value text-accent">{data ? data.totalFormatted : '0 B'}</span>
            <span className="summary-detail">
              ({data ? data.totalCount : 0} rebuildable folders like node_modules, target, .venv, .next)
            </span>
          </div>
        </div>
        <div className="summary-right">
          <button 
            className="btn btn-danger" 
            disabled={selectedPaths.size === 0 || loading}
            onClick={handlePurge}
          >
            <Trash2 size={15} /> Purge Selected ({formatBytes(selectedBytes)})
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="alert-banner">
          <CheckCircle2 size={16} className="text-success" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="filter-controls-bar">
        <div className="search-input-wrapper">
          <Search size={14} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by project name or type..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="select-buttons">
          <button className="btn btn-ghost btn-sm" onClick={() => selectAll(filteredArtifacts)}>
            <CheckSquare size={14} /> Select All
          </button>
          <button className="btn btn-ghost btn-sm" onClick={deselectAll}>
            <Square size={14} /> Deselect
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => loadProjects()} disabled={loading}>
            <RotateCcw size={14} /> Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loader"></div>
          <p>Scanning code directories for heavy build outputs...</p>
        </div>
      )}

      {/* Artifacts List */}
      {!loading && (
        <div className="purger-list">
          {filteredArtifacts.map(art => {
            const isChecked = selectedPaths.has(art.path);
            return (
              <div 
                key={art.path} 
                className={`purger-row ${isChecked ? 'selected' : ''}`}
                onClick={() => toggleSelect(art.path)}
              >
                <div className="purger-checkbox" onClick={e => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={isChecked}
                    onChange={() => toggleSelect(art.path)}
                  />
                </div>

                <div className="purger-icon">
                  <FolderArchive size={20} className="text-accent" />
                </div>

                <div className="purger-main">
                  <div className="purger-name-row">
                    <span className="purger-project">{art.projectName}</span>
                    <span className="badge badge-accent">{art.artifactType}</span>
                    <span className="badge badge-category">Rebuildable</span>
                  </div>
                  <div className="purger-path" title={art.path}>
                    <span>{art.path}</span>
                    <button 
                      className="btn-icon" 
                      onClick={(e) => { e.stopPropagation(); handleReveal(art.path); }}
                      title="Reveal in Finder"
                    >
                      <FolderOpen size={12} />
                    </button>
                  </div>
                </div>

                <div className="purger-size">
                  <strong>{art.sizeFormatted}</strong>
                </div>
              </div>
            );
          })}

          {filteredArtifacts.length === 0 && (
            <div className="empty-substate">
              <Sparkles size={32} className="text-secondary" />
              <p>No heavy build artifacts detected. Your workspace is tidy!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
