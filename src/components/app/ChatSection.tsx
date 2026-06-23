import { useRef } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { User, ChatMessage } from './types';

interface Props {
  user: User | null;
  messages: ChatMessage[];
  chatText: string;
  chatSending: boolean;
  setChatText: (v: string) => void;
  sendMessage: () => void;
  onOpenAuth: () => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
}

const ChatSection = ({ user, messages, chatText, chatSending, setChatText, sendMessage, onOpenAuth, chatEndRef }: Props) => {
  const myName = user ? (user.name || user.email) : null;

  return (
    <section id="chat" className="relative z-10 container mx-auto px-4 py-16">
      <div className="flex items-center gap-3 mb-8">
        <Icon name="MessageCircle" size={24} className="text-primary" />
        <h2 className="text-2xl font-display font-bold">Общий чат</h2>
        {!user && <span className="text-xs text-muted-foreground">(войдите чтобы писать)</span>}
      </div>
      <div className="glass rounded-2xl overflow-hidden flex flex-col max-w-3xl mx-auto" style={{ height: '480px' }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Icon name="MessageCircle" size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Пока нет сообщений. Начните общение!</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${myName && msg.user_name === myName ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {(msg.user_name || '?').charAt(0).toUpperCase()}
              </div>
              <div className={`max-w-[75%] ${myName && msg.user_name === myName ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`rounded-2xl px-4 py-2 ${myName && msg.user_name === myName ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-secondary rounded-tl-sm'}`}>
                  {!(myName && msg.user_name === myName) && (
                    <p className="text-xs font-semibold text-primary mb-1">{msg.user_name}</p>
                  )}
                  <p className="text-sm">{msg.text}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 px-1">{msg.created_at}</p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="border-t border-border p-3 flex gap-2">
          {user ? (
            <>
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Написать сообщение..."
                className="flex-1 bg-secondary rounded-xl px-4 py-2 text-sm outline-none placeholder:text-muted-foreground"
                maxLength={1000}
              />
              <Button onClick={sendMessage} disabled={chatSending || !chatText.trim()} className="rounded-xl px-4 shrink-0">
                <Icon name="Send" size={16} />
              </Button>
            </>
          ) : (
            <button onClick={onOpenAuth} className="w-full text-center text-sm text-muted-foreground py-2 hover:text-primary transition-colors">
              Войдите в аккаунт чтобы писать в чат →
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default ChatSection;
