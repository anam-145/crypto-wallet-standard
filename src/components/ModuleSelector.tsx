'use client';

interface Module {
  id: string;
  name: string;
  description?: string;
  actionCount: number;
}

interface Props {
  modules: Module[];
  selected: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}

export default function ModuleSelector({ modules, selected, onToggle, disabled }: Props) {
  if (modules.length === 0) return null;

  return (
    <div style={{
      padding: '12px 24px',
      borderBottom: '1px solid #1a1a1a',
    }}>
      <div style={{
        fontSize: 11,
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
      }}>
        Modules
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {modules.map((m) => {
          const active = selected.includes(m.id);
          return (
            <button
              key={m.id}
              onClick={() => !disabled && onToggle(m.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 8,
                border: `1px solid ${active ? '#34d399' : '#2a2a2a'}`,
                background: active ? 'rgba(52, 211, 153, 0.08)' : '#161616',
                cursor: disabled ? 'default' : 'pointer',
                transition: 'all 0.15s',
                userSelect: 'none',
                opacity: disabled ? 0.5 : 1,
                pointerEvents: disabled ? 'none' : 'auto',
              }}
            >
              {/* Checkbox */}
              <div style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                border: `1.5px solid ${active ? '#34d399' : '#444'}`,
                background: active ? '#34d399' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s',
              }}>
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none"
                  style={{ opacity: active ? 1 : 0, transition: 'opacity 0.15s' }}>
                  <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {/* Name */}
              <span style={{
                fontSize: 12,
                color: active ? '#34d399' : '#777',
                transition: 'color 0.15s',
              }}>
                {m.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
