import React, { useState, useEffect } from 'react';
import { 
  Copy, 
  Trash2, 
  FolderOpen, 
  CheckCircle2, 
  RotateCcw, 
  Search, 
  FileCheck,
  ShieldCheck
} from 'lucide-react';

export default function DuplicateFinder() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [selectedPaths, setSelectedPaths] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState(null);

  const loadDuplicates = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      if (window.cleanSweepAPI?.scanDuplicates) {
        const res = await window.cleanSweepAPI.scanDuplicates();
        setData(res);
        // By default, select all duplicate copies (keeping the original unchecked)
        const dupes = [];
        res.groups.forEach(g => {
          g.duplicates.forEach(d => dupes.push(d.path));
        });
        setSelectedPaths(new Set(dupes));
      }
    } catch (err) {
      console.error('Failed to scan duplicates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDuplicates();
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

  const handleRemoveDuplicates = async () => {
    if (selectedPaths.size === 0) return;
    setLoading(true);
    try {
      const res = await window.cleanSweepAPI.removeDuplicates(Array.from(selectedPaths), { useTrash: true });
      setActionMessage(`✓ Successfully moved ${res.cleanedCount} duplicate file(s) to Trash.`);
      await loadDuplicates();
    } catch (err) {
      setActionMessage(`Error removing duplicates: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const groups = data?.groups || [];
  const filteredGroups = groups.filter(g => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const inOrig = g.original.name.toLowerCase().includes(q) || g.original.path.toLowerCase().includes(q);
    const inDupes = g.duplicates.some(d => d.name.toLowerCase().includes(q) || d.path.toLowerCase().includes(q));
    return inOrig || inDupes;
  });

  return (
    <div className="duplicates-container">
      {/* Top Banner and Summary */}
      <div className="summary-card">
        <div className="summary-left">
          <span className="summary-title">Cryptographic Duplicate Finder</span>
          <div className="summary-number-row">
            <span className="summary-value text-accent">{data ? data.totalWastedFormatted : '0 B'}</span>
            <span className="summary-detail">
              ({data ? data.totalDuplicates : 0} duplicate files verified via SHA-256 fingerprinting)
            </span>
          </div>
        </div>
        <div className="summary-right">
          <button 
            className="btn btn-danger" 
            disabled={selectedPaths.size === 0 || loading}
            onClick={handleRemoveDuplicates}
          >
            <Trash2 size={15} /> Move Selected Duplicates to Trash
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
        <div className="search-input-wrapper">
          <Search size={14} className="search-icon" />
          <input 
            type="text" 
            placeholder="Filter duplicates by filename..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="select-buttons">
          <button className="btn btn-secondary btn-sm" onClick={loadDuplicates} disabled={loading}>
            <RotateCcw size={14} /> Rescan
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loader"></div>
          <p>Scanning directories and calculating SHA-256 signatures...</p>
        </div>
      )}

      {/* Duplicate Groups */}
      {!loading && (
        <div className="duplicate-groups-list">
          {filteredGroups.map(group => (
            <div key={group.groupId} className="duplicate-group-card">
              <div className="duplicate-group-header">
                <div className="duplicate-group-title">
                  <Copy size={16} className="text-accent" />
                  <span>{group.original.name}</span>
                  <span className="badge badge-category">{group.sizeFormatted} per file</span>
                </div>
                <div className="duplicate-group-wasted text-danger">
                  +{group.wastedFormatted} wasted
                </div>
              </div>

              <div className="duplicate-files-table">
                {/* 1. Original File (Safe, Keep) */}
                <div className="duplicate-file-row original-row">
                  <div className="duplicate-file-badge">
                    <span className="badge badge-success">
                      <FileCheck size={11} /> Original (Keep)
                    </span>
                  </div>
                  <div className="duplicate-file-path" title={group.original.path}>
                    <span>{group.original.path}</span>
                    <button 
                      className="btn-icon" 
                      onClick={() => handleReveal(group.original.path)} 
                      title="Reveal in Finder"
                    >
                      <FolderOpen size={12} />
                    </button>
                  </div>
                  <div className="duplicate-file-date text-xs text-secondary">
                    Modified: {new Date(group.original.modifiedAt).toLocaleDateString()}
                  </div>
                </div>

                {/* 2. Duplicate Copies (Checkable for Deletion) */}
                {group.duplicates.map(dupe => {
                  const isChecked = selectedPaths.has(dupe.path);
                  return (
                    <div 
                      key={dupe.path} 
                      className={`duplicate-file-row dupe-row ${isChecked ? 'selected' : ''}`}
                      onClick={() => toggleSelect(dupe.path)}
                    >
                      <div className="duplicate-file-checkbox" onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => toggleSelect(dupe.path)}
                        />
                      </div>
                      <div className="duplicate-file-badge">
                        <span className="badge badge-danger">Duplicate</span>
                      </div>
                      <div className="duplicate-file-path" title={dupe.path}>
                        <span>{dupe.path}</span>
                        <button 
                          className="btn-icon" 
                          onClick={(e) => { e.stopPropagation(); handleReveal(dupe.path); }} 
                          title="Reveal in Finder"
                        >
                          <FolderOpen size={12} />
                        </button>
                      </div>
                      <div className="duplicate-file-date text-xs text-secondary">
                        Modified: {new Date(dupe.modifiedAt).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredGroups.length === 0 && (
            <div className="empty-substate">
              <ShieldCheck size={36} className="text-success" />
              <p>No duplicate files found across target directories.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
