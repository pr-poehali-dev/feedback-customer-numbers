import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

import AppHeader from '@/components/app/AppHeader';
import CheckSection from '@/components/app/CheckSection';
import ChatSection from '@/components/app/ChatSection';
import ReviewForm from '@/components/app/ReviewForm';
import MembersSection from '@/components/app/MembersSection';
import ParticipantGate, { Participant } from '@/components/app/ParticipantGate';
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
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
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
          body: JSON.stringify({ text: textToSend, user_name: participant?.full_name }),
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
    <ParticipantGate onReady={setParticipant}>
      {((requireParticipant: (action: () => void) => void, p: Participant | null) => (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

      <AppHeader
        onOpenForm={() => requireParticipant(() => setFormOpen(true))}
        onOpenMembers={() => {
          setShowMembers(true);
          setTimeout(() => document.getElementById('members')?.scrollIntoView({ behavior: 'smooth' }), 50);
        }}
        onOpenInstall={isStandalone ? undefined : () => setInstallHelpOpen(true)}
      />

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
        onOpenForm={(phone) => requireParticipant(() => { setFormPhone(phone); setFormOpen(true); })}
        onCloseHint={closeHint}
      />

      {showMembers && (
        <MembersSection
          onClose={() => setShowMembers(false)}
          canManage={!!p && p.phone.replace(/\D/g, '').slice(-10) === '9652000177'}
        />
      )}

      <ChatSection
        user={p ? { id: p.id, email: p.phone, name: p.full_name } : null}
        messages={messages}
        chatText={chatText}
        chatSending={chatSending}
        setChatText={setChatText}
        sendMessage={sendMessage}
        onOpenAuth={() => {}}
        chatEndRef={chatEndRef}
        onRequireParticipant={requireParticipant}
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

      <Dialog open={installHelpOpen} onOpenChange={setInstallHelpOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="Smartphone" size={20} className="text-primary" />
              Установить приложение
            </DialogTitle>
          </DialogHeader>
          {isIos ? (
            <div className="space-y-3 pt-1">
              <p className="text-sm text-muted-foreground">Чтобы приложение появилось на главном экране iPhone:</p>
              <div className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                <span>Нажмите значок <Icon name="Share2" size={15} className="inline text-primary -mt-0.5" /> «Поделиться» внизу браузера Safari</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                <span>Пролистайте и выберите «На экран „Домой“»</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                <span>Нажмите «Добавить» в правом верхнем углу</span>
              </div>
            </div>
          ) : installPrompt ? (
            <div className="space-y-3 pt-1">
              <p className="text-sm text-muted-foreground">Нажмите кнопку — приложение установится на ваш телефон.</p>
              <Button onClick={() => { handleInstall(); setInstallHelpOpen(false); }} className="w-full rounded-lg">
                <Icon name="Download" size={16} />
                Установить на телефон
              </Button>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <p className="text-sm text-muted-foreground">Чтобы добавить приложение на телефон:</p>
              <div className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                <span>Откройте меню браузера <Icon name="EllipsisVertical" size={15} className="inline text-primary -mt-0.5" /> (три точки вверху справа)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                <span>Выберите «Установить приложение» или «Добавить на главный экран»</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {!installBannerClosed && !isStandalone && (installPrompt || isIos) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm animate-fade-up">
          <div className="glass rounded-2xl p-4 glow-primary relative">
            <button onClick={closeInstallBanner} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1">
              <Icon name="X" size={18} />
            </button>
            <div className="flex items-center gap-3 pr-6">
              <img
                src="https://cdn.poehali.dev/projects/13876108-688c-474f-aed7-7b67d3d10ce5/bucket/6ed778f2-1ce5-40cd-a17c-c3ce71ce45ad.jpeg"
                alt="Микс Строй"
                className="w-11 h-11 rounded-xl shrink-0 object-cover"
              />
              <p className="font-semibold text-sm">Установить приложение «Микс Строй»</p>
            </div>

            {isIos ? (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="w-5 h-5 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                  <span className="text-muted-foreground">Нажмите значок <Icon name="Share2" size={13} className="inline text-primary -mt-0.5" /> «Поделиться» внизу браузера</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="w-5 h-5 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                  <span className="text-muted-foreground">Выберите «На экран „Домой“»</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="w-5 h-5 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                  <span className="text-muted-foreground">Нажмите «Добавить»</span>
                </div>
              </div>
            ) : (
              <Button size="sm" onClick={handleInstall} className="rounded-lg text-sm w-full mt-3">
                <Icon name="Download" size={15} />
                Установить на телефон
              </Button>
            )}
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
      )) as unknown as React.ReactNode}
    </ParticipantGate>
  );
};

export default Index;