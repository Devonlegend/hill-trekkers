"use client";

import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { placeholderImage } from "@/lib/images";
import {
  PersonSimpleHike,
  AirplaneTilt,
  Tent,
  Smiley,
  Coffee,
  ShieldCheck,
  UsersThree,
  Handshake,
  ArrowUpRight,
} from "@phosphor-icons/react";

const WHAT_WE_DO = [
  {
    label: "Hikes",
    slug: "hikes",
    desc: "Regular local and day hikes for every fitness level.",
    icon: PersonSimpleHike,
  },
  {
    label: "Out-of-state trips",
    slug: "out-of-state-trips",
    desc: "Multi-day adventures that take us beyond the city.",
    icon: AirplaneTilt,
  },
  {
    label: "Out in the wild",
    slug: "out-in-the-wild",
    desc: "Camping and wilderness expeditions off the grid.",
    icon: Tent,
  },
  {
    label: "Hikers day out",
    slug: "hikers-day-out",
    desc: "Casual, social, low-difficulty outings. A great first trip.",
    icon: Smiley,
  },
  {
    label: "Tea and pep meets",
    slug: "tea-and-pep-meets",
    desc: "Non-hiking meetups that keep the club close.",
    icon: Coffee,
  },
];

const CONDUCT = [
  {
    title: "Respect the trail",
    desc: "Leave no trace. Carry out what you carry in.",
    icon: ShieldCheck,
  },
  {
    title: "Respect each other",
    desc: "No shaming, no gatekeeping. Every pace is a good pace.",
    icon: UsersThree,
  },
  {
    title: "Look out for your crew",
    desc: "If someone slows down, we slow down together.",
    icon: Handshake,
  },
];

const TESTIMONIALS = [
  {
    quote: "I showed up alone on my first hike. I left with about fifteen new friends.",
    name: "Amaka",
    role: "Club member",
  },
  {
    quote: "The early-bird pricing meant I could actually afford to start hiking regularly.",
    name: "Tunde",
    role: "Club member",
  },
  {
    quote: "The leaders are so thorough. Safety first, always, and still so much fun.",
    name: "Zainab",
    role: "Club member",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="bg-forest-deep py-16 text-white md:py-20">
        <div className="container-x">
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            We walk up mountains. We lift each other up.
          </h1>
          <p className="mt-5 max-w-xl leading-relaxed text-white/70">
            The Hill Trekkers Club is a growing community of hikers, campers,
            and weekend wanderers across Nigeria. Here&apos;s who we are.
          </p>
        </div>
      </section>

      {/* Our story */}
      <section className="container-x grid items-center gap-12 py-20 md:grid-cols-2 md:py-28">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-forest md:text-3xl">
            Our story
          </h2>
          <div className="mt-6 space-y-4 leading-relaxed text-foreground/80">
            <p>
              The Hill Trekkers Club started with a simple idea: that adventure
              is better shared. What began as a handful of friends climbing one
              hill became a growing community of hikers, campers, and weekend
              wanderers across Nigeria.
            </p>
            <p>
              Every trek is planned with care. Safety briefings, vetted routes,
              trained leaders, and a pace that welcomes first-timers as warmly
              as it challenges seasoned trekkers.
            </p>
            <p>
              But the real reason people stay is the people. On the trail we
              cheer each other up steep sections, share water and snacks, and
              celebrate every summit together. That&apos;s the Hill Trekkers way.
            </p>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="relative">
            <div className="overflow-hidden rounded-2xl">
              <img
                src={placeholderImage("trekkers-on-the-trail", 1000, 1100)}
                alt="A group of trekkers on a wooded trail"
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden w-48 overflow-hidden rounded-xl border-4 border-[var(--background)] shadow-lg md:block">
              <img
                src={placeholderImage("summit-hands-up", 500, 400)}
                alt="Trekkers celebrating at a summit"
                className="aspect-[5/4] w-full object-cover"
              />
            </div>
          </div>
        </Reveal>
      </section>

      {/* What we do */}
      <section className="border-y border-black/5 bg-sand/50 py-20 md:py-24">
        <div className="container-x">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight text-forest md:text-3xl">
              What we do
            </h2>
            <p className="mt-3 max-w-xl text-muted">
              Five ways to get out there, each with its own rhythm.
            </p>
          </Reveal>
          <div className="mt-10 divide-y divide-black/5 border-y border-black/5">
            {WHAT_WE_DO.map((item, i) => (
              <Reveal key={item.slug} delay={i * 50}>
                <Link
                  href={`/activities/${item.slug}`}
                  className="group flex items-center gap-5 py-6 transition-colors hover:bg-white/60"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-forest text-white transition-colors group-hover:bg-trail">
                    <item.icon size={20} weight="duotone" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-forest group-hover:underline">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">{item.desc}</p>
                  </div>
                  <ArrowUpRight
                    size={18}
                    className="shrink-0 text-forest/30 transition-colors group-hover:text-trail"
                  />
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Code of conduct */}
      <section className="container-x py-20 md:py-28">
        <Reveal>
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-forest md:text-3xl">
              We keep the trail kind
            </h2>
            <p className="mt-3 text-muted">
              Everyone who joins us agrees to these basics.
            </p>
          </div>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {CONDUCT.map((c, i) => (
            <Reveal key={c.title} delay={i * 70}>
              <div className="flex h-full flex-col gap-4 rounded-2xl border border-black/5 bg-white p-7">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-sand text-forest">
                  <c.icon size={20} weight="duotone" />
                </span>
                <div>
                  <p className="font-bold text-forest">{c.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {c.desc}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-forest-deep py-20 text-white md:py-28">
        <div className="container-x">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              What members say
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 80}>
                <blockquote className="flex h-full flex-col justify-between gap-8 border-t border-white/15 pt-6">
                  <p className="text-lg leading-relaxed text-white/85 md:text-xl">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <figcaption>
                    <p className="font-semibold text-white">{t.name}</p>
                    <p className="mt-1 text-sm text-white/50">{t.role}</p>
                  </figcaption>
                </blockquote>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
