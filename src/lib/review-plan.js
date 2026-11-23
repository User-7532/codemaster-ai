import { base44 } from '@/api/base44Client';
import { addDaysISO, todayISO } from '@/lib/srs';
import { questionPreview } from '@/lib/answer-guard';

// 1日に出す復習の上限。溜まった分は、この数を超えないように先の日へならしていく
const LIMIT_KEY = 'codemaster-review-limit';
export const LIMIT_OPTIONS = [10, 15, 25];
export const QUICK_COUNT = 5;

export function readLimit() {
  try {
    const v = Number(localStorage.getItem(LIMIT_KEY));
    return LIMIT_OPTIONS.includes(v) ? v : 15;
  } catch {
    return 15;
  }
}

export function saveLimit(n) {
  try {
    localStorage.setItem(LIMIT_KEY, String(n));
  } catch {
    // 保存できなくても今日の分は出せる
  }
}

// 今日すでに片付けた復習の数（端末ごと）
const doneKey = () => `codemaster-reviewed-${todayISO()}`;

export function readDoneToday() {
  try {
    return Number(localStorage.getItem(doneKey())) || 0;
  } catch {
    return 0;
  }
}

export function countDoneToday() {
  try {
    localStorage.setItem(doneKey(), String(readDoneToday() + 1));
  } catch {
    // 数えられなくても復習の記録には影響しない
  }
}

// 出す順番：前回まちがえたもの → まだ定着していないもの → 期日が古いもの
export function byPriority(a, b) {
  const wa = a.last_result === 'wrong' ? 0 : 1;
  const wb = b.last_result === 'wrong' ? 0 : 1;
  if (wa !== wb) return wa - wb;
  const sa = a.streak || 0;
  const sb = b.streak || 0;
  if (sa !== sb) return sa - sb;
  return String(a.due_date).localeCompare(String(b.due_date));
}

// 今日の分（上限まで）だけを返す
export function todaysReviews(items, limit = readLimit()) {
  const today = todayISO();
  const due = (items || []).filter((i) => i.due_date <= today).sort(byPriority);
  const room = Math.max(0, limit - readDoneToday());
  return { today: due.slice(0, room), overflow: due.slice(room), room, limit };
}

// 上限からあふれた分を、明日以降の空いている日へ振り分ける（1日あたり上限まで）
let running = null;
export function levelBacklog(items, limit = readLimit()) {
  if (running) return running;
  const { overflow } = todaysReviews(items, limit);
  if (overflow.length === 0) return Promise.resolve(null);

  const today = todayISO();
  const load = {};
  (items || []).forEach((i) => {
    if (i.due_date > today) load[i.due_date] = (load[i.due_date] || 0) + 1;
  });

  const updates = [];
  let day = 1;
  overflow.forEach((item) => {
    while (day < 120 && (load[addDaysISO(day)] || 0) >= limit) day += 1;
    const date = addDaysISO(day);
    load[date] = (load[date] || 0) + 1;
    updates.push({ id: item.id, due_date: date });
  });

  running = (async () => {
    for (let i = 0; i < updates.length; i += 200) {
      await base44.entities.ReviewItem.bulkUpdate(updates.slice(i, i + 200));
    }
    const moved = new Map(updates.map((u) => [u.id, u.due_date]));
    return (items || []).map((i) => (moved.has(i.id) ? { ...i, due_date: moved.get(i.id) } : i));
  })().finally(() => {
    running = null;
  });
  return running;
}

// 知識カードを「翌日から」忘却曲線に乗せる。すでに復習予定があるカードには作らない（重複防止）。
// 取り込んだ瞬間に予定を作るので、「取り込んだが復習に出ず眠ったまま」を防ぐ。
export async function scheduleCardsNextDay(cards) {
  const list = (cards || []).filter((c) => c && c.id);
  if (!list.length) return 0;
  const ids = list.map((c) => c.id);
  let have = new Set();
  try {
    const existing = await base44.entities.ReviewItem.filter(
      { item_type: 'knowledge', item_id: { $in: ids } },
      { limit: 500 }
    );
    have = new Set((existing.items || []).map((i) => i.item_id));
  } catch {
    // 照合できなくても、下の作成でできるだけ付ける
  }
  const due = addDaysISO(1);
  const records = list
    .filter((c) => !have.has(c.id))
    .map((c) => ({
      item_type: 'knowledge',
      item_id: c.id,
      title: questionPreview(c, 40) || '知識カード',
      topic: c.domain || '',
      due_date: due,
      interval_days: 1,
      streak: 0,
    }));
  for (let i = 0; i < records.length; i += 100) {
    await base44.entities.ReviewItem.bulkCreate(records.slice(i, i + 100)).catch(() => {});
  }
  return records.length;
}

// すでに取り込んであるのに復習予定が無い知識カード（source='chat'）を、一度だけ翌日予定に拾い上げる。
const BACKFILL_KEY = 'codemaster-import-backfill-v1';
export async function backfillImportedCards() {
  try {
    if (localStorage.getItem(BACKFILL_KEY)) return;
  } catch {
    return;
  }
  try {
    const page = await base44.entities.KnowledgeCard.filter({ source: 'chat' }, { sort: '-created_date', limit: 500 });
    const cards = page.items || [];
    if (cards.length) await scheduleCardsNextDay(cards);
    try {
      localStorage.setItem(BACKFILL_KEY, '1');
    } catch {
      // 立てられなくても、次回また拾い上げを試みるだけ
    }
  } catch {
    // 失敗したらキーを立てず、次回に回す
  }
}

// 復習の一覧を読み込み、片付けとならしを済ませたものを返す
export async function loadReviewItems() {
  // 眠っている取り込み済みカードを、一度だけ翌日予定に拾い上げる
  await backfillImportedCards().catch(() => {});
  const page = await base44.entities.ReviewItem.list({ sort: 'due_date', limit: 500 });
  const items = page.items || [];
  const leveled = await levelBacklog(items).catch(() => null);
  return leveled || items;
}
