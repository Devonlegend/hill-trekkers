"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Category } from "@/lib/types";
import { formatDate } from "@/lib/format";

interface CalendarTrip {
  id: string;
  title: string;
  slug: string;
  start_date: string | null;
  category_slug: string;
  seats_booked: number;
  capacity: number;
}

const COLORS: Record<string, string> = {
  hikes: "#c97b3d",
  "out-of-state-trips": "#2f6f5e",
  "out-in-the-wild": "#4c6b56",
  "hikers-day-out": "#8a7a4a",
  "tea-and-pep-meets": "#6d5b7a",
};

const QUIZ = [
  {
    q: "New to hiking?",
    options: [
      { label: "Brand new", slug: "hikers-day-out" },
      { label: "Some experience", slug: "hikes" },
      { label: "Bring it on", slug: "out-in-the-wild" },
    ],
  },
  {
    q: "How far will you travel?",
    options: [
      { label: "Local only", slug: "hikes" },
      { label: "A short trip away", slug: "hikers-day-out" },
      { label: "Anywhere", slug: "out-of-state-trips" },
    ],
  },
  {
    q: "What's the vibe?",
    options: [
      { label: "Chill & social", slug: "tea-and-pep-meets" },
      { label: "Adventure", slug: "out-in-the-wild" },
      { label: "Getting outdoors", slug: "hikes" },
    ],
  },
];

export default function PlanYourAdventurePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [trips, setTrips] = useState<CalendarTrip[]>([]);
  const [quizStep, setQuizStep] = useState(0);
  const [quizResult, setQuizResult] = useState<string | null>(null);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    api<Category[]>("/api/categories").then(setCategories).catch(() => {});
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    const to = new Date();
    to.setMonth(to.getMonth() + 6);
    api<CalendarTrip[]>(
      `/api/trips/calendar?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`
    )
      .then(setTrips)
      .catch(() => {});
  }, []);

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: (number | null)[] = [
      ...Array(startOffset).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    return cells;
  }, [month]);

  const tripsByDay = useMemo(() => {
    const map = new Map<string, CalendarTrip[]>();
    for (const t of trips) {
      if (!t.start_date) continue;
      const key = t.start_date.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return map;
  }, [trips]);

  const selectedKey = selectedDay
    ? `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : null;
  const selectedTrips = selectedKey ? tripsByDay.get(selectedKey) ?? [] : [];

  const catName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;

  return (
    <>
      <section className="bg-forest-deep py-14 text-white">
        <div className="container-x">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/60">Plan Your Adventure</p>
          <h1 className="text-3xl font-extrabold md:text-4xl">Find your next trek</h1>
          <p className="mt-3 max-w-xl text-white/75">
            Not sure where to start? Answer three quick questions and we&apos;ll point you to the right activity.
          </p>
        </div>
      </section>

      {/* Quiz */}
      <section className="container-x py-12">
        <div className="card">
          <h2 className="text-xl font-bold text-forest">Find your fit</h2>
          {quizResult ? (
            <div className="mt-6 text-center">
              <p className="text-foreground/70">We think you&apos;ll love:</p>
              <p className="mt-2 text-2xl font-extrabold text-trail-deep capitalize">{catName(quizResult)}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href={`/activities/${quizResult}`} className="btn-forest">Explore {catName(quizResult)}</Link>
                <button onClick={() => { setQuizStep(0); setQuizResult(null); }} className="btn-ghost">Restart quiz</button>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                <div className="h-full bg-trail transition-all" style={{ width: `${((quizStep + 1) / QUIZ.length) * 100}%` }} />
              </div>
              <p className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
                Question {quizStep + 1} of {QUIZ.length}
              </p>
              <p className="mt-2 text-xl font-bold text-forest">{QUIZ[quizStep].q}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {QUIZ[quizStep].options.map((o) => (
                  <button
                    key={o.label}
                    onClick={() => {
                      if (quizStep + 1 < QUIZ.length) setQuizStep(quizStep + 1);
                      else setQuizResult(o.slug);
                    }}
                    className="btn-ghost"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Calendar */}
      <section className="container-x pb-12">
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-forest">Trip calendar</h2>
            <div className="flex gap-2">
              <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="btn-ghost px-4! py-2!">←</button>
              <span className="grid place-items-center rounded-lg bg-forest px-4 text-sm font-bold text-white">
                {month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
              </span>
              <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="btn-ghost px-4! py-2!">→</button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {Object.entries(COLORS).map(([slug, color]) => (
              <span key={slug} className="flex items-center gap-1.5 text-xs text-foreground/60">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                {catName(slug)}
              </span>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 overflow-x-auto text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <span key={d} className="py-2 text-xs font-semibold uppercase text-foreground/50">{d}</span>
            ))}
            {days.map((day, i) => {
              const key = day
                ? `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                : null;
              const dayTrips = key ? tripsByDay.get(key) ?? [] : [];
              const colors = dayTrips.map((t) => COLORS[t.category_slug] ?? "#4c6b56");
              return (
                <button
                  key={i}
                  disabled={!day}
                  onClick={() => {
                    if (day != null) setSelectedDay(selectedDay === String(day) ? null : String(day));
                  }}
                  className={`flex min-h-16 flex-col items-center justify-center rounded-lg p-1 text-sm transition-colors ${
                    day ? "hover:bg-forest/5 cursor-pointer" : ""
                  } ${selectedDay === day ? "bg-forest text-white" : ""}`}
                >
                  {day}
                  <span className="mt-1 flex gap-1">
                    {colors.slice(0, 3).map((c, j) => (
                      <span key={j} className="h-1.5 w-1.5 rounded-full" style={{ background: selectedDay === day ? "#fff" : c }} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <h3 className="font-bold text-forest">
              {selectedKey ? formatDate(selectedKey) : "Click a date to see trips"}
            </h3>
            {selectedTrips.length === 0 ? (
              selectedKey && <p className="mt-2 text-sm text-foreground/60">No trips on this day.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {selectedTrips.map((t) => (
                  <Link
                    key={t.id}
                    href={`/activities/${t.category_slug}/${t.slug}`}
                    className="flex items-center justify-between rounded-xl border border-black/10 p-4 hover:border-forest"
                  >
                    <div>
                      <p className="font-semibold text-forest">{t.title}</p>
                      <p className="text-xs text-foreground/60">{catName(t.category_slug)} · {t.seats_booked}/{t.capacity} booked</p>
                    </div>
                    <span className="text-sm font-semibold text-trail-deep">View →</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Group request + guide */}
      <section className="container-x grid gap-6 pb-16 md:grid-cols-2">
        <div className="card">
          <h2 className="text-xl font-bold text-forest">Bring your group</h2>
          <p className="mt-2 text-sm text-foreground/60">
            Planning a corporate or friends&apos; outing? Tell us what you need and we&apos;ll get back to you.
          </p>
          <GroupRequestForm />
        </div>
        <div className="card flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-forest">Packing guide</h2>
            <p className="mt-2 text-sm text-foreground/60">
              Don&apos;t forget your boots. Download our free packing checklist so you show up ready.
            </p>
          </div>
          <div className="mt-6">
            <a href="/packing-checklist.pdf" className="btn-trail">Download packing checklist</a>
          </div>
        </div>
      </section>
    </>
  );
}

function GroupRequestForm() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [groupSize, setGroupSize] = useState("");
  const [dates, setDates] = useState("");
  const [message, setMessage] = useState("");

  const field = "w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-forest";
  const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground/50";

  if (sent) {
    return <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Thanks! We&apos;ve got your request — we&apos;ll email you soon.</p>;
  }

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </div>
        <div>
          <label className={label}>Email</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>Group size</label>
          <input required value={groupSize} onChange={(e) => setGroupSize(e.target.value)} className={field} placeholder="e.g. 10 people" />
        </div>
        <div>
          <label className={label}>Preferred dates</label>
          <input value={dates} onChange={(e) => setDates(e.target.value)} className={field} placeholder="e.g. Nov 2026" />
        </div>
      </div>
      <div>
        <label className={label}>Message</label>
        <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className={`${field} resize-y`} />
      </div>
      <button type="submit" className="btn-forest">Send group request</button>
    </form>
  );
}
