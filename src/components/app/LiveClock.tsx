import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';

const LiveClock = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const weekday = now.toLocaleDateString('ru-RU', { weekday: 'long' });
  const date = now.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="glass rounded-2xl px-5 py-4 flex items-center gap-4 justify-center">
      <Icon name="Clock" size={28} className="text-primary shrink-0" />
      <div className="text-center">
        <p className="font-display font-bold text-2xl sm:text-3xl tracking-tight tabular-nums leading-none">{time}</p>
        <p className="text-sm text-muted-foreground mt-1 capitalize">{weekday}, {date}</p>
      </div>
    </div>
  );
};

export default LiveClock;
