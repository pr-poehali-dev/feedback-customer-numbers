import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';

type Verdict = 'safe' | 'risky' | 'scam';

interface NumberRecord {
  phone: string;
  rating: number;
  reviews: number;
  verdict: Verdict;
  tags: string[];
  lastReview: string;
}

const DATABASE: NumberRecord[] = [
  { phone: '+7 (912) 345-67-89', rating: 4.7, reviews: 128, verdict: 'safe', tags: ['Платит вовремя', 'Адекватный'], lastReview: 'Отличный заказчик, оплата без задержек.' },
  { phone: '+7 (903) 222-11-00', rating: 2.1, reviews: 64, verdict: 'risky', tags: ['Задержки оплаты', 'Меняет ТЗ'], lastReview: 'Долго тянул с оплатой, в итоге заплатил не всё.' },
  { phone: '+7 (495) 777-88-99', rating: 1.2, reviews: 211, verdict: 'scam', tags: ['Не платит', 'Кидала'], lastReview: 'Пропал после сдачи работы. Деньги не отдал.' },
  { phone: '+7 (921) 100-50-30', rating: 4.9, reviews: 342, verdict: 'safe', tags: ['Топ заказчик', 'Рекомендую'], lastReview: 'Работаю не первый раз — всё чётко.' },
];

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

const Index = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<NumberRecord | null>(null);
  const [searched, setSearched] = useState(false);
  const [tracked, setTracked] = useState<string[]>([]);

  const handleSearch = () => {
    if (!query.trim()) return;
    const digits = query.replace(/\D/g, '');
    const found = DATABASE.find((r) => r.phone.replace(/\D/g, '').includes(digits.slice(-7)) && digits.length >= 4);
    setResult(found || null);
    setSearched(true);
  };

  const toggleTrack = (phone: string) => {
    setTracked((prev) => (prev.includes(phone) ? prev.filter((p) => p !== phone) : [...prev, phone]));
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="Star" size={14} className={i <= Math.round(rating) ? 'text-warning fill-warning' : 'text-muted'} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

      {/* Header */}
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
          <Button size="sm" className="rounded-lg font-medium">
            <Icon name="Bell" size={15} />
            {tracked.length > 0 && <span className="ml-1">{tracked.length}</span>}
          </Button>
        </div>
      </header>

      {/* Hero / Check */}
      <section id="check" className="relative z-10 container mx-auto px-4 pt-20 pb-16 text-center">
        <div className="animate-fade-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-muted-foreground mb-8">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse-ring" />
          База из 48 920 проверенных номеров
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
            <Button onClick={handleSearch} className="rounded-xl px-6 font-semibold">Проверить</Button>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-4 text-xs text-muted-foreground">
            <span>Попробуйте:</span>
            {DATABASE.slice(0, 2).map((r) => (
              <button key={r.phone} onClick={() => { setQuery(r.phone); }} className="font-mono hover:text-primary transition-colors underline underline-offset-2">{r.phone}</button>
            ))}
          </div>
        </div>

        {/* Result */}
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
                <Button onClick={() => toggleTrack(result.phone)} variant={tracked.includes(result.phone) ? 'secondary' : 'outline'} className="w-full mt-4 rounded-xl">
                  <Icon name={tracked.includes(result.phone) ? 'BellRing' : 'Bell'} size={16} />
                  {tracked.includes(result.phone) ? 'Отслеживается — уведомим о новых отзывах' : 'Следить за новыми отзывами'}
                </Button>
              </div>
            ) : (
              <div className="glass rounded-2xl p-6 text-center">
                <Icon name="SearchX" size={32} className="text-muted-foreground mx-auto mb-2" />
                <p className="font-medium">Номер пока не в базе</p>
                <p className="text-sm text-muted-foreground mt-1">Станьте первым, кто оставит отзыв о нём.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Reviews */}
      <section id="reviews" className="relative z-10 container mx-auto px-4 py-16">
        <div className="flex items-center gap-3 mb-8">
          <Icon name="MessageSquare" size={24} className="text-primary" />
          <h2 className="text-2xl font-display font-bold">Свежие отзывы</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {DATABASE.map((r) => (
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
      </section>

      {/* Stats */}
      <section id="stats" className="relative z-10 container mx-auto px-4 py-16">
        <div className="flex items-center gap-3 mb-8">
          <Icon name="BarChart3" size={24} className="text-primary" />
          <h2 className="text-2xl font-display font-bold">Рейтинги и статистика</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Номеров в базе', value: '48 920', icon: 'Database' },
            { label: 'Отзывов оставлено', value: '127 K', icon: 'MessageSquare' },
            { label: 'Мошенников выявлено', value: '3 412', icon: 'ShieldX' },
            { label: 'Точность проверки', value: '98.6%', icon: 'Target' },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl p-6 text-center">
              <Icon name={s.icon} size={24} className="text-primary mx-auto mb-3" />
              <p className="text-3xl font-display font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Support */}
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
    </div>
  );
};

export default Index;
