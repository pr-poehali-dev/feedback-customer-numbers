import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { AUTH_API, User, getToken } from './types';

interface PendingUser {
  id: number;
  name: string;
  email: string;
  work_direction: string;
  organization: string;
  created_at: string;
}

interface Props {
  user: User | null;
}

const OWNER_ID = 2;

const AdminPanel = ({ user }: Props) => {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPending = async () => {
    if (!user || user.id !== OWNER_ID) return;
    try {
      const res = await fetch(AUTH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ action: 'pending_users' }),
      });
      const data = await res.json();
      setPending(data.users || []);
    } catch { /* тихо */ }
  };

  useEffect(() => { loadPending(); }, [user]);

  const approve = async (userId: number, action: 'approve_user' | 'reject_user') => {
    setLoading(true);
    try {
      await fetch(AUTH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ action, user_id: userId }),
      });
      toast({ title: action === 'approve_user' ? 'Пользователь одобрен!' : 'Заявка отклонена' });
      setPending((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      toast({ title: 'Ошибка', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.id !== OWNER_ID) return null;
  if (pending.length === 0) return null;

  return (
    <section className="relative z-10 container mx-auto px-4 py-8">
      <div className="border border-primary/40 rounded-2xl p-6 bg-primary/5">
        <div className="flex items-center gap-3 mb-5">
          <Icon name="ShieldCheck" size={22} className="text-primary" />
          <h2 className="text-lg font-display font-bold">Заявки на вступление</h2>
          <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
        </div>
        <div className="space-y-3">
          {pending.map((u) => (
            <div key={u.id} className="glass rounded-xl p-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                  {(u.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{u.name || 'Без имени'}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                  {u.organization && <p className="text-xs text-muted-foreground mt-0.5">{u.organization}</p>}
                  {u.work_direction && <p className="text-xs text-primary mt-0.5">{u.work_direction}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{u.created_at}</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" onClick={() => approve(u.id, 'approve_user')} disabled={loading} className="rounded-lg text-xs">
                  <Icon name="Check" size={14} />Принять
                </Button>
                <Button size="sm" variant="outline" onClick={() => approve(u.id, 'reject_user')} disabled={loading} className="rounded-lg text-xs border-destructive text-destructive hover:bg-destructive hover:text-white">
                  <Icon name="X" size={14} />Отклонить
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AdminPanel;
