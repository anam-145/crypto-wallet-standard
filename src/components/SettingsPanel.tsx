'use client';

import { useState, useEffect, useRef } from 'react';

type Mode = 'default' | 'custom-url' | 'custom-ai';

interface Props {
  currentMode: Mode;
  onModeChange: (mode: Mode) => void;
  onApply: (settings: Record<string, string>) => void;
  availableProviders: string[];
}

const MODE_LABELS: Record<Mode, string> = {
  'default': 'Anam',
  'custom-url': 'Custom URL',
  'custom-ai': 'Custom AI',
};

export default function SettingsPanel({ currentMode, onModeChange, onApply, availableProviders }: Props) {
  const [mode, setMode] = useState<Mode>(currentMode);
  const [chatUrl, setChatUrl] = useState('');
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);

  const urlRef = useRef<HTMLInputElement>(null);
  const apiKeyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMode(currentMode);
    setPanelOpen(currentMode !== 'default');
  }, [currentMode]);

  function handleModeChange(newMode: Mode) {
    setMode(newMode);
    setChatUrl('');
    setApiKey('');
    setSystemPrompt('');
    setPanelOpen(newMode !== 'default');
    onModeChange(newMode);
  }

  function flashError(el: HTMLElement | null) {
    if (!el) return;
    el.style.borderColor = '#f87171';
    setTimeout(() => { el.style.borderColor = '#2a2a2a'; }, 1500);
  }

  function handleApply() {
    if (mode === 'custom-url') {
      if (!chatUrl.trim()) {
        flashError(urlRef.current);
        return;
      }
      onApply({ mode: 'custom-url', chatUrl: chatUrl.trim() });
      setPanelOpen(false);
    } else if (mode === 'custom-ai') {
      if (!apiKey.trim()) {
        flashError(apiKeyRef.current);
        return;
      }
      onApply({ mode: 'custom-ai', provider, apiKey: apiKey.trim(), systemPrompt: systemPrompt.trim() });
      setPanelOpen(false);
    }
  }

  return (
    <>
      {/* Mode Radio Chips */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(['default', 'custom-url', 'custom-ai'] as Mode[]).map((m) => {
          const active = mode === m;
          return (
            <label
              key={m}
              onClick={() => handleModeChange(m)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 20,
                border: `1px solid ${active ? '#4f8fff' : '#333'}`,
                background: active ? 'rgba(79, 143, 255, 0.1)' : '#1a1a1a',
                cursor: 'pointer',
                transition: 'all 0.15s',
                userSelect: 'none',
              }}
            >
              <div style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                border: `1.5px solid ${active ? '#4f8fff' : '#555'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'border-color 0.15s',
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#4f8fff',
                  transform: active ? 'scale(1)' : 'scale(0)',
                  transition: 'transform 0.15s',
                }} />
              </div>
              <span style={{ fontSize: 13, color: active ? '#4f8fff' : '#999', transition: 'color 0.15s' }}>
                {MODE_LABELS[m]}
              </span>
            </label>
          );
        })}
      </div>

      {/* Config Panel */}
      <div style={{
        maxHeight: panelOpen ? 500 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.25s ease, padding 0.25s ease',
        padding: panelOpen ? '16px 0 0' : '0',
      }}>
        {mode === 'custom-url' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={labelStyle}>Backend URL</span>
            <input
              ref={urlRef}
              type="text"
              placeholder="https://your-backend.com/api/chat"
              value={chatUrl}
              onChange={(e) => setChatUrl(e.target.value)}
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = '#4f8fff'}
              onBlur={(e) => e.target.style.borderColor = '#2a2a2a'}
            />
            <button onClick={handleApply} style={buttonStyle}
              onMouseEnter={(e) => (e.target as HTMLElement).style.background = '#3a7bef'}
              onMouseLeave={(e) => (e.target as HTMLElement).style.background = '#4f8fff'}
            >Connect</button>
          </div>
        )}

        {mode === 'custom-ai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={labelStyle}>Provider</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              style={{
                ...inputStyle,
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                cursor: 'pointer',
              }}
            >
              {availableProviders.map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
            <span style={labelStyle}>API Key</span>
            <input
              ref={apiKeyRef}
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = '#4f8fff'}
              onBlur={(e) => e.target.style.borderColor = '#2a2a2a'}
            />
            <span style={labelStyle}>System Prompt</span>
            <textarea
              placeholder="Optional custom system prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              style={{ ...inputStyle, height: 64, resize: 'none', fontFamily: 'inherit' } as React.CSSProperties}
              onFocus={(e) => e.target.style.borderColor = '#4f8fff'}
              onBlur={(e) => e.target.style.borderColor = '#2a2a2a'}
            />
            <button onClick={handleApply} style={buttonStyle}
              onMouseEnter={(e) => (e.target as HTMLElement).style.background = '#3a7bef'}
              onMouseLeave={(e) => (e.target as HTMLElement).style.background = '#4f8fff'}
            >Apply</button>
          </div>
        )}
      </div>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#666',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 13,
  color: '#e5e5e5',
  background: '#1a1a1a',
  border: '1px solid #2a2a2a',
  borderRadius: 10,
  outline: 'none',
  transition: 'border-color 0.15s',
};

const buttonStyle: React.CSSProperties = {
  alignSelf: 'flex-end',
  padding: '8px 20px',
  fontSize: 13,
  fontWeight: 500,
  color: '#fff',
  background: '#4f8fff',
  border: 'none',
  borderRadius: 20,
  cursor: 'pointer',
  transition: 'background 0.15s',
};
