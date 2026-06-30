// Seller identity always visible per CLAUDE.md constraint #5.
interface Props {
  name: string;
  location?: string | null;
  rating: number | string;
  ratingCount: number;
  salesCount: number;
  size?: 'sm' | 'md';
}

export default function SellerBadge({ name, location, rating, ratingCount, salesCount, size = 'md' }: Props) {
  const stars = Math.round(Number(rating) * 10) / 10;
  const isSmall = size === 'sm';

  return (
    <div className={`flex items-start gap-2 ${isSmall ? 'text-xs' : 'text-sm'}`}>
      <div className={`rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center flex-shrink-0 ${isSmall ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'}`}>
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className={`font-semibold text-gray-900 truncate ${isSmall ? 'text-xs' : 'text-sm'}`}>{name}</p>
        {location && <p className="text-gray-500 truncate">{location}</p>}
        <div className="flex items-center gap-2 text-gray-500 mt-0.5 flex-wrap">
          <span className="flex items-center gap-0.5">
            <span className="text-amber-400">★</span>
            <span>{stars > 0 ? stars.toFixed(1) : '–'}</span>
            {ratingCount > 0 && <span>({ratingCount})</span>}
          </span>
          {salesCount > 0 && (
            <span>{salesCount} sales</span>
          )}
        </div>
      </div>
    </div>
  );
}
