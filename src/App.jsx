import { useState, useEffect } from 'react'
import { HardDrive, Trash2, Activity, Settings, AlertCircle, CheckCircle2, ChevronRight, Monitor } from 'lucide-react'
import './index.css'

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [scanStatus, setScanStatus] = useState('idle'); // idle, scanning, result, cleaning, done
  const [scanData, setScanData] = useState(null);
  const [cleanResult, setCleanResult] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [categoryFilter, setCategoryFilter] = useState('All');

  const handleScan = async () => {
    setScanStatus('scanning');
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.scanSystem();
        setScanData(data);
        const initialSelected = new Set(data.items.filter(i => i.defaultChecked).map(i => i.id));
        setSelectedIds(initialSelected);
        setCategoryFilter('All');
        setScanStatus('result');
      } else {
        alert("Error: Cannot connect to Electron backend. Ensure you are running the app via 'npm run dev', not directly in a browser.");
        setScanStatus('idle');
      }
    } catch (error) {
      console.error("Scan failed:", error);
      alert(error.message || "Scan failed.");
      setScanStatus('idle');
    }
  };

  const toggleItem = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCategory = (itemsInCategory) => {
    const allSelected = itemsInCategory.every(i => selectedIds.has(i.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      itemsInCategory.forEach(i => {
        if (allSelected) next.delete(i.id);
        else next.add(i.id);
      });
      return next;
    });
  };

  const selectedItems = scanData ? scanData.items.filter(i => selectedIds.has(i.id)) : [];
  const selectedBytes = selectedItems.reduce((sum, item) => sum + item.sizeBytes, 0);
  const selectedFormatted = formatBytes(selectedBytes);

  const categories = ['System & App Junk', 'Developer & Build', 'Package Managers', 'Containers & IDEs'];
  const availableCategories = scanData
    ? categories.filter(cat => scanData.items.some(i => i.category === cat))
    : [];

  const handleClean = async () => {
    if (selectedItems.length === 0) return;
    setScanStatus('cleaning');
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.cleanSystem(selectedItems);
        setCleanResult(res);
      } else {
        await new Promise(r => setTimeout(r, 2000));
        setCleanResult({ success: true, cleanedCount: selectedItems.length, skippedCount: 0 });
      }
      setScanStatus('done');
    } catch (error) {
      console.error("Clean failed:", error);
      setScanStatus('result');
    }
  };

  const reset = () => {
    setScanData(null);
    setCleanResult(null);
    setSelectedIds(new Set());
    setCategoryFilter('All');
    setScanStatus('idle');
  };

  return (
    <>
      <div className="titlebar"></div>
      <div className="sidebar">
        <div className="sidebar-nav">
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <Monitor /> Dashboard
          </div>
          <div className={`nav-item ${activeTab === 'system' ? 'active' : ''}`} onClick={() => setActiveTab('system')}>
            <HardDrive /> System Junk
          </div>
          <div className={`nav-item ${activeTab === 'trash' ? 'active' : ''}`} onClick={() => setActiveTab('trash')}>
            <Trash2 /> Trash Bins
          </div>
          <div className="nav-item" style={{ opacity: 0.5 }}>
            <Activity /> Activity Monitor
          </div>
          <div className="nav-item" style={{ opacity: 0.5, marginTop: 'auto' }}>
            <Settings /> Preferences
          </div>
        </div>
      </div>

      <div className="content">
        <div className="header">
          <h1>Mac Cleaner</h1>
          <p>Optimize and free up storage space</p>
        </div>

        <div className="main-area">
          {scanStatus === 'idle' && (
            <div className="empty-state">
              <Monitor className="empty-state-icon" strokeWidth={1.5} />
              <h2>System Check Required</h2>
              <p>Your system has not been scanned recently. We recommend running a full scan to identify unneeded files and reclaim disk space.</p>
              <button className="btn btn-primary" onClick={handleScan}>
                Scan Now
              </button>
            </div>
          )}

          {scanStatus === 'scanning' && (
            <div className="loading-state">
              <div className="loader"></div>
              <p>Analyzing system and developer storage directories...</p>
            </div>
          )}

          {scanStatus === 'result' && scanData && (
            <div>
              <div className="summary-card">
                <div className="summary-stat">
                  <span className="summary-label">Selected to Clean</span>
                  <span className="summary-value">{selectedFormatted}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {selectedItems.length} of {scanData.items.length} items selected (Total detected: {scanData.totalFormatted})
                  </span>
                </div>
                <div>
                  <button className="btn" onClick={reset} style={{ marginRight: '0.5rem' }}>Cancel</button>
                  <button className="btn btn-danger" disabled={selectedItems.length === 0} onClick={handleClean}>
                    Clean Selected ({selectedFormatted})
                  </button>
                </div>
              </div>

              <div className="category-tabs">
                <button
                  className={`category-tab ${categoryFilter === 'All' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter('All')}
                >
                  All Categories
                  <span className="category-tab-count">{scanData.items.length}</span>
                </button>
                {availableCategories.map(cat => {
                  const catItems = scanData.items.filter(i => i.category === cat);
                  return (
                    <button
                      key={cat}
                      className={`category-tab ${categoryFilter === cat ? 'active' : ''}`}
                      onClick={() => setCategoryFilter(cat)}
                    >
                      {cat}
                      <span className="category-tab-count">{catItems.length}</span>
                    </button>
                  );
                })}
              </div>

              {availableCategories
                .filter(cat => categoryFilter === 'All' || categoryFilter === cat)
                .map(cat => {
                  const catItems = scanData.items.filter(i => i.category === cat);
                  const catBytes = catItems.reduce((sum, i) => sum + i.sizeBytes, 0);
                  const allSelected = catItems.length > 0 && catItems.every(i => selectedIds.has(i.id));

                  return (
                    <div key={cat} style={{ marginBottom: '1.5rem' }}>
                      <div className="category-header">
                        <div className="category-header-left">
                          <input
                            type="checkbox"
                            className="item-checkbox"
                            checked={allSelected}
                            onChange={() => toggleCategory(catItems)}
                          />
                          <span>{cat}</span>
                          <span className="category-tab-count" style={{ background: 'rgba(128,128,128,0.2)' }}>{catItems.length}</span>
                        </div>
                        <div className="category-header-right">
                          {formatBytes(catBytes)}
                        </div>
                      </div>

                      <table className="results-table" style={{ marginBottom: '0.5rem' }}>
                        <tbody>
                          {catItems.map(item => (
                            <tr key={item.id} className="item-row" onClick={() => toggleItem(item.id)} style={{ cursor: 'pointer' }}>
                              <td style={{ width: '36px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  className="item-checkbox"
                                  checked={selectedIds.has(item.id)}
                                  onChange={() => toggleItem(item.id)}
                                />
                              </td>
                              <td>
                                <div>
                                  <span className="item-name" style={{ display: 'inline-block' }}>{item.name}</span>
                                  {!item.defaultChecked && (
                                    <span className="item-badge-optional">Optional</span>
                                  )}
                                </div>
                                <div className="item-desc">{item.description}</div>
                                <div className="item-path">{item.path}</div>
                              </td>
                              <td className="item-size">{item.sizeFormatted}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
            </div>
          )}

          {scanStatus === 'cleaning' && (
            <div className="loading-state">
              <div className="loader" style={{ borderTopColor: 'var(--danger-color)' }}></div>
              <p>Cleaning selected system and developer cache files...</p>
            </div>
          )}

          {scanStatus === 'done' && (
            <div className="empty-state">
              <CheckCircle2 className="empty-state-icon" style={{ color: '#34c759' }} strokeWidth={1.5} />
              <h2>Optimization Complete</h2>
              <p>Successfully recovered <strong>{selectedFormatted}</strong> of disk space. Your system should be running more efficiently now.</p>
              {cleanResult?.skippedCount > 0 && (
                <div style={{
                  margin: '16px auto',
                  maxWidth: '520px',
                  padding: '12px 16px',
                  background: 'var(--surface-bg-alt)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  textAlign: 'left',
                  lineHeight: '1.4'
                }}>
                  <strong>ℹ️ Note on macOS Protections:</strong> {cleanResult.skippedCount} file(s) or system caches (such as Apple CloudKit, Safari, or active application logs) were skipped. To clean Apple-protected caches and the Trash bin, grant <strong>Full Disk Access</strong> in <em>System Settings &gt; Privacy &amp; Security &gt; Full Disk Access</em>.
                </div>
              )}
              <button className="btn" onClick={reset}>
                Return to Dashboard
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

export default App

