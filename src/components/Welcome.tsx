'use client';

interface Props {
  onStart: () => void;
}

export default function Welcome({ onStart }: Props) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: '32px 24px 24px',
      overflowY: 'auto',
    }}>
      {/* Title */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
            Crypto Wallet Plugin
          </h1>
          <span style={{
            fontSize: 11,
            color: '#34d399',
            background: 'rgba(52, 211, 153, 0.1)',
            border: '1px solid rgba(52, 211, 153, 0.2)',
            padding: '2px 8px',
            borderRadius: 4,
          }}>
            CWP Standard Demo
          </span>
        </div>
        <img
          src="/logo.jpg"
          alt="ANAM145"
          style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'contain' }}
        />
      </div>

      {/* What is this */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={sectionTitle}>What is this?</h3>
        <p style={paragraph}>
          A proof-of-concept for the <strong style={{ color: '#e5e5e5' }}>Crypto Wallet Plugin (CWP)</strong> standard
          — a universal interface that lets AI agents discover and use crypto wallets as in-process modules.
          Instead of clicking buttons to swap, bridge, or send, just tell the agent what you want.
        </p>
      </div>

      {/* Demo Setup */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={sectionTitle}>Demo Setup</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <InfoRow label="Wallet" value="Testnet wallet (Ethereum Sepolia + Base Sepolia)" />
          <InfoRow label="Modules" value="Ethereum Wallet, Base Wallet, Uniswap V3 Swap" />
          <InfoRow label="Balance" value="Pre-funded with small testnet ETH (limited supply)" />
          <InfoRow label="Session" value="In-memory only — refreshing resets all state" />
        </div>
      </div>

      {/* Connection Modes */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={sectionTitle}>Connection Modes</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <ModeRow
            name="Anam"
            desc="Connected to the developer's personal agent server for demo purposes."
            note="Personal OpenAI quota — may be unavailable if exhausted"
          />
          <ModeRow
            name="Custom URL"
            desc="Connect to your own backend implementing the chat API."
            note={null}
          />
          <ModeRow
            name="Custom AI"
            desc="Bring your own OpenAI API key for direct LLM access."
            note={null}
          />
        </div>
      </div>

      {/* How to Use */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={sectionTitle}>How to Use</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <StepRow step="1" text="Select a connection mode (Anam works by default)" />
          <StepRow step="2" text="Choose one or more wallet modules to enable" />
          <StepRow step="3" text="Type a natural language command (e.g. &quot;What's my ETH balance?&quot;)" />
        </div>
      </div>

      {/* Note */}
      <div style={{
        padding: '10px 12px',
        borderRadius: 8,
        background: 'rgba(245, 158, 11, 0.06)',
        border: '1px solid rgba(245, 158, 11, 0.15)',
        fontSize: 12,
        color: '#999',
        lineHeight: 1.5,
        marginBottom: 24,
      }}>
        High-risk actions (<strong style={{ color: '#f59e0b' }}>sendETH</strong>, <strong style={{ color: '#f59e0b' }}>swap execute</strong>) always require
        your explicit confirmation before execution.
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Start Button */}
      <button
        onClick={onStart}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 24,
          border: 'none',
          background: '#4f8fff',
          color: '#fff',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => (e.target as HTMLElement).style.background = '#3a7bef'}
        onMouseLeave={(e) => (e.target as HTMLElement).style.background = '#4f8fff'}
      >
        Start
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.5 }}>
      <span style={{ color: '#555', minWidth: 64, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#bbb' }}>{value}</span>
    </div>
  );
}

function ModeRow({ name, desc, note }: { name: string; desc: string; note: string | null }) {
  return (
    <div style={{
      padding: '8px 10px',
      borderRadius: 8,
      background: '#161616',
      border: '1px solid #2a2a2a',
    }}>
      <div style={{ fontSize: 12, color: '#e5e5e5', fontWeight: 500, marginBottom: 2 }}>{name}</div>
      <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4 }}>{desc}</div>
      {note && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 3 }}>{note}</div>}
    </div>
  );
}

function StepRow({ step, text }: { step: string; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
      <div style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: '#4f8fff',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 600,
        flexShrink: 0,
      }}>{step}</div>
      <span style={{ color: '#bbb', lineHeight: 1.4 }}>{text}</span>
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#777',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 8,
};

const paragraph: React.CSSProperties = {
  fontSize: 13,
  color: '#999',
  lineHeight: 1.6,
};
