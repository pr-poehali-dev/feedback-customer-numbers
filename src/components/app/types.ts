export const API = 'https://functions.poehali.dev/f89f476c-1066-4f2b-b1fa-53c7e98cfd2f';
export const AUTH_API = 'https://functions.poehali.dev/d1b46d26-6b11-4be2-8267-1081db5bb482';
export const CHAT_API = 'https://functions.poehali.dev/4900b2e3-7dad-46ac-bb86-767cec0438f1';

export interface User { id: number; email: string; name: string; }

export type Verdict = 'safe' | 'risky' | 'scam';

export interface ReviewItem {
  id?: number;
  rating: number;
  verdict: Verdict;
  author: string;
  comment: string;
  tags: string[];
  createdAt: string | null;
  customerName: string;
  objectAddress: string;
  authorPhone?: string;
}

export const getParticipantPhone = () => localStorage.getItem('ms_participant_phone') || '';

export interface NumberRecord {
  phone: string;
  rating: number;
  reviews: number;
  verdict: Verdict;
  tags: string[];
  lastReview: string;
  reviewList?: ReviewItem[];
}

export interface Member {
  id: number;
  name: string;
  joined: string;
  work_direction: string;
  organization: string;
}

export interface ChatReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface ChatMessage {
  id: number;
  user_name: string;
  text: string;
  created_at: string;
  time?: string;
  author_phone?: string;
  image_url?: string;
  image_urls?: string[];
  audio_url?: string;
  reactions?: ChatReaction[];
}

export const verdictMeta: Record<Verdict, { label: string; color: string; icon: string }> = {
  safe: { label: 'Надёжный', color: 'text-success', icon: 'ShieldCheck' },
  risky: { label: 'Осторожно', color: 'text-warning', icon: 'ShieldAlert' },
  scam: { label: 'Мошенник', color: 'text-destructive', icon: 'ShieldX' },
};

export const reviewWord = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'отзыв';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'отзыва';
  return 'отзывов';
};

export const numberWord = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'номер';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'номера';
  return 'номеров';
};

export const navItems = [
  { id: 'check', label: 'Проверка', icon: 'Search' },
  { id: 'members', label: 'Участники', icon: 'Users' },
  { id: 'chat', label: 'Чат', icon: 'MessageCircle' },
  { id: 'support', label: 'Контакты', icon: 'LifeBuoy' },
];

export const getToken = () => localStorage.getItem('ms_token') || '';

export const saveSession = (token: string, user: User) => {
  localStorage.setItem('ms_token', token);
  localStorage.setItem('ms_user', JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem('ms_token');
  localStorage.removeItem('ms_user');
};