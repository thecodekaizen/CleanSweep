import React, { useState, useEffect } from 'react';
import { 
  Rocket, 
  FolderOpen, 
  Trash2, 
  CheckCircle2, 
  RotateCcw, 
  Search, 
  FileCode 
} from 'lucide-react';

export default function StartupItems() {
  const [loading, setLoading] = useState(false);
  const [itemsData, setItemsData] = useState(null);
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState(null);

  const loadStartupItems = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      if (window.cleanSweepAPI?.getStartupItems) {
        const data = await window.cleanSweepAPI.getStartupItems();
        setItemsData(data);
      }
    } catch (err) {
      console.error('Failed to load startup items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStartupItems();
  }, []);

  const handleReveal = (p) => {
    if (window.cleanSweepAPI?.revealInFinder) {
      window.cleanSweepAPI.revealInFinder(p);
    }
  };

  const handleRemove = async (item) => {
    setLoading(true);
    try {
      await window.cleanSweepAPI.removeStartupItem(item.path, true);
      setActionMessage(`✓ Moved startup item '${item.name}' to Trash.`);
      await loadStartupItems();
    } catch (err) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const items = itemsData?.items || [];
  const filteredItems = items.filter(i => {
    const matchesType = filterType === 'All' || i.type === filterType;
    const matchesSearch = !searchQuery || 
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      i.program.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="startup-container">
      {/* Header Banner */}
      <div className="summary-card">
        <div className="summary-left">
          <span className="summary-title">Startup &amp; Background Launch Items</span>
          <div className="summary-number-row">
            <span className="summary-value text-accent">{itemsData?.totalCount || 0} Registered Items</span>
            <span className="summary-detail">
              Manage LaunchAgents and background daemons that run automatically when your Mac boots.
            </span>
          </div>
        </div>
        <div className="summary-right">
          <button className="btn btn-secondary btn-sm" onClick={loadStartupItems} disabled={loading}>
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

      {/* Filter and Search Bar */}
      <div className="filter-controls-bar">
        <div className="category-tabs">
          {['All', 'User LaunchAgent', 'System LaunchAgent', 'System LaunchDaemon'].map(t => (
            <button 
              key={t}
              className={`category-tab ${filterType === t ? 'active' : ''}`}
              onClick={() => setFilterType(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="search-input-wrapper">
          <Search size={14} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search startup items..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loader"></div>
          <p>Enumerating startup items and background daemons...</p>
        </div>
      )}

      {/* Items List */}
      {!loading && (
        <div className="startup-list">
          {filteredItems.map(item => (
            <div key={item.id} className="startup-card">
              <div className="startup-icon-wrapper">
                <FileCode size={20} className="text-accent" />
              </div>

              <div className="startup-main-info">
                <div className="startup-title-row">
                  <span className="startup-name">{item.name}</span>
                  <span className="badge badge-category">{item.type}</span>
                  {item.runAtLoad && <span className="badge badge-success">Runs at Login</span>}
                </div>
                <div className="startup-program" title={item.program}>
                  <strong>Command:</strong> {item.program}
                </div>
                <div className="startup-path" title={item.path}>
                  <span>{item.path}</span>
                  <button className="btn-icon" onClick={() => handleReveal(item.path)} title="Reveal in Finder">
                    <FolderOpen size={12} />
                  </button>
                </div>
              </div>

              <div className="startup-actions">
                <button 
                  className="btn btn-danger btn-sm" 
                  disabled={!item.isUserLevel}
                  onClick={() => handleRemove(item)}
                  title={item.isUserLevel ? 'Move item to Trash' : 'System LaunchDaemons are protected by root / SIP'}
                >
                  <Trash2 size={13} /> {item.isUserLevel ? 'Remove' : 'Protected'}
                </button>
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="empty-substate">
              <Rocket size={32} className="text-secondary" />
              <p>No startup items found under the selected category.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
