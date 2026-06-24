import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { NumberRecord, verdictMeta } from './types';

interface Props {
  query: string;
  setQuery: (v: string) => void;
  result: NumberRecord | null;
  searched: boolean;
  searching: boolean;
  hintClosed: boolean;
  tracked: string[];
  onSearch: () => void;
  onToggleTrack: (phone: string) => void;
  onOpenForm: (phone?: string) => void;
  onCloseHint: () => void;
  onOpenInstall?: () => void;
}

const renderStars = (rating: number, size = 14) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Icon key={i} name="Star" size={size} className={i <= Math.round(rating) ? 'text-warning fill-warning' : 'text-muted'} />
    ))}
  </div>
);

const CheckSection = ({ query, setQuery, result, searched, searching, hintClosed, tracked, onSearch, onToggleTrack, onOpenForm, onCloseHint, onOpenInstall }: Props) => (
  <section id="check" className="relative z-10 container mx-auto px-4 pt-20 pb-16 text-center">
    <div className="animate-fade-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-muted-foreground mb-8">
      <span className="w-2 h-2 rounded-full bg-primary animate-pulse-ring" />
      Живая база отзывов о заказчиках
    </div>
    <h1 className="animate-fade-up text-4xl md:text-6xl font-display font-bold tracking-tight mb-5" style={{ animationDelay: '0.05s' }}>
      Микс Строй<br /><span className="text-primary text-glow">проверка номеров</span>
    </h1>
    <p className="animate-fade-up text-muted-foreground max-w-xl mx-auto mb-10 text-lg" style={{ animationDelay: '0.1s' }}>
      Узнай рейтинг и отзывы о номере до начала работы. Защити себя от мошенников и неплатёжеспособных клиентов.
    </p>



    {!hintClosed && (
      <div className="animate-fade-up max-w-2xl mx-auto mb-8" style={{ animationDelay: '0.2s' }}>
        <div className="glass rounded-2xl p-5 relative">
          <button onClick={onCloseHint} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={16} />
          </button>
          <p className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
            <Icon name="Lightbulb" size={16} />
            Как пользоваться NumCheck
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            {[
              { icon: 'Search', step: '1', title: 'Введите номер', desc: 'Вставьте телефон заказчика в строку поиска и нажмите «Проверить»' },
              { icon: 'ShieldCheck', step: '2', title: 'Смотрите результат', desc: 'Вы увидите рейтинг, вердикт и отзывы других исполнителей' },
              { icon: 'Plus', step: '3', title: 'Оставьте отзыв', desc: 'Поделитесь своим опытом — помогите другим не попасть на мошенника' },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon name={item.icon} size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={onCloseHint} className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
            Понятно, больше не показывать
          </button>
        </div>
      </div>
    )}

    <div className="animate-fade-up max-w-xl mx-auto mb-4" style={{ animationDelay: '0.13s' }}>
      <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-center">
        Проверить <span className="text-muted-foreground font-normal">или</span> <span className="text-primary">оставить отзыв</span>
      </h2>
    </div>

    <div className="animate-fade-up max-w-xl mx-auto" style={{ animationDelay: '0.15s' }}>
      <div className="glass rounded-2xl p-2 flex items-center gap-2">
        <Icon name="Search" size={20} className="text-muted-foreground ml-3" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          placeholder="Введите номер телефона..."
          className="flex-1 bg-transparent outline-none font-mono text-base placeholder:text-muted-foreground"
        />
        <Button onClick={onSearch} disabled={searching} className="rounded-xl px-6 font-semibold">
          {searching ? '...' : 'Проверить'}
        </Button>
      </div>
    </div>

    {onOpenInstall && (
      <button
        onClick={onOpenInstall}
        className="animate-fade-up max-w-xl mx-auto mt-4 w-full glass rounded-xl px-4 py-3 flex items-center gap-3 text-left hover:bg-secondary/40 transition-colors group"
        style={{ animationDelay: '0.18s' }}
      >
        <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Icon name="Smartphone" size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Установите приложение</p>
          <p className="text-xs text-muted-foreground">Проверяйте номера в один тап прямо с экрана телефона</p>
        </div>
        <Icon name="ChevronRight" size={18} className="text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </button>
    )}

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
              <Button onClick={() => onToggleTrack(result.phone)} variant={tracked.includes(result.phone) ? 'secondary' : 'outline'} className="flex-1 rounded-xl">
                <Icon name={tracked.includes(result.phone) ? 'BellRing' : 'Bell'} size={16} />
                {tracked.includes(result.phone) ? 'Отслеживается' : 'Следить'}
              </Button>
              <Button onClick={() => onOpenForm(result.phone)} className="flex-1 rounded-xl">
                <Icon name="Plus" size={16} />Оставить отзыв
              </Button>
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl p-6 text-center">
            <Icon name="SearchX" size={32} className="text-muted-foreground mx-auto mb-2" />
            <p className="font-medium">Номер пока не в базе</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Станьте первым, кто оставит отзыв о нём.</p>
            <Button onClick={() => onOpenForm(query)} className="rounded-xl"><Icon name="Plus" size={16} />Добавить отзыв</Button>
          </div>
        )}
      </div>
    )}
  </section>
);

export default CheckSection;