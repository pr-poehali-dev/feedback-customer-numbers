import { useState } from 'react';
import Icon from '@/components/ui/icon';

interface Props {
  phone: string;
  className?: string;
}

const maskPhone = (p?: string) => {
  const digits = (p || '').replace(/\D/g, '');
  const last10 = digits.slice(-10);
  if (last10.length < 4) return '+7 ••• ••• •• ••';
  const code = last10.slice(0, 3);
  return `+7 ${code} ••• •• ••`;
};

const MaskedPhone = ({ phone, className }: Props) => {
  const [revealed, setRevealed] = useState(false);

  return (
    <span className={`inline-flex items-center gap-2 ${className || ''}`}>
      <span>{revealed ? phone : maskPhone(phone)}</span>
      {!revealed && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setRevealed(true);
          }}
          className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-normal font-sans text-muted-foreground hover:text-primary transition-colors shrink-0"
          title="Показать номер"
        >
          <Icon name="Eye" size={12} />
          Показать
        </button>
      )}
    </span>
  );
};

export default MaskedPhone;
