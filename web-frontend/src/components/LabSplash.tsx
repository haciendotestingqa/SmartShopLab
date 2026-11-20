interface LabSplashProps {
  message?: string;
  error?: string | null;
  onRetry?: () => void;
}

export default function LabSplash({
  message = 'Waking up the lab…',
  error,
  onRetry,
}: LabSplashProps) {
  return (
    <div
      data-testid="lab-splash"
      className="flex min-h-[70vh] flex-col items-center justify-center gap-7 px-4 text-center animate-fade-in"
      role="status"
      aria-live="polite"
      aria-busy={!error}
    >
      <div className="relative">
        <div
          className="absolute -inset-6 rounded-[2rem] opacity-70 blur-3xl neon-glow"
          aria-hidden="true"
        />
        <img
          src="/smartshoplab-logo.jpg"
          alt="SmartShopLab"
          className="animate-splash-pulse relative h-40 w-40 rounded-2xl object-cover ring-2 ring-neon-pink/50 sm:h-52 sm:w-52"
        />
      </div>

      <div className="w-full max-w-xl rounded-2xl border border-neon-pink/25 bg-surface px-6 py-5 shadow-neon">
        <p className="text-xl font-bold text-text sm:text-2xl">
          {error ? 'Could not wake up the lab' : message}
        </p>
        {!error ? (
          <>
            <p className="mt-2 text-base font-semibold text-neon-pink">
              Loading the store
              <span className="animate-splash-dots ml-1 inline-flex gap-0.5" aria-hidden="true">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </p>
            <p className="mt-1 whitespace-nowrap text-sm text-text-muted">
              The API may take a few seconds to wake up (cold start).
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-text-muted">{error}</p>
        )}

        {!error && (
          <div
            className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-surface-muted"
            aria-hidden="true"
          >
            <div className="animate-splash-bar h-full w-2/5 rounded-full bg-neon-gradient" />
          </div>
        )}
      </div>

      {error && onRetry && (
        <button
          type="button"
          data-testid="splash-retry"
          onClick={onRetry}
          className="rounded-lg bg-neon-gradient px-6 py-3 font-semibold text-white shadow-neon transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-neon-pink focus:ring-offset-2 focus:ring-offset-background"
        >
          Retry
        </button>
      )}
    </div>
  );
}
