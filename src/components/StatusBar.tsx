'use client';

type Mode = 'default' | 'custom-url' | 'custom-ai';

interface Props {
  mode: Mode;
  connected: boolean;
  connectedDetail: string;
  selectedModuleCount: number;
}

export default function StatusBar({ mode, connected, connectedDetail, selectedModuleCount }: Props) {
  const ready = connected && selectedModuleCount > 0;
  const dotColor = ready ? '#34d399' : '#f59e0b';
  const statusText = ready ? 'Ready' : connected ? 'Select a module' : 'Not connected';

  let detail = connectedDetail;
  if (!connected) {
    if (mode === 'default') detail = 'Anam Agent Server';
    else if (mode === 'custom-url') detail = 'Enter URL above';
    else if (mode === 'custom-ai') detail = 'Enter API key above';
  } else if (selectedModuleCount > 0) {
    detail = `${connectedDetail} · ${selectedModuleCount} module${selectedModuleCount > 1 ? 's' : ''}`;
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 24px',
      background: ready ? 'rgba(52, 211, 153, 0.04)' : 'transparent',
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
