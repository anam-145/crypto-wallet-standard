'use client';

import { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import ToolFlowBar from './ToolFlowBar';

interface ToolUsed {
  name: string;
  success: boolean;
  responseTime: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: ToolUsed[];
}

interface Props {
  selectedModules: string[];
  connected: boolean;
  onSessionEnd: () => void;
  onRestart: () => void;
  sessionDone: boolean;
}

export default function Chat({ selectedModules, connected, onSessionEnd, onRestart, sessionDone }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading || !connected || sessionDone) return;

    setInput('');
    setMessages([{ role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, modules: selectedModules }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          prev[0],
          { role: 'assistant', content: `Error: ${data.error}` },
        ]);
      } else {
        setMessages((prev) => [
          prev[0],
          { role: 'assistant', content: data.message, toolsUsed: data.toolsUsed },
        ]);
      }

      onSessionEnd();
    } catch (error) {
      setMessages((prev) => [
        prev[0],
        { role: 'assistant', content: `Error: ${(error as Error).message}` },
      ]);
      onSessionEnd();
    } finally {
      setLoading(false);
    }
  }

  function handleRestart() {
    setMessages([]);
    setInput('');
    onRestart();
  }

  return (
    <>
      {/* Chat Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        {messages.length === 0 && !loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#555', fontSize: 14 }}>Send a message to start</span>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              maxWidth: '85%',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <span style={{
              fontSize: 11,
              color: '#666',
              padding: '0 4px',
              textAlign: msg.role === 'user' ? 'right' : 'left',
            }}>
              {msg.role === 'user' ? 'You' : 'Agent'}
            </span>
            <div style={{
              padding: '10px 14px',
              borderRadius: 16,
              ...(msg.role === 'user'
                ? { background: '#4f8fff', color: '#fff', borderBottomRightRadius: 4 }
                : { background: '#1e1e1e', color: '#e5e5e5', borderBottomLeftRadius: 4 }),
              fontSize: 14,
              lineHeight: 1.5,
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}>
              {msg.role === 'assistant' ? (
                <Markdown
                  components={{
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>
                        {children}
                      </a>
                    ),
                    p: ({ children }) => <p style={{ margin: '4px 0' }}>{children}</p>,
                    ul: ({ children }) => <ul style={{ margin: '4px 0', paddingLeft: 16 }}>{children}</ul>,
                    ol: ({ children }) => <ol style={{ margin: '4px 0', paddingLeft: 16 }}>{children}</ol>,
                    li: ({ children }) => <li style={{ margin: '2px 0' }}>{children}</li>,
                    strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
                  }}
                >
                  {msg.content}
                </Markdown>
              ) : (
                msg.content
              )}
            </div>

            {/* Tool flow bar */}
            {msg.toolsUsed && msg.toolsUsed.length > 0 && (
              <ToolFlowBar tools={msg.toolsUsed} />
            )}
          </div>
        ))}

        {/* Loading dots */}
        {loading && (
          <div style={{
            maxWidth: '85%',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            alignSelf: 'flex-start',
          }}>
            <span style={{ fontSize: 11, color: '#666', padding: '0 4px' }}>Agent</span>
            <div style={{
              padding: '12px 18px',
              borderRadius: 16,
              borderBottomLeftRadius: 4,
              background: '#1e1e1e',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{
                  display: 'inline-block',
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: '#666',
                  animation: 'dot-pulse 1.2s ease-in-out infinite',
                  animationDelay: `${i * 0.2}s`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Area or Restart Button */}
      {sessionDone ? (
        <div style={{
          padding: '16px 24px 24px',
          borderTop: '1px solid #1a1a1a',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <button
            onClick={handleRestart}
            style={{
              padding: '10px 28px',
              borderRadius: 24,
              border: '1px solid #333',
              background: '#1a1a1a',
              color: '#e5e5e5',
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              const el = e.target as HTMLElement;
              el.style.borderColor = '#4f8fff';
              el.style.background = 'rgba(79, 143, 255, 0.1)';
              el.style.color = '#4f8fff';
            }}
            onMouseLeave={(e) => {
              const el = e.target as HTMLElement;
              el.style.borderColor = '#333';
              el.style.background = '#1a1a1a';
              el.style.color = '#e5e5e5';
            }}
          >
            New Conversation
          </button>
        </div>
      ) : (
        <div style={{ padding: '16px 24px 24px', borderTop: '1px solid #1a1a1a' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 4px 4px 16px',
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: 24,
            opacity: connected ? 1 : 0.4,
            pointerEvents: connected ? 'auto' : 'none',
            transition: 'border-color 0.15s',
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={connected ? 'Enter your message...' : 'Connect first to start'}
              disabled={!connected || loading}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: '#e5e5e5',
                fontSize: 14,
              }}
            />
            <button
              onClick={handleSend}
              disabled={!connected || loading || !input.trim()}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: 'none',
                background: connected && input.trim() && !loading ? '#4f8fff' : '#333',
                cursor: connected && input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14 2L7 9M14 2L9.5 14L7 9M14 2L2 6.5L7 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
