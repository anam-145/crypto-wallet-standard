'use client';

type Mode = 'default' | 'custom-url' | 'custom-ai';

interface Props {
  mode: Mode;
  connected: boolean;
  connectedDetail: string;
}

export default function StatusBar({ mode, connected, connectedDetail }: Props) {
  const dotColor = connected ? '#34d399' : '#f59e0b';
  const statusText = connected ? 'Connected' : 'Not connected';

  let detail = connectedDetail;
  if (!connected) {
    if (mode === 'default') detail = 'Anam Agent Server';
    else if (mode === 'custom-url') detail = 'Enter URL above';
    else if (mode === 'custom-ai') detail = 'Enter API key above';
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 24px',
      background: connected ? 'rgba(52, 211, 153, 0.04)' : 'transparent',
      borderBottom: '1px solid #1a1a1a',
      fontSize: 11,
    }}>
      <div style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: dotColor,
      }} />
      <span style={{ color: dotColor }}>{statusText}</span>
      <span style={{ color: '#555', marginLeft: 'auto' }}>{detail}</span>
    </div>
  );
}
