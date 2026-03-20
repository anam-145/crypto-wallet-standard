'use client';

import { useState } from 'react';

interface ToolUsed {
  name: string;
  success: boolean;
  responseTime: number;
}

interface Props {
  tools: ToolUsed[];
}

function formatName(name: string): string {
  const lastUnderscore = name.lastIndexOf('_');
  if (lastUnderscore === -1) return name;
  return name.substring(lastUnderscore + 1);
}

function formatTime(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export default function ToolFlowBar({ tools }: Props) {
  const [open, setOpen] = useState(false);

  const totalTime = tools.reduce((sum, t) => sum + t.responseTime, 0);
  const allSuccess = tools.every(t => t.success);

  return (
    <div style={{ marginTop: 6 }}>
      {/* Summary bar */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 10px',
          borderRadius: 8,
          border: '1px solid #2a2a2a',
          background: '#161616',
          cursor: 'pointer',
          fontSize: 11,
          color: '#999',
          width: 'fit-content',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#444')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2a2a2a')}
      >
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: allSuccess ? '#34d399' : '#f87171',
          flexShrink: 0,
        }} />
        <span style={{ color: '#777' }}>
          {tools.map(t => formatName(t.name)).join(' → ')}
        </span>
        <span style={{ color: '#555', marginLeft: 2 }}>
          {tools.length} tools, {formatTime(totalTime)}
        </span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          style={{
            marginLeft: 2,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }}
        >
          <path d="M1 1L5 5L9 1" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Detail panel */}
      <div style={{
        maxHeight: open ? 200 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.2s ease',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          marginTop: 6,
          padding: '8px 10px',
          borderRadius: 8,
          background: '#161616',
          border: '1px solid #2a2a2a',
        }}>
          {tools.map((t, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
            }}>
              <div style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: t.success ? '#34d399' : '#f87171',
                flexShrink: 0,
              }} />
              <span style={{ color: '#999', flex: 1 }}>{t.name}</span>
              <span style={{ color: '#555' }}>{formatTime(t.responseTime)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
