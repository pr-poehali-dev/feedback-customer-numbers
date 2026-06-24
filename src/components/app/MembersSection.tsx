import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';

const PARTICIPANTS_API = 'https://functions.poehali.dev/185a902f-2976-42bb-b791-ee85aa91f561';

interface Member {
  short_name: string;
  organization: string;
  work_direction: string;
  joined: string;
}

const MembersSection = ({ onClose }: { onClose?: () => void }) => {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    fetch(PARTICIPANTS_API)
      .then((r) => r.json())
      .then((data) => setMembers(data.members || []))
      .catch(() => {});
  }, []);

  return (
    <section id="members" className="relative z-10 container mx-auto px-4 py-16">
      <div className="flex items-center gap-3 mb-8">
        <Icon name="Users" size={24} className="text-primary" />
        <h2 className="text-2xl font-display font-bold">Участники</h2>
        <span className="text-sm text-muted-foreground ml-1">({members.length})</span>
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
          <div className="hidden md:grid grid-cols-4 px-5 py-3 text-xs text-muted-foreground border-b border-border font-semibold uppercase tracking-wide">
            <span>#</span>
            <span>Участник</span>
            <span>Организация / Направление</span>
            <span>Дата</span>
          </div>
          {members.map((m, i) => (
            <div key={i} className={`px-5 py-4 ${i !== members.length - 1 ? 'border-b border-border' : ''} hover:bg-secondary/30 transition-colors`}>
              {/* Desktop */}
              <div className="hidden md:grid grid-cols-4 items-center gap-3">
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
              </div>
              {/* Mobile */}
              <div className="flex md:hidden items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                  {m.short_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm">{m.short_name}</p>
                  {m.organization && <p className="text-xs text-muted-foreground mt-0.5">{m.organization}</p>}
                  {m.work_direction && <p className="text-xs text-primary mt-0.5">{m.work_direction}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{m.joined}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default MembersSection;