export function SeatsRemaining({ seatsBooked, capacity }: { seatsBooked: number; capacity: number }) {
  const remaining = Math.max(capacity - seatsBooked, 0);
  const soldOut = remaining <= 0;
  const nearlyFull = !soldOut && remaining <= 5;
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className={soldOut ? "font-semibold text-trail-deep" : "text-foreground/60"}>
        {soldOut ? "Sold out" : `${remaining} of ${capacity} seats left`}
      </span>
      {nearlyFull && <span className="font-semibold text-trail-deep">Almost full</span>}
    </div>
  );
}
