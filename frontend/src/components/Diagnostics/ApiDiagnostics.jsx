import React, { useState } from 'react';
import './ApiDiagnostics.css';
import { 
  Cpu, 
  Server, 
  Play, 
  RefreshCw, 
  Settings, 
  Terminal
} from 'lucide-react';
import { 
  getApiBaseUrls, 
  setApiBaseUrls, 
  getDashboardStats, 
  getAllCandidates 
} from '../../services/api';

export default function ApiDiagnostics({ healthStatus, onRefreshHealth, showToast }) {
  const currentUrls = getApiBaseUrls();
  const [nodeUrl, setNodeUrl] = useState(currentUrls.nodeUrl);
  const [pythonUrl, setPythonUrl] = useState(currentUrls.pythonUrl);
  const [testOutput, setTestOutput] = useState(null);
  const [testingEndpoint, setTestingEndpoint] = useState(null);

  const handleSaveUrls = (e) => {
    e.preventDefault();
    setApiBaseUrls(nodeUrl, pythonUrl);
    showToast?.('API Endpoints updated', 'success');
    onRefreshHealth?.();
  };

  const handleTestEndpoint = async (endpointName, testFn) => {
    setTestingEndpoint(endpointName);
    setTestOutput({ status: 'running', message: `Sending request to ${endpointName}...` });
    try {
      const start = performance.now();
      const res = await testFn();
      const latency = Math.round(performance.now() - start);
      setTestOutput({
        status: 'success',
        endpoint: endpointName,
        latency: `${latency}ms`,
        data: res
      });
      showToast?.(`${endpointName} responded successfully in ${latency}ms`, 'success');
    } catch (err) {
      setTestOutput({
        status: 'error',
        endpoint: endpointName,
        error: err.message,
        details: err.data || null
      });
      showToast?.(`${endpointName} failed: ${err.message}`, 'error');
    } finally {
      setTestingEndpoint(null);
    }
  };

  return (
    <div className="diagnostics-wrapper">
      <div className="section-header">
        <div className="badge badge-purple">
          <Cpu size={13} />
          <span>Developer & System Diagnostics</span>
        </div>
        <h1 className="section-title">Localhost API Console & Health Monitor</h1>
        <p className="section-description">
          Inspect and test communication with your local Node.js Express server (<code>http://localhost:5000</code>) and Python FastAPI assessment service (<code>http://localhost:8000</code>).
        </p>
      </div>

      <div className="diagnostics-grid">
        {/* Left: Server Status & URL Config */}
        <div className="glass-panel diag-card">
          <h2 className="card-title">
            <Server size={19} className="text-indigo" />
            <span>Localhost Server Endpoints</span>
          </h2>
          <p className="card-subtitle">Verify port mappings and health checks</p>

          <div className="server-status-cards">
            {/* Express Server */}
            <div className={`diag-status-box ${healthStatus?.node?.online ? 'online' : 'offline'}`}>
              <div className="status-header">
                <div className="status-title-wrap">
                  <span className="pulse-indicator"></span>
                  <strong>Node.js Express Server</strong>
                </div>
                <span className={`badge ${healthStatus?.node?.online ? 'badge-emerald' : 'badge-rose'}`}>
                  {healthStatus?.node?.online ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="status-meta">Port: <strong>5000</strong> (ATS Analysis, MongoDB CRM, Proctoring)</p>
              {healthStatus?.node?.latency && (
                <span className="latency-tag">Latency: {healthStatus.node.latency}</span>
              )}
            </div>

            {/* Python FastAPI Service */}
            <div className={`diag-status-box ${healthStatus?.python?.online ? 'online' : 'offline'}`}>
              <div className="status-header">
                <div className="status-title-wrap">
                  <span className="pulse-indicator"></span>
                  <strong>Python FastAPI Service</strong>
                </div>
                <span className={`badge ${healthStatus?.python?.online ? 'badge-emerald' : 'badge-amber'}`}>
                  {healthStatus?.python?.online ? 'Online' : 'Standby / Offline'}
                </span>
              </div>
              <p className="status-meta">Port: <strong>8000</strong> (Exam Submissions & Assessment Proctor)</p>
              {healthStatus?.python?.latency && (
                <span className="latency-tag">Latency: {healthStatus.python.latency}</span>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveUrls} className="endpoint-form mt-4">
            <h3 className="section-subtitle">
              <Settings size={15} /> Customize Base URLs:
            </h3>

            <div className="form-group">
              <label className="form-label">Express Backend URL</label>
              <input
                type="url"
                value={nodeUrl}
                onChange={(e) => setNodeUrl(e.target.value)}
                className="form-input"
                placeholder="http://localhost:5000"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Python Assessment URL</label>
              <input
                type="url"
                value={pythonUrl}
                onChange={(e) => setPythonUrl(e.target.value)}
                className="form-input"
                placeholder="http://localhost:8000"
              />
            </div>

            <div className="form-row-actions">
              <button type="submit" className="btn btn-primary btn-sm">
                Save Endpoints
              </button>
              <button
                type="button"
                onClick={onRefreshHealth}
                className="btn btn-secondary btn-sm"
              >
                <RefreshCw size={14} />
                <span>Recheck Health</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Quick API Request Testers & Console */}
        <div className="glass-panel diag-card">
          <h2 className="card-title">
            <Terminal size={19} className="text-cyan" />
            <span>Interactive Endpoint Tester</span>
          </h2>
          <p className="card-subtitle">Dispatch test queries directly from the browser</p>

          <div className="test-buttons-grid">
            <button
              type="button"
              disabled={testingEndpoint !== null}
              onClick={() => handleTestEndpoint('GET /api/admin/stats', getDashboardStats)}
              className="btn btn-secondary btn-sm test-btn"
            >
              <Play size={14} className="text-emerald" />
              <span>Test Dashboard Stats</span>
            </button>

            <button
              type="button"
              disabled={testingEndpoint !== null}
              onClick={() => handleTestEndpoint('GET /api/admin/candidates', () => getAllCandidates({ limit: 3 }))}
              className="btn btn-secondary btn-sm test-btn"
            >
              <Play size={14} className="text-indigo" />
              <span>Test Candidates List</span>
            </button>

            <button
              type="button"
              disabled={testingEndpoint !== null}
              onClick={() => handleTestEndpoint('GET /api/proctor/sessions', async () => {
                const { nodeUrl } = getApiBaseUrls();
                const r = await fetch(`${nodeUrl}/api/proctor/sessions`);
                return r.json();
              })}
              className="btn btn-secondary btn-sm test-btn"
            >
              <Play size={14} className="text-cyan" />
              <span>Test Proctoring Sessions</span>
            </button>
          </div>

          {/* Console / Output Terminal */}
          <div className="console-terminal mt-3">
            <div className="terminal-header">
              <span className="term-dot red"></span>
              <span className="term-dot yellow"></span>
              <span className="term-dot green"></span>
              <span className="term-title">API Response Inspector</span>
            </div>

            <div className="terminal-body">
              {!testOutput && (
                <p className="term-empty">Click one of the test buttons above to inspect live backend JSON payloads.</p>
              )}

              {testOutput?.status === 'running' && (
                <div className="term-running">
                  <div className="spinner-small" />
                  <span>{testOutput.message}</span>
                </div>
              )}

              {testOutput?.status === 'success' && (
                <pre className="term-code text-emerald">
                  {`// ${testOutput.endpoint} [${testOutput.latency}]\n`}
                  {JSON.stringify(testOutput.data, null, 2)}
                </pre>
              )}

              {testOutput?.status === 'error' && (
                <pre className="term-code text-rose">
                  {`// ERROR: ${testOutput.endpoint}\n`}
                  {testOutput.error}
                  {testOutput.details && `\n${JSON.stringify(testOutput.details, null, 2)}`}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
