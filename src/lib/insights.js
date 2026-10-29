export function topicWeakness(submissions, { minTotal = 1, limit = 4 } = {}) {
  const acc = {};
  (submissions || []).forEach((s) => {
    (s.topics || []).forEach((t) => {
      acc[t] = acc[t] || { topic: t, total: 0, wrong: 0 };
      acc[t].total += 1;
      if (s.verdict !== 'correct') acc[t].wrong += 1;
    });
  });

  return Object.values(acc)
    .map((v) => ({ ...v, rate: Math.round((v.wrong / v.total) * 100) }))
    .filter((v) => v.total >= minTotal)
    .sort((a, b) => b.wrong / b.total - a.wrong / a.total || b.total - a.total)
    .slice(0, limit);
}