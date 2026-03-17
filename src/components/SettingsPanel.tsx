'use client';

import { useState, useEffect } from 'react';

type Mode = 'default' | 'custom-url' | 'custom-ai';

interface Props {
  currentMode: Mode;
  onApply: (settings: Record<string, string>) => void;
  availableProviders: string[];
}

export default function SettingsPanel({ currentMode, onApply, availableProviders }: Props) {
  const [mode, setMode] = useState<Mode>(currentMode);
  const [chatUrl, setChatUrl] = useState('');
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');

  useEffect(() => {
    setMode(currentMode);
  }, [currentMode]);

  function handleModeChange(newMode: Mode) {
    setMode(newMode);
    setChatUrl('');
    setApiKey('');
    setSystemPrompt('');
  }

  function handleApply() {
    if (mode === 'default') {
      onApply({ mode: 'default' });
    } else if (mode === 'custom-url') {
      onApply({ mode: 'custom-url', chatUrl });
    } else {
      onApply({ mode: 'custom-ai', provider, apiKey, systemPrompt });
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Settings</h3>

      <div className="flex gap-1">
        {(['default', 'custom-url', 'custom-ai'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`px-2 py-1 text-xs rounded ${
              mode === m
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === 'custom-url' && (
        <input
          type="text"
          placeholder="Backend URL"
          value={chatUrl}
          onChange={(e) => setChatUrl(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      )}

      {mode === 'custom-ai' && (
        <div className="space-y-2">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-blue-500"
          >
            {availableProviders.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input
            type="password"
            placeholder="API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            placeholder="System prompt (optional)"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      )}

      <button
        onClick={handleApply}
        className="w-full py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        Apply
      </button>
    </div>
  );
}
