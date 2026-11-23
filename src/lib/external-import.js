import { base44 } from '@/api/base44Client';
import { signedUrls } from '@/lib/attachments';
import { scheduleCardsNextDay } from '@/lib/review-plan';

// 添付した画像（会話のスクリーンショットなど）を文字に起こし、貼り付けた文章に足す
async function withImageText(text, uris) {
  if (!uris || !uris.length) return text;
  const urls = await signedUrls(uris);
  const res = await base44.functions.invoke('readImages', { urls });
  if (res.data?.error) throw new Error(res.data.error);
  const read = String(res.data?.text || '').trim();
  if (!read) return text;
  return [text, `[添付した画像から読み取った内容]\n${read}`].filter(Boolean).join('\n\n');
}
import { refineNewCards } from '@/lib/refine-written';

export const IMPORT_MAX = 60000;
export const IMPORT_MIN = 40;

// ほかのAIとの会話を取り込み、知識問題・コーディング問題・アシスタントの記憶に反映する
export async function importExternal(raw, imageUris = []) {
  const text = (await withImageText(String(raw || '').trim(), imageUris)).slice(0, IMPORT_MAX);
  if (text.length < IMPORT_MIN) throw new Error('貼り付けた文章が短すぎます。対話をそのまま貼り付けてください。');

  // 長い記録ほど話題が多いので、問題数も少しずつ増やす
  const count = Math.min(24, Math.max(10, Math.ceil(text.length / 2500)));
  const [cardsRes, digestRes, lastSub] = await Promise.allSettled([
    base44.functions.invoke('generateKnowledge', { source: 'external', text, count }),
    base44.functions.invoke('digestExternal', { text }),
    base44.entities.Submission.list({ sort: '-created_date', limit: 1 }),
  ]);

  const errors = [];
  const rawCards = cardsRes.status === 'fulfilled' && !cardsRes.value.data?.error ? cardsRes.value.data?.cards || [] : [];
  // 記述問題は聞き方を見直してから使う
  const cards = await refineNewCards(rawCards);
  if (cards.length === 0) errors.push('知識の問題');
  const digest = digestRes.status === 'fulfilled' && !digestRes.value.data?.error ? digestRes.value.data : null;
  if (!digest) errors.push('記憶とコーディング問題');

  // コーディング問題は、いつも使っている言語で作る
  const language = (lastSub.status === 'fulfilled' && lastSub.value.items?.[0]?.language) || 'cpp';
  const made = await Promise.allSettled(
    (digest?.coding || []).map((c) =>
      base44.functions.invoke('generateProblem', {
        topic: c.topic,
        request: c.request,
        difficulty: c.difficulty,
        language,
        source: 'ai',
      })
    )
  );
  const problems = made
    .filter((r) => r.status === 'fulfilled' && r.value.data?.problem)
    .map((r) => r.value.data.problem);
  if (made.some((r) => r.status === 'rejected' || !r.value?.data?.problem)) errors.push('コーディング問題の一部');

  // 取り込んだ知識カードは、翌日から忘却曲線に乗せる（解くまで眠らないように）。
  // コーディング問題は、解いたときに復習の予定ができる（従来どおり）。
  const scheduled = await scheduleCardsNextDay(cards).catch(() => 0);
  return { cards, problems, scheduled, memoryUpdated: !!digest?.updated, errors };
}

// 単一のテキスト（アシスタントの返信など）から知識カードだけを作り、翌日の復習に乗せる。
// コーディング問題や記憶更新はしない、軽い取り込み。
export async function importKnowledge(raw, imageUris = []) {
  const text = (await withImageText(String(raw || '').trim(), imageUris)).slice(0, IMPORT_MAX);
  if (text.length < IMPORT_MIN) throw new Error('取り込める中身が短すぎます。');
  const count = Math.min(12, Math.max(3, Math.ceil(text.length / 1200)));
  const res = await base44.functions.invoke('generateKnowledge', { source: 'external', text, count });
  if (res.data?.error) throw new Error(res.data.error);
  const cards = await refineNewCards(res.data?.cards || []);
  const scheduled = await scheduleCardsNextDay(cards).catch(() => 0);
  return { cards, scheduled };
}

// 取り込んだ結果を、短い報告文にする
export function importReport(result) {
  const lines = ['取り込みました。'];
  lines.push(`・知識の問題: ${result.cards.length}問（明日の復習から出ます。知識モードでも解けます）`);
  if (result.problems.length) {
    lines.push(`・コーディング問題: ${result.problems.length}問（${result.problems.map((p) => `「${p.title}」`).join('')}）`);
  } else {
    lines.push('・コーディング問題: 会話にコードの題材がなかったので、作っていません');
  }
  if (result.memoryUpdated) lines.push('・会話の要点を覚えました。これからの返答に反映します');
  if (result.errors.length) lines.push(`うまくいかなかったもの: ${result.errors.join('、')}`);
  return lines.join('\n');
}
