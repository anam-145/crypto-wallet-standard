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
  role: 'user' | 'assistant' | 'confirmation';
  content: string;
  toolsUsed?: ToolUsed[];
}

interface PendingToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

interface Props {
  selectedModules: string[];
  connected: boolean;
  onSessionEnd: () => void;
  onRestart: () => void;
  sessionDone: boolean;
}

function friendlyError(msg: string): string {
  if (msg.includes('401') || msg.includes('Incorrect API key')) {
    return 'Invalid API key. Please check your key in Settings and try again.';
  }
  if (msg.includes('429') || msg.includes('rate limit')) {
    return 'Rate limit reached. Please wait a moment and try again.';
  }
  if (msg.includes('Failed to parse URL') || msg.includes('Invalid URL')) {
    return 'Invalid backend URL. Please check the URL in Settings.';
  }
  if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED')) {
    return 'Cannot reach the server. Please check your connection and try again.';
  }
  if (msg.includes('OPENAI_API_KEY is not configured')) {
    return 'OpenAI API key is not set. Switch to Custom AI mode and enter your key, or configure the server.';
  }
  return msg;
}

export default function Chat({ selectedModules, connected, onSessionEnd, onRestart, sessionDone }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [llmHistory, setLlmHistory] = useState<any[]>([]);
  const [continuing, setContinuing] = useState(false);
  const [pendingToolCall, setPendingToolCall] = useState<PendingToolCall | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, pendingToolCall]);

  function handleResponse(data: { message: string; toolsUsed?: ToolUsed[]; history?: unknown[]; needsConfirmation?: boolean; pendingToolCall?: PendingToolCall }) {
    if (data.history) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setLlmHistory(data.history as any[]);
    }

    if (data.needsConfirmation && data.pendingToolCall) {
      setPendingToolCall(data.pendingToolCall);
      // Show confirmation message
      const args = data.pendingToolCall.arguments;
      const argsStr = Object.entries(args).map(([k, v]) => `${k}: ${v}`).join(', ');
      setMessages((prev) => [
        ...prev,
        { role: 'confirmation' as const, content: `**${data.pendingToolCall!.name}** requires confirmation.\n\n${argsStr}`, toolsUsed: data.toolsUsed },
      ]);
      setLoading(false);
      return;
    }

    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: data.message, toolsUsed: data.toolsUsed },
    ]);
    setPendingToolCall(null);
    onSessionEnd();
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading || !connected) return;

    setInput('');

    if (continuing) {
      setMessages((prev) => [...prev, { role: 'user', content: text }]);
      setContinuing(false);
    } else {
      setMessages([{ role: 'user', content: text }]);
      setLlmHistory([]);
    }

    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          modules: selectedModules,
          history: continuing ? llmHistory : [],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', content: friendlyError(data.error) }]);
        onSessionEnd();
      } else {
        handleResponse(data);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: friendlyError((error as Error).message) }]);
      onSessionEnd();
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!pendingToolCall) return;
    setLoading(true);

    // Remove confirmation message
    setMessages((prev) => prev.filter(m => m.role !== 'confirmation'));

    try {
      const res = await fetch('/api/chat/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modules: selectedModules,
          history: llmHistory,
          pendingToolCall,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', content: friendlyError(data.error) }]);
        onSessionEnd();
      } else {
        handleResponse(data);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: friendlyError((error as Error).message) }]);
      onSessionEnd();
    } finally {
      setLoading(false);
      setPendingToolCall(null);
    }
  }

  function handleReject() {
    // Add tool response to history so OpenAI doesn't complain about missing tool_call_id
    if (pendingToolCall) {
      const lastAssistant = [...llmHistory].reverse().find(m => m.tool_calls);
      const toolCallId = lastAssistant?.tool_calls?.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (tc: any) => tc.function.name === pendingToolCall.name
      )?.id || 'rejected';

      setLlmHistory((prev) => [
        ...prev,
        { role: 'tool', tool_call_id: toolCallId, content: JSON.stringify({ error: 'Action rejected by user' }) },
        { role: 'assistant', content: 'Action cancelled by user.' },
      ]);
    }

    setMessages((prev) => [
      ...prev.filter(m => m.role !== 'confirmation'),
      { role: 'assistant', content: 'Action cancelled by user.' },
    ]);
    setPendingToolCall(null);
    onSessionEnd();
  }

  function handleMore() {
    setContinuing(true);
    onRestart();
  }

  function handleRestart() {
    setMessages([]);
    setInput('');
    setLlmHistory([]);
    setContinuing(false);
    setPendingToolCall(null);
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

        {messages.map((msg, i) => {
          if (msg.role === 'confirmation') {
            return (
              <div key={i} style={{
                maxWidth: '85%',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                alignSelf: 'flex-start',
              }}>
                <span style={{ fontSize: 11, color: '#666', padding: '0 4px' }}>Agent</span>
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 16,
                  borderBottomLeftRadius: 4,
                  background: '#1a1a00',
                  border: '1px solid #f59e0b33',
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: '#e5e5e5',
                  wordBreak: 'break-all',
                }}>
                  <Markdown
                    components={{
                      p: ({ children }) => <p style={{ margin: '4px 0' }}>{children}</p>,
                      strong: ({ children }) => <strong style={{ fontWeight: 600, color: '#f59e0b' }}>{children}</strong>,
                    }}
                  >
                    {msg.content}
                  </Markdown>
                </div>
                {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                  <ToolFlowBar tools={msg.toolsUsed} />
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    style={{
                      padding: '7px 18px',
                      borderRadius: 20,
                      border: '1px solid #34d399',
                      background: 'rgba(52, 211, 153, 0.1)',
                      color: '#34d399',
                      fontSize: 13,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.5 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={loading}
                    style={{
                      padding: '7px 18px',
                      borderRadius: 20,
                      border: '1px solid #555',
                      background: 'transparent',
                      color: '#999',
                      fontSize: 13,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.5 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          }

          return (
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
          );
        })}

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

      {/* Input Area or Action Buttons */}
      {sessionDone && !continuing && !pendingToolCall ? (
        <div style={{
          padding: '16px 24px 24px',
          borderTop: '1px solid #1a1a1a',
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
        }}>
          <button
            onClick={handleMore}
            style={{
              padding: '10px 24px',
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
              el.style.borderColor = '#34d399';
              el.style.background = 'rgba(52, 211, 153, 0.1)';
              el.style.color = '#34d399';
            }}
            onMouseLeave={(e) => {
              const el = e.target as HTMLElement;
              el.style.borderColor = '#333';
              el.style.background = '#1a1a1a';
              el.style.color = '#e5e5e5';
            }}
          >
            Continue
          </button>
          <button
            onClick={handleRestart}
            style={{
              padding: '10px 24px',
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
            New
          </button>
        </div>
      ) : !pendingToolCall ? (
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
              placeholder={continuing ? 'Ask a follow-up...' : connected ? 'Enter your message...' : 'Select a module to start'}
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
      ) : null}
    </>
  );
}
