import React from 'react';
import { Terminal, CheckCircle, XCircle, EyeOff } from 'lucide-react';

const ConsoleRunner = ({
  activeConsoleTab,
  setActiveConsoleTab,
  currentTestResult,
}) => {
  return (
    <div className="console-panel">
      <div className="console-tabs-header">
        <div className="console-tab-buttons">
          <button
            className={`console-tab-btn ${activeConsoleTab === 'tests' ? 'active' : ''}`}
            onClick={() => setActiveConsoleTab('tests')}
          >
            Test Cases Evaluation {currentTestResult && `(${currentTestResult.passed_tests}/${currentTestResult.total_tests})`}
          </button>
          <button
            className={`console-tab-btn ${activeConsoleTab === 'output' ? 'active' : ''}`}
            onClick={() => setActiveConsoleTab('output')}
          >
            <Terminal size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Console / Stderr
          </button>
        </div>

        {currentTestResult && (
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              color: currentTestResult.all_passed ? '#34d399' : '#f87171',
            }}
          >
            {currentTestResult.all_passed ? 'All Tests Passed' : 'Tests Incomplete'}
          </span>
        )}
      </div>

      <div className="console-content">
        {activeConsoleTab === 'tests' ? (
          !currentTestResult ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Click <strong>"Run Code & Tests"</strong> below to test your solution against both public and hidden test cases.
            </div>
          ) : (
            <div className="test-results-grid">
              {/* Public Test Cases */}
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.3rem' }}>
                Public Test Cases:
              </div>

              {currentTestResult.public_results?.map((pub) => (
                <div
                  key={pub.test_index}
                  className={`test-result-card ${pub.passed ? 'passed' : 'failed'}`}
                >
                  <div className="test-result-top">
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f3f4f6' }}>
                      Case {pub.test_index}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {pub.execution_time_ms} ms
                      </span>
                      {pub.passed ? (
                        <span className="badge-passed">
                          <CheckCircle size={14} /> Passed
                        </span>
                      ) : (
                        <span className="badge-failed">
                          <XCircle size={14} /> Failed
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Input: </span>
                      <code style={{ color: '#93c5fd' }}>{JSON.stringify(pub.input)}</code>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Expected: </span>
                      <code style={{ color: '#86efac' }}>{JSON.stringify(pub.expected_output)}</code>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Output: </span>
                      <code style={{ color: pub.passed ? '#86efac' : '#fca5a5' }}>
                        {JSON.stringify(pub.actual_output)}
                      </code>
                    </div>
                    {pub.error && (
                      <div style={{ color: '#f87171', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                        Error: {pub.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Hidden Test Cases */}
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#e2e8f0',
                  marginTop: '0.6rem',
                  marginBottom: '0.3rem',
                }}
              >
                Hidden Test Cases (Confidential States):
              </div>

              {currentTestResult.hidden_results?.map((hid) => (
                <div
                  key={hid.test_index}
                  className={`hidden-result-pill ${hid.passed ? 'passed' : 'failed'}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <EyeOff size={15} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f3f4f6' }}>
                      Hidden Test Case {hid.test_index}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {hid.execution_time_ms} ms
                    </span>
                    {hid.passed ? (
                      <span className="badge-passed">
                        <CheckCircle size={14} /> Passed
                      </span>
                    ) : (
                      <span className="badge-failed">
                        <XCircle size={14} /> Hidden State Not Satisfied
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div>
            {currentTestResult?.stdout && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Stdout:</div>
                <pre
                  style={{
                    background: '#030712',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem',
                    color: '#e2e8f0',
                  }}
                >
                  {currentTestResult.stdout}
                </pre>
              </div>
            )}

            {currentTestResult?.compile_error ? (
              <div>
                <div style={{ fontSize: '0.8rem', color: '#f87171', marginBottom: '0.25rem' }}>Execution Error:</div>
                <pre
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem',
                    color: '#fca5a5',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {currentTestResult.compile_error}
                </pre>
              </div>
            ) : (
              !currentTestResult?.stdout && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No output generated. Print statements will appear here.
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsoleRunner;
