const TIKTOK_URL = 'https://www.tiktok.com/@haciendotestingqa';
const YOUTUBE_URL = 'https://www.youtube.com/@haciendotestingqa';

interface SiteFooterProps {
  toast?: string | null;
}

export default function SiteFooter({ toast = null }: SiteFooterProps) {
  return (
    <footer
      data-testid="site-footer"
      className="sticky bottom-0 z-40 mt-auto border-t border-neon-pink/25 bg-surface px-4 py-6 text-center shadow-[0_-8px_24px_rgba(10,9,18,0.12)]"
    >
      {toast ? (
        <div
          data-testid="cart-toast"
          role="status"
          aria-live="polite"
          className="mx-auto mb-4 w-[min(92vw,24rem)] animate-fade-in rounded-xl border border-neon-pink/30 bg-background px-4 py-3 text-sm font-semibold text-text shadow-neon"
        >
          {toast}
        </div>
      ) : null}
      <p className="text-sm text-text">
        by{' '}
        <span className="font-semibold text-neon-gradient">@haciendotestingqa</span>
      </p>
      <p className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm">
        <a
          href={TIKTOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-neon-pink/40 bg-neon-gradient px-4 py-1.5 font-semibold text-white shadow-neon transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-neon-pink"
        >
          TikTok
        </a>
        <a
          href={YOUTUBE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-neon-orange/50 bg-surface px-4 py-1.5 font-semibold text-neon-orange shadow-sm transition hover:border-neon-orange hover:bg-neon-orange/10 focus:outline-none focus:ring-2 focus:ring-neon-orange"
        >
          YouTube
        </a>
      </p>
    </footer>
  );
}
