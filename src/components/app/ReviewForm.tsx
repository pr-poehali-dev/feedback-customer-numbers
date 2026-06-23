import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { API } from './types';

interface Props {
  defaultPhone?: string;
  onDone: () => void;
}

const ReviewForm = ({ defaultPhone, onDone }: Props) => {
  const [phone, setPhone] = useState(defaultPhone || '');
  const [rating, setRating] = useState(5);
  const [author, setAuthor] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!phone.trim() || !comment.trim()) {
      toast({ title: 'Заполните номер и текст отзыва', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, rating, author, customer_name: customerName, object_address: address, comment, tags }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Отзыв добавлен!', description: 'Спасибо, что помогаете сообществу.' });
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
    <div className="space-y-4">
      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Номер телефона" className="font-mono" />
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Оценка:</span>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" onClick={() => setRating(i)}>
            <Icon name="Star" size={24} className={i <= rating ? 'text-warning fill-warning' : 'text-muted'} />
          </button>
        ))}
      </div>
      <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Ваше имя (необязательно)" />
      <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Имя заказчика" />
      <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Адрес объекта (улица, город)" />
      <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Теги через запятую: Платит вовремя, Адекватный" />
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Опишите опыт работы с заказчиком..." rows={4} />
      <Button onClick={submit} disabled={loading} className="w-full rounded-xl font-semibold">
        {loading ? 'Отправка...' : 'Опубликовать отзыв'}
      </Button>
    </div>
  );
};

export default ReviewForm;
