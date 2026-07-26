import { useState, useEffect } from 'react'
import { HardDrive, Trash2, Activity, Settings, AlertCircle, CheckCircle2, ChevronRight, Monitor } from 'lucide-react'
import './index.css'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [scanStatus, setScanStatus] = useState('idle'); // idle, scanning, result, cleaning, done
  const [scanData, setScanData] = useState(null);

  const handleScan = async () => {
    setScanStatus('scanning');
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.scanSystem();
        setScanData(data);
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

  const handleClean = async () => {
    setScanStatus('cleaning');
    try {
      if (window.electronAPI) {
        await window.electronAPI.cleanSystem(scanData.items);
      } else {
        await new Promise(r => setTimeout(r, 2000));
      }
      setScanStatus('done');
    } catch (error) {
      console.error("Clean failed:", error);
      setScanStatus('result');
    }
  };

  const reset = () => {
    setScanData(null);
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
              <p>Analyzing system directories...</p>
            </div>
          )}

          {scanStatus === 'result' && scanData && (
            <div>
              <div className="summary-card">
                <div className="summary-stat">
                  <span className="summary-label">Space to Recover</span>
                  <span className="summary-value">{scanData.totalFormatted}</span>
                </div>
                <div>
                  <button className="btn" onClick={reset} style={{ marginRight: '0.5rem' }}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleClean}>
                    Clean System
                  </button>
                </div>
              </div>

              <table className="results-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Size</th>
                  </tr>
                </thead>
                <tbody>
                  {scanData.items.map(item => (
                    <tr key={item.id}>
                      <td>
                        <span className="item-name">{item.name}</span>
                        <span className="item-path">{item.path}</span>
                      </td>
                      <td className="item-size">{item.sizeFormatted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {scanStatus === 'cleaning' && (
            <div className="loading-state">
              <div className="loader" style={{ borderTopColor: 'var(--danger-color)' }}></div>
              <p>Moving files to Trash...</p>
            </div>
          )}

          {scanStatus === 'done' && (
            <div className="empty-state">
              <CheckCircle2 className="empty-state-icon" style={{ color: '#34c759' }} strokeWidth={1.5} />
              <h2>Optimization Complete</h2>
              <p>Successfully recovered <strong>{scanData?.totalFormatted}</strong> of disk space. Your system should be running more efficiently now.</p>
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
