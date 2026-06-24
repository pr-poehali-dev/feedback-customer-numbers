import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { API, ReviewItem, verdictMeta } from './types';

interface MyReview extends ReviewItem {
  phone: string;
}

interface Props {
  myPhone: string;
  refreshKey: number;
  onEditReview: (rv: ReviewItem) => void;
  onDeleteReview: (rv: ReviewItem) => void;
}

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

const MyReviewsSection = ({ myPhone, refreshKey, onEditReview, onDeleteReview }: Props) => {
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!myPhone) { setReviews([]); setLoading(false); return; }
    setLoading(true);
    fetch(`${API}?mine=${encodeURIComponent(myPhone)}`)
      .then((r) => r.json())
      .then((data) => setReviews(data.reviews || []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [myPhone, refreshKey]);

  if (!myPhone) return null;

  return (
    <section id="my-reviews" className="relative z-10 container mx-auto px-4 py-12 max-w-2xl">
      <div className="flex items-center gap-2 mb-5">
        <Icon name="PenLine" size={22} className="text-primary" />
        <h2 className="text-2xl font-display font-bold tracking-tight">Мои отзывы</h2>
        {!loading && <span className="text-sm text-muted-foreground">· {reviews.length}</span>}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Загрузка...</p>
      ) : reviews.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center">
          <Icon name="MessageSquarePlus" size={32} className="text-muted-foreground mx-auto mb-2" />
          <p className="font-medium">Вы пока не оставили ни одного отзыва</p>
          <p className="text-sm text-muted-foreground mt-1">Проверьте номер заказчика и поделитесь опытом.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((rv) => (
            <div key={rv.id} className="glass rounded-xl p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon name="Phone" size={14} className="text-primary shrink-0" />
                  <span className="font-mono text-sm font-semibold truncate">{rv.phone}</span>
                  {rv.createdAt && (
                    <span className="text-xs text-muted-foreground shrink-0">{formatDate(rv.createdAt)}</span>
                  )}
                </div>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg bg-secondary text-xs ${verdictMeta[rv.verdict].color}`}>
                  <Icon name={verdictMeta[rv.verdict].icon} size={13} />
                  <span className="font-semibold">{verdictMeta[rv.verdict].label}</span>
                </div>
              </div>
              <div className="mb-2">{renderStars(rv.rating)}</div>
              {(rv.customerName || rv.objectAddress) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
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
              <div className="flex gap-2 mt-3">
                <Button onClick={() => onEditReview(rv)} variant="outline" size="sm" className="rounded-lg flex-1">
                  <Icon name="Pencil" size={14} />Редактировать
                </Button>
                <Button onClick={() => onDeleteReview(rv)} variant="ghost" size="sm" className="rounded-lg text-destructive hover:text-destructive">
                  <Icon name="Trash2" size={14} />Удалить
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default MyReviewsSection;
