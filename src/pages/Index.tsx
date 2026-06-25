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
import MyReviewsSection from '@/components/app/MyReviewsSection';
import AllReviewsSection from '@/components/app/AllReviewsSection';
import ParticipantGate, { Participant } from '@/components/app/ParticipantGate';
import { API, CHAT_API, NumberRecord, ChatMessage, ReviewItem } from '@/components/app/types';

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
  const [editReview, setEditReview] = useState<ReviewItem | undefined>();
  const [reviewsRefresh, setReviewsRefresh] = useState(0);
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
  const [unreadChat, setUnreadChat] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const chatVisibleRef = useRef(false);
  const lastSeenIdRef = useRef(0);
  const lastFetchedIdRef = useRef(0);
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
      const since = lastFetchedIdRef.current || 0;
      const res = await fetch(since ? `${CHAT_API}?since=${since}` : CHAT_API);
      const data = await res.json();

      // Лёгкий ответ: новых сообщений нет — только обновляем реакции и убираем удалённые
      if (data.unchanged) {
        const ids: number[] = data.ids || [];
        const reactionsMap: Record<string, ChatMessage['reactions']> = data.reactions || {};
        setMessages((prev) => {
          const idSet = new Set(ids);
          const next = prev
            .filter((m) => idSet.has(m.id))
            .map((m) => {
              const r = reactionsMap[String(m.id)] || [];
              if (JSON.stringify(m.reactions || []) === JSON.stringify(r)) return m;
              return { ...m, reactions: r };
            });
          if (next.length === prev.length && next.every((m, i) => m === prev[i])) return prev;
          return next;
        });
        if (chatVisibleRef.current) setUnreadChat(0);
        return;
      }

      const fresh: ChatMessage[] = data.messages || [];

      // Счётчик непрочитанных: считаем сообщения новее последнего просмотренного, пока чат не на экране
      const maxId = fresh.length ? Math.max(...fresh.map((m) => m.id)) : 0;
      lastFetchedIdRef.current = maxId;
      if (chatVisibleRef.current) {
        lastSeenIdRef.current = maxId;
        setUnreadChat(0);
      } else {
        const unread = fresh.filter((m) => m.id > lastSeenIdRef.current).length;
        setUnreadChat(unread);
      }

      setMessages((prev) => {
        // Обновляем состояние только при реальных изменениях — без лишних перерисовок и мигания
        if (prev.length === fresh.length) {
          let same = true;
          for (let i = 0; i < fresh.length; i++) {
            const a = prev[i];
            const b = fresh[i];
            if (
              a.id !== b.id ||
              a.text !== b.text ||
              JSON.stringify(a.reactions || []) !== JSON.stringify(b.reactions || [])
            ) { same = false; break; }
          }
          if (same) return prev;
        }
        // Если появилось новое сообщение и пользователь внизу чата — подскроллим
        const container = chatEndRef.current?.parentElement;
        const nearBottom = container
          ? container.scrollHeight - container.scrollTop - container.clientHeight < 120
          : false;
        if (fresh.length > prev.length && nearBottom) {
          setTimeout(() => { if (container) container.scrollTop = container.scrollHeight; }, 50);
        }
        return fresh;
      });
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
          body: JSON.stringify({ text: textToSend, user_name: participant?.full_name, phone: participant?.phone }),
        });
        const data = await res.json();
        if (data.message) {
          lastFetchedIdRef.current = Math.max(lastFetchedIdRef.current, data.message.id);
          lastSeenIdRef.current = Math.max(lastSeenIdRef.current, data.message.id);
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

  const deleteMessage = async (id: number) => {
    if (!participant) return;
    const prev = messages;
    setMessages((m) => m.filter((msg) => msg.id !== id));
    try {
      const res = await fetch(CHAT_API, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: id, phone: participant.phone, user_name: participant.full_name }),
      });
      const data = await res.json();
      if (!data.success) {
        setMessages(prev);
        toast({ title: data.error || 'Не удалось удалить', variant: 'destructive' });
      }
    } catch {
      setMessages(prev);
      toast({ title: 'Нет связи с сервером', variant: 'destructive' });
    }
  };

  const reactMessage = async (id: number, emoji: string) => {
    if (!participant) return;
    try {
      const res = await fetch(CHAT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'react', message_id: id, emoji, phone: participant.phone }),
      });
      const data = await res.json();
      if (data.message_id) {
        setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, reactions: data.reactions } : msg)));
      }
    } catch {
      toast({ title: 'Не удалось поставить реакцию', variant: 'destructive' });
    }
  };

  useEffect(() => {
    // При открытии страница всегда сверху, не прыгает к чату/подвалу
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    loadMessages();
  }, []);

  useEffect(() => {
    // Экономим вычислительное время: когда чат виден — опрос раз в минуту,
    // когда чат не на экране — раз в 5 минут (нужен только для значка непрочитанных).
    // Скрытая вкладка не опрашивается вообще.
    let lastFetch = 0;
    const tick = () => {
      if (document.hidden) return;
      const period = chatVisibleRef.current ? 120000 : 300000;
      if (Date.now() - lastFetch < period) return;
      lastFetch = Date.now();
      loadMessages();
    };
    const interval = setInterval(tick, 30000);

    const chatEl = document.getElementById('chat');
    const observer = new IntersectionObserver(
      ([entry]) => {
        chatVisibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) { setUnreadChat(0); loadMessages(); }
      },
      { threshold: 0.1 }
    );
    if (chatEl) observer.observe(chatEl);

    return () => { clearInterval(interval); observer.disconnect(); };
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

  const afterSubmit = () => { setFormOpen(false); setEditReview(undefined); setReviewsRefresh((v) => v + 1); if (query) handleSearch(); };

  const deleteReview = async (rv: ReviewItem) => {
    if (!rv.id) return;
    if (!window.confirm('Удалить ваш отзыв? Это действие нельзя отменить.')) return;
    try {
      const res = await fetch(API, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rv.id, author_phone: localStorage.getItem('ms_participant_phone') || '' }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Отзыв удалён' });
        setReviewsRefresh((v) => v + 1);
        if (query) handleSearch();
      } else {
        toast({ title: data.error || 'Ошибка', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Не удалось удалить', variant: 'destructive' });
    }
  };

  const closeHint = () => { localStorage.setItem('numcheck_hint_closed', '1'); setHintClosed(true); };
  const logout = () => { localStorage.removeItem('ms_participant_phone'); window.location.reload(); };
  const ADMIN_PHONES = ['9652000177', '9774951403'];
  const isAdmin = (pp: Participant | null) => !!pp && ADMIN_PHONES.includes(pp.phone.replace(/\D/g, '').slice(-10));

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
        onLogout={logout}
        onLogin={() => requireParticipant(() => {})}
        isLoggedIn={!!p}
        participantName={p?.full_name}
        unreadChat={unreadChat}
        reviewsCount={reviewsCount}
      />

      <ChatSection
        user={p ? { id: p.id, email: p.phone, name: p.full_name } : null}
        myPhone={p ? p.phone.replace(/\D/g, '').slice(-10) : ''}
        isAdmin={isAdmin(p)}
        messages={messages}
        chatText={chatText}
        chatSending={chatSending}
        setChatText={setChatText}
        sendMessage={sendMessage}
        onDeleteMessage={(id) => requireParticipant(() => deleteMessage(id))}
        onReactMessage={(id, emoji) => requireParticipant(() => reactMessage(id, emoji))}
        onRefresh={loadMessages}
        onOpenAuth={() => {}}
        chatEndRef={chatEndRef}
        onRequireParticipant={requireParticipant}
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
        onOpenForm={(phone) => requireParticipant(() => { setEditReview(undefined); setFormPhone(phone); setFormOpen(true); })}
        onEditReview={(rv) => requireParticipant(() => { setEditReview(rv); setFormOpen(true); })}
        onDeleteReview={(rv) => requireParticipant(() => deleteReview(rv))}
        myPhone={p?.phone || ''}
        onCloseHint={closeHint}
        onOpenInstall={!isStandalone && (installPrompt || isIos) ? () => setInstallHelpOpen(true) : undefined}
      />

      <AllReviewsSection refreshKey={reviewsRefresh} onCount={setReviewsCount} />

      {p && (
        <MyReviewsSection
          myPhone={p.phone}
          refreshKey={reviewsRefresh}
          onEditReview={(rv) => { setEditReview(rv); setFormOpen(true); }}
          onDeleteReview={deleteReview}
        />
      )}

      {showMembers && (
        <MembersSection
          onClose={() => setShowMembers(false)}
          canManage={isAdmin(p)}
        />
      )}

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

      <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) setEditReview(undefined); }}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="font-display">{editReview ? 'Редактировать отзыв' : 'Оставить отзыв о номере'}</DialogTitle>
          </DialogHeader>
          <ReviewForm defaultPhone={formPhone} editReview={editReview} onDone={afterSubmit} />
        </DialogContent>
      </Dialog>
    </div>
      )) as unknown as React.ReactNode}
    </ParticipantGate>
  );
};

export default Index;