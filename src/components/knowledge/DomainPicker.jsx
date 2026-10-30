const DOMAINS = [
  { id: 'all', label: 'すべて' },
  { id: 'chat', label: '会話から' },
  { id: 'ap', label: '応用情報' },
  { id: 'security', label: 'セキスペ' },
  { id: 'aws', label: 'AWS' },
  { id: 'cisco', label: 'Cisco' },
  { id: 'global', label: '海外面接' },
  { id: 'business', label: 'ビジネス/KPI' },
  { id: 'osi', label: 'OSIモデル' },
  { id: 'cpp', label: 'C系' },
  { id: 'python', label: 'Python' },
];

const OSI_LAYERS = [
  '物理層',
  'データリンク層',
  'ネットワーク層',
  'トランスポート層',
  'セッション層',
  'プレゼンテーション層',
  'アプリケーション層',
];

export default function DomainPicker({ domain, onDomain, layer, onLayer }) {
  return (
    <>
      <div className="mt-6 flex flex-wrap gap-1.5">
        {DOMAINS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onDomain(d.id)}
            className={`rounded-full px-3 py-1 text-[11px] transition-colors ${
              domain === d.id
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {domain === 'osi' && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2.5">
          {['all', ...OSI_LAYERS].map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onLayer(l)}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
                layer === l
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {l === 'all' ? 'すべての層' : l}
            </button>
          ))}
        </div>
      )}
    </>
  );
}