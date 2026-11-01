// 今日の復習のセッションの途中経過を、問題を解きに行っても失わないように保持する
const KEY = 'codemaster-mixed-session';

export const loadSession = () => {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data?.queue) || data.queue.length === 0) return null;
    const idx = Math.min(Math.max(Number(data.idx) || 0, 0), data.queue.length);
    return { queue: data.queue, idx };
  } catch {
    return null;
  }
};

export const saveSession = (queue, idx) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ queue, idx }));
  } catch {
    // 保存できなくても学習の続行は妨げない
  }
};

export const clearSession = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // 何もしない
  }
};

// 解き終えたコード問題がセッションの現在地なら、次の項目へ進める
export const completeSessionProblem = (problemId) => {
  const data = loadSession();
  if (!data) return;
  const current = data.queue[data.idx];
  const nextIdx =
    current && current.type === 'problem' && current.item?.id === problemId ? data.idx + 1 : data.idx;
  saveSession(data.queue, nextIdx);
};