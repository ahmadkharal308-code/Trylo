import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { search, getTaxonomy } from '../lib/api';
import { clearToken } from '../lib/auth';
import ProductCard from '../components/ProductCard';

type Department = 'WOMEN' | 'MEN';

interface Category {
  id: string;
  name: string;
  slug: string;
  subStyles: Array<{ id: string; name: string; slug: string }>;
}

interface SearchResult {
  query: string;
  correctedQuery: string | null;
  taxonomy: { rootCategory: { id: string; name: string }; subStyle: { id: string; name: string } | null } | null;
  items: unknown[];
}

export default function HomePage() {
  const nav = useNavigate();
  const [department, setDepartment] = useState<Department>('WOMEN');
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [_searching, setSearching] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  useEffect(() => {
    getTaxonomy(department).then(setCategories).catch(() => {});
  }, [department]);

  async function doSearch(q: string) {
    if (!q.trim()) { setResults(null); return; }
    setSearching(true);
    try {
      const data = await search(q, department);
      setResults(data);
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }

  function startSwipe(categoryId?: string) {
    nav(`/swipe?department=${department}${categoryId ? `&categoryId=${categoryId}` : ''}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-black text-rose-600 tracking-tight">trylo</h1>
          <button onClick={() => { clearToken(); nav('/login'); }} className="text-xs text-gray-400">Sign out</button>
        </div>

        {/* Department toggle */}
        <div className="flex rounded-lg bg-gray-100 p-1 mb-3">
          {(['WOMEN', 'MEN'] as const).map((d) => (
            <button
              key={d}
              onClick={() => { setDepartment(d); setResults(null); setQuery(''); }}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                department === d ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              {d === 'WOMEN' ? "Women's" : "Men's"}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); doSearch(e.target.value); }}
            onFocus={() => setShowCategories(false)}
            placeholder={`Search ${department === 'WOMEN' ? "abayas, kameez, shoes…" : "kurta, shalwar, shoes…"}`}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>
      </header>

      <main className="flex-1 px-4 py-4">
        {/* Typo correction notice */}
        {results?.correctedQuery && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 text-sm">
            Showing results for <strong>{results.correctedQuery}</strong> — did you mean that?
          </div>
        )}

        {/* Category resolved */}
        {results?.taxonomy && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-500">Category:</span>
            <span className="bg-rose-100 text-rose-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {results.taxonomy.subStyle?.name ?? results.taxonomy.rootCategory.name}
            </span>
          </div>
        )}

        {/* Search results */}
        {results && (
          <div>
            {results.items.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-medium text-gray-600">No products found</p>
                <p className="text-sm mt-1">Try a different search or browse categories below</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {(results.items as Parameters<typeof ProductCard>[0]['product'][]).map((p) => (
                  <ProductCard key={(p as {id:string}).id} product={p} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Default state: category grid + swipe CTA */}
        {!results && (
          <>
            {/* Start swiping CTA */}
            <button
              onClick={() => startSwipe()}
              className="w-full bg-rose-500 text-white rounded-2xl py-4 font-bold text-base shadow-md active:scale-95 transition-transform mb-6"
            >
              ✨ Discover your style — start swiping
            </button>

            {/* Categories */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800 text-sm">Browse by category</h2>
              <button
                onClick={() => setShowCategories(!showCategories)}
                className="text-xs text-rose-500"
              >
                {showCategories ? 'Less' : 'See all'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(showCategories ? categories : categories.slice(0, 6)).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => startSwipe(cat.id)}
                  className="bg-white border border-gray-100 rounded-xl py-3 px-4 text-sm font-medium text-gray-700 text-left shadow-sm active:scale-95 transition-transform"
                >
                  {cat.name}
                  <span className="block text-xs text-gray-400 mt-0.5 font-normal">
                    {cat.subStyles.length} styles
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
