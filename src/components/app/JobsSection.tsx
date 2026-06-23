import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

const JOBS_API = 'https://functions.poehali.dev/9db3fbb7-d09a-451b-9b2c-f75933050bb9';

interface Job {
  id: number;
  address: string;
  workers: number;
  hours: number;
  price: string;
  phone: string;
  work_type: string;
  comment: string;
  created_at: string;
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
        toast({ title: 'Заявка отправлена!', description: 'Ваша заявка добавлена в список.' });
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
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Дополнительный комментарий..." rows={3} />
      <Button onClick={submit} disabled={loading} className="w-full rounded-xl font-semibold">
        {loading ? 'Отправка...' : 'Отправить заявку'}
      </Button>
    </div>
  );
};

const JobsSection = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [formOpen, setFormOpen] = useState(false);

  const loadJobs = async () => {
    try {
      const res = await fetch(JOBS_API);
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch { /* тихо */ }
  };

  useEffect(() => { loadJobs(); }, []);

  return (
    <section id="jobs" className="relative z-10 container mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Icon name="ClipboardList" size={24} className="text-primary" />
          <h2 className="text-2xl font-display font-bold">Заявки на работу</h2>
        </div>
        <Button onClick={() => setFormOpen(true)} className="rounded-xl font-semibold">
          <Icon name="Plus" size={16} />Подать заявку
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
          <Icon name="ClipboardList" size={40} className="mx-auto mb-3 opacity-30" />
          <p>Пока нет заявок. Будьте первым!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <div key={job.id} className="glass rounded-2xl p-5 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-sm">{job.work_type}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Icon name="MapPin" size={11} />{job.address}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">{job.created_at}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-secondary rounded-xl p-2 text-center">
                  <p className="text-lg font-bold">{job.workers}</p>
                  <p className="text-xs text-muted-foreground">рабочих</p>
                </div>
                <div className="bg-secondary rounded-xl p-2 text-center">
                  <p className="text-lg font-bold">{job.hours}</p>
                  <p className="text-xs text-muted-foreground">часов</p>
                </div>
                <div className="bg-secondary rounded-xl p-2 text-center">
                  <p className="text-sm font-bold truncate">{job.price || '—'}</p>
                  <p className="text-xs text-muted-foreground">цена</p>
                </div>
              </div>
              {job.comment && (
                <p className="text-xs text-muted-foreground italic mb-3 border-l-2 border-primary pl-2">{job.comment}</p>
              )}
              <a href={`tel:${job.phone}`} className="flex items-center gap-2 text-primary text-sm font-mono hover:underline">
                <Icon name="Phone" size={14} />{job.phone}
              </a>
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="glass border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Подать заявку на работу</DialogTitle>
          </DialogHeader>
          <JobForm onDone={() => { setFormOpen(false); loadJobs(); }} />
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default JobsSection;
