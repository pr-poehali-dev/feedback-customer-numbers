export const API = 'https://functions.poehali.dev/f89f476c-1066-4f2b-b1fa-53c7e98cfd2f';
export const AUTH_API = 'https://functions.poehali.dev/d1b46d26-6b11-4be2-8267-1081db5bb482';
export const CHAT_API = 'https://functions.poehali.dev/4900b2e3-7dad-46ac-bb86-767cec0438f1';

export interface User { id: number; email: string; name: string; }

export type Verdict = 'safe' | 'risky' | 'scam';

export interface NumberRecord {
  phone: string;
  rating: number;
  reviews: number;
  verdict: Verdict;
  tags: string[];
  lastReview: string;
}

export interface Member {
  id: number;
  name: string;
  joined: string;
  work_direction: string;
  organization: string;
}

export interface ChatMessage {
  id: number;
  user_name: string;
  text: string;
  created_at: string;
}

export const verdictMeta: Record<Verdict, { label: string; color: string; icon: string }> = {
  safe: { label: 'Надёжный', color: 'text-success', icon: 'ShieldCheck' },
  risky: { label: 'Осторожно', color: 'text-warning', icon: 'ShieldAlert' },
  scam: { label: 'Мошенник', color: 'text-destructive', icon: 'ShieldX' },
};

export const navItems = [
  { id: 'check', label: 'Проверка', icon: 'Search' },
  { id: 'reviews', label: 'Отзывы', icon: 'MessageSquare' },
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