import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getResults } from '../lib/api';
import ProductCard from '../components/ProductCard';

interface Results {
  department: string;
  basedOnSwipes: number;
  skipped: boolean;
  usedFallback: boolean;
  tasteProfile?: {
    attributes: Record<string, Record<string, number>>;
    swipeCount: number;
  };
  items: Parameters<typeof ProductCard>[0]['product'][];
}

export default function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const nav = useNavigate();
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    getResults(sessionId)
      .then(setResults)
      .catch(() => setResults(null))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-3">✨</div>
          <p className="text-gray-500 text-sm">Building your picks…</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-gray-500 mb-4">Could not load results.</p>
          <button onClick={() => nav('/')} className="text-rose-500 font-medium">Back to home</button>
        </div>
      </div>
    );
  }

  // Build a human-readable taste summary from profile.
  const topAttr = results.tasteProfile?.attributes;
  const tasteSummary: string[] = [];
  if (topAttr?.formality) {
    const top = Object.entries(topAttr.formality).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (top) tasteSummary.push(top.toLowerCase().replace('_', '-'));
  }
  if (topAttr?.pattern) {
    const top = Object.entries(topAttr.pattern).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (top && top !== 'PLAIN') tasteSummary.push(top.toLowerCase());
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={() => nav('/')} className="text-gray-400">← Home</button>
          <h1 className="font-bold text-gray-900">Your picks</h1>
          <button
            onClick={() => nav(`/swipe?department=${results.department}`)}
            className="text-rose-500 text-sm font-medium"
          >
            Swipe again
          </button>
        </div>

        {/* Taste summary */}
        {!results.usedFallback && tasteSummary.length > 0 ? (
          <p className="text-sm text-gray-500 mt-2">
            Based on your taste for <strong>{tasteSummary.join(', ')}</strong> styles
          </p>
        ) : results.skipped ? (
          <p className="text-sm text-gray-500 mt-2">Popular picks — swipe next time for personalised results</p>
        ) : (
          <p className="text-sm text-gray-500 mt-2">{results.items.length} products found</p>
        )}
      </div>

      {/* Grid */}
      <div className="p-4">
        {results.items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🛍️</p>
            <p className="font-medium text-gray-600">No products yet</p>
            <p className="text-sm text-gray-400 mt-1">Our sellers are adding more soon</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {results.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
