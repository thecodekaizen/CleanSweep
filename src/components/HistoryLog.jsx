import React, { useState, useEffect } from 'react';
import { 
  History, 
  Trash2, 
  RotateCcw, 
  ShieldCheck, 
  Calendar
} from 'lucide-react';

export default function HistoryLog() {
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState(null);

  const loadHistory = async () => {
    setLoading(true);
    try {
      if (window.cleanSweepAPI?.getHistory) {
        const data = await window.cleanSweepAPI.getHistory();
        setHistoryData(data);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your cleanup history log?')) return;
    setLoading(true);
    try {
      await window.cleanSweepAPI.clearHistory();
      await loadHistory();
    } catch (err) {
      console.error('Failed to clear history:', err);
    } finally {
      setLoading(false);
    }
  };

  const entries = historyData?.entries || [];

  return (
    <div className="history-container">
      {/* Top Banner with Lifetime Stats */}
      <div className="summary-card">
        <div className="summary-left">
          <span className="summary-title">Lifetime Storage Optimization</span>
          <div className="summary-number-row">
            <span className="summary-value text-success">
              {historyData ? historyData.totalLifetimeFormatted : '0 B'}
            </span>
            <span className="summary-detail">
              reclaimed across {historyData ? historyData.totalOperations : 0} maintenance runs
            </span>
          </div>
        </div>

        <div className="summary-right">
          <div className="flex-row gap-2">
            <button className="btn btn-secondary btn-sm" onClick={loadHistory} disabled={loading}>
              <RotateCcw size={14} /> Refresh
            </button>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={handleClearHistory}
              disabled={entries.length === 0 || loading}
            >
              <Trash2 size={14} /> Clear Log
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loader"></div>
          <p>Loading operation history records...</p>
        </div>
      )}

      {/* History Entries List */}
      {!loading && (
        <div className="history-list">
          {entries.map(entry => (
            <div key={entry.id} className="history-card">
              <div className="history-icon-wrapper">
                <History size={18} className="text-accent" />
              </div>

              <div className="history-main-info">
                <div className="history-title-row">
                  <span className="history-type">{entry.type}</span>
                  <span className="badge badge-category">
                    <Calendar size={11} /> {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="history-details">{entry.details}</div>
              </div>

              <div className="history-stats">
                {entry.bytesReclaimed > 0 ? (
                  <strong className="text-success">+{entry.reclaimedFormatted}</strong>
                ) : (
                  <span className="badge badge-accent">{entry.itemCount} item(s)</span>
                )}
              </div>
            </div>
          ))}

          {entries.length === 0 && (
            <div className="empty-substate">
              <ShieldCheck size={36} className="text-secondary" />
              <p>No cleanup operations recorded yet. Run a Smart Clean to start tracking your reclaimed storage!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
