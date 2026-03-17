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
}

export default function ModuleSelector({ modules, selected, onToggle }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Modules</h3>
      {modules.length === 0 && (
        <p className="text-sm text-gray-500">No modules found</p>
      )}
      {modules.map((m) => (
        <label
          key={m.id}
          className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-800 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={selected.includes(m.id)}
            onChange={() => onToggle(m.id)}
            className="mt-1 accent-blue-500"
          />
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-200">{m.name}</div>
            <div className="text-xs text-gray-500 truncate">{m.description}</div>
            <div className="text-xs text-gray-600">{m.actionCount} actions</div>
          </div>
        </label>
      ))}
    </div>
  );
}
