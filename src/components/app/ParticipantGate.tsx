import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

const PARTICIPANTS_API = 'https://functions.poehali.dev/185a902f-2976-42bb-b791-ee85aa91f561';
const STORAGE_KEY = 'ms_participant_phone';

export interface Participant {
  id: number;
  full_name: string;
  organization: string;
  work_direction: string;
  phone: string;
}

interface Props {
  onReady: (p: Participant) => void;
  children: React.ReactNode;
}

// Форматирует ввод в вид +7 (___) ___-__-__
const formatPhone = (value: string): string => {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (!digits.startsWith('7')) digits = '7' + digits;
  digits = digits.slice(0, 11);
  const d = digits.slice(1); // 10 цифр после 7
  let out = '+7';
  if (d.length > 0) out += ' (' + d.slice(0, 3);
  if (d.length >= 3) out += ')';
  if (d.length > 3) out += ' ' + d.slice(3, 6);
  if (d.length > 6) out += '-' + d.slice(6, 8);
  if (d.length > 8) out += '-' + d.slice(8, 10);
  return out;
};

// Форма регистрации участника
const RegisterForm = ({ onDone }: { onDone: (p: Participant) => void }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const phoneDigits = phone.replace(/\D/g, '');
    if (!fullName.trim() || !phone.trim()) {
      toast({ title: 'Заполните ФИО и номер телефона', variant: 'destructive' });
      return;
    }
    if (phoneDigits.length !== 11) {
      toast({ title: 'Введите номер телефона полностью', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(PARTICIPANTS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, organization: '', work_direction: '', phone }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem(STORAGE_KEY, phone.trim());
        onDone({ id: data.id, full_name: fullName, organization: '', work_direction: '', phone });
        toast({ title: 'Добро пожаловать!', description: fullName });
      } else {
        toast({ title: data.error || 'Ошибка', variant: 'destructive' });
      }
    } catch (e) {
      console.error('[participants] error:', e);
      toast({ title: 'Не удалось подключиться', description: 'Проверьте интернет-соединение', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ФИО *" />
      <Input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="+7 (___) ___-__-__" className="font-mono"
        inputMode="tel" onKeyDown={(e) => e.key === 'Enter' && submit()} />
      <Button onClick={submit} disabled={loading} className="w-full rounded-xl font-semibold">
        {loading ? 'Сохранение...' : 'Войти в систему'}
      </Button>
    </div>
  );
};

// Обёртка — проверяет есть ли участник, если нет — показывает форму
const ParticipantGate = ({ onReady, children }: Props) => {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    const savedPhone = localStorage.getItem(STORAGE_KEY);
    if (!savedPhone) return;
    fetch(`${PARTICIPANTS_API}?phone=${encodeURIComponent(savedPhone)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.found) {
          const p = { ...data.participant, phone: savedPhone };
          setParticipant(p);
          onReady(p);
        }
      })
      .catch(() => {});
  }, []);

  const requireParticipant = (action: () => void) => {
    if (participant) {
      action();
    } else {
      setPendingAction(() => action);
      setDialogOpen(true);
    }
  };

  const handleRegistered = (p: Participant) => {
    setParticipant(p);
    onReady(p);
    setDialogOpen(false);
    if (pendingAction) {
      setTimeout(() => { pendingAction(); setPendingAction(null); }, 100);
    }
  };

  return (
    <>
      {/* Передаём requireParticipant через context-like prop */}
      {typeof children === 'function'
        ? (children as (fn: typeof requireParticipant, p: Participant | null) => React.ReactNode)(requireParticipant, participant)
        : children}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Icon name="UserPlus" size={20} className="text-primary" />
              Заполните данные для доступа
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">Чтобы оставлять отзывы и подавать заявки, нужно один раз заполнить форму.</p>
          <RegisterForm onDone={handleRegistered} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ParticipantGate;
export { PARTICIPANTS_API, STORAGE_KEY };