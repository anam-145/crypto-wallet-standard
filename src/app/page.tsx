'use client';

import { useState, useEffect } from 'react';
import Chat from '@/components/Chat';
import ModuleSelector from '@/components/ModuleSelector';
import SettingsPanel from '@/components/SettingsPanel';

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
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/modules')
      .then((r) => r.json())
      .then((data) => {
        setModules(data.modules || []);
        setSelectedModules((data.modules || []).map((m: Module) => m.id));
      });

    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setMode(data.mode);
        setAvailableProviders(data.availableProviders || []);
      });
  }, []);

  function handleToggle(id: string) {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
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
    }
  }

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* Sidebar */}
      <aside className="w-72 border-r border-gray-800 p-4 flex flex-col gap-6 overflow-y-auto">
        <h1 className="text-lg font-bold">Crypto Wallet Agent</h1>
        <div className="text-xs text-gray-500">
          Mode: <span className="text-gray-300">{mode}</span>
        </div>
        <SettingsPanel
          currentMode={mode}
          onApply={handleApplySettings}
          availableProviders={availableProviders}
        />
        <ModuleSelector
          modules={modules}
          selected={selectedModules}
          onToggle={handleToggle}
        />
      </aside>

      {/* Chat */}
      <main className="flex-1 flex flex-col">
        <Chat selectedModules={selectedModules} />
      </main>
    </div>
  );
}
