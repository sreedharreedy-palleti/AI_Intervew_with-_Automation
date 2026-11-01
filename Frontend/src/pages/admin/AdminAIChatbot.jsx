import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Users,
  UserCheck,
  CheckCircle,
  XCircle,
  Award,
  ShieldAlert,
  RotateCcw,
  Search,
  ChevronRight,
  ShieldCheck,
  Activity,
  Layers,
} from 'lucide-react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import { chatbotApi } from '../../chatbot/chatbotApi';
import { adminApi } from '../../api/adminApi';

/**
 * Lightweight markdown-like formatter for structured assistant responses
 */
const FormattedMessage = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={idx} style={{ height: '0.4rem' }} />;
        }

        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} style={{ fontSize: '1.05rem', fontWeight: 800, color: '#a5b4fc', margin: '0.6rem 0 0.35rem 0' }}>
              {trimmed.replace('### ', '')}
            </h4>
          );
        }

        if (trimmed.startsWith('#### ')) {
          return (
            <h5 key={idx} style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e0e7ff', margin: '0.5rem 0 0.25rem 0' }}>
              {trimmed.replace('#### ', '')}
            </h5>
          );
        }

        if (trimmed.startsWith('---')) {
          return <hr key={idx} style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0.6rem 0' }} />;
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
          const content = trimmed.substring(2);
          return (
            <li key={idx} style={{ marginLeft: '1.25rem', listStyleType: 'disc', marginBottom: '0.25rem' }}>
              <FormatInline text={content} />
            </li>
          );
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <li key={idx} style={{ marginLeft: '1.25rem', listStyleType: 'decimal', marginBottom: '0.25rem' }}>
              <FormatInline text={numMatch[2]} />
            </li>
          );
        }

        return (
          <p key={idx} style={{ margin: '0 0 0.45rem 0' }}>
            <FormatInline text={trimmed} />
          </p>
        );
      })}
    </div>
  );
};

const FormatInline = ({ text }) => {
  if (!text) return null;

  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} style={{ color: '#fff', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={i}
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '0.15rem 0.4rem',
                borderRadius: '4px',
                fontSize: '0.82rem',
                color: '#6ee7b7',
              }}
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      })}
    </>
  );
};

export const AdminAIChatbot = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [summary, setSummary] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load live admin analytics for quick telemetry header chips
  useEffect(() => {
    const loadQuickStats = async () => {
      try {
        const data = await adminApi.getDashboardAnalytics();
        if (data?.summary) {
          setSummary(data.summary);
        }
      } catch (err) {
        console.warn('Could not prefetch admin telemetry:', err);
      }
    };
    loadQuickStats();
  }, []);

  // Initialize initial message
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: `### 🤖 Welcome to the Admin Intelligence AI Assistant
I am directly connected to your **MongoDB Atlas** database. You can search or ask me any questions about your platform, such as:

- **Candidate Registrations**: How many candidates are registered in total?
- **User & Admin Roster**: How many total users and administrators are there?
- **ATS Shortlisting**: How many students were shortlisted (≥70%) vs rejected?
- **AI Coding Assignments**: How many candidates qualified (≥50%) vs disqualified or locked out?
- **AI Voice Interviews**: How many candidates qualified in the AI interview round?

Click any of the quick query cards below or type your question!`,
      },
    ]);

    setSuggestions([
      'How many candidates are registered?',
      'How many users and admins count?',
      'How many candidates qualified on AI assignment?',
      'How many candidates are shortlisted by ATS?',
      'How many candidates qualified on AI interview round?',
      'Give me full admin platform details',
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (queryText) => {
    const text = (queryText || inputText).trim();
    if (!text || isTyping) return;

    setInputText('');

    const newMsgs = [...messages, { role: 'user', content: text }];
    setMessages(newMsgs);
    setIsTyping(true);

    try {
      const history = newMsgs.slice(1).map((m) => ({ role: m.role, content: m.content }));
      const response = await chatbotApi.sendMessage(text, history, { role: 'admin', page: 'admin_intelligence' });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.reply,
        },
      ]);

      if (response.suggested_questions?.length > 0) {
        setSuggestions(response.suggested_questions);
      }
    } catch (err) {
      console.error('Admin chatbot error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Unable to reach Gemini API. Please verify network access or check your MongoDB connection.',
        },
      ]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQueryCards = [
    {
      title: 'Registered Candidates',
      query: 'how many candidates are register those count',
      desc: 'Candidate registrations & course enrollments',
      icon: <UserCheck size={18} color="#818cf8" />,
    },
    {
      title: 'Users & Admins Count',
      query: 'how many users and admins count',
      desc: 'Account breakdown across roles',
      icon: <Users size={18} color="#38bdf8" />,
    },
    {
      title: 'ATS Shortlisted Students',
      query: 'how many candidates are shortlisted by ATS',
      desc: 'Candidates meeting ≥70% resume cutoff',
      icon: <Award size={18} color="#fbbf24" />,
    },
    {
      title: 'AI Assignment Pass / Disqualify',
      query: 'how many candidates are qualify on ai assignment and disqualify',
      desc: 'Exam pass rates & integrity lockouts',
      icon: <CheckCircle size={18} color="#10b981" />,
    },
    {
      title: 'AI Voice Interview Qualify',
      query: 'how many candidates qualify on ai intervew round',
      desc: 'Selected candidates in AI interview',
      icon: <Sparkles size={18} color="#c084fc" />,
    },
    {
      title: 'Full Platform Report',
      query: 'give me full admin page details and telemetry summary',
      desc: 'Complete live MongoDB Atlas analytics',
      icon: <Activity size={18} color="#f43f5e" />,
    },
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }} className="gradient-text">
              Admin Intelligence AI Assistant
            </h2>
            <Badge variant="primary" style={{ fontSize: '0.72rem' }}>
              Live MongoDB Atlas Sync
            </Badge>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
            Query real-time candidate registrations, ATS shortlisting, assignment pass/fail rates, and AI interview qualification.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setMessages([]);
            setTimeout(() => {
              setMessages([
                {
                  role: 'assistant',
                  content: 'Chat history cleared. How can I assist you with your administrative platform telemetry?',
                },
              ]);
            }, 50);
          }}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
        >
          <RotateCcw size={14} />
          <span>Clear Conversation</span>
        </button>
      </div>

      {/* Live Telemetry KPI Chips */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Registered Candidates</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>{summary.total_enrollments}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Users / Admins</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#38bdf8' }}>
              {summary.total_users} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({summary.admin_users} admin)</span>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ATS Shortlisted (≥70%)</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981' }}>
              {summary.total_shortlisted} <span style={{ fontSize: '0.8rem', color: '#6ee7b7' }}>({summary.shortlist_rate}%)</span>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Assignments Monitored</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24' }}>{summary.total_assignments}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Integrity Violations</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: summary.violation_lockouts > 0 ? '#f43f5e' : '#10b981' }}>
              {summary.violation_lockouts}
            </div>
          </div>
        </div>
      )}

      {/* Preset Admin Query Tiles */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, marginBottom: '0.6rem' }}>
          Quick Admin Queries (Click to Ask):
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {quickQueryCards.map((tile, idx) => (
            <div
              key={idx}
              onClick={() => handleSend(tile.query)}
              style={{
                background: 'rgba(17, 24, 39, 0.7)',
                backdropFilter: 'blur(10px)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {tile.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tile.title}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tile.desc}
                </div>
              </div>
              <ChevronRight size={14} color="var(--text-muted)" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Workspace */}
      <Card elevated style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '620px' }}>
        {/* Chat Header */}
        <div
          style={{
            padding: '1rem 1.5rem',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 0 12px rgba(99, 102, 241, 0.5)',
              }}
            >
              <Bot size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Admin Telemetry Assistant</h4>
              <span style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                Real-Time MongoDB Intelligence Engine
              </span>
            </div>
          </div>

          <Badge variant="primary" style={{ fontSize: '0.72rem' }}>
            Restricted to Platform Analytics
          </Badge>
        </div>

        {/* Message Thread */}
        <div
          className="graph-scrollbar-right"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '0.75rem',
                maxWidth: msg.role === 'user' ? '80%' : '92%',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              }}
            >
              {msg.role === 'assistant' && (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: '#818cf8',
                    marginTop: '2px',
                  }}
                >
                  <Bot size={18} />
                </div>
              )}

              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '16px',
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                  background:
                    msg.role === 'user'
                      ? 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)'
                      : 'rgba(255, 255, 255, 0.03)',
                  border: msg.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                  color: msg.role === 'user' ? '#fff' : '#e5e7eb',
                  borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                  borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                  boxShadow: msg.role === 'user' ? '0 4px 15px rgba(99, 102, 241, 0.3)' : 'none',
                }}
              >
                <FormattedMessage text={msg.content} />
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', gap: '0.75rem', alignSelf: 'flex-start' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#818cf8',
                }}
              >
                <Bot size={18} />
              </div>
              <div
                style={{
                  padding: '0.75rem 1.2rem',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#818cf8', animation: 'hpBounce 1.4s infinite ease-in-out both' }} />
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#818cf8', animation: 'hpBounce 1.4s infinite ease-in-out both', animationDelay: '-0.16s' }} />
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#818cf8', animation: 'hpBounce 1.4s infinite ease-in-out both', animationDelay: '-0.32s' }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>Computing live database metrics...</span>
              </div>
            </div>
          )}

          {/* Contextual Suggestions */}
          {!isTyping && suggestions.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem', paddingLeft: '2.5rem' }}>
              {suggestions.map((sug, sIdx) => (
                <button
                  key={sIdx}
                  type="button"
                  onClick={() => handleSend(sug)}
                  style={{
                    background: 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    color: '#c7d2fe',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    padding: '0.4rem 0.85rem',
                    borderRadius: '999px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.25)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)';
                    e.currentTarget.style.color = '#c7d2fe';
                  }}
                >
                  <ChevronRight size={12} color="#818cf8" />
                  <span>{sug}</span>
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Bar */}
        <div
          style={{
            padding: '1rem 1.5rem',
            background: 'rgba(17, 24, 39, 0.95)',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 'var(--radius-md)',
              padding: '0.5rem 0.75rem 0.5rem 1rem',
            }}
          >
            <Search size={16} color="var(--text-muted)" />
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask: 'how many candidates are registered?', 'how many qualified on assignment?'..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '0.92rem',
                outline: 'none',
              }}
              disabled={isTyping}
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isTyping}
              className="btn btn-primary"
              style={{
                padding: '0.5rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.86rem',
                fontWeight: 700,
              }}
            >
              <span>Ask AI</span>
              <Send size={14} />
            </button>
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.45rem' }}>
            🔒 Strict Telemetry Engine: Answers only questions directly concerning this platform's candidates, courses, and evaluation telemetry.
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminAIChatbot;

