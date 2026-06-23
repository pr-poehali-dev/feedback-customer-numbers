import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { NumberRecord, Member, verdictMeta } from './types';

interface Props {
  feed: NumberRecord[];
  members: Member[];
  onOpenForm: (phone?: string) => void;
}

const renderStars = (rating: number, size = 14) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Icon key={i} name="Star" size={size} className={i <= Math.round(rating) ? 'text-warning fill-warning' : 'text-muted'} />
    ))}
  </div>
);

const ReviewsSection = ({ feed, members, onOpenForm }: Props) => (
  <>
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
                <span className="font-mono font-semibold">{r.phone}</span>
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

    <section id="stats" className="relative z-10 container mx-auto px-4 py-16">
      <div className="flex items-center gap-3 mb-8">
        <Icon name="BarChart3" size={24} className="text-primary" />
        <h2 className="text-2xl font-display font-bold">Рейтинги и статистика</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Номеров в базе', value: feed.length, icon: 'Database' },
          { label: 'Отзывов всего', value: feed.reduce((s, r) => s + r.reviews, 0), icon: 'MessageSquare' },
          { label: 'Мошенников', value: feed.filter((r) => r.verdict === 'scam').length, icon: 'ShieldX' },
          { label: 'Надёжных', value: feed.filter((r) => r.verdict === 'safe').length, icon: 'ShieldCheck' },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-6 text-center">
            <Icon name={s.icon} size={24} className="text-primary mx-auto mb-3" />
            <p className="text-3xl font-display font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </section>

    <section id="members" className="relative z-10 container mx-auto px-4 py-16">
      <div className="flex items-center gap-3 mb-8">
        <Icon name="Users" size={24} className="text-primary" />
        <h2 className="text-2xl font-display font-bold">Участники</h2>
        <span className="text-sm text-muted-foreground ml-1">({members.length})</span>
      </div>
      {members.length === 0 ? (
        <p className="text-muted-foreground">Пока никто не зарегистрировался. Будьте первым!</p>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-5 px-5 py-3 text-xs text-muted-foreground border-b border-border font-semibold uppercase tracking-wide">
            <span>#</span>
            <span>ФИО</span>
            <span>Организация</span>
            <span>Направление</span>
            <span>Дата входа</span>
          </div>
          {members.map((m, i) => (
            <div key={m.id} className={`px-5 py-4 ${i !== members.length - 1 ? 'border-b border-border' : ''} hover:bg-secondary/30 transition-colors`}>
              <div className="hidden md:grid grid-cols-5 items-center gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {(m.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-muted-foreground">{i + 1}</span>
                </div>
                <p className="font-medium text-sm truncate">{m.name || 'Участник'}</p>
                <p className="text-sm text-muted-foreground truncate">{m.organization || '—'}</p>
                <p className="text-sm text-muted-foreground truncate">{m.work_direction || '—'}</p>
                <span className="text-sm text-muted-foreground">{m.joined}</span>
              </div>
              <div className="flex md:hidden items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                  {(m.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{m.name || 'Участник'}</p>
                  {m.organization && <p className="text-xs text-muted-foreground mt-0.5">{m.organization}</p>}
                  {m.work_direction && <p className="text-xs text-primary mt-0.5">{m.work_direction}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{m.joined}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  </>
);

export default ReviewsSection;
