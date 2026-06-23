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
  messages: ChatMessage[];
  chatText: string;
  chatSending: boolean;
  setChatText: (v: string) => void;
  sendMessage: () => void;
  onOpenAuth: () => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
}

const JobForm = ({ onDone }: { onDone: () => void }) => {
  const [address, setAddress] = useState('');
  const [workers, setWorkers] = useState('');
  const [hours, setHours] = useState('');
  const [price, setPrice] = useState('');
  const [phone, setPhone] = useState('');
  const [workType, setWorkType] = useState('');
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
        body: JSON.stringify({ address, workers: Number(workers), hours: Number(hours), price, phone, work_type: workType, comment }),
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
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Дополнительный комментарий..." rows={2} />
      <Button onClick={submit} disabled={loading} className="w-full rounded-xl font-semibold">
        {loading ? 'Отправка...' : 'Отправить заявку в чат'}
      </Button>
    </div>
  );
};

const ChatSection = ({ user, messages, chatText, chatSending, setChatText, sendMessage, onOpenAuth, chatEndRef }: Props) => {
  const myName = user ? (user.name || user.email) : null;
  const [jobFormOpen, setJobFormOpen] = useState(false);

  return (
    <section id="chat" className="relative z-10 container mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Icon name="MessageCircle" size={24} className="text-primary" />
          <h2 className="text-2xl font-display font-bold">Общий чат</h2>
          {!user && <span className="text-xs text-muted-foreground">(войдите чтобы писать)</span>}
        </div>
        <Button onClick={() => setJobFormOpen(true)} variant="outline" className="rounded-xl font-semibold">
          <Icon name="ClipboardList" size={16} />Подать заявку
        </Button>
      </div>

      <div className="glass rounded-2xl overflow-hidden flex flex-col max-w-3xl mx-auto" style={{ height: '480px' }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Icon name="MessageCircle" size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Пока нет сообщений. Начните общение!</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${myName && msg.user_name === myName ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {(msg.user_name || '?').charAt(0).toUpperCase()}
              </div>
              <div className={`max-w-[75%] ${myName && msg.user_name === myName ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`rounded-2xl px-4 py-2 ${myName && msg.user_name === myName ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-secondary rounded-tl-sm'}`}>
                  {!(myName && msg.user_name === myName) && (
                    <p className="text-xs font-semibold text-primary mb-1">{msg.user_name}</p>
                  )}
                  <p className="text-sm whitespace-pre-line">{msg.text}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 px-1">{msg.created_at}</p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="border-t border-border p-3 flex gap-2">
          {user ? (
            <>
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Написать сообщение..."
                className="flex-1 bg-secondary rounded-xl px-4 py-2 text-sm outline-none placeholder:text-muted-foreground"
                maxLength={1000}
              />
              <Button onClick={sendMessage} disabled={chatSending || !chatText.trim()} className="rounded-xl px-4 shrink-0">
                <Icon name="Send" size={16} />
              </Button>
            </>
          ) : (
            <button onClick={onOpenAuth} className="w-full text-center text-sm text-muted-foreground py-2 hover:text-primary transition-colors">
              Войдите в аккаунт чтобы писать в чат →
            </button>
          )}
        </div>
      </div>

      <Dialog open={jobFormOpen} onOpenChange={setJobFormOpen}>
        <DialogContent className="glass border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Подать заявку на работу</DialogTitle>
          </DialogHeader>
          <JobForm onDone={() => setJobFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ChatSection;
