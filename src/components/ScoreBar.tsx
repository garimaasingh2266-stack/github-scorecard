export function ScoreBar({ label, score, note }: { label: string; score: number; note?: string }) {
  const pct = Math.max(0, Math.min(10, score)) * 10;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="font-mono text-sm tabular-nums text-accent">{score.toFixed(1)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {note ? <p className="text-xs leading-relaxed text-muted-foreground">{note}</p> : null}
    </div>
  );
}
