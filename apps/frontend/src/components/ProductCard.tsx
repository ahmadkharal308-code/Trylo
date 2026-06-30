import { useNavigate } from 'react-router-dom';
import SellerBadge from './SellerBadge';

interface Product {
  id: string;
  title: string;
  priceMinor: number;
  seller: { id: string; businessName: string; location?: string | null; ratingAverage: number | string; ratingCount: number; salesCount: number };
  images: Array<{ url: string; kind: string }>;
  rootCategory?: { name: string };
}

interface Props {
  product: Product;
}

function pkrFormat(paisa: number) {
  return `PKR ${(paisa / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

export default function ProductCard({ product }: Props) {
  const nav = useNavigate();
  const frontImage = product.images.find((i) => i.kind === 'FRONT') ?? product.images[0];

  return (
    <div
      onClick={() => nav(`/product/${product.id}`)}
      className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer active:scale-95 transition-transform"
    >
      <div className="aspect-[4/5] bg-gray-100 overflow-hidden">
        {frontImage ? (
          <img src={frontImage.url} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">No photo</div>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{product.title}</p>
        <p className="text-base font-bold text-rose-600 mt-1">{pkrFormat(product.priceMinor)}</p>
        <div className="mt-2">
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
  );
}
