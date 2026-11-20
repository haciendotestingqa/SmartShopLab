import { FormEvent, useState } from 'react';
import { sendChatMessage } from '../api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isHallucination?: boolean;
}

const ASSISTANT_NAME = 'Lumina';
const ASSISTANT_LABEL = `Assistant (${ASSISTANT_NAME})`;

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi! I am the SmartShopLab assistant (${ASSISTANT_NAME}). How can I help you today?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setIsSending(true);

    try {
      const response = await sendChatMessage(text, sessionId);
      setSessionId(response.sessionId);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.reply,
          isHallucination: response.isHallucination,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        <div
          className="animate-fab-bounce max-w-[11rem] rounded-2xl border border-neon-pink/40 bg-surface px-3 py-2 text-right text-xs font-semibold text-text shadow-neon sm:max-w-[13rem] sm:text-sm"
          aria-hidden="true"
        >
          Catalog questions?
          <span className="mt-0.5 block bg-neon-gradient bg-clip-text text-transparent">
            Chat with the assistant ({ASSISTANT_NAME})
          </span>
        </div>
        <button
          type="button"
          data-testid="chatbot-fab"
          onClick={() => setIsOpen(true)}
          className="animate-fab-pulse flex h-16 w-16 items-center justify-center rounded-full bg-neon-gradient text-white shadow-neon transition hover:scale-105 hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-neon-pink/40"
          aria-label={`Open AI assistant (${ASSISTANT_NAME})`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end bg-black/50 p-4 sm:items-center sm:justify-center"
          role="presentation"
          onClick={() => setIsOpen(false)}
        >
          <div
            data-testid="chatbot-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`SmartShopLab Assistant (${ASSISTANT_NAME})`}
            className="flex h-[32rem] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-neon-pink/25 bg-surface shadow-neon"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-neon-gradient px-4 py-4 text-white">
              <div>
                <h2 className="text-lg font-bold">{ASSISTANT_LABEL}</h2>
                <p className="text-xs text-white/90">SmartShopLab</p>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 rounded-full bg-white" aria-hidden="true" />
                  <span data-testid="chatbot-status">Online</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>

            <div data-testid="chat-messages" className="flex-1 space-y-3 overflow-y-auto bg-background p-4">
              {messages.map((msg, i) => (
                <div
                  key={`${msg.role}-${i}`}
                  data-testid={msg.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-neon-pink text-white'
                        : msg.isHallucination
                          ? 'border border-neon-yellow/50 bg-surface-muted text-text'
                          : 'border border-neon-pink/15 bg-surface text-text shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="border-t border-neon-pink/15 p-4">
              <div className="flex gap-2">
                <input
                  data-testid="chat-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 rounded-lg border border-neon-pink/25 bg-surface px-3 py-2 text-sm text-text focus:border-neon-orange focus:ring-neon-orange"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  data-testid="chat-send"
                  disabled={isSending || !input.trim()}
                  className="rounded-lg bg-neon-gradient px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
