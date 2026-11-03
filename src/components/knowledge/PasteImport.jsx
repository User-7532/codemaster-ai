import { useRef, useState } from 'react';
import { ImagePlus, ClipboardPaste, Loader2 } from 'lucide-react';
import { IMPORT_MAX, IMPORT_MIN, importExternal } from '@/lib/external-import';
import { MAX_IMAGES, imagesFromClipboard, useImageAttachments } from '@/lib/attachments';
import { ImageStrip } from '@/components/assistant/ImageStrip';

// ほかのAIとのやり取りを貼り付けて、そこから知識問題を作る小さな窓口
export default function PasteImport({ onCards }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  // 会話のスクリーンショット（画像）も一緒に、または画像だけでも取り込める
  const att = useImageAttachments();
  const fileRef = useRef(null);
  const ready = !att.uploading && (text.trim().length >= IMPORT_MIN || att.ready.length > 0);

  const run = async () => {
    if (busy || !ready) return;
    setBusy(true);
    setNote('');
    try {
      // 知識問題に加えて、コーディング問題・今日の復習・アシスタントの記憶にも反映する
      const result = await importExternal(text, att.ready.map((i) => i.uri));
      if (result.cards.length === 0 && result.problems.length === 0) {
        setNote('問題を作れませんでした。少し待ってからもう一度お試しください。');
        return;
      }
      setText('');
      att.clear();
      setOpen(false);
      onCards(result.cards, result);
    } catch (e) {
      setNote(e.message || '問題を作れませんでした。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] transition-colors ${
          open
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-border/70 text-muted-foreground hover:text-foreground'
        }`}
        title="ほかのAIとの対話を貼り付けて、そこから問題を作ります"
      >
        <ClipboardPaste className="h-3 w-3" />
        他AIの会話から作る
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-border/60 bg-card/50 p-3">
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            ほかのAIとのやり取りをそのまま貼り付けてください。やり取りの中の知識を、抜けが出ないように順に問題にします。コードの話題があればコーディング問題も作り、どちらも今日の復習に入れます。会話の要点はAIアシスタントが覚えます。
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={(e) => {
              const files = imagesFromClipboard(e);
              if (files.length) att.add(files);
            }}
            rows={8}
            maxLength={IMPORT_MAX}
            placeholder="（例）AIとの対話をコピーして貼り付け"
            className="mt-2 w-full resize-y rounded-lg border border-border/70 bg-background/70 px-2.5 py-2 text-[11.5px] leading-relaxed outline-none focus:border-primary/50"
          />
          <div className="mt-2">
            <ImageStrip images={att.images} onRemove={att.remove} />
            {att.error && <p className="mb-1.5 text-[10px] text-destructive">{att.error}</p>}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                att.add(e.target.files);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy || att.images.length >= MAX_IMAGES}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[10.5px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <ImagePlus className="h-3 w-3" />
              会話のスクリーンショットを添付（{MAX_IMAGES}枚まで・貼り付けも可）
            </button>
          </div>
          {note && <p className="mt-1.5 text-[10px] text-rose-700">{note}</p>}
          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={run}
              disabled={busy || !ready}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy && <Loader2 className="h-3 w-3 animate-spin" />}
              {busy ? '対話を読み取っています（1〜2分かかることがあります）…' : 'この対話を取り込む'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setNote('');
              }}
              className="shrink-0 rounded-lg border border-border/70 px-3 py-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              閉じる
            </button>
          </div>
          <p className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground/70">
            <span>長い記録もそのまま貼り付けられます。</span>
            <span className="tabular-nums">{text.trim().length.toLocaleString()} / {IMPORT_MAX.toLocaleString()}字</span>
          </p>
        </div>
      )}
    </div>
  );
}