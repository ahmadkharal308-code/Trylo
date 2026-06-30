import { useRef, useState } from 'react';
import SellerBadge from './SellerBadge';

interface Product {
  id: string;
  title: string;
  priceMinor: number;
  description?: string | null;
  pattern: string;
  formality: string;
  seller: { businessName: string; location?: string | null; ratingAverage: number | string; ratingCount: number; salesCount: number };
  images: Array<{ url: string; kind: string }>;
  rootCategory?: { name: string };
  subStyle?: { name: string } | null;
}

interface Props {
  product: Product;
  phase: string;
  swipeNumber: number;
  totalSwipes: number;
  onSwipe: (direction: 'LEFT' | 'RIGHT' | 'UP') => void;
}

function pkrFormat(paisa: number) {
  return `PKR ${(paisa / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

const SWIPE_THRESHOLD = 80;
const UP_THRESHOLD = 80;

export default function SwipeCard({ product, phase, swipeNumber, totalSwipes, onSwipe }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hint, setHint] = useState<'LEFT' | 'RIGHT' | 'UP' | null>(null);
  const [settling, setSettling] = useState(false);

  const frontImage = product.images.find((i) => i.kind === 'FRONT') ?? product.images[0];

  function onStart(clientX: number, clientY: number) {
    startRef.current = { x: clientX, y: clientY };
    setSettling(false);
  }

  function onMove(clientX: number, clientY: number) {
    if (!startRef.current) return;
    const dx = clientX - startRef.current.x;
    const dy = clientY - startRef.current.y;
    setOffset({ x: dx, y: dy });

    if (dy < -UP_THRESHOLD && Math.abs(dx) < 60) setHint('UP');
    else if (dx > SWIPE_THRESHOLD) setHint('RIGHT');
    else if (dx < -SWIPE_THRESHOLD) setHint('LEFT');
    else setHint(null);
  }

  function onEnd() {
    if (!startRef.current) return;
    const dx = offset.x;
    const dy = offset.y;

    if (dy < -UP_THRESHOLD && Math.abs(dx) < 60) {
      flyOut(0, -600, () => onSwipe('UP'));
    } else if (dx > SWIPE_THRESHOLD) {
      flyOut(600, dy, () => onSwipe('RIGHT'));
    } else if (dx < -SWIPE_THRESHOLD) {
      flyOut(-600, dy, () => onSwipe('LEFT'));
    } else {
      // Snap back
      setSettling(true);
      setOffset({ x: 0, y: 0 });
      setHint(null);
      setTimeout(() => setSettling(false), 250);
    }
    startRef.current = null;
  }

  function flyOut(toX: number, toY: number, cb: () => void) {
    setSettling(true);
    setOffset({ x: toX, y: toY });
    setHint(null);
    setTimeout(cb, 220);
  }

  const rotation = (offset.x / 300) * 12;
  const opacity = Math.max(0, 1 - Math.abs(offset.x) / 400 - Math.max(0, -offset.y) / 500);

  return (
    <div className="relative flex flex-col h-full select-none">
      {/* Phase indicator */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          {phase === 'BENCHMARK' ? 'Discover' : 'Confirm taste'}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: totalSwipes }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i < swipeNumber - 1
                  ? 'bg-rose-500 w-5'
                  : i === swipeNumber - 1
                  ? 'bg-rose-400 w-5'
                  : 'bg-gray-200 w-3'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 px-4 pb-2 relative overflow-hidden">
        <div
          ref={cardRef}
          className={`swipe-card ${settling ? 'settling' : ''} absolute inset-0 mx-4 rounded-2xl overflow-hidden shadow-lg bg-white`}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
            opacity,
          }}
          onMouseDown={(e) => onStart(e.clientX, e.clientY)}
          onMouseMove={(e) => { if (startRef.current) onMove(e.clientX, e.clientY); }}
          onMouseUp={onEnd}
          onMouseLeave={onEnd}
          onTouchStart={(e) => onStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={(e) => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); }}
          onTouchEnd={onEnd}
        >
          {/* Image */}
          <div className="relative h-[55%] bg-gray-100 overflow-hidden">
            {frontImage ? (
              <img src={frontImage.url} alt={product.title} className="w-full h-full object-cover" draggable={false} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">No photo</div>
            )}

            {/* Swipe direction hint overlays */}
            {hint === 'RIGHT' && (
              <div className="absolute inset-0 bg-green-500/20 flex items-start justify-start p-4">
                <span className="text-green-600 font-black text-3xl border-4 border-green-600 rounded-lg px-3 py-1 rotate-[-15deg]">LIKE</span>
              </div>
            )}
            {hint === 'LEFT' && (
              <div className="absolute inset-0 bg-red-500/20 flex items-start justify-end p-4">
                <span className="text-red-600 font-black text-3xl border-4 border-red-600 rounded-lg px-3 py-1 rotate-[15deg]">NOPE</span>
              </div>
            )}
            {hint === 'UP' && (
              <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                <span className="text-violet-600 font-black text-3xl border-4 border-violet-600 rounded-lg px-3 py-1">MAYBE</span>
              </div>
            )}

            {/* Category tag */}
            {product.subStyle && (
              <div className="absolute bottom-2 left-2">
                <span className="bg-black/50 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                  {product.subStyle.name}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 flex flex-col gap-2 h-[45%] overflow-hidden">
            <div>
              <p className="font-semibold text-gray-900 text-base leading-snug line-clamp-2">{product.title}</p>
              <p className="text-rose-600 font-bold text-lg mt-0.5">{pkrFormat(product.priceMinor)}</p>
            </div>
            {product.description && (
              <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{product.description}</p>
            )}
            <div className="mt-auto">
              <SellerBadge
                name={product.seller.businessName}
                location={product.seller.location}
                rating={product.seller.ratingAverage}
                ratingCount={product.seller.ratingCount}
                salesCount={product.seller.salesCount}
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex-shrink-0 flex items-center justify-center gap-6 px-4 pb-6 pt-2">
        <button
          onClick={() => flyOut(-600, 0, () => onSwipe('LEFT'))}
          className="w-14 h-14 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-2xl active:scale-90 transition-transform"
        >
          ✕
        </button>
        <button
          onClick={() => flyOut(0, -600, () => onSwipe('UP'))}
          className="w-11 h-11 rounded-full bg-violet-50 shadow-md border border-violet-200 flex items-center justify-center text-lg active:scale-90 transition-transform"
          title="Maybe (saves with lower weight)"
        >
          ◆
        </button>
        <button
          onClick={() => flyOut(600, 0, () => onSwipe('RIGHT'))}
          className="w-14 h-14 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-2xl active:scale-90 transition-transform"
        >
          ♥
        </button>
      </div>

      {/* Gesture hint on first card */}
      {swipeNumber === 1 && (
        <p className="text-center text-xs text-gray-400 pb-2 px-4">
          ♥ like · ✕ skip · ◆ maybe (saved with less weight)
        </p>
      )}
    </div>
  );
}
