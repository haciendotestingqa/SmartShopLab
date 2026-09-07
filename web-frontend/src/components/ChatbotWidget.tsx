import { FormEvent, useState } from 'react';
import { sendChatMessage } from '../api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isHallucination?: boolean;
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu asistente SmartShopLab. ¿En qué puedo ayudarte hoy?',
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
        { role: 'assistant', content: 'Lo siento, hubo un error. Intenta de nuevo.' },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        data-testid="chatbot-fab"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-xl transition hover:scale-105 hover:bg-violet-600 focus:outline-none focus:ring-4 focus:ring-accent/40"
        aria-label="Abrir asistente de IA"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 p-4 sm:items-center sm:justify-center"
          role="presentation"
          onClick={() => setIsOpen(false)}
        >
          <div
            data-testid="chatbot-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Asistente SmartShopLab"
            className="flex h-[32rem] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-primary-dark to-accent px-4 py-4 text-white">
              <div>
                <h2 className="text-lg font-bold">Asistente SmartShopLab</h2>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 rounded-full bg-green-400" aria-hidden="true" />
                  <span data-testid="chatbot-status">Online</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Cerrar chat"
              >
                ✕
              </button>
            </div>

            <div
              data-testid="chat-messages"
              className="flex-1 space-y-3 overflow-y-auto bg-background p-4"
            >
              {messages.map((msg, i) => (
                <div
                  key={`${msg.role}-${i}`}
                  data-testid={msg.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary-main text-white'
                        : msg.isHallucination
                          ? 'border border-amber-300 bg-amber-50 text-text'
                          : 'bg-white text-text shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
              <div className="flex gap-2">
                <input
                  data-testid="chat-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe tu mensaje..."
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:ring-accent"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  data-testid="chat-send"
                  disabled={isSending || !input.trim()}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-violet-600 disabled:opacity-50"
                >
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
