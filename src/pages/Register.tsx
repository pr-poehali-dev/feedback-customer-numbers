import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';
import { AUTH_API, saveSession } from '@/components/app/types';

const benefits = [
  { icon: 'ShieldCheck', title: 'Проверка номеров', text: 'Узнайте репутацию заказчика до начала работы' },
  { icon: 'Users', title: 'Сообщество бригад', text: 'Тысячи проверенных мастеров и отзывы коллег' },
  { icon: 'MessageCircle', title: 'Живой чат', text: 'Заказы, обмен опытом и поддержка 24/7' },
];

const Register = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [workDirection, setWorkDirection] = useState('');
  const [organization, setOrganization] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) { toast({ title: 'Укажите ФИО', variant: 'destructive' }); return; }
    if (!email || !password) { toast({ title: 'Заполните email и пароль', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const res = await fetch(AUTH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', email, password, name, birthdate, work_direction: workDirection, organization }),
      });
      const data = await res.json();
      if (data.token) {
        saveSession(data.token, data.user);
        toast({ title: 'Добро пожаловать!', description: data.user.email });
        navigate('/');
      } else if (data.pending) {
        toast({ title: 'Заявка отправлена!', description: 'Ожидайте одобрения администратора.' });
        navigate('/');
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
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Левая часть — оффер */}
      <div className="lg:w-1/2 relative overflow-hidden bg-primary/5 p-8 lg:p-14 flex flex-col justify-center">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="relative max-w-lg mx-auto lg:mx-0 animate-fade-up">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6">
            <Icon name="ShieldCheck" size={16} className="text-primary" />
            <span className="text-sm font-semibold">Сообщество проверенных бригад</span>
          </div>
          <h1 className="text-3xl lg:text-5xl font-bold leading-tight mb-4">
            Работайте только с <span className="text-primary">надёжными</span> заказчиками
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            Присоединяйтесь к сообществу строителей: проверяйте номера заказчиков, читайте отзывы коллег и находите проверенные объекты.
          </p>
          <div className="space-y-4">
            {benefits.map((b) => (
              <div key={b.title} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Icon name={b.icon} size={20} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{b.title}</p>
                  <p className="text-sm text-muted-foreground">{b.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Правая часть — форма */}
      <div className="lg:w-1/2 p-8 lg:p-14 flex flex-col justify-center">
        <div className="w-full max-w-md mx-auto animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-2xl font-bold mb-1">Регистрация</h2>
          <p className="text-muted-foreground mb-6">Это бесплатно и займёт минуту</p>
          <div className="space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ФИО *" />
            <Input value={birthdate} onChange={(e) => setBirthdate(e.target.value)} placeholder="Дата рождения (ДД.ММ.ГГГГ)" />
            <Input value={workDirection} onChange={(e) => setWorkDirection(e.target.value)} placeholder="Направление рабочего дома" />
            <Input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Название организации" />
            <div className="border-t border-border pt-1" />
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email *" type="email" />
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль (минимум 6 символов) *" type="password"
              onKeyDown={(e) => e.key === 'Enter' && submit()} />
            <Button onClick={submit} disabled={loading} className="w-full font-semibold rounded-xl h-12 text-base">
              {loading ? '...' : 'Зарегистрироваться'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Уже есть аккаунт?{' '}
              <button onClick={() => navigate('/')} className="text-primary underline underline-offset-2">
                Войти
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
