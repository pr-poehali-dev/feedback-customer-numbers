import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { NumberRecord, verdictMeta } from './types';
import MaskedPhone from './MaskedPhone';

interface Props {
  feed: NumberRecord[];
  onOpenForm: (phone?: string) => void;
}

const renderStars = (rating: number, size = 14) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Icon key={i} name="Star" size={size} className={i <= Math.round(rating) ? 'text-warning fill-warning' : 'text-muted'} />
    ))}
  </div>
);

const ReviewsSection = ({ feed, onOpenForm }: Props) => (
  <section id="reviews" className="relative z-10 container mx-auto px-4 py-16">
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <Icon name="MessageSquare" size={24} className="text-primary" />
        <h2 className="text-2xl font-display font-bold">Свежие отзывы</h2>
      </div>
      <Button onClick={() => onOpenForm()} variant="outline" className="rounded-xl"><Icon name="Plus" size={16} />Добавить</Button>
    </div>
    {feed.length === 0 ? (
      <p className="text-muted-foreground">Пока нет отзывов. Будьте первым!</p>
    ) : (
      <div className="grid md:grid-cols-2 gap-4">
        {feed.map((r) => (
          <div key={r.phone} className="glass rounded-2xl p-5 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <MaskedPhone phone={r.phone} className="font-mono font-semibold" />
              <div className={`flex items-center gap-1 text-xs ${verdictMeta[r.verdict].color}`}>
                <Icon name={verdictMeta[r.verdict].icon} size={14} />
                {verdictMeta[r.verdict].label}
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">{renderStars(r.rating)}<span className="text-xs text-muted-foreground">{r.reviews} отзывов</span></div>
            <p className="text-sm text-muted-foreground">«{r.lastReview}»</p>
          </div>
        ))}
      </div>
    )}
  </section>
);

export default ReviewsSection;