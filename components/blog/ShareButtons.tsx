'use client';

import { useState } from 'react';
import { Twitter, Linkedin, Facebook, Link2 } from 'lucide-react';

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface ShareButtonsProps {
  title: string;
  slug: string;
  label?: string;
}

export function ShareButtons({ title, slug, label }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const postUrl = `https://tradelogpro.xyz/blog/${slug}`;
  const encodedUrl = encodeURIComponent(postUrl);
  const encodedTitle = encodeURIComponent(title);

  const platforms = [
    {
      label: 'X',
      icon: <Twitter size={16} />,
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      label: 'LinkedIn',
      icon: <Linkedin size={16} />,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      label: 'Facebook',
      icon: <Facebook size={16} />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: 'WhatsApp',
      icon: <WhatsAppIcon />,
      href: `https://wa.me/?text=${encodeURIComponent(`${title} ${postUrl}`)}`,
    },
  ];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(postUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {label && (
        <p className="text-sm text-text-muted mb-4">{label}</p>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        {platforms.map(({ label: btnLabel, icon, href }) => (
          <a
            key={btnLabel}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 group"
          >
            <span className="w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-bg-elevated text-text-muted group-hover:text-accent group-hover:border-accent/40 transition">
              {icon}
            </span>
            <span className="font-mono text-[9px] tracking-widest text-text-dim uppercase">{btnLabel}</span>
          </a>
        ))}
        <button onClick={handleCopy} className="flex flex-col items-center gap-1.5 group">
          <span className="w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-bg-elevated text-text-muted group-hover:text-accent group-hover:border-accent/40 transition">
            <Link2 size={16} />
          </span>
          <span className="font-mono text-[9px] tracking-widest text-text-dim uppercase">
            {copied ? 'Copied!' : 'Copy'}
          </span>
        </button>
      </div>
    </div>
  );
}

export function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const postUrl = `https://tradelogpro.xyz/blog/${slug}`;

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(postUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Link copied!' : 'Copy link'}
      className="relative p-1.5 rounded-lg text-text-dim hover:text-accent transition"
    >
      <Link2 size={13} />
      {copied && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-accent text-bg text-[10px] font-mono px-2 py-0.5 rounded whitespace-nowrap pointer-events-none">
          Link copied!
        </span>
      )}
    </button>
  );
}
