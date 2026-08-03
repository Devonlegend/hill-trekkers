"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Skeleton } from "@/components/Skeleton";
import { formatKobo } from "@/lib/format";

interface TierDraft {
  key: number;
  tier_name: string;
  price_kobo: number;
  valid_from: string;
  valid_until: string;
}

interface AdminTrip {
  id: string;
  title: string;
  slug: string;
  status: string;
  start_date: string | null;
  pricing_tiers: {
    id: string;
    tier_name: string;
    price_kobo: number;
    valid_from: string;
    valid_until: string;
  }[];
}

function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PricingEditorPage() {
  const params = useParams<{ id: string }>();
  const [trip, setTrip] = useState<AdminTrip | null>(null);
  const [tiers, setTiers] = useState<TierDraft[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const t = await api<AdminTrip>(`/api/admin/trips/${params.id}`);
      setTrip(t);
      setTiers(
        t.pricing_tiers.map((tier, i) => ({
          key: i,
          tier_name: tier.tier_name,
          price_kobo: tier.price_kobo,
          valid_from: toDateTimeLocal(tier.valid_from),
          valid_until: toDateTimeLocal(tier.valid_until),
        }))
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load trip");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const nairaToKobo = (n: number) => Math.round(n * 100);

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);
    const payload = {
      tiers: tiers.map((t) => ({
        tier_name: t.tier_name,
        price_kobo: nairaToKobo(t.price_kobo),
        valid_from: new Date(t.valid_from).toISOString(),
        valid_until: new Date(t.valid_until).toISOString(),
      })),
    };
    try {
      await api(`/api/admin/trips/${params.id}/pricing-tiers`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save tiers");
    } finally {
      setSaving(false);
    }
  }

  const addTier = () => {
    const last = tiers[tiers.length - 1];
    const start = last ? new Date(last.valid_until) : new Date();
    const end = new Date(start.getTime() + 15 * 86400000);
    setTiers((prev) => [
      ...prev,
      {
        key: Date.now(),
        tier_name: `Tier ${prev.length + 1}`,
        price_kobo: prev.length > 0 ? prev[prev.length - 1].price_kobo + 50000 : 100000,
        valid_from: toDateTimeLocal(start.toISOString()),
        valid_until: toDateTimeLocal(end.toISOString()),
      },
    ]);
  };

  if (error && !trip) {
    return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  }

  if (!trip) {
    return <Skeleton className="h-64" />;
  }

  const input = "w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-forest";

  return (
    <div>
      <Link href="/admin" className="text-sm text-foreground/60 hover:underline">← Trips</Link>
      <h1 className="mt-2 text-2xl font-bold text-forest">{trip.title}</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Status: <span className="font-semibold capitalize">{trip.status}</span> · Edit pricing tiers below.
      </p>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      {saved && <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">Tiers saved.</p>}

      <div className="card mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-forest">Pricing tiers</h2>
          <button onClick={addTier} className="btn-ghost !px-4 !py-2 text-xs">+ Add tier</button>
        </div>
        <p className="mt-1 text-xs text-foreground/50">
          Price is in Naira here (stored as kobo). Tiers must not overlap in time.
        </p>

        <div className="mt-4 space-y-3">
          {tiers.length === 0 && (
            <p className="text-sm text-foreground/50">No tiers yet. Add at least one before publishing.</p>
          )}
          {tiers.map((t, i) => (
            <div key={t.key} className="grid gap-3 rounded-xl border border-black/10 p-4 sm:grid-cols-[1fr_120px_1fr_1fr_auto]">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-foreground/50">Name</label>
                <input
                  className={input}
                  value={t.tier_name}
                  onChange={(e) =>
                    setTiers((prev) => prev.map((x) => (x.key === t.key ? { ...x, tier_name: e.target.value } : x)))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-foreground/50">Price (₦)</label>
                <input
                  type="number"
                  min={1}
                  className={input}
                  value={t.price_kobo}
                  onChange={(e) =>
                    setTiers((prev) => prev.map((x) => (x.key === t.key ? { ...x, price_kobo: Number(e.target.value) } : x)))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-foreground/50">Valid from</label>
                <input
                  type="datetime-local"
                  className={input}
                  value={t.valid_from}
                  onChange={(e) =>
                    setTiers((prev) => prev.map((x) => (x.key === t.key ? { ...x, valid_from: e.target.value } : x)))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-foreground/50">Valid until</label>
                <input
                  type="datetime-local"
                  className={input}
                  value={t.valid_until}
                  onChange={(e) =>
                    setTiers((prev) => prev.map((x) => (x.key === t.key ? { ...x, valid_until: e.target.value } : x)))
                  }
                />
              </div>
              <button
                onClick={() => setTiers((prev) => prev.filter((x) => x.key !== t.key))}
                className="mt-5 grid h-9 w-9 place-items-center self-end rounded-lg text-foreground/50 hover:bg-red-50 hover:text-red-600"
                title="Remove tier"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {tiers.length > 0 && (
          <div className="mt-4 rounded-xl bg-sand/60 p-4 text-sm">
            <p className="mb-2 font-semibold text-forest">Live preview</p>
            <ul className="space-y-1">
              {tiers.map((t, i) => (
                <li key={t.key} className="flex justify-between text-foreground/70">
                  <span>{t.tier_name}</span>
                  <span>
                    {formatKobo(nairaToKobo(t.price_kobo))} · {new Date(t.valid_from).toLocaleDateString()} → {new Date(t.valid_until).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={save} disabled={saving} className="btn-forest">
            {saving ? "Saving…" : "Save tiers"}
          </button>
          {trip.status !== "published" && tiers.length > 0 && (
            <button
              onClick={async () => {
                await save();
                await api(`/api/admin/trips/${params.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({ status: "published" }),
                });
                await load();
              }}
              className="btn-trail"
            >
              Save & publish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
