import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createSession, getNextCard, recordSwipe, skipSwiping } from '../lib/api';
import SwipeCard from '../components/SwipeCard';

interface Card {
  phase: string;
  swipeNumber: number;
  totalSwipes: number;
  product: Parameters<typeof SwipeCard>[0]['product'];
}

export default function SwipePage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const department = params.get('department') ?? 'WOMEN';

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [error, setError] = useState('');

  // Start session and fetch first card.
  useEffect(() => {
    let alive = true;
    async function init() {
      try {
        const session = await createSession(department);
        if (!alive) return;
        setSessionId(session.id);
        const next = await getNextCard(session.id);
        if (!alive) return;
        setCard(next);
      } catch (err: unknown) {
        if (!alive) return;
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(msg ?? 'Could not start session');
      } finally {
        if (alive) setLoading(false);
      }
    }
    init();
    return () => { alive = false; };
  }, [department]);

  const handleSwipe = useCallback(async (direction: 'LEFT' | 'RIGHT' | 'UP') => {
    if (!sessionId || !card || swiping) return;
    setSwiping(true);
    try {
      const result = await recordSwipe(sessionId, card.product.id, direction);
      if (result.isComplete) {
        nav(`/results/${sessionId}`);
        return;
      }
      const next = await getNextCard(sessionId);
      setCard(next);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Something went wrong');
    } finally {
      setSwiping(false);
    }
  }, [sessionId, card, swiping, nav]);

  async function handleSkip() {
    if (!sessionId) return;
    await skipSwiping(sessionId).catch(() => {});
    nav(`/results/${sessionId}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-spin">✨</div>
          <p className="text-gray-500 text-sm">Finding products for you…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6 text-center">
        <div>
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => nav('/')} className="text-rose-500 font-medium">Back to home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-w-md mx-auto flex flex-col bg-gray-50 overflow-hidden">
      {/* Nav */}
      <div className="flex items-center justify-between px-4 pt-12 pb-0 flex-shrink-0">
        <button onClick={() => nav('/')} className="text-gray-400 text-sm">✕ Exit</button>
        <button onClick={handleSkip} className="text-rose-400 text-sm font-medium">
          Skip to results →
        </button>
      </div>

      {/* Swipe card */}
      {card && (
        <div className="flex-1 overflow-hidden">
          <SwipeCard
            key={card.product.id}
            product={card.product}
            phase={card.phase}
            swipeNumber={card.swipeNumber}
            totalSwipes={card.totalSwipes}
            onSwipe={handleSwipe}
          />
        </div>
      )}

      {swiping && (
        <div className="absolute inset-0 pointer-events-none" />
      )}
    </div>
  );
}
