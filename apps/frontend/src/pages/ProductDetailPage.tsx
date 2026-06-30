import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProduct } from '../lib/api';
import SellerBadge from '../components/SellerBadge';

interface Variant { id: string; size: string; stockQty: number; }
interface Image { id: string; url: string; kind: string; sortOrder: number; }
interface Product {
  id: string;
  title: string;
  description?: string | null;
  priceMinor: number;
  pattern: string;
  tone: string;
  formality: string;
  coverage: string;
  department: string;
  seller: { businessName: string; location?: string | null; ratingAverage: number | string; ratingCount: number; salesCount: number };
  images: Image[];
  variants: Variant[];
  rootCategory?: { name: string };
  subStyle?: { name: string } | null;
}

function pkrFormat(paisa: number) {
  return `PKR ${(paisa / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [tryOnVisible, setTryOnVisible] = useState(false);

  useEffect(() => {
    if (!id) return;
    getProduct(id)
      .then((p) => { setProduct(p); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-spin">✨</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-gray-500 mb-4">Product not found.</p>
          <button onClick={() => nav(-1)} className="text-rose-500">Go back</button>
        </div>
      </div>
    );
  }

  const inStock = product.variants.some((v) => v.stockQty > 0);
  const selectedVariantObj = product.variants.find((v) => v.id === selectedVariant);

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto">
      {/* Back nav */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 px-4 pt-12 pb-3 border-b border-gray-100">
        <button onClick={() => nav(-1)} className="text-gray-500 text-sm">← Back</button>
      </div>

      {/* Image gallery */}
      <div className="aspect-square bg-gray-100 overflow-hidden">
        {product.images.length > 0 ? (
          <img
            src={product.images[selectedImage]?.url ?? product.images[0].url}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
            Photo coming soon
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {product.images.length > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto">
          {product.images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setSelectedImage(i)}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                i === selectedImage ? 'border-rose-500' : 'border-transparent'
              }`}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="px-4 pb-32">
        {/* Title & price */}
        <div className="py-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-lg font-bold text-gray-900 leading-snug">{product.title}</h1>
          </div>
          <p className="text-2xl font-black text-rose-600 mt-1">{pkrFormat(product.priceMinor)}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {[product.rootCategory?.name, product.subStyle?.name, product.formality.toLowerCase().replace('_', ' ')].filter(Boolean).map((tag) => (
              <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">{tag}</span>
            ))}
          </div>
        </div>

        {/* Seller — always visible (CLAUDE.md constraint #5) */}
        <div className="py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Seller</p>
          <SellerBadge
            name={product.seller.businessName}
            location={product.seller.location}
            rating={product.seller.ratingAverage}
            ratingCount={product.seller.ratingCount}
            salesCount={product.seller.salesCount}
          />
        </div>

        {/* Size / variant picker */}
        {product.variants.length > 0 && (
          <div className="py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Select size</p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariant(v.id === selectedVariant ? null : v.id)}
                  disabled={v.stockQty === 0}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    v.id === selectedVariant
                      ? 'bg-rose-500 text-white border-rose-500'
                      : v.stockQty === 0
                      ? 'bg-gray-50 text-gray-300 border-gray-200 line-through cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-200 active:scale-95'
                  }`}
                >
                  {v.size}
                  {v.stockQty <= 2 && v.stockQty > 0 && (
                    <span className="ml-1 text-amber-500 text-xs">({v.stockQty} left)</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {product.description && (
          <div className="py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">About this item</p>
            <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
          </div>
        )}

        {/* Try-on — only on product detail, never during swiping (CLAUDE.md constraint #6) */}
        <div className="py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Virtual try-on</p>
          {!tryOnVisible ? (
            <button
              onClick={() => setTryOnVisible(true)}
              className="w-full border-2 border-dashed border-rose-200 text-rose-400 rounded-xl py-4 text-sm font-medium active:scale-95 transition-transform"
            >
              👗 Try this on — see how it looks on you
            </button>
          ) : (
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-center">
              <p className="text-2xl mb-2">🚧</p>
              <p className="text-sm font-medium text-rose-700">Virtual try-on coming soon</p>
              <p className="text-xs text-rose-500 mt-1">
                We're integrating a real try-on service. This feature will let you see how this exact item looks on your photo.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 px-4 py-4 pb-8">
        {!inStock ? (
          <button disabled className="w-full bg-gray-200 text-gray-400 rounded-2xl py-4 font-bold text-base cursor-not-allowed">
            Out of stock
          </button>
        ) : (
          <button
            onClick={() => alert('Order intent captured! Payment & fulfilment coming in a future milestone.')}
            disabled={product.variants.length > 0 && !selectedVariant}
            className="w-full bg-rose-500 text-white rounded-2xl py-4 font-bold text-base shadow-md active:scale-95 transition-transform disabled:opacity-40"
          >
            {product.variants.length > 0 && !selectedVariant
              ? 'Select a size first'
              : `Contact seller · ${pkrFormat(product.priceMinor)}`}
          </button>
        )}
        {selectedVariantObj && (
          <p className="text-center text-xs text-gray-400 mt-2">
            Size {selectedVariantObj.size} · {selectedVariantObj.stockQty} in stock
          </p>
        )}
      </div>
    </div>
  );
}
