import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { API, NumberRecord, verdictMeta } from './types';

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
}

const AllReviewsSection = ({ refreshKey }: Props) => {
  const [records, setRecords] = useState<NumberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(API)
      .then((r) => r.json())
      .then((data) => setRecords(data.records || []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const filtered = records.filter((r) => r.phone.replace(/\D/g, '').includes(search.replace(/\D/g, '')));
  const totalReviews = records.reduce((sum, r) => sum + (r.reviewList?.length || 0), 0);

  return (
    <section id="all-reviews" className="relative z-10 container mx-auto px-4 py-12 max-w-2xl">
      <div className="flex items-center gap-2 mb-2">
        <Icon name="MessagesSquare" size={22} className="text-primary" />
        <h2 className="text-2xl font-display font-bold tracking-tight">Оставленные отзывы</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Все отзывы о заказчиках, которые оставили участники {!loading && `· ${totalReviews}`}
      </p>

      <div className="glass rounded-xl p-2 flex items-center gap-2 mb-5">
        <Icon name="Search" size={18} className="text-muted-foreground ml-2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по номеру заказчика..."
          className="border-0 bg-transparent font-mono focus-visible:ring-0"
        />
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
          {filtered.map((rec) => (
            <div key={rec.phone} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="font-mono text-lg font-bold truncate">{rec.phone}</p>
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
                  <div key={rv.id ?? i} className="rounded-xl bg-secondary/40 p-3">
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
        </div>
      )}
    </section>
  );
};

export default AllReviewsSection;
