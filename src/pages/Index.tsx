import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

import AppHeader from '@/components/app/AppHeader';
import CheckSection from '@/components/app/CheckSection';
import ChatSection from '@/components/app/ChatSection';
import ReviewForm from '@/components/app/ReviewForm';
import { API, CHAT_API, NumberRecord, ChatMessage } from '@/components/app/types';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Index = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<NumberRecord | null>(null);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [tracked, setTracked] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formPhone, setFormPhone] = useState<string | undefined>();
  const [hintClosed, setHintClosed] = useState(() => !!localStorage.getItem('numcheck_hint_closed'));
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [installBannerClosed, setInstallBannerClosed] = useState(() => !!localStorage.getItem('numcheck_install_closed'));
  const [isIos] = useState(() => /iphone|ipad|ipod/i.test(navigator.userAgent));
  const [isStandalone] = useState(() => window.matchMedia('(display-mode: standalone)').matches);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    (installPrompt as BeforeInstallPromptEvent).prompt();
    const { outcome } = await (installPrompt as BeforeInstallPromptEvent).userChoice;
    if (outcome === 'accepted') { setInstallPrompt(null); closeInstallBanner(); }
  };

  const closeInstallBanner = () => { localStorage.setItem('numcheck_install_closed', '1'); setInstallBannerClosed(true); };

  const loadMessages = async () => {
    try {
      const res = await fetch(CHAT_API);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch { /* тихо */ }
  };

  const sendMessage = async () => {
    if (!chatText.trim()) return;
    setChatSending(true);
    const textToSend = chatText.trim();
    setChatText('');

    // До 3 попыток при нестабильной сети
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(CHAT_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToSend }),
        });
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
          setTimeout(() => {
            const container = chatEndRef.current?.parentElement;
            if (container) container.scrollTop = container.scrollHeight;
          }, 50);
        } else {
          toast({ title: data.error || 'Ошибка', variant: 'destructive' });
        }
        setChatSending(false);
        return;
      } catch {
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        setChatText(textToSend);
        toast({ title: 'Нет связи с сервером', description: 'Проверьте интернет и попробуйте снова', variant: 'destructive' });
      }
    }
    setChatSending(false);
  };

  useEffect(() => {
    // При открытии страница всегда сверху, не прыгает к чату/подвалу
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    loadMessages();
  }, []);

  useEffect(() => {
    // Опрашиваем только когда вкладка активна — экономим вызовы
    const interval = setInterval(() => {
      if (!document.hidden) loadMessages();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

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

  const afterSubmit = () => { setFormOpen(false); if (query) handleSearch(); };
  const closeHint = () => { localStorage.setItem('numcheck_hint_closed', '1'); setHintClosed(true); };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

      <AppHeader onOpenForm={() => { setFormOpen(true); }} />

      <CheckSection
        query={query}
        setQuery={setQuery}
        result={result}
        searched={searched}
        searching={searching}
        hintClosed={hintClosed}
        tracked={tracked}
        onSearch={handleSearch}
        onToggleTrack={toggleTrack}
        onOpenForm={(phone) => { setFormPhone(phone); setFormOpen(true); }}
        onCloseHint={closeHint}
      />

      <ChatSection
        user={null}
        messages={messages}
        chatText={chatText}
        chatSending={chatSending}
        setChatText={setChatText}
        sendMessage={sendMessage}
        onOpenAuth={() => {}}
        chatEndRef={chatEndRef}
      />

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
        <p>© 2026 Микс Строй — проверка номеров заказчиков</p>
      </footer>

      {!installBannerClosed && !isStandalone && (installPrompt || isIos) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm animate-fade-up">
          <div className="glass rounded-2xl p-4 glow-primary flex items-center gap-4">
            <img
              src="https://cdn.poehali.dev/projects/13876108-688c-474f-aed7-7b67d3d10ce5/bucket/6ed778f2-1ce5-40cd-a17c-c3ce71ce45ad.jpeg"
              alt="Микс Строй"
              className="w-12 h-12 rounded-xl shrink-0 object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Установить Микс Строй</p>
              {isIos ? (
                <p className="text-xs text-muted-foreground mt-0.5">Нажмите <Icon name="Share2" size={11} className="inline" /> → «На экран Домой»</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">Добавить на рабочий стол</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isIos && (
                <Button size="sm" onClick={handleInstall} className="rounded-lg text-xs px-3">
                  Установить
                </Button>
              )}
              <button onClick={closeInstallBanner} className="text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="X" size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

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