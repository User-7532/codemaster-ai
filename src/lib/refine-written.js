import { base44 } from '@/api/base44Client';

// 記述問題の聞き方を見直す（答えの範囲が定まるように、観点・数・条件を足す）

// 作ったばかりのカードのうち、記述問題だけを見直して差し替える。失敗したら元のまま使う
export async function refineNewCards(cards) {
  const ids = (cards || []).filter((c) => c.kind === 'written' && c.refined !== true).map((c) => c.id);
  if (!ids.length) return cards;
  try {
    const updated = [];
    for (let i = 0; i < ids.length; i += 12) {
      const res = await base44.functions.invoke('refineWritten', { ids: ids.slice(i, i + 12) });
      updated.push(...(res.data?.cards || []));
    }
    const byId = new Map(updated.map((c) => [c.id, c]));
    return cards.map((c) => byId.get(c.id) || c);
  } catch {
    return cards;
  }
}

// これまでの記述問題を、画面を開いているあいだに少しずつ見直す（1回の表示につき数回まで）
let running = false;
export async function refineOldCardsInBackground(rounds = 4) {
  if (running) return;
  running = true;
  try {
    for (let i = 0; i < rounds; i += 1) {
      const res = await base44.functions.invoke('refineWritten', {});
      if (!res.data || res.data.error || !res.data.remaining) break;
    }
  } catch {
    // 見直せなくても、問題はそのまま使える
  } finally {
    running = false;
  }
}
