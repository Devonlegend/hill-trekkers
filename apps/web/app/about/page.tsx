export default function AboutPage() {
  return (
    <>
      <section className="bg-forest-deep py-16 text-white md:py-20">
        <div className="container-x">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/60">About us</p>
          <h1 className="max-w-2xl text-3xl font-extrabold leading-tight md:text-5xl">
            We walk up mountains. We lift each other up.
          </h1>
        </div>
      </section>

      <section className="container-x py-16 md:py-20">
        <div className="grid gap-10 md:grid-cols-2">
          <div className="space-y-4 text-foreground/80 leading-relaxed">
            <h2 className="text-2xl font-bold text-forest">Our story</h2>
            <p>
              The Hill Trekkers Club started with a simple idea: that adventure is
              better shared. What began as a handful of friends climbing one
              hill became a growing community of hikers, campers, and weekend
              wanderers across Nigeria.
            </p>
            <p>
              Every trek is planned with care — safety briefings, vetted routes,
              trained leaders, and a pace that welcomes first-timers as warmly as
              it challenges seasoned trekkers.
            </p>
            <p>
              But the real reason people stay is the people. On the trail, we
              cheer each other up steep sections, share water and snacks, and
              celebrate every summit together. That&apos;s the Hill Trekkers way.
            </p>
          </div>
          <div className="space-y-4 text-foreground/80 leading-relaxed">
            <h2 className="text-2xl font-bold text-forest">What we do</h2>
            <ul className="space-y-3">
              {[
                "Hikes — regular local and day hikes for all fitness levels",
                "Out-of-state trips — multi-day adventures beyond the city",
                "Out in the wild — camping and wilderness expeditions",
                "Hikers day out — casual, social, low-difficulty outings",
                "Tea & pep meets — non-hiking meetups to keep the club close",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1 text-trail">▲</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-sand/60 py-16">
        <div className="container-x">
          <h2 className="text-2xl font-bold text-forest md:text-3xl">Code of conduct</h2>
          <p className="mt-2 max-w-2xl text-foreground/60">
            We keep the trail kind. Everyone who joins us agrees to these basics.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { t: "Respect the trail", d: "Leave no trace — carry out what you carry in." },
              { t: "Respect each other", d: "No shaming, no gatekeeping. Every pace is a good pace." },
              { t: "Look out for your crew", d: "If someone slows down, we slow down together." },
            ].map((c) => (
              <div key={c.t} className="card">
                <p className="font-bold text-forest">{c.t}</p>
                <p className="mt-2 text-sm text-foreground/60">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x py-16 md:py-20">
        <h2 className="text-2xl font-bold text-forest md:text-3xl">What members say</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              q: "I showed up alone on my first hike. I left with about fifteen new friends.",
              a: "Amaka",
            },
            {
              q: "The early-bird pricing meant I could actually afford to start hiking regularly.",
              a: "Tunde",
            },
            {
              q: "The leaders are so thorough — safety first, always, and still so much fun.",
              a: "Zainab",
            },
          ].map((t) => (
            <figure key={t.a} className="card">
              <blockquote className="text-foreground/80">“{t.q}”</blockquote>
              <figcaption className="mt-4 text-sm font-semibold text-forest">— {t.a}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </>
  );
}
