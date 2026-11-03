import { questionPreview } from '@/lib/answer-guard';
import { base44 } from '@/api/base44Client';
import { recordReview } from '@/lib/srs';

export function recordKnowledgeAnswer(card, correct, mode) {
  if (!card) return;
  base44.entities.KnowledgeAttempt.create({
    card_id: card.id,
    domain: card.domain,
    topic: card.topic || '',
    correct,
    mode,
  }).catch(() => {});

  recordReview({
    item_type: 'knowledge',
    item_id: card.id,
    // 一覧に出しても答えが見えないよう、答えを伏せた問題文を題名にする
    title: questionPreview(card, 40) || '知識カード',
    topic: card.domain,
    correct,
  }).catch(() => {});
}