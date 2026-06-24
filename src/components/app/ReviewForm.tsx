import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { API, getParticipantPhone, ReviewItem } from './types';

interface Props {
  defaultPhone?: string;
  editReview?: ReviewItem;
  onDone: () => void;
}

const ReviewForm = ({ defaultPhone, editReview, onDone }: Props) => {
  const isEdit = !!editReview;
  const [phone, setPhone] = useState(defaultPhone || '');
  const [rating, setRating] = useState(editReview?.rating || 5);
  const [author, setAuthor] = useState(editReview?.author && editReview.author !== 'Аноним' ? editReview.author : '');
  const [customerName, setCustomerName] = useState(editReview?.customerName || '');
  const [address, setAddress] = useState(editReview?.objectAddress || '');
  const [comment, setComment] = useState(editReview?.comment || '');
  const [tags, setTags] = useState(editReview?.tags?.join(', ') || '');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!isEdit && !phone.trim()) {
      toast({ title: 'Заполните номер', variant: 'destructive' });
      return;
    }
    if (!comment.trim()) {
      toast({ title: 'Заполните текст отзыва', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const authorPhone = getParticipantPhone();
    try {
      const res = await fetch(API, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isEdit
            ? { id: editReview!.id, rating, customer_name: customerName, object_address: address, comment, tags, author_phone: authorPhone }
            : { phone, rating, author, customer_name: customerName, object_address: address, comment, tags, author_phone: authorPhone }
        ),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: isEdit ? 'Отзыв обновлён!' : 'Отзыв добавлен!', description: 'Спасибо, что помогаете сообществу.' });
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
      {!isEdit && (
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Номер телефона" className="font-mono" />
      )}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Оценка:</span>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" onClick={() => setRating(i)}>
            <Icon name="Star" size={24} className={i <= rating ? 'text-warning fill-warning' : 'text-muted'} />
          </button>
        ))}
      </div>
      {!isEdit && (
        <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Ваше имя (необязательно)" />
      )}
      <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Имя заказчика" />
      <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Адрес объекта (улица, город)" />
      <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Теги через запятую: Платит вовремя, Адекватный" />
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Опишите опыт работы с заказчиком..." rows={4} />
      <Button onClick={submit} disabled={loading} className="w-full rounded-xl font-semibold">
        {loading ? 'Отправка...' : isEdit ? 'Сохранить изменения' : 'Опубликовать отзыв'}
      </Button>
    </div>
  );
};

export default ReviewForm;
