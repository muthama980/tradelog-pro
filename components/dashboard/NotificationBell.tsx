'use client';

import { Bell } from 'lucide-react';
import { useState } from 'react';

interface Notification {
  id: number;
  message: string;
  date: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    message: 'Welcome to TradeLog Pro! Start by logging your first trade.',
    date: 'Today',
    read: false,
  },
  {
    id: 2,
    message: 'New feature: Connect your Binance account for auto-sync',
    date: 'Yesterday',
    read: false,
  },
  {
    id: 3,
    message: "AI Coach coming soon — we'll notify you when it's ready",
    date: '2 days ago',
    read: true,
  },
];

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);

  const unread = notifications.filter(n => !n.read).length;

  function markRead(id: number) {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  }

  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg text-text-muted hover:text-text hover:bg-bg-elevated transition-colors"
        aria-label="Notifications"
      >
        <Bell size={17} strokeWidth={1.7} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-accent text-bg rounded-full font-mono text-[9px] font-black flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-40 w-80 bg-bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="font-bold text-sm text-text">Notifications</span>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="font-mono text-[10px] tracking-widest text-accent uppercase hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <ul className="divide-y divide-border/50 max-h-80 overflow-y-auto">
              {notifications.map(n => (
                <li
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`px-4 py-3 cursor-pointer hover:bg-bg-elevated transition-colors ${!n.read ? 'bg-accent/5' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${!n.read ? 'bg-accent' : 'bg-transparent'}`}
                    />
                    <div>
                      <p className={`text-sm leading-snug ${!n.read ? 'text-text' : 'text-text-muted'}`}>
                        {n.message}
                      </p>
                      <p className="font-mono text-[10px] text-text-dim mt-1">{n.date}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
