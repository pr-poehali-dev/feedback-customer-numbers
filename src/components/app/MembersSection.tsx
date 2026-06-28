import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';

const PARTICIPANTS_API = 'https://functions.poehali.dev/185a902f-2976-42bb-b791-ee85aa91f561';

interface Member {
  id: number;
  short_name: string;
  organization: string;
  work_direction: string;
  joined: string;
}

const MembersSection = ({ onClose, canManage }: { onClose?: () => void; canManage?: boolean }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = () => {
    fetch(PARTICIPANTS_API)
      .then((r) => r.json())
      .then((data) => setMembers(data.members || []))
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const todayStr = (() => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${d.getFullYear()}`;
  })();
  const todayCount = members.filter((m) => m.joined === todayStr).length;

  const removeMember = async (m: Member) => {
    if (!window.confirm(`Удалить участника «${m.short_name}»?`)) return;
    setDeletingId(m.id);
    try {
      const res = await fetch(`${PARTICIPANTS_API}?id=${m.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMembers((prev) => prev.filter((x) => x.id !== m.id));
        toast({ title: 'Участник удалён' });
      } else {
        toast({ title: data.error || 'Не удалось удалить', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Нет связи с сервером', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section id="members" className="relative z-10 container mx-auto px-4 py-16">
      <div className="flex items-center gap-3 mb-8">
        <Icon name="Users" size={24} className="text-primary" />
        <h2 className="text-2xl font-display font-bold">Участники</h2>
        <span className="text-sm text-muted-foreground ml-1">({members.length})</span>
        {todayCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
            <Icon name="Sparkles" size={13} />
            Сегодня: {todayCount}
          </span>
        )}
        {onClose && (
          <button onClick={onClose} className="ml-auto text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <Icon name="X" size={16} />Скрыть
          </button>
        )}
      </div>

      {members.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
          <Icon name="Users" size={40} className="mx-auto mb-3 opacity-30" />
          <p>Пока нет участников</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className={`hidden md:grid ${canManage ? 'grid-cols-5' : 'grid-cols-4'} px-5 py-3 text-xs text-muted-foreground border-b border-border font-semibold uppercase tracking-wide`}>
            <span>#</span>
            <span>Участник</span>
            <span>Организация / Направление</span>
            <span>Дата</span>
            {canManage && <span className="text-right">Действие</span>}
          </div>
          {members.map((m, i) => (
            <div key={m.id} className={`px-5 py-4 ${i !== members.length - 1 ? 'border-b border-border' : ''} hover:bg-secondary/30 transition-colors`}>
              {/* Desktop */}
              <div className={`hidden md:grid ${canManage ? 'grid-cols-5' : 'grid-cols-4'} items-center gap-3`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {m.short_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-muted-foreground">{i + 1}</span>
                </div>
                <p className="font-semibold text-sm">{m.short_name}</p>
                <div>
                  {m.organization && <p className="text-sm text-muted-foreground">{m.organization}</p>}
                  {m.work_direction && <p className="text-xs text-primary">{m.work_direction}</p>}
                </div>
                <span className="text-sm text-muted-foreground">{m.joined}</span>
                {canManage && (
                  <div className="text-right">
                    <button onClick={() => removeMember(m)} disabled={deletingId === m.id} className="inline-flex items-center gap-1 text-xs text-destructive hover:bg-destructive/10 px-2 py-1 rounded-lg transition-colors disabled:opacity-50">
                      <Icon name="Trash2" size={14} />{deletingId === m.id ? 'Удаление...' : 'Удалить'}
                    </button>
                  </div>
                )}
              </div>
              {/* Mobile */}
              <div className="flex md:hidden items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                  {m.short_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{m.short_name}</p>
                  {m.organization && <p className="text-xs text-muted-foreground mt-0.5">{m.organization}</p>}
                  {m.work_direction && <p className="text-xs text-primary mt-0.5">{m.work_direction}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{m.joined}</p>
                </div>
                {canManage && (
                  <button onClick={() => removeMember(m)} disabled={deletingId === m.id} className="shrink-0 text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors disabled:opacity-50">
                    <Icon name="Trash2" size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default MembersSection;