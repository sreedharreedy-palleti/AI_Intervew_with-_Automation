import React from 'react';
import { FileCode, Copy, Check, RotateCcw } from 'lucide-react';

const CodeEditorPanel = ({
  activeCode,
  handleCodeChange,
  handleKeyDown,
  handleCopyCode,
  handleResetCode,
  copiedCode,
  textareaRef,
}) => {
  return (
    <div className="code-editor-box">
      {/* Editor Toolbar */}
      <div className="editor-toolbar">
        <div className="editor-lang-badge">
          <FileCode size={16} />
          <span>Python 3 (CPython 3.12)</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={handleCopyCode}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
            title="Copy code"
          >
            {copiedCode ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>{copiedCode ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleResetCode}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
            title="Reset to default starter template"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Editor Textarea */}
      <div className="editor-textarea-wrapper">
        <textarea
          ref={textareaRef}
          value={activeCode}
          onChange={handleCodeChange}
          onKeyDown={handleKeyDown}
          className="code-textarea"
          placeholder="def solution(...):&#10;    # Write your solution here"
          spellCheck={false}
        />
      </div>
    </div>
  );
};

export default CodeEditorPanel;
