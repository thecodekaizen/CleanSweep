import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  Eye, 
  HardDrive, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export default function Optimizer() {
  const [tasks, setTasks] = useState([]);
  const [runningTaskId, setRunningTaskId] = useState(null);
  const [taskResults, setTaskResults] = useState({});
  const [runningAll, setRunningAll] = useState(false);
  const [runningDamageScan, setRunningDamageScan] = useState(false);
  const [damageReport, setDamageReport] = useState(null);

  useEffect(() => {
    async function loadTasks() {
      if (window.cleanSweepAPI?.getOptimizationTasks) {
        const list = await window.cleanSweepAPI.getOptimizationTasks();
        setTasks(list);
      }
    }
    loadTasks();
  }, []);

  const runDamageScanner = async () => {
    setRunningDamageScan(true);
    try {
      if (window.cleanSweepAPI?.runDamageScan) {
        const report = await window.cleanSweepAPI.runDamageScan();
        setDamageReport(report);
      }
    } catch (err) {
      console.error('Damage scanner error:', err);
    } finally {
      setRunningDamageScan(false);
    }
  };

  const runTask = async (taskId) => {
    setRunningTaskId(taskId);
    try {
      const res = await window.cleanSweepAPI.runOptimization(taskId);
      setTaskResults(prev => ({ ...prev, [taskId]: res }));
    } catch (err) {
      setTaskResults(prev => ({
        ...prev,
        [taskId]: { success: false, message: err.message, durationMs: 0 }
      }));
    } finally {
      setRunningTaskId(null);
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    for (const t of tasks) {
      setRunningTaskId(t.id);
      try {
        const res = await window.cleanSweepAPI.runOptimization(t.id);
        setTaskResults(prev => ({ ...prev, [t.id]: res }));
      } catch (err) {
        setTaskResults(prev => ({
          ...prev,
          [t.id]: { success: false, message: err.message, durationMs: 0 }
        }));
      }
    }
    setRunningTaskId(null);
    setRunningAll(false);
  };

  const getTaskIcon = (taskId) => {
    switch (taskId) {
      case 'flush-dns': return <Zap size={18} className="text-accent" />;
      case 'purge-ram': return <Layers size={18} className="text-warning" />;
      case 'rebuild-launchservices': return <Cpu size={18} className="text-purple" />;
      case 'refresh-quicklook': return <Eye size={18} className="text-success" />;
      case 'clean-snapshots': return <HardDrive size={18} className="text-orange" />;
      default: return <Sparkles size={18} className="text-accent" />;
    }
  };

  return (
    <div className="optimizer-container">
      {/* Header Banner */}
      <div className="summary-card">
        <div className="summary-left">
          <span className="summary-title">macOS Maintenance Routines</span>
          <div className="summary-number-row">
            <span className="summary-value text-accent">System Optimizer</span>
            <span className="summary-detail">
              Refresh system databases, flush stale caches, purge RAM, and resolve macOS glitches.
            </span>
          </div>
        </div>
        <div className="summary-right" style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary" 
            disabled={runningDamageScan || runningAll || runningTaskId !== null}
            onClick={runDamageScanner}
          >
            <ShieldCheck size={15} className="text-success" /> {runningDamageScan ? 'Scanning...' : 'Run Damage Scanner'}
          </button>
          <button 
            className="btn btn-primary" 
            disabled={runningAll || runningTaskId !== null || runningDamageScan}
            onClick={runAll}
          >
            <Sparkles size={15} /> Run All Optimizations
          </button>
        </div>
      </div>

      {damageReport && (
        <div className="summary-card" style={{ marginTop: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div className="summary-left" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} className="text-success" />
                <span className="summary-title" style={{ fontSize: '15px' }}>
                  System Damage &amp; Safety Audit: <strong>{damageReport.overallStatus}</strong>
                </span>
              </div>
              <span className="badge badge-category" style={{ backgroundColor: '#10b98120', color: '#10b981' }}>
                Safety Score: {damageReport.safetyScore}% ({damageReport.checksPassed}/{damageReport.totalChecks} Checks Passed)
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px', marginTop: '12px' }}>
              {damageReport.checks.map(c => (
                <div key={c.id} style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '6px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', marginBottom: '4px' }}>
                    <CheckCircle2 size={13} className="text-success" />
                    <span>{c.title}</span>
                  </div>
                  <div className="text-secondary" style={{ fontSize: '11px', lineHeight: '1.4' }}>
                    {c.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Task Grid */}
      <div className="optimizer-grid">
        {tasks.map(task => {
          const isRunning = runningTaskId === task.id;
          const result = taskResults[task.id];

          return (
            <div key={task.id} className="optimizer-card">
              <div className="optimizer-card-top">
                <div className="optimizer-icon-box">
                  {getTaskIcon(task.id)}
                </div>
                <div className="optimizer-info">
                  <div className="optimizer-title-row">
                    <span className="optimizer-title">{task.title}</span>
                    <span className="badge badge-category">{task.category}</span>
                  </div>
                  <p className="optimizer-desc">{task.description}</p>
                </div>
              </div>

              {result && (
                <div className={`optimizer-result-banner ${result.success ? 'success' : 'error'}`}>
                  {result.success ? (
                    <CheckCircle2 size={14} className="text-success" />
                  ) : (
                    <AlertCircle size={14} className="text-warning" />
                  )}
                  <span>{result.message}</span>
                  {result.durationMs > 0 && (
                    <span className="text-xs text-secondary">({result.durationMs}ms)</span>
                  )}
                </div>
              )}

              <div className="optimizer-card-footer">
                <button 
                  className="btn btn-secondary btn-sm" 
                  disabled={isRunning || runningAll}
                  onClick={() => runTask(task.id)}
                >
                  {isRunning ? (
                    <>
                      <div className="spinner-sm"></div> Running...
                    </>
                  ) : (
                    <>
                      <Zap size={13} /> Execute Task
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
