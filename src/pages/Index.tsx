import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

const API = 'https://functions.poehali.dev/f89f476c-1066-4f2b-b1fa-53c7e98cfd2f';

type Verdict = 'safe' | 'risky' | 'scam';

interface NumberRecord {
  phone: string;
  rating: number;
  reviews: number;
  verdict: Verdict;
  tags: string[];
  lastReview: string;
}

const verdictMeta: Record<Verdict, { label: string; color: string; icon: string }> = {
  safe: { label: 'Надёжный', color: 'text-success', icon: 'ShieldCheck' },
  risky: { label: 'Осторожно', color: 'text-warning', icon: 'ShieldAlert' },
  scam: { label: 'Мошенник', color: 'text-destructive', icon: 'ShieldX' },
};

const navItems = [
  { id: 'check', label: 'Проверка', icon: 'Search' },
  { id: 'reviews', label: 'Отзывы', icon: 'MessageSquare' },
  { id: 'stats', label: 'Рейтинги', icon: 'BarChart3' },
  { id: 'support', label: 'Контакты', icon: 'LifeBuoy' },
];

const renderStars = (rating: number, size = 14) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Icon key={i} name="Star" size={size} className={i <= Math.round(rating) ? 'text-warning fill-warning' : 'text-muted'} />
    ))}
  </div>
);

const ReviewForm = ({ defaultPhone, onDone }: { defaultPhone?: string; onDone: () => void }) => {
  const [phone, setPhone] = useState(defaultPhone || '');
  const [rating, setRating] = useState(5);
  const [author, setAuthor] = useState('');
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!phone.trim() || !comment.trim()) {
      toast({ title: 'Заполните номер и текст отзыва', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, rating, author, comment, tags }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Отзыв добавлен!', description: 'Спасибо, что помогаете сообществу.' });
        onDone();
      } else {
        toast({ title: data.error || 'Ошибка', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Не удалось отправить', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Номер телефона" className="font-mono" />
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Оценка:</span>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" onClick={() => setRating(i)}>
            <Icon name="Star" size={24} className={i <= rating ? 'text-warning fill-warning' : 'text-muted'} />
          </button>
        ))}
      </div>
      <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Ваше имя (необязательно)" />
      <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Теги через запятую: Платит вовремя, Адекватный" />
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Опишите опыт работы с заказчиком..." rows={4} />
      <Button onClick={submit} disabled={loading} className="w-full rounded-xl font-semibold">
        {loading ? 'Отправка...' : 'Опубликовать отзыв'}
      </Button>
    </div>
  );
};

const Index = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<NumberRecord | null>(null);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [tracked, setTracked] = useState<string[]>([]);
  const [feed, setFeed] = useState<NumberRecord[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formPhone, setFormPhone] = useState<string | undefined>();

  const loadFeed = async () => {
    try {
      const res = await fetch(API);
      const data = await res.json();
      setFeed(data.records || []);
    } catch {
      setFeed([]);
    }
  };

  useEffect(() => { loadFeed(); }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearched(true);
    try {
      const res = await fetch(`${API}?phone=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResult(data.found ? data.record : null);
    } catch {
      setResult(null);
    } finally {
      setSearching(false);
    }
  };

  const toggleTrack = (phone: string) => {
    const isTracked = tracked.includes(phone);
    setTracked((prev) => (isTracked ? prev.filter((p) => p !== phone) : [...prev, phone]));
    if (!isTracked) {
      toast({ title: 'Уведомления включены', description: `Сообщим о новых отзывах на ${phone}` });
    }
  };

  const openForm = (phone?: string) => { setFormPhone(phone); setFormOpen(true); };
  const afterSubmit = () => { setFormOpen(false); loadFeed(); if (query) handleSearch(); };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

      <header className="relative z-20 sticky top-0 glass">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <a href="#check" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center glow-primary">
              <Icon name="Radar" size={20} className="text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">Num<span className="text-primary">Check</span></span>
          </a>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-2">
                <Icon name={item.icon} size={15} />
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button onClick={() => openForm()} size="sm" variant="outline" className="rounded-lg font-medium">
              <Icon name="Plus" size={15} />
              <span className="hidden sm:inline">Отзыв</span>
            </Button>
            <Button size="sm" className="rounded-lg font-medium">
              <Icon name="Bell" size={15} />
              {tracked.length > 0 && <span className="ml-1">{tracked.length}</span>}
            </Button>
          </div>
        </div>
      </header>

      <section id="check" className="relative z-10 container mx-auto px-4 pt-20 pb-16 text-center">
        <div className="animate-fade-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-muted-foreground mb-8">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse-ring" />
          Живая база отзывов о заказчиках
        </div>
        <h1 className="animate-fade-up text-4xl md:text-6xl font-display font-bold tracking-tight mb-5" style={{ animationDelay: '0.05s' }}>
          Проверь заказчика<br /><span className="text-primary text-glow">за 1 секунду</span>
        </h1>
        <p className="animate-fade-up text-muted-foreground max-w-xl mx-auto mb-10 text-lg" style={{ animationDelay: '0.1s' }}>
          Узнай рейтинг и отзывы о номере до начала работы. Защити себя от мошенников и неплатёжеспособных клиентов.
        </p>

        <div className="animate-fade-up max-w-xl mx-auto" style={{ animationDelay: '0.15s' }}>
          <div className="glass rounded-2xl p-2 flex items-center gap-2">
            <Icon name="Search" size={20} className="text-muted-foreground ml-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Введите номер телефона..."
              className="flex-1 bg-transparent outline-none font-mono text-base placeholder:text-muted-foreground"
            />
            <Button onClick={handleSearch} disabled={searching} className="rounded-xl px-6 font-semibold">
              {searching ? '...' : 'Проверить'}
            </Button>
          </div>
        </div>

        {searched && (
          <div className="animate-fade-up max-w-xl mx-auto mt-8">
            {result ? (
              <div className="glass rounded-2xl p-6 text-left">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-mono text-xl font-bold">{result.phone}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {renderStars(result.rating)}
                      <span className="text-sm text-muted-foreground">{result.rating} · {result.reviews} отзывов</span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary ${verdictMeta[result.verdict].color}`}>
                    <Icon name={verdictMeta[result.verdict].icon} size={16} />
                    <span className="text-sm font-semibold">{verdictMeta[result.verdict].label}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {result.tags.map((t) => (
                    <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">{t}</span>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic border-l-2 border-primary pl-3">«{result.lastReview}»</p>
                <div className="flex gap-2 mt-4">
                  <Button onClick={() => toggleTrack(result.phone)} variant={tracked.includes(result.phone) ? 'secondary' : 'outline'} className="flex-1 rounded-xl">
                    <Icon name={tracked.includes(result.phone) ? 'BellRing' : 'Bell'} size={16} />
                    {tracked.includes(result.phone) ? 'Отслеживается' : 'Следить'}
                  </Button>
                  <Button onClick={() => openForm(result.phone)} className="flex-1 rounded-xl">
                    <Icon name="Plus" size={16} />Оставить отзыв
                  </Button>
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl p-6 text-center">
                <Icon name="SearchX" size={32} className="text-muted-foreground mx-auto mb-2" />
                <p className="font-medium">Номер пока не в базе</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Станьте первым, кто оставит отзыв о нём.</p>
                <Button onClick={() => openForm(query)} className="rounded-xl"><Icon name="Plus" size={16} />Добавить отзыв</Button>
              </div>
            )}
          </div>
        )}
      </section>

      <section id="reviews" className="relative z-10 container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Icon name="MessageSquare" size={24} className="text-primary" />
            <h2 className="text-2xl font-display font-bold">Свежие отзывы</h2>
          </div>
          <Button onClick={() => openForm()} variant="outline" className="rounded-xl"><Icon name="Plus" size={16} />Добавить</Button>
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

      <section id="support" className="relative z-10 container mx-auto px-4 py-16">
        <div className="glass rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto">
          <Icon name="LifeBuoy" size={32} className="text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold mb-3">Нужна помощь?</h2>
          <p className="text-muted-foreground mb-6">Свяжитесь с нашей поддержкой — ответим в течение дня и поможем разобраться с любым номером.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button className="rounded-xl"><Icon name="Mail" size={16} />Написать на почту</Button>
            <Button variant="outline" className="rounded-xl"><Icon name="Send" size={16} />Telegram</Button>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 NumCheck — проверка номеров заказчиков</p>
      </footer>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="font-display">Оставить отзыв о номере</DialogTitle>
          </DialogHeader>
          <ReviewForm defaultPhone={formPhone} onDone={afterSubmit} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
