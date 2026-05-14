'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Search, ThumbsUp, ThumbsDown } from 'lucide-react';
import { chatbotData, type FAQ, type FAQCategory } from '@/lib/chatbotData';

const SESSION_OPENED_KEY = 'tradelog_chat_opened';
const SESSION_MESSAGES_KEY = 'tradelog_chat_messages';

type Extras =
  | { kind: 'categories' }
  | { kind: 'questions'; faqs: FAQ[]; categoryLabel: string }
  | { kind: 'feedback'; feedbackGiven: boolean };

type ChatMessage = {
  id: string;
  role: 'bot' | 'user';
  text: string;
  extras?: Extras;
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function botMsg(text: string, extras?: Extras): ChatMessage {
  return { id: uid(), role: 'bot', text, extras };
}

function userMsg(text: string): ChatMessage {
  return { id: uid(), role: 'user', text };
}

function fuzzySearch(query: string): FAQ[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const results: FAQ[] = [];
  for (const cat of chatbotData) {
    for (const faq of cat.faqs) {
      const haystack = (faq.question + ' ' + faq.answer).toLowerCase();
      if (words.every(w => haystack.includes(w))) results.push(faq);
    }
  }
  return results;
}

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'bot',
  text: "Hey! 👋 I'm here to help you with TradeLog Pro. Pick a topic below or type a question.",
  extras: { kind: 'categories' },
};

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [showDot, setShowDot] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [searchQuery, setSearchQuery] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowDot(!sessionStorage.getItem(SESSION_OPENED_KEY));
    try {
      const raw = sessionStorage.getItem(SESSION_MESSAGES_KEY);
      if (raw) {
        const msgs: ChatMessage[] = JSON.parse(raw);
        if (msgs.length) setMessages(msgs);
      }
    } catch {}
    const t = setTimeout(() => setShowPulse(false), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    sessionStorage.setItem(SESSION_MESSAGES_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (isOpen && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, isOpen, searchQuery]);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const panel = panelRef.current;
    function trapFocus(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const els = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
      );
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', trapFocus);
    return () => document.removeEventListener('keydown', trapFocus);
  }, [isOpen]);

  function openChat() {
    setIsOpen(true);
    if (showDot) {
      setShowDot(false);
      sessionStorage.setItem(SESSION_OPENED_KEY, 'true');
    }
  }

  function push(...msgs: ChatMessage[]) {
    setMessages(prev => [...prev, ...msgs]);
  }

  function handleCategorySelect(cat: FAQCategory) {
    push(
      userMsg(cat.label),
      botMsg(`Here are some questions about ${cat.label}:`, {
        kind: 'questions',
        faqs: cat.faqs,
        categoryLabel: cat.label,
      })
    );
  }

  function handleQuestionSelect(faq: FAQ) {
    setSearchQuery('');
    push(
      userMsg(faq.question),
      botMsg(faq.answer, { kind: 'feedback', feedbackGiven: false })
    );
  }

  function handleFeedback(id: string) {
    setMessages(prev =>
      prev.map(m =>
        m.id === id
          ? { ...m, extras: { kind: 'feedback' as const, feedbackGiven: true } }
          : m
      )
    );
  }

  function handleAskAnother() {
    push(botMsg('Sure! What else can I help you with?', { kind: 'categories' }));
  }

  const searchResults = searchQuery.trim() ? fuzzySearch(searchQuery) : [];

  return (
    <>
      {/* Chat panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="TradeLog Pro Support Chat"
        aria-hidden={!isOpen}
        className={[
          'fixed z-[51] flex flex-col overflow-hidden',
          'bg-bg-surface border border-border shadow-2xl',
          'transition-all duration-200',
          isOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none',
          // Mobile: full screen
          'inset-0 rounded-none',
          // Desktop: floating panel
          'sm:inset-auto sm:bottom-20 sm:right-6 sm:w-[380px] sm:max-h-[520px] sm:rounded-xl sm:origin-bottom-right',
        ].join(' ')}
      >
        {/* Header */}
        <div className="shrink-0 bg-bg-elevated border-b border-border px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
            <MessageCircle size={16} className="text-accent" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text">TradeLog Pro Support</p>
            <p className="text-xs text-text-dim">Typically replies instantly</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close support chat"
            className="p-1.5 rounded-lg text-text-dim hover:text-text hover:bg-bg-surface transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message body */}
        <div
          ref={bodyRef}
          className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0"
        >
          {searchQuery.trim() ? (
            <div className="flex flex-col gap-2">
              {searchResults.length > 0 ? (
                <>
                  <p className="text-xs text-text-dim">Results for &ldquo;{searchQuery}&rdquo;</p>
                  {searchResults.map((faq, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuestionSelect(faq)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-bg-elevated border border-border hover:border-accent/50 text-sm text-text transition-colors"
                    >
                      {faq.question}
                    </button>
                  ))}
                </>
              ) : (
                <p className="text-sm text-text-muted px-1 leading-relaxed">
                  I couldn&apos;t find an answer for that. Try a different question or contact our support team at{' '}
                  <a
                    href="https://tradelogpro.xyz/contact"
                    className="text-accent hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    tradelogpro.xyz/contact
                  </a>
                </p>
              )}
            </div>
          ) : (
            messages.map(msg => (
              <MessageItem
                key={msg.id}
                message={msg}
                onCategorySelect={handleCategorySelect}
                onQuestionSelect={handleQuestionSelect}
                onFeedback={handleFeedback}
                onAskAnother={handleAskAnother}
              />
            ))
          )}
        </div>

        {/* Search input */}
        <div className="shrink-0 border-t border-border p-3">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none"
            />
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a question..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search frequently asked questions"
              className="w-full bg-bg border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Floating trigger button */}
      <button
        onClick={isOpen ? () => setIsOpen(false) : openChat}
        aria-label={isOpen ? 'Close support chat' : 'Open support chat'}
        className={[
          'fixed bottom-6 right-6 z-50',
          'w-14 h-14 rounded-full bg-accent text-bg',
          'flex items-center justify-center',
          'shadow-lg hover:scale-110 active:scale-95 transition-all duration-200',
          showPulse && !isOpen ? 'animate-pulse-cyan' : '',
          isOpen ? 'max-sm:hidden' : '',
        ].filter(Boolean).join(' ')}
      >
        {showDot && !isOpen && (
          <span
            className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-signal-green border-2 border-bg"
            aria-hidden="true"
          />
        )}
        {isOpen ? (
          <X size={22} strokeWidth={2} />
        ) : (
          <MessageCircle size={22} strokeWidth={2} />
        )}
      </button>
    </>
  );
}

type MessageItemProps = {
  message: ChatMessage;
  onCategorySelect: (cat: FAQCategory) => void;
  onQuestionSelect: (faq: FAQ) => void;
  onFeedback: (id: string) => void;
  onAskAnother: () => void;
};

function MessageItem({
  message,
  onCategorySelect,
  onQuestionSelect,
  onFeedback,
  onAskAnother,
}: MessageItemProps) {
  const isBot = message.role === 'bot';
  const extras = message.extras;

  return (
    <div className={`flex flex-col gap-2 ${isBot ? 'items-start' : 'items-end'}`}>
      {isBot && (
        <span className="text-xs text-text-dim px-1 select-none">TradeLog Pro</span>
      )}

      {message.text && (
        <div
          className={[
            'px-3 py-2 rounded-lg text-sm leading-relaxed',
            isBot
              ? 'max-w-[85%] bg-bg-elevated text-text rounded-tl-none'
              : 'max-w-[85%] bg-accent/10 text-accent border border-accent/20 rounded-tr-none',
          ].join(' ')}
        >
          {message.text}
        </div>
      )}

      {extras?.kind === 'categories' && (
        <div className="grid grid-cols-2 gap-2 w-full">
          {chatbotData.map(cat => (
            <button
              key={cat.label}
              onClick={() => onCategorySelect(cat)}
              aria-label={`Browse ${cat.label} questions`}
              className="px-2 py-2 rounded-lg bg-bg-elevated border border-border hover:bg-border hover:border-accent/50 text-sm text-text text-center transition-colors"
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {extras?.kind === 'questions' && (
        <div className="flex flex-col gap-1.5 w-full">
          {extras.faqs.map((faq, i) => (
            <button
              key={i}
              onClick={() => onQuestionSelect(faq)}
              className="w-full text-left px-3 py-2 rounded-lg bg-bg-elevated border border-border hover:border-accent/50 text-sm text-text transition-colors"
            >
              {faq.question}
            </button>
          ))}
        </div>
      )}

      {extras?.kind === 'feedback' && (
        <div className="flex flex-col gap-2 w-full">
          {!extras.feedbackGiven ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-dim">Was this helpful?</span>
              <button
                onClick={() => onFeedback(message.id)}
                aria-label="Yes, this was helpful"
                className="p-1.5 rounded-lg text-text-dim hover:text-signal-green hover:bg-bg-elevated transition-colors"
              >
                <ThumbsUp size={14} />
              </button>
              <button
                onClick={() => onFeedback(message.id)}
                aria-label="No, this was not helpful"
                className="p-1.5 rounded-lg text-text-dim hover:text-signal-red hover:bg-bg-elevated transition-colors"
              >
                <ThumbsDown size={14} />
              </button>
            </div>
          ) : (
            <p className="text-xs text-text-dim">Thanks for your feedback! 🙏</p>
          )}
          <button
            onClick={onAskAnother}
            aria-label="Ask another question"
            className="text-xs text-accent hover:underline text-left w-fit"
          >
            Ask another question →
          </button>
        </div>
      )}
    </div>
  );
}
