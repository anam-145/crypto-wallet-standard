'use client';

import { useState, useEffect } from 'react';
import Chat from '@/components/Chat';
import ModuleSelector from '@/components/ModuleSelector';
import SettingsPanel from '@/components/SettingsPanel';
import StatusBar from '@/components/StatusBar';
import Welcome from '@/components/Welcome';

interface Module {
  id: string;
  name: string;
  description?: string;
  actionCount: number;
}

type Mode = 'default' | 'custom-url' | 'custom-ai';

export default function Home() {
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>('default');
  const [connected, setConnected] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [sessionDone, setSessionDone] = useState(false);
  const [connectedDetail, setConnectedDetail] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    fetch('/api/modules')
      .then((r) => r.json())
      .then((data) => {
        setModules(data.modules || []);
        setSelectedModules([]);
      });

    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setMode(data.mode);
        setAvailableProviders(data.availableProviders || []);
        if (data.mode === 'default') {
          setConnected(true);
          setConnectedDetail('Anam Agent Server');
        }
      });
  }, []);

  function handleToggle(id: string) {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  function handleModeChange(newMode: Mode) {
    setMode(newMode);
    if (newMode === 'default') {
      // Anam mode: auto-connect + reset server
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'default' }),
      });
      setConnected(true);
      setConnectedDetail('Anam Agent Server');
    } else {
      setConnected(false);
      setConnectedDetail('');
    }
  }

  async function handleApplySettings(settings: Record<string, string>) {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (res.ok) {
      setMode(data.mode);
      setConnected(true);
      if (settings.mode === 'custom-url') {
        setConnectedDetail(settings.chatUrl);
      } else if (settings.mode === 'custom-ai') {
        const providerName = (settings.provider || 'openai').charAt(0).toUpperCase() + (settings.provider || 'openai').slice(1);
        setConnectedDetail(`${providerName} Direct`);
      }
    }
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: 480,
      height: '100vh',
      maxHeight: 760,
      display: 'flex',
      flexDirection: 'column',
      background: '#111',
      borderRadius: 16,
      overflow: 'hidden',
      border: '1px solid #222',
    }}>
      {showWelcome ? (
        <Welcome onStart={() => setShowWelcome(false)} />
      ) : (
        <>
          {/* Header */}
          <div style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #1a1a1a',
          }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 16 }}>
              Crypto Wallet Agent
            </h1>
            <SettingsPanel
              currentMode={mode}
              onModeChange={handleModeChange}
              onApply={handleApplySettings}
              availableProviders={availableProviders}
            />
          </div>

          {/* Modules */}
          <ModuleSelector
            modules={modules}
            selected={selectedModules}
            onToggle={handleToggle}
            disabled={sessionDone}
          />

          {/* Status Bar */}
          <StatusBar
            mode={mode}
            connected={connected}
            connectedDetail={connectedDetail}
            selectedModuleCount={selectedModules.length}
          />

          {/* Chat */}
          <Chat
            selectedModules={selectedModules}
            connected={connected && selectedModules.length > 0}
            sessionDone={sessionDone}
            onSessionEnd={() => setSessionDone(true)}
            onRestart={() => setSessionDone(false)}
          />
        </>
      )}
    </div>
  );
}
