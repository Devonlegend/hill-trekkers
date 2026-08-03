export function SeatsRemaining({ seatsBooked, capacity }: { seatsBooked: number; capacity: number }) {
  const remaining = Math.max(capacity - seatsBooked, 0);
  const pct = Math.min((seatsBooked / capacity) * 100, 100);
  const nearlyFull = remaining <= 5;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">
          {remaining > 0 ? `${remaining} of ${capacity} seats left` : "Sold out"}
        </span>
        {nearlyFull && remaining > 0 && (
          <span className="rounded-full bg-trail/15 px-2 py-0.5 font-semibold text-trail-deep">
            Almost full
          </span>
        )}
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
        <div
          className={`h-full rounded-full ${nearlyFull ? "bg-trail" : "bg-moss"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
