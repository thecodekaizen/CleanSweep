import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  Eye, 
  HardDrive, 
  Sparkles 
} from 'lucide-react';

export default function Optimizer() {
  const [tasks, setTasks] = useState([]);
  const [runningTaskId, setRunningTaskId] = useState(null);
  const [taskResults, setTaskResults] = useState({});
  const [runningAll, setRunningAll] = useState(false);

  useEffect(() => {
    async function loadTasks() {
      if (window.cleanSweepAPI?.getOptimizationTasks) {
        const list = await window.cleanSweepAPI.getOptimizationTasks();
        setTasks(list);
      }
    }
    loadTasks();
  }, []);

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
        <div className="summary-right">
          <button 
            className="btn btn-primary" 
            disabled={runningAll || runningTaskId !== null}
            onClick={runAll}
          >
            <Sparkles size={15} /> Run All Optimizations
          </button>
        </div>
      </div>

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
