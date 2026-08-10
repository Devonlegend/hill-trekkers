"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Category } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { Reveal } from "@/components/Reveal";
import { ArrowRight, CaretLeft, CaretRight, DownloadSimple } from "@phosphor-icons/react";

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
  hikes: "#c9702f",
  "out-of-state-trips": "#2f6f5e",
  "out-in-the-wild": "#55755f",
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
      <section className="bg-forest-deep py-14 text-white md:py-16">
        <div className="container-x">
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Find your next trek
          </h1>
          <p className="mt-4 max-w-xl leading-relaxed text-white/70">
            Not sure where to start? Answer three quick questions and we&apos;ll
            point you to the right activity. Then check the calendar to pick a date.
          </p>
        </div>
      </section>

      {/* Quiz */}
      <section className="container-x py-14 md:py-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-forest text-white">
            <div className="contour-pattern absolute inset-0 opacity-40" />
            <div className="relative p-8 md:p-12">
              {quizResult ? (
                <div className="flex flex-col items-start gap-6">
                  <p className="text-white/65">We think you&apos;ll love:</p>
                  <p className="text-3xl font-extrabold capitalize tracking-tight md:text-4xl">
                    {catName(quizResult)}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/activities/${quizResult}`} className="btn-trail">
                      Explore {catName(quizResult)}
                      <ArrowRight size={15} weight="bold" />
                    </Link>
                    <button
                      onClick={() => {
                        setQuizStep(0);
                        setQuizResult(null);
                      }}
                      className="btn-ghost-light"
                    >
                      Restart quiz
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-white/55">
                    {quizStep + 1} of {QUIZ.length}
                  </p>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
                    {QUIZ[quizStep].q}
                  </h2>
                  <div className="mt-7 flex max-w-md flex-col gap-3">
                    {QUIZ[quizStep].options.map((o) => (
                      <button
                        key={o.label}
                        onClick={() => {
                          if (quizStep + 1 < QUIZ.length) setQuizStep(quizStep + 1);
                          else setQuizResult(o.slug);
                        }}
                        className="group flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-6 py-4 text-left text-base font-medium text-white transition-colors hover:border-trail hover:bg-white/10"
                      >
                        {o.label}
                        <ArrowRight
                          size={17}
                          className="text-white/40 transition-colors group-hover:text-trail"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Calendar */}
      <section className="container-x pb-14 md:pb-20">
        <Reveal>
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm md:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl font-bold tracking-tight text-forest">Trip calendar</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                  aria-label="Previous month"
                  className="grid h-9 w-9 place-items-center rounded-full border border-black/10 text-forest transition-colors hover:bg-forest/5"
                >
                  <CaretLeft size={15} />
                </button>
                <span className="grid min-w-32 place-items-center rounded-full bg-forest px-4 py-2 text-sm font-bold text-white">
                  {month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                </span>
                <button
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                  aria-label="Next month"
                  className="grid h-9 w-9 place-items-center rounded-full border border-black/10 text-forest transition-colors hover:bg-forest/5"
                >
                  <CaretRight size={15} />
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-4">
              {Object.entries(COLORS).map(([slug, color]) => (
                <span key={slug} className="flex items-center gap-1.5 text-xs text-foreground/60">
                  <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                  {catName(slug)}
                </span>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-7 gap-1.5 overflow-x-auto text-center">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <span key={d} className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-foreground/45">
                  {d}
                </span>
              ))}
              {days.map((day, i) => {
                const key = day
                  ? `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                  : null;
                const dayTrips = key ? tripsByDay.get(key) ?? [] : [];
                const colors = dayTrips.map((t) => COLORS[t.category_slug] ?? "#55755f");
                return (
                  <button
                    key={i}
                    disabled={!day}
                    onClick={() => {
                      if (day != null) setSelectedDay(selectedDay === String(day) ? null : String(day));
                    }}
                    className={`flex min-h-16 flex-col items-center justify-center rounded-xl p-1 text-sm transition-colors ${
                      day ? "cursor-pointer hover:bg-forest/5" : ""
                    } ${selectedDay === day ? "bg-forest text-white" : ""}`}
                  >
                    {day}
                    <span className="mt-1.5 flex gap-1">
                      {colors.slice(0, 3).map((c, j) => (
                        <span
                          key={j}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: selectedDay === day ? "#fff" : c }}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 border-t border-black/5 pt-6">
              <h3 className="font-bold text-forest">
                {selectedKey ? formatDate(selectedKey) : "Click a date to see trips"}
              </h3>
              {selectedTrips.length === 0 ? (
                selectedKey && <p className="mt-2 text-sm text-foreground/60">No trips on this day.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {selectedTrips.map((t) => (
                    <Link
                      key={t.id}
                      href={`/activities/${t.category_slug}/${t.slug}`}
                      className="group flex items-center justify-between gap-4 rounded-2xl border border-black/5 bg-sand/40 px-5 py-4 transition-colors hover:border-forest/30 hover:bg-white"
                    >
                      <div>
                        <p className="font-semibold text-forest group-hover:underline">{t.title}</p>
                        <p className="mt-0.5 text-xs text-foreground/55">
                          {catName(t.category_slug)}
                          <span className="mx-2 text-foreground/30">|</span>
                          {t.seats_booked}/{t.capacity} booked
                        </p>
                      </div>
                      <ArrowRight size={16} className="shrink-0 text-forest/30 transition-colors group-hover:text-trail" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Group request + guide */}
      <section className="container-x grid gap-6 pb-20 md:grid-cols-2 md:pb-28">
        <Reveal>
          <div className="h-full rounded-3xl border border-black/5 bg-white p-7 shadow-sm md:p-9">
            <h2 className="text-2xl font-bold tracking-tight text-forest">Bring your group</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/60">
              Planning a corporate or friends&apos; outing? Tell us what you need
              and we&apos;ll get back to you.
            </p>
            <GroupRequestForm />
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="flex h-full flex-col justify-between gap-6 rounded-3xl bg-forest p-7 text-white md:p-9">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Packing guide</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Don&apos;t forget your boots. Download our free packing checklist
                so you show up ready for the trail.
              </p>
            </div>
            <div>
              <a href="/packing-checklist.pdf" className="btn-trail">
                <DownloadSimple size={16} weight="bold" />
                Download packing checklist
              </a>
            </div>
          </div>
        </Reveal>
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

  const field =
    "w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-trail";
  const label = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/50";

  if (sent) {
    return (
      <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        Thanks! We&apos;ve got your request. We&apos;ll email you soon.
      </p>
    );
  }

  return (
    <form
      className="mt-5 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </div>
        <div>
          <label className={label}>Email</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Group size</label>
          <input
            required
            value={groupSize}
            onChange={(e) => setGroupSize(e.target.value)}
            className={field}
            placeholder="e.g. 10 people"
          />
        </div>
        <div>
          <label className={label}>Preferred dates</label>
          <input
            value={dates}
            onChange={(e) => setDates(e.target.value)}
            className={field}
            placeholder="e.g. Nov 2026"
          />
        </div>
      </div>
      <div>
        <label className={label}>Message</label>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${field} resize-y`}
        />
      </div>
      <button type="submit" className="btn-forest">
        Send group request
      </button>
    </form>
  );
}
