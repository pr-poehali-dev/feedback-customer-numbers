import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { navItems } from './types';

interface Props {
  onOpenForm: () => void;
  onOpenMembers?: () => void;
  onOpenInstall?: () => void;
}

const AppHeader = ({ onOpenForm, onOpenMembers, onOpenInstall }: Props) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (id: string) => {
    setMenuOpen(false);
    if (id === 'members') {
      onOpenMembers?.();
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const share = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: 'Микс Строй — проверка номеров заказчиков', url });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: 'Ссылка скопирована!', description: 'Отправьте её друзьям или коллегам.' });
    }
  };

  return (
    <header className="relative z-20 sticky top-0 glass">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <a href="#check" className="flex items-center gap-2">
          <img src="https://cdn.poehali.dev/projects/13876108-688c-474f-aed7-7b67d3d10ce5/bucket/6ed778f2-1ce5-40cd-a17c-c3ce71ce45ad.jpeg" alt="Микс Строй" className="w-9 h-9 rounded-xl object-cover" />
          <span className="font-display font-bold text-lg tracking-tight">Микс <span className="text-primary">Строй</span></span>
        </a>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => handleNav(item.id)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-2">
              <Icon name={item.icon} size={15} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button onClick={onOpenForm} size="sm" variant="outline" className="rounded-lg font-medium">
            <Icon name="Plus" size={15} />
            <span className="hidden sm:inline">Отзыв</span>
          </Button>
          <Button size="sm" variant="outline" className="rounded-lg font-medium" onClick={share}>
            <Icon name="Share2" size={15} />
            <span className="hidden sm:inline">Поделиться</span>
          </Button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Меню"
          >
            <Icon name={menuOpen ? 'X' : 'Menu'} size={22} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="md:hidden border-t border-border px-4 py-2 flex flex-col gap-1 animate-fade-up">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => handleNav(item.id)} className="px-3 py-3 rounded-lg text-sm text-left text-foreground hover:bg-secondary transition-colors flex items-center gap-3">
              <Icon name={item.icon} size={18} className="text-primary" />
              {item.label}
            </button>
          ))}
          {onOpenInstall && (
            <button onClick={() => { setMenuOpen(false); onOpenInstall(); }} className="px-3 py-3 rounded-lg text-sm text-left text-foreground hover:bg-secondary transition-colors flex items-center gap-3 border-t border-border mt-1 pt-3">
              <Icon name="Smartphone" size={18} className="text-primary" />
              Установить приложение
            </button>
          )}
        </nav>
      )}
    </header>
  );
};

export default AppHeader;