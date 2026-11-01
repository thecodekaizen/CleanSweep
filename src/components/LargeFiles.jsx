import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Archive, 
  Film, 
  Music, 
  Image, 
  FolderOpen, 
  Trash2, 
  Search, 
  Calendar,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export default function LargeFiles() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [selectedPaths, setSelectedPaths] = useState(new Set());
  const [sizeFilterMb, setSizeFilterMb] = useState(50);
  const [ageFilterDays, setAgeFilterDays] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState(null);

  const loadFiles = async (minMb = sizeFilterMb) => {
    setLoading(true);
    setActionMessage(null);
    try {
      if (window.cleanSweepAPI?.scanLargeFiles) {
        const res = await window.cleanSweepAPI.scanLargeFiles({
          minSizeBytes: minMb * 1024 * 1024
        });
        setData(res);
        setSelectedPaths(new Set());
      }
    } catch (err) {
      console.error('Failed to scan large files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles(sizeFilterMb);
  }, [sizeFilterMb]);

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

  const handleDeleteSelected = async () => {
    if (selectedPaths.size === 0) return;
    setLoading(true);
    try {
      const res = await window.cleanSweepAPI.deleteLargeFiles(Array.from(selectedPaths), { useTrash: true });
      setActionMessage(`✓ Moved ${res.deletedCount} file(s) to Trash.`);
      await loadFiles(sizeFilterMb);
    } catch (err) {
      setActionMessage(`Error deleting: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Archives & Installers': return <Archive size={16} className="text-warning" />;
      case 'Videos': return <Film size={16} className="text-accent" />;
      case 'Audio': return <Music size={16} className="text-success" />;
      case 'Images': return <Image size={16} className="text-pink" />;
      default: return <FileText size={16} className="text-secondary" />;
    }
  };

  const files = data?.files || [];
  const filteredFiles = files.filter(f => {
    const matchesAge = ageFilterDays === 0 || f.ageDays >= ageFilterDays;
    const matchesCat = categoryFilter === 'All' || f.category === categoryFilter;
    const matchesSearch = !searchQuery || 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      f.path.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAge && matchesCat && matchesSearch;
  });

  const selectedBytes = filteredFiles
    .filter(f => selectedPaths.has(f.path))
    .reduce((sum, f) => sum + f.sizeBytes, 0);

  function formatBytes(bytes) {
    if (!+bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  return (
    <div className="large-files-container">
      {/* Top Banner and Actions */}
      <div className="summary-card">
        <div className="summary-left">
          <span className="summary-title">Disk Space Explorer</span>
          <div className="summary-number-row">
            <span className="summary-value text-accent">{data ? data.totalFormatted : '0 B'}</span>
            <span className="summary-detail">
              ({data ? data.totalCount : 0} large files found in Downloads, Documents &amp; Media)
            </span>
          </div>
        </div>

        <div className="summary-right">
          <button 
            className="btn btn-danger" 
            disabled={selectedPaths.size === 0}
            onClick={handleDeleteSelected}
          >
            <Trash2 size={15} /> Move Selected to Trash ({formatBytes(selectedBytes)})
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="alert-banner">
          <CheckCircle2 size={16} className="text-success" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Filter Row: Sizes and Ages */}
      <div className="filter-controls-bar">
        <div className="filter-group">
          <span className="filter-group-label">Category:</span>
          {['All', 'Archives & Installers', 'Videos', 'Documents'].map(cat => (
            <button 
              key={cat} 
              className={`filter-btn ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === 'Archives & Installers' ? 'Archives' : cat}
            </button>
          ))}
        </div>

        <div className="filter-group">
          <span className="filter-group-label">Size:</span>
          {[50, 100, 500, 1024].map(mb => (
            <button 
              key={mb} 
              className={`filter-btn ${sizeFilterMb === mb ? 'active' : ''}`}
              onClick={() => setSizeFilterMb(mb)}
            >
              &gt; {mb >= 1024 ? '1 GB' : `${mb} MB`}
            </button>
          ))}
        </div>

        <div className="filter-group">
          <span className="filter-group-label">Age:</span>
          {[
            { label: 'All', days: 0 },
            { label: '> 30 Days', days: 30 },
            { label: '> 90 Days', days: 90 },
            { label: '> 1 Year', days: 365 }
          ].map(a => (
            <button 
              key={a.days} 
              className={`filter-btn ${ageFilterDays === a.days ? 'active' : ''}`}
              onClick={() => setAgeFilterDays(a.days)}
            >
              {a.label}
            </button>
          ))}
        </div>

        <div className="search-input-wrapper">
          <Search size={14} className="search-icon" />
          <input 
            type="text" 
            placeholder="Filter files..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loader"></div>
          <p>Analyzing directories for large and old assets...</p>
        </div>
      )}

      {/* File List */}
      {!loading && (
        <div className="large-files-list">
          {filteredFiles.map(file => {
            const isChecked = selectedPaths.has(file.path);
            return (
              <div 
                key={file.path} 
                className={`large-file-row ${isChecked ? 'selected' : ''}`}
                onClick={() => toggleSelect(file.path)}
              >
                <div className="large-file-checkbox" onClick={e => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={isChecked}
                    onChange={() => toggleSelect(file.path)}
                  />
                </div>

                <div className="large-file-icon">
                  {getCategoryIcon(file.category)}
                </div>

                <div className="large-file-main">
                  <div className="large-file-name-row">
                    <span className="large-file-name">{file.name}</span>
                    <span className="badge badge-category">{file.category}</span>
                    <span className="badge badge-age">
                      <Calendar size={11} /> {file.ageDays} days old
                    </span>
                  </div>
                  <div className="large-file-path" title={file.path}>
                    <span>{file.path}</span>
                    <button 
                      className="btn-icon" 
                      onClick={(e) => { e.stopPropagation(); handleReveal(file.path); }}
                      title="Reveal in Finder"
                    >
                      <FolderOpen size={12} />
                    </button>
                  </div>
                </div>

                <div className="large-file-size">
                  <strong>{file.sizeFormatted}</strong>
                </div>
              </div>
            );
          })}

          {filteredFiles.length === 0 && (
            <div className="empty-substate">
              <Sparkles size={28} className="text-secondary" />
              <p>No files matching the active filter criteria.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
