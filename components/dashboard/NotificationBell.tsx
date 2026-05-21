'use client';

import {
  Bell,
  BellOff,
  Info,
  CheckCircle,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

type NotifType = 'info' | 'success' | 'warning' | 'alert' | 'feature';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotifType;
  read: boolean;
  link: string | null;
  created_at: string;
}

const TYPE_ICON: Record<NotifType, React.ElementType> = {
  info:    Info,
  success: CheckCircle,
  warning: AlertTriangle,
  alert:   Bell,
  feature: Sparkles,
};

const TYPE_COLOR: Record<NotifType, string> = {
  info:    'text-accent',
  success: 'text-signal-green',
  warning: 'text-amber-400',
  alert:   'text-signal-red',
  feature: 'text-purple-400',
};

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen]                 = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) setNotifications(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const unread = notifications.filter(n => !n.read).length;

  async function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    });
  }

  async function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
  }

  async function clearAll() {
    setNotifications([]);
    await fetch('/api/notifications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
  }

  async function handleClick(n: Notification) {
    if (!n.read) markRead(n.id);
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg text-text-muted hover:text-text hover:bg-bg-elevated transition-colors"
        aria-label="Notifications"
      >
        <Bell size={17} strokeWidth={1.7} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-3.5 bg-signal-red text-white rounded-full font-mono text-[9px] font-black flex items-center justify-center px-0.5 leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-[360px] bg-bg-surface border border-border rounded-xl shadow-2xl flex flex-col max-h-[400px]">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
            <span className="font-bold text-sm text-text">Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="font-mono text-[10px] tracking-widest text-accent uppercase hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <BellOff size={28} className="text-text-dim" strokeWidth={1.5} />
                <p className="text-sm text-text-dim">No notifications yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {notifications.map(n => {
                  const Icon  = TYPE_ICON[n.type]  ?? Info;
                  const color = TYPE_COLOR[n.type] ?? 'text-accent';
                  return (
                    <li
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`px-4 py-3 cursor-pointer hover:bg-bg-elevated transition-colors ${!n.read ? 'bg-accent/5' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon size={15} className={`shrink-0 mt-0.5 ${color}`} strokeWidth={1.7} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold leading-snug ${!n.read ? 'text-text' : 'text-text-muted'}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-text-muted leading-relaxed mt-0.5">
                            {n.message}
                          </p>
                          <p className="font-mono text-[10px] text-text-dim mt-1">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5" />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border shrink-0">
              <button
                onClick={clearAll}
                className="font-mono text-[10px] tracking-widest text-text-dim uppercase hover:text-signal-red transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
