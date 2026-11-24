// 写経中のHTMLを、打つたびにその場で描画する。
// あなたが書いた内容（value）とお手本（model）を並べて出すので、写経が進むほど左が右へ近づくのが見える。
// 安全のため iframe は sandbox="" で完全に隔離（スクリプトもネットワークも動かさない。HTML/CSSの描画だけ）。
function Frame({ title, html }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-white">
      <div className="border-b border-border/60 bg-card/70 px-3 py-1.5 text-[11px] text-muted-foreground">{title}</div>
      <iframe
        title={title}
        sandbox=""
        srcDoc={html || '<!doctype html><html><body></body></html>'}
        className="h-64 w-full border-0 bg-white"
      />
    </div>
  );
}

export default function LivePreview({ value, model }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Frame title="あなたの画面（書いた分だけ描画）" html={value} />
      <Frame title="お手本" html={model} />
    </div>
  );
}
