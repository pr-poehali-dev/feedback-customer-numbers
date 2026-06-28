import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { API, NumberRecord, verdictMeta } from './types';
import MaskedPhone from './MaskedPhone';

const formatDate = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const renderStars = (rating: number) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Icon key={i} name="Star" size={13} className={i <= Math.round(rating) ? 'text-warning fill-warning' : 'text-muted'} />
    ))}
  </div>
);

interface Props {
  refreshKey: number;
  onCount?: (count: number) => void;
}

type SortKey = 'fresh' | 'scam' | 'best';

const SORT_OPTIONS: { key: SortKey; label: string; icon: string }[] = [
  { key: 'fresh', label: 'Сначала свежие', icon: 'Clock' },
  { key: 'scam', label: 'Сначала мошенники', icon: 'ShieldX' },
  { key: 'best', label: 'По рейтингу', icon: 'Star' },
];

const lastReviewTime = (r: NumberRecord) => {
  const dates = (r.reviewList || []).map((rv) => (rv.createdAt ? new Date(rv.createdAt).getTime() : 0));
  return dates.length ? Math.max(...dates) : 0;
};

const verdictWeight = (v: NumberRecord['verdict']) => (v === 'scam' ? 0 : v === 'risky' ? 1 : 2);

const AllReviewsSection = ({ refreshKey, onCount }: Props) => {
  const [records, setRecords] = useState<NumberRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('fresh');
  const [open, setOpen] = useState(false);
  const PAGE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  useEffect(() => { setVisibleCount(PAGE); }, [search, sort]);

  const reload = (showLoader = false) => {
    if (showLoader) setLoading(true);
    fetch(API)
      .then((r) => r.json())
      .then((data) => {
        setRecords(data.records || []);
        if (typeof data.totalReviews === 'number') setTotalCount(data.totalReviews);
      })
      .catch(() => { if (showLoader) setRecords([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload(true);
  }, [refreshKey]);

  useEffect(() => {
    // Тихое автообновление: раз в 2 минуты и при возврате на вкладку
    const tick = () => { if (!document.hidden) reload(false); };
    const interval = setInterval(tick, 120000);
    const onVisible = () => { if (!document.hidden) reload(false); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  useEffect(() => {
    const handler = () => {
      setOpen(true);
      setTimeout(() => document.getElementById('all-reviews')?.scrollIntoView({ behavior: 'smooth' }), 50);
    };
    window.addEventListener('open-all-reviews', handler);
    return () => window.removeEventListener('open-all-reviews', handler);
  }, []);

  useEffect(() => {
    if (loading || records.length === 0) return;
    const m = window.location.hash.match(/#review-(\d+)/);
    if (!m) return;
    const targetId = Number(m[1]);

    setOpen(true);
    setSearch('');
    setSort('fresh');

    const idx = records.findIndex((r) => (r.reviewList || []).some((rv) => rv.id === targetId));
    if (idx >= 0) setVisibleCount((v) => Math.max(v, idx + 1));

    setHighlightId(targetId);
    setTimeout(() => {
      document.getElementById(`review-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 250);
    const t = setTimeout(() => setHighlightId(null), 4000);

    history.replaceState(null, '', window.location.pathname + '#all-reviews');
    return () => clearTimeout(t);
  }, [loading, records]);

  const filtered = records
    .filter((r) => r.phone.replace(/\D/g, '').includes(search.replace(/\D/g, '')))
    .slice()
    .sort((a, b) => {
      if (sort === 'fresh') return lastReviewTime(b) - lastReviewTime(a);
      if (sort === 'scam') return verdictWeight(a.verdict) - verdictWeight(b.verdict);
      return b.rating - a.rating;
    });
  const totalReviews = totalCount ?? records.reduce((sum, r) => sum + (r.reviewList?.length || 0), 0);

  useEffect(() => {
    if (!loading) onCount?.(totalReviews);
  }, [loading, totalReviews, onCount]);

  return (
    <section id="all-reviews" className="relative z-10 container mx-auto px-4 py-12 max-w-2xl">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 mb-2 text-left"
      >
        <div className="flex items-center gap-2">
          <Icon name="MessagesSquare" size={22} className="text-primary" />
          <h2 className="text-2xl font-display font-bold tracking-tight">Оставленные отзывы</h2>
        </div>
        <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={22} className="text-muted-foreground shrink-0" />
      </button>
      <p className="text-sm text-muted-foreground mb-5">
        Все отзывы о заказчиках, которые оставили участники {!loading && `· ${totalReviews}`}
      </p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="glass rounded-xl w-full p-4 flex items-center justify-center gap-2 text-sm font-medium text-primary hover:bg-secondary/40 transition-colors"
        >
          <Icon name="Eye" size={16} />
          Показать все отзывы
        </button>
      ) : (
        <>
      <div className="glass rounded-xl p-2 flex items-center gap-2 mb-5">
        <Icon name="Search" size={18} className="text-muted-foreground ml-2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по номеру заказчика..."
          className="border-0 bg-transparent font-mono focus-visible:ring-0"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSort(opt.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              sort === opt.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon name={opt.icon} size={13} />
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Загрузка...</p>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center">
          <Icon name="SearchX" size={32} className="text-muted-foreground mx-auto mb-2" />
          <p className="font-medium">Отзывов пока нет</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.slice(0, visibleCount).map((rec) => (
            <div key={rec.phone} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <MaskedPhone phone={rec.phone} className="font-mono text-lg font-bold" />
                  <div className="flex items-center gap-2 mt-1">
                    {renderStars(rec.rating)}
                    <span className="text-xs text-muted-foreground">{rec.rating} · {rec.reviews} отзывов</span>
                  </div>
                </div>
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary shrink-0 ${verdictMeta[rec.verdict].color}`}>
                  <Icon name={verdictMeta[rec.verdict].icon} size={14} />
                  <span className="text-xs font-semibold">{verdictMeta[rec.verdict].label}</span>
                </div>
              </div>

              <div className="space-y-2">
                {(rec.reviewList || []).map((rv, i) => (
                  <div
                    key={rv.id ?? i}
                    id={rv.id ? `review-${rv.id}` : undefined}
                    className={`rounded-xl p-3 transition-all duration-500 ${
                      highlightId && rv.id === highlightId
                        ? 'bg-primary/15 ring-2 ring-primary'
                        : 'bg-secondary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon name="User" size={13} className="text-muted-foreground shrink-0" />
                        <span className="text-sm font-semibold truncate">{rv.author}</span>
                        {rv.createdAt && (
                          <span className="text-xs text-muted-foreground shrink-0">{formatDate(rv.createdAt)}</span>
                        )}
                      </div>
                      {renderStars(rv.rating)}
                    </div>
                    {(rv.customerName || rv.objectAddress) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-1.5">
                        {rv.customerName && (
                          <span className="flex items-center gap-1"><Icon name="Briefcase" size={12} />{rv.customerName}</span>
                        )}
                        {rv.objectAddress && (
                          <span className="flex items-center gap-1"><Icon name="MapPin" size={12} />{rv.objectAddress}</span>
                        )}
                      </div>
                    )}
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">{rv.comment}</p>
                    {rv.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {rv.tags.map((t) => (
                          <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {visibleCount < filtered.length && (
            <button
              onClick={() => setVisibleCount((v) => v + PAGE)}
              className="glass rounded-xl w-full p-4 flex items-center justify-center gap-2 text-sm font-medium text-primary hover:bg-secondary/40 transition-colors"
            >
              <Icon name="ChevronDown" size={16} />
              Показать ещё ({filtered.length - visibleCount})
            </button>
          )}
        </div>
      )}
        </>
      )}
    </section>
  );
};

export default AllReviewsSection;