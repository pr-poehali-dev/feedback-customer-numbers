import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { isPushSupported, getPushPermission, enablePushNotifications } from '@/lib/push';

const STORAGE_KEY = 'numcheck_push_banner_closed';

const PushBanner = () => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    const perm = getPushPermission();
    const closed = !!localStorage.getItem(STORAGE_KEY);
    setVisible(perm === 'default' && !closed);
  }, []);

  if (!visible) return null;

  const close = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const enable = async () => {
    setLoading(true);
    const ok = await enablePushNotifications();
    setLoading(false);
    if (ok) {
      toast({ title: 'Уведомления включены', description: 'Будем сообщать о новых участниках и сообщениях.' });
      setVisible(false);
    } else {
      toast({ title: 'Не удалось включить уведомления', description: 'Разрешите уведомления в браузере и попробуйте снова.', variant: 'destructive' });
    }
  };

  return (
    <div className="glass rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3 border border-primary/30">
      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
        <Icon name="BellRing" size={20} className="text-primary" />
      </div>
      <div className="flex-1">
        <p className="font-semibold leading-tight">Включите уведомления</p>
        <p className="text-sm text-muted-foreground">Узнавайте о новых участниках и сообщениях — приходят даже когда сайт закрыт.</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" className="rounded-lg font-medium" onClick={enable} disabled={loading}>
          <Icon name={loading ? 'Loader2' : 'Bell'} size={15} className={loading ? 'animate-spin' : ''} />
          Включить
        </Button>
        <button onClick={close} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" aria-label="Закрыть">
          <Icon name="X" size={18} />
        </button>
      </div>
    </div>
  );
};

export default PushBanner;