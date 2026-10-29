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
    title: card.topic || card.answer,
    topic: card.domain,
    correct,
  }).catch(() => {});
}