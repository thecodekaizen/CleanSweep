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
  Sparkles,
  Database,
  HardDrive,
  AlertTriangle,
  RotateCcw,
  CheckSquare,
  Square
} from 'lucide-react';

export default function LargeFiles() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [selectedPaths, setSelectedPaths] = useState(new Set());
  const [sizeFilterMb, setSizeFilterMb] = useState(50);
  const [ageFilterDays, setAgeFilterDays] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [customScanDir, setCustomScanDir] = useState(null);
  const [sortBy, setSortBy] = useState('size-desc');
  const [actionMessage, setActionMessage] = useState(null);

  const loadFiles = async (minMb = sizeFilterMb, customDir = customScanDir) => {
    setLoading(true);
    setActionMessage(null);
    try {
      if (window.cleanSweepAPI?.scanLargeFiles) {
        const options = {
          minSizeBytes: minMb * 1024 * 1024
        };
        if (customDir) {
          options.customDirs = [customDir];
        }
        const res = await window.cleanSweepAPI.scanLargeFiles(options);
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
    loadFiles(sizeFilterMb, customScanDir);
  }, [sizeFilterMb, customScanDir]);

  const handlePickCustomDir = async () => {
    if (window.cleanSweepAPI?.selectDirectory) {
      const dir = await window.cleanSweepAPI.selectDirectory();
      if (dir) {
        setCustomScanDir(dir);
      }
    }
  };

  const handleResetDefaultDirs = () => {
    setCustomScanDir(null);
  };

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
    setSelectedPaths(new Set(filteredList.map(f => f.path)));
  };

  const deselectAll = () => {
    setSelectedPaths(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedPaths.size === 0) return;
    setLoading(true);
    try {
      const res = await window.cleanSweepAPI.deleteLargeFiles(Array.from(selectedPaths), { useTrash: true });
      setActionMessage(`✓ Moved ${res.deletedCount} file(s) to Trash.`);
      await loadFiles(sizeFilterMb, customScanDir);
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
      case 'Disk Images & VMs': return <HardDrive size={16} className="text-purple" />;
      case 'Developer & Data': return <Database size={16} className="text-cyan" />;
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

  // Sort files according to active sort selector
  filteredFiles.sort((a, b) => {
    if (sortBy === 'size-desc') return b.sizeBytes - a.sizeBytes;
    if (sortBy === 'size-asc') return a.sizeBytes - b.sizeBytes;
    if (sortBy === 'age-desc') return b.ageDays - a.ageDays;
    if (sortBy === 'age-asc') return a.ageDays - b.ageDays;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0;
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
              ({data ? data.totalCount : 0} large files found {customScanDir ? `in ${customScanDir}` : 'in Downloads, Documents & Media'})
            </span>
          </div>
        </div>

        <div className="summary-right" style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handlePickCustomDir}
            disabled={loading}
          >
            <FolderOpen size={14} /> {customScanDir ? 'Change Folder...' : 'Scan Custom Folder...'}
          </button>
          {customScanDir && (
            <button 
              className="btn btn-secondary" 
              onClick={handleResetDefaultDirs}
              title="Reset to default system locations"
            >
              <RotateCcw size={14} /> Default
            </button>
          )}
          <button 
            className="btn btn-danger" 
            disabled={selectedPaths.size === 0 || loading}
            onClick={handleDeleteSelected}
          >
            <Trash2 size={15} /> Move to Trash ({formatBytes(selectedBytes)})
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="alert-banner">
          <CheckCircle2 size={16} className="text-success" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Permission Notices */}
      {data?.permissionDeniedDirs?.length > 0 && !customScanDir && (
        <div className="alert-banner" style={{ background: '#f59e0b15', border: '1px solid #f59e0b40', color: '#d97706' }}>
          <AlertTriangle size={16} />
          <span>
            Notice: {data.permissionDeniedDirs.length} folder(s) were protected by macOS privacy permissions. Click <strong>"Scan Custom Folder..."</strong> to directly grant access to any drive or folder.
          </span>
        </div>
      )}

      {/* Filter Row: Sizes, Ages, Categories */}
      <div className="filter-controls-bar">
        <div className="filter-group">
          <span className="filter-group-label">Category:</span>
          {['All', 'Archives & Installers', 'Videos', 'Developer & Data', 'Disk Images & VMs', 'Documents', 'Images', 'Audio', 'Other Large Files'].map(cat => (
            <button 
              key={cat} 
              className={`filter-btn ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === 'Archives & Installers' ? 'Archives' : (cat === 'Disk Images & VMs' ? 'VM / Disks' : (cat === 'Developer & Data' ? 'Data / Dev' : cat))}
            </button>
          ))}
        </div>

        <div className="filter-group">
          <span className="filter-group-label">Min Size:</span>
          {[10, 25, 50, 100, 500, 1024].map(mb => (
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
            placeholder="Search by file name or path..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Secondary Action Toolbar: Select All, Deselect, Sort */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => selectAll(filteredFiles)}
            disabled={filteredFiles.length === 0}
          >
            <CheckSquare size={12} /> Select All ({filteredFiles.length})
          </button>
          {selectedPaths.size > 0 && (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={deselectAll}
            >
              <Square size={12} /> Deselect All
            </button>
          )}
          <span>{selectedPaths.size} selected ({formatBytes(selectedBytes)})</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Sort by:</span>
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px' }}
          >
            <option value="size-desc">Largest First</option>
            <option value="size-asc">Smallest First</option>
            <option value="age-desc">Oldest First</option>
            <option value="age-asc">Newest First</option>
            <option value="name">File Name (A-Z)</option>
          </select>
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
              {customScanDir && (
                <button className="btn btn-secondary btn-sm" style={{ marginTop: '8px' }} onClick={handleResetDefaultDirs}>
                  Return to Default Locations
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
