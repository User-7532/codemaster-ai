const dayLabel = (value) => {
  const d = new Date(value);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

// 日別の提出数と正答率（全期間・サーバー集計の結果から）
export function dailySeries(rows) {
  const days = {};
  (rows || []).forEach((r) => {
    const key = String(r.created_date).slice(0, 10);
    days[key] = days[key] || { total: 0, correct: 0 };
    days[key].total += r.count || 0;
    if (r.verdict === 'correct') days[key].correct += r.count || 0;
  });

  return Object.entries(days)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, v]) => ({
      label: dayLabel(key),
      提出: v.total,
      正答率: v.total ? Math.round((v.correct / v.total) * 100) : 0,
    }));
}

// 苦手トピックごとの、それまでの累積誤答率の推移
export function topicTrends(subs, { limit = 4, minTotal = 2 } = {}) {
  const chrono = [...(subs || [])].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  const totals = {};
  chrono.forEach((s) => {
    (s.topics || []).forEach((t) => {
      totals[t] = totals[t] || { total: 0, wrong: 0 };
      totals[t].total += 1;
      if (s.verdict !== 'correct') totals[t].wrong += 1;
    });
  });

  const topics = Object.entries(totals)
    .map(([topic, v]) => ({ topic, total: v.total, rate: v.wrong / v.total }))
    .filter((t) => t.total >= minTotal)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, limit)
    .map((t) => t.topic);

  if (!topics.length) return { topics: [], data: [] };

  const running = {};
  topics.forEach((t) => {
    running[t] = { total: 0, wrong: 0 };
  });

  const data = [];
  chrono.forEach((s) => {
    const hit = topics.filter((t) => (s.topics || []).includes(t));
    if (!hit.length) return;
    hit.forEach((t) => {
      running[t].total += 1;
      if (s.verdict !== 'correct') running[t].wrong += 1;
    });
    const point = { label: dayLabel(s.created_date) };
    topics.forEach((t) => {
      if (running[t].total) point[t] = Math.round((running[t].wrong / running[t].total) * 100);
    });
    data.push(point);
  });

  return { topics, data };
}