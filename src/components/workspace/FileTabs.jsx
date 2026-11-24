import { FileCode, Plus, X } from 'lucide-react';

// 複数ファイルのタブ。tabs は表示名の配列（index 0 はメイン＝閉じられない）。
export default function FileTabs({ tabs, active, onSelect, onAdd, onClose }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((name, i) => (
        <div
          key={i}
          onClick={() => onSelect(i)}
          className={`group flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-2.5 py-1.5 text-[11px] transition-colors ${
            active === i
              ? 'border-blue-500 bg-white text-slate-800'
              : 'border-transparent text-slate-500 hover:bg-slate-100'
          }`}
        >
          <FileCode className="h-3 w-3 shrink-0" />
          <span className="font-mono">{name}</span>
          {i !== 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose(i);
              }}
              title="このファイルを閉じる"
              className="rounded p-0.5 text-slate-400 transition-colors hover:text-slate-700"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        title="ファイルを追加"
        className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
