import { useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { User, ChatMessage } from './types';

const JOBS_API = 'https://functions.poehali.dev/9db3fbb7-d09a-451b-9b2c-f75933050bb9';

interface Props {
  user: User | null;
  myPhone?: string;
  isAdmin?: boolean;
  messages: ChatMessage[];
  chatText: string;
  chatSending: boolean;
  setChatText: (v: string) => void;
  sendMessage: (images?: { data: string; type: string }[], audio?: { data: string; type: string }) => void;
  onDeleteMessage?: (id: number) => void;
  onReactMessage?: (id: number, emoji: string) => void;
  onRefresh?: () => void;
  onOpenAuth: () => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
  onRequireParticipant?: (action: () => void) => void;
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🔥', '👎', '🙏', '✅'];
const REACTION_LABELS: Record<string, string> = { '✅': 'Заказ закрыт' };

const JobForm = ({ onDone }: { onDone: () => void }) => {
  const [address, setAddress] = useState('');
  const [workers, setWorkers] = useState('');
  const [hours, setHours] = useState('');
  const [price, setPrice] = useState('');
  const [phone, setPhone] = useState('');
  const [workType, setWorkType] = useState('');
  const [docs, setDocs] = useState('Да');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!address || !workers || !hours || !phone || !workType) {
      toast({ title: 'Заполните все обязательные поля', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(JOBS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, workers: Number(workers), hours: Number(hours), price, phone, work_type: workType, docs, comment }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Заявка отправлена в чат!' });
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
    <div className="space-y-3">
      <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Адрес объекта *" />
      <div className="grid grid-cols-2 gap-3">
        <Input value={workers} onChange={(e) => setWorkers(e.target.value)} placeholder="Кол-во рабочих *" type="number" min="1" />
        <Input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Рабочих часов *" type="number" min="1" />
      </div>
      <Input value={workType} onChange={(e) => setWorkType(e.target.value)} placeholder="Фронт работы * (напр. кладка кирпича)" />
      <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Цена (напр. 5000 руб/день)" />
      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Номер для связи *" className="font-mono" />
      <div>
        <p className="text-sm text-muted-foreground mb-2">Документы нужны?</p>
        <div className="grid grid-cols-2 gap-3">
          {['Да', 'Нет'].map((opt) => (
            <Button
              key={opt}
              type="button"
              variant={docs === opt ? 'default' : 'outline'}
              onClick={() => setDocs(opt)}
              className="rounded-xl"
            >
              {opt}
            </Button>
          ))}
        </div>
      </div>
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Дополнительный комментарий..." rows={2} />
      <Button onClick={submit} disabled={loading} className="w-full rounded-xl font-semibold">
        {loading ? 'Отправка...' : 'Отправить заявку в чат'}
      </Button>
    </div>
  );
};

const formatPhone = (raw?: string) => {
  const d = (raw || '').replace(/\D/g, '').slice(-10);
  if (d.length !== 10) return raw || '';
  return `+7 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8, 10)}`;
};

const renderMessageText = (text: string) => {
  if (text.startsWith('[[red]]')) {
    const rest = text.slice('[[red]]'.length);
    const nl = rest.indexOf('\n');
    const title = nl === -1 ? rest : rest.slice(0, nl);
    const body = nl === -1 ? '' : rest.slice(nl + 1);
    return (
      <>
        <span className="block text-lg font-extrabold text-red-600 mb-1">{title}</span>
        {body && <span className="block text-sm whitespace-pre-line break-words">{body}</span>}
      </>
    );
  }
  return <span className="whitespace-pre-line break-words">{text}</span>;
};

const ChatSection = ({ user, myPhone, isAdmin, messages, chatText, chatSending, setChatText, sendMessage, onDeleteMessage, onReactMessage, onRefresh, onOpenAuth, chatEndRef, onRequireParticipant }: Props) => {
  const myName = user ? (user.name || user.email) : null;
  const [jobFormOpen, setJobFormOpen] = useState(false);
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [photos, setPhotos] = useState<{ data: string; type: string; preview: string }[]>([]);
  const [contactFor, setContactFor] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_PHOTOS = 10;

  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordCancelledRef = useRef(false);
  const holdStartXRef = useRef(0);
  const [slideOffset, setSlideOffset] = useState(0);
  const CANCEL_THRESHOLD = 90;

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.readAsDataURL(blob);
    });

  const stopTimer = () => {
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
  };

  const startRecording = async () => {
    if (recording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast({ title: 'Запись не поддерживается', description: 'Откройте сайт в современном браузере', variant: 'destructive' });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      audioChunksRef.current = [];
      recordCancelledRef.current = false;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        stopTimer();
        setRecording(false);
        if (recordCancelledRef.current) return;
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 1000) return;
        const data = await blobToBase64(blob);
        sendMessage(undefined, { data, type: recorder.mimeType || 'audio/webm' });
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordSecs(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSecs((s) => {
          if (s >= 120) { stopRecording(); return s; }
          return s + 1;
        });
      }, 1000);
    } catch {
      toast({ title: 'Нет доступа к микрофону', description: 'Разрешите доступ в настройках браузера', variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    recordCancelledRef.current = true;
    stopRecording();
  };

  const fmtSecs = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const handleHoldStart = (e: React.PointerEvent) => {
    e.preventDefault();
    try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* ignore */ }
    holdStartXRef.current = e.clientX;
    setSlideOffset(0);
    if (onRequireParticipant) onRequireParticipant(startRecording);
    else startRecording();
  };

  const handleHoldMove = (e: React.PointerEvent) => {
    if (!recording) return;
    const dx = e.clientX - holdStartXRef.current;
    setSlideOffset(dx < 0 ? Math.max(dx, -150) : 0);
  };

  const handleHoldEnd = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!recording) return;
    if (-slideOffset >= CANCEL_THRESHOLD) {
      cancelRecording();
    } else {
      stopRecording();
    }
    setSlideOffset(0);
  };

  const handlePickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const slots = MAX_PHOTOS - photos.length;
    if (slots <= 0) {
      toast({ title: `Можно прикрепить максимум ${MAX_PHOTOS} фото`, variant: 'destructive' });
      return;
    }
    files.slice(0, slots).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Можно отправлять только изображения', variant: 'destructive' });
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        toast({ title: `Фото «${file.name}» слишком большое`, description: 'Максимум 8 МБ', variant: 'destructive' });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        setPhotos((prev) => (prev.length >= MAX_PHOTOS ? prev : [...prev, { data: base64, type: file.type, preview: result }]));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (idx: number) => setPhotos((prev) => prev.filter((_, i) => i !== idx));

  const handleSend = () => {
    if (chatSending) return;
    if (photos.length > 0) {
      sendMessage(photos.map((p) => ({ data: p.data, type: p.type })));
      setPhotos([]);
    } else if (chatText.trim()) {
      sendMessage();
    }
  };

  const handleRefresh = () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    onRefresh();
    setTimeout(() => setRefreshing(false), 800);
  };
  const openJobForm = () => {
    if (onRequireParticipant) {
      onRequireParticipant(() => setJobFormOpen(true));
    } else {
      setJobFormOpen(true);
    }
  };

  return (
    <section id="chat" className="relative z-10 container mx-auto px-4 py-16">
      <div className="flex items-center gap-3 mb-6">
        <Icon name="MessageCircle" size={24} className="text-primary" />
        <h2 className="text-2xl font-display font-bold">Общий чат</h2>
        {!user && <span className="text-xs text-muted-foreground">(войдите чтобы писать)</span>}
        {onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors rounded-lg px-3 py-1.5 hover:bg-secondary"
            title="Обновить чат"
          >
            <Icon name="RefreshCw" size={16} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Обновить</span>
          </button>
        )}
      </div>

      <div className="flex justify-center mb-6">
        <Button onClick={openJobForm} className="rounded-xl font-semibold px-8 py-3 text-base">
          <Icon name="ClipboardList" size={18} />Размещение заказов
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:items-start max-w-6xl mx-auto">

      {/* Фото бригад — слева от чата */}
      <div className="w-full lg:w-56 shrink-0 order-first grid grid-cols-2 lg:grid-cols-1 gap-3">
        {[
          'https://cdn.poehali.dev/projects/13876108-688c-474f-aed7-7b67d3d10ce5/bucket/5e781115-819e-4970-a0cf-f9d1eef3e8c7.jpeg',
          'https://cdn.poehali.dev/projects/13876108-688c-474f-aed7-7b67d3d10ce5/bucket/b7aa7285-32b6-484a-a849-3047080697d2.jpeg',
          'https://cdn.poehali.dev/projects/13876108-688c-474f-aed7-7b67d3d10ce5/bucket/b85988a5-3f3a-4c71-9db2-802df5e1275d.jpeg',
          'https://cdn.poehali.dev/projects/13876108-688c-474f-aed7-7b67d3d10ce5/bucket/4441c37a-7d1e-4bcd-b59f-3eab2acbb360.jpeg',
        ].map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`Бригада ${i + 1}`}
            loading="lazy"
            className="w-full h-28 lg:h-32 object-cover rounded-xl"
          />
        ))}
      </div>

      {/* Чат */}
      <div className="glass rounded-2xl overflow-hidden flex flex-col w-full lg:flex-1 h-[70vh] min-h-[400px] lg:h-[600px]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Icon name="MessageCircle" size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Пока нет сообщений. Начните общение!</p>
            </div>
          )}
          {messages.map((msg) => {
            const mine = !!myName && msg.user_name === myName;
            const canDelete = isAdmin || mine || (!!myPhone && msg.author_phone === myPhone);
            return (
            <div key={msg.id}>
            <div className={`group flex gap-3 ${mine ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {(msg.user_name || '?').charAt(0).toUpperCase()}
              </div>
              <div className={`max-w-[78%] ${mine ? 'items-end' : 'items-start'} flex flex-col relative`}>
                <div className="flex items-end gap-1.5">
                  {mine && (
                    <div className="flex items-center gap-1 self-center opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      {onReactMessage && (
                        <button onClick={() => setPickerFor(pickerFor === msg.id ? null : msg.id)} className="text-muted-foreground hover:text-primary p-1.5" title="Реакция">
                          <Icon name="SmilePlus" size={16} />
                        </button>
                      )}
                      {canDelete && onDeleteMessage && (
                        <button onClick={() => onDeleteMessage(msg.id)} className="text-muted-foreground hover:text-destructive p-1.5" title="Удалить">
                          <Icon name="Trash2" size={16} />
                        </button>
                      )}
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 py-2 ${mine ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-secondary rounded-tl-sm'}`}>
                    {!msg.text.startsWith('[[red]]') && (
                      <div className="mb-1">
                        <p className={`text-xs font-semibold ${mine ? 'text-primary-foreground' : 'text-primary'}`}>{msg.user_name}</p>
                        {msg.author_phone && (
                          <div className="relative">
                            <button
                              onClick={() => setContactFor(contactFor === msg.id ? null : msg.id)}
                              className={`text-[11px] font-mono flex items-center gap-1 hover:underline ${mine ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}
                            >
                              <Icon name="Phone" size={11} />
                              {formatPhone(msg.author_phone)}
                            </button>
                            {contactFor === msg.id && (
                              <div className="absolute z-20 mt-1 flex flex-col rounded-xl glass border border-border shadow-lg overflow-hidden min-w-[160px]">
                                <a
                                  href={`tel:+7${(msg.author_phone || '').replace(/\D/g, '').slice(-10)}`}
                                  onClick={() => setContactFor(null)}
                                  className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors"
                                >
                                  <Icon name="Phone" size={14} className="text-primary" />Позвонить
                                </a>
                                <a
                                  href={`https://wa.me/7${(msg.author_phone || '').replace(/\D/g, '').slice(-10)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => setContactFor(null)}
                                  className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors border-t border-border"
                                >
                                  <Icon name="MessageCircle" size={14} className="text-green-600" />WhatsApp
                                </a>
                                <a
                                  href={`https://t.me/+7${(msg.author_phone || '').replace(/\D/g, '').slice(-10)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => setContactFor(null)}
                                  className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors border-t border-border"
                                >
                                  <Icon name="Send" size={14} className="text-sky-500" />Telegram
                                </a>
                                <button
                                  onClick={() => {
                                    const num = `+7${(msg.author_phone || '').replace(/\D/g, '').slice(-10)}`;
                                    navigator.clipboard?.writeText(num).catch(() => {});
                                    toast({ title: 'Номер скопирован', description: 'Вставьте его в поиск MAX' });
                                    window.open('https://max.ru', '_blank', 'noopener,noreferrer');
                                    setContactFor(null);
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors border-t border-border text-left"
                                >
                                  <Icon name="Send" size={14} className="text-blue-500" />MAX
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {(() => {
                      const imgs = msg.image_urls && msg.image_urls.length > 0
                        ? msg.image_urls
                        : (msg.image_url ? [msg.image_url] : []);
                      if (imgs.length === 0) return null;
                      return (
                        <div className={`mb-1 grid gap-1 ${imgs.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                          {imgs.map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt="Фото"
                              loading="lazy"
                              onClick={() => setLightbox(url)}
                              className={`rounded-xl object-cover cursor-pointer w-full ${imgs.length === 1 ? 'max-h-64' : 'h-28'}`}
                            />
                          ))}
                        </div>
                      );
                    })()}
                    {msg.audio_url && (
                      <div className="flex items-center gap-2 mb-1 min-w-[200px]">
                        <Icon name="Mic" size={16} className={mine ? 'text-primary-foreground' : 'text-primary'} />
                        <audio src={msg.audio_url} controls preload="none" className="h-9 max-w-[220px]" />
                      </div>
                    )}
                    {msg.text && <p className="text-sm">{renderMessageText(msg.text)}</p>}
                  </div>
                  {!mine && (
                    <div className="flex items-center gap-1 self-center opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      {onReactMessage && (
                        <button onClick={() => setPickerFor(pickerFor === msg.id ? null : msg.id)} className="text-muted-foreground hover:text-primary p-1.5" title="Реакция">
                          <Icon name="SmilePlus" size={16} />
                        </button>
                      )}
                      {canDelete && onDeleteMessage && (
                        <button onClick={() => onDeleteMessage(msg.id)} className="text-muted-foreground hover:text-destructive p-1.5" title="Удалить">
                          <Icon name="Trash2" size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {pickerFor === msg.id && onReactMessage && (
                  <div className={`flex items-center gap-1 mt-1.5 glass rounded-full px-2 py-1 ${mine ? 'self-end' : 'self-start'}`}>
                    {REACTION_EMOJIS.map((e) => (
                      <button key={e} onClick={() => { onReactMessage(msg.id, e); setPickerFor(null); }}
                        className="hover:scale-110 transition-transform px-0.5 flex items-center gap-1"
                        title={REACTION_LABELS[e]}>
                        <span className="text-lg">{e}</span>
                        {REACTION_LABELS[e] && <span className="text-xs font-medium text-primary pr-1">{REACTION_LABELS[e]}</span>}
                      </button>
                    ))}
                  </div>
                )}

                {msg.reactions && msg.reactions.length > 0 && (
                  <div className={`flex flex-wrap gap-1 mt-1.5 ${mine ? 'justify-end' : ''}`}>
                    {msg.reactions.map((r) => {
                      const reacted = !!myPhone && r.users.includes(myPhone);
                      return (
                        <button
                          key={r.emoji}
                          onClick={() => onReactMessage && onReactMessage(msg.id, r.emoji)}
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border transition-colors ${reacted ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-secondary border-transparent hover:border-border'}`}
                        >
                          <span className="text-sm leading-none">{r.emoji}</span>
                          {REACTION_LABELS[r.emoji] && <span className="font-medium">{REACTION_LABELS[r.emoji]}</span>}
                          <span className="font-medium">{r.count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground mt-1 px-1">{msg.time || msg.created_at}</p>
              </div>
            </div>
            <div className="h-1 rounded-full bg-red-600 w-full my-2" />
            </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
        <div className="border-t border-border p-3">
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {photos.map((p, i) => (
                <div key={i} className="relative">
                  <img src={p.preview} alt="Превью" className="h-20 w-20 object-cover rounded-xl" />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center shadow"
                    title="Убрать фото"
                  >
                    <Icon name="X" size={14} />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                  title="Добавить ещё"
                >
                  <Icon name="Plus" size={22} />
                </button>
              )}
            </div>
          )}
          {recording ? (
            <div className="flex gap-2 items-center">
              <Button
                type="button"
                variant="outline"
                onClick={cancelRecording}
                className="rounded-xl px-3 shrink-0 text-destructive"
                title="Отменить запись"
              >
                <Icon name="Trash2" size={18} />
              </Button>
              <div className="flex-1 flex items-center gap-2 bg-secondary rounded-xl px-4 py-2 text-sm overflow-hidden">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="font-mono shrink-0">{fmtSecs(recordSecs)}</span>
                {-slideOffset >= CANCEL_THRESHOLD ? (
                  <span className="text-destructive font-medium">Отпустите для отмены</span>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-1 transition-opacity" style={{ opacity: 1 - (-slideOffset / CANCEL_THRESHOLD) }}>
                    <Icon name="ChevronLeft" size={14} /> Влево — отмена
                  </span>
                )}
              </div>
              <Button
                type="button"
                onPointerMove={handleHoldMove}
                onPointerUp={handleHoldEnd}
                onPointerCancel={handleHoldEnd}
                className={`rounded-xl px-4 shrink-0 select-none touch-none text-white scale-110 transition-transform ${-slideOffset >= CANCEL_THRESHOLD ? 'bg-destructive hover:bg-destructive' : 'bg-red-500 hover:bg-red-500'}`}
                style={{ transform: `translateX(${Math.max(slideOffset, -60)}px) scale(1.1)` }}
                title="Отпустите, чтобы отправить"
              >
                <Icon name={-slideOffset >= CANCEL_THRESHOLD ? 'Trash2' : 'Mic'} size={18} />
              </Button>
            </div>
          ) : (
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePickPhoto} />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={chatSending}
              className="rounded-xl px-3 shrink-0"
              title="Прикрепить фото"
            >
              <Icon name="ImagePlus" size={18} />
            </Button>
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={photos.length > 0 ? 'Добавьте подпись (необязательно)...' : 'Написать сообщение...'}
              className="flex-1 bg-secondary rounded-xl px-4 py-2 text-sm outline-none placeholder:text-muted-foreground"
              maxLength={1000}
            />
            {chatText.trim() || photos.length > 0 ? (
              <Button onClick={handleSend} disabled={chatSending} className="rounded-xl px-4 shrink-0">
                <Icon name="Send" size={16} />
              </Button>
            ) : (
              <Button
                type="button"
                onPointerDown={handleHoldStart}
                disabled={chatSending}
                className="rounded-xl px-4 shrink-0 select-none touch-none"
                title="Зажмите, чтобы записать голосовое"
              >
                <Icon name="Mic" size={18} />
              </Button>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Правила — справа от чата */}
      <div className="w-full lg:w-80 shrink-0 space-y-3 text-left">
        <div className="border border-primary/50 rounded-2xl bg-primary/5 px-4 py-3 flex items-start gap-2">
          <Icon name="AlertTriangle" size={16} className="text-primary shrink-0 mt-0.5" />
          <p className="font-bold text-xs text-primary">Кто взял заявку — отписывайтесь в назначенное время, будьте на связи!</p>
        </div>

        <div className="border border-primary/30 rounded-2xl overflow-hidden">
          <div className="bg-primary/10 px-4 py-2">
            <p className="font-bold text-xs uppercase tracking-wide text-primary">Правила для исполнителей</p>
          </div>
          <div className="px-4 py-3 space-y-2">
            <div className="flex gap-2">
              <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0 mt-0.5">1</span>
              <p className="text-xs">Полный отчёт с утра тому, у кого взяли заявку.</p>
            </div>
            <div className="flex gap-2">
              <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0 mt-0.5">2</span>
              <div className="text-xs space-y-1">
                <p>Относитесь к заявке с ответственностью — все мы зарабатываем!</p>
                <p className="text-destructive font-semibold">Не ставьте кривых и пьяных!</p>
                <p>Если минус на объекте — <span className="font-semibold">сразу</span> отпишитесь. Не надейтесь, что прокатит!</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border border-primary/30 rounded-2xl overflow-hidden">
          <div className="bg-primary/10 px-4 py-2">
            <p className="font-bold text-xs uppercase tracking-wide text-primary">Правила для диспетчеров</p>
          </div>
          <div className="px-4 py-3 space-y-2">
            <div className="flex gap-2">
              <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0 mt-0.5">1</span>
              <p className="text-xs">Будьте на связи с утра, контролируйте заявку — вы становитесь потенциальным заказчиком!</p>
            </div>
            <div className="flex gap-2">
              <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0 mt-0.5">2</span>
              <div className="text-xs space-y-1">
                <p>Переводите деньги сразу со своих средств, потом разбирайтесь с заказчиком.</p>
                <p className="text-destructive font-semibold">«Подожди, мне ещё не перевели!» — недопустимо.</p>
                <p>Люди отработали — оплати сразу!</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border border-primary rounded-2xl bg-primary/10 px-4 py-3 text-center">
          <p className="text-xs font-bold text-primary uppercase tracking-wide">Руководители · Диспетчера · Помощники</p>
          <p className="text-xs mt-1 font-medium">Все мы работаем и зарабатываем вместе!</p>
        </div>
      </div>

      </div>{/* конец flex-row */}

      <Dialog open={jobFormOpen} onOpenChange={setJobFormOpen}>
        <DialogContent className="glass border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Размещение заказов</DialogTitle>
          </DialogHeader>
          <JobForm onDone={() => setJobFormOpen(false)} />
        </DialogContent>
      </Dialog>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img src={lightbox} alt="Фото" className="max-w-full max-h-full rounded-xl object-contain" />
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center">
            <Icon name="X" size={22} />
          </button>
        </div>
      )}
    </section>
  );
};

export default ChatSection;