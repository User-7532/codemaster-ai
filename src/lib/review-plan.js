import { base44 } from '@/api/base44Client';
import { addDaysISO, todayISO } from '@/lib/srs';

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

// 会話の取り込みで、解く前から復習に入っていたもの（一度も解いていない）を外す。1回だけ行う
const CLEANUP_KEY = 'codemaster-import-review-cleanup-v1';
export async function removeUnansweredImports(items) {
  try {
    if (localStorage.getItem(CLEANUP_KEY)) return items;
  } catch {
    return items;
  }
  const targets = (items || []).filter((i) => !i.last_result && !i.streak && !i.interval_days);
  for (let i = 0; i < targets.length; i += 10) {
    await Promise.all(targets.slice(i, i + 10).map((t) => base44.entities.ReviewItem.delete(t.id).catch(() => {})));
  }
  try {
    localStorage.setItem(CLEANUP_KEY, '1');
  } catch {
    // 次回もう一度試みるだけ
  }
  const gone = new Set(targets.map((t) => t.id));
  return (items || []).filter((i) => !gone.has(i.id));
}

// 復習の一覧を読み込み、片付けとならしを済ませたものを返す
export async function loadReviewItems() {
  const page = await base44.entities.ReviewItem.list({ sort: 'due_date', limit: 500 });
  let items = page.items || [];
  items = await removeUnansweredImports(items);
  const leveled = await levelBacklog(items).catch(() => null);
  return leveled || items;
}
