import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { navItems } from './types';

interface Props {
  onOpenForm: () => void;
}

const AppHeader = ({ onOpenForm }: Props) => (
  <header className="relative z-20 sticky top-0 glass">
    <div className="container mx-auto flex items-center justify-between h-16 px-4">
      <a href="#check" className="flex items-center gap-2">
        <img src="https://cdn.poehali.dev/projects/13876108-688c-474f-aed7-7b67d3d10ce5/bucket/6ed778f2-1ce5-40cd-a17c-c3ce71ce45ad.jpeg" alt="Микс Строй" className="w-9 h-9 rounded-xl object-cover" />
        <span className="font-display font-bold text-lg tracking-tight">Микс <span className="text-primary">Строй</span></span>
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
        <Button onClick={onOpenForm} size="sm" variant="outline" className="rounded-lg font-medium">
          <Icon name="Plus" size={15} />
          <span className="hidden sm:inline">Отзыв</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-lg font-medium"
          onClick={() => {
            const url = window.location.href;
            if (navigator.share) {
              navigator.share({ title: 'Микс Строй — проверка номеров заказчиков', url });
            } else {
              navigator.clipboard.writeText(url);
              toast({ title: 'Ссылка скопирована!', description: 'Отправьте её друзьям или коллегам.' });
            }
          }}
        >
          <Icon name="Share2" size={15} />
          <span className="hidden sm:inline">Поделиться</span>
        </Button>
      </div>
    </div>
  </header>
);

export default AppHeader;
