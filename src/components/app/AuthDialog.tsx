import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { AUTH_API, User, saveSession } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
  onAuth: (user: User) => void;
}

const AuthDialog = ({ open, onClose, onAuth }: Props) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [workDirection, setWorkDirection] = useState('');
  const [organization, setOrganization] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) { toast({ title: 'Заполните email и пароль', variant: 'destructive' }); return; }
    if (mode === 'register' && !name.trim()) { toast({ title: 'Укажите ФИО', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const res = await fetch(AUTH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, email, password, name, birthdate, work_direction: workDirection, organization }),
      });
      const data = await res.json();
      if (data.token) {
        saveSession(data.token, data.user);
        onAuth(data.user);
        onClose();
        toast({ title: mode === 'login' ? 'Добро пожаловать!' : 'Аккаунт создан!', description: data.user.email });
      } else {
        toast({ title: data.error || 'Ошибка', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Не удалось подключиться', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass border-border max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'login' ? 'Вход в аккаунт' : 'Регистрация'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {mode === 'register' && (
            <>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ФИО *" />
              <Input value={birthdate} onChange={(e) => setBirthdate(e.target.value)} placeholder="Дата рождения (ДД.ММ.ГГГГ)" />
              <Input value={workDirection} onChange={(e) => setWorkDirection(e.target.value)} placeholder="Направление рабочего дома" />
              <Input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Название организации" />
              <div className="border-t border-border pt-1" />
            </>
          )}
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email *" type="email" />
          <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль (минимум 6 символов) *" type="password"
            onKeyDown={(e) => e.key === 'Enter' && submit()} />
          <Button onClick={submit} disabled={loading} className="w-full font-semibold rounded-xl">
            {loading ? '...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {mode === 'login' ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-primary underline underline-offset-2">
              {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
