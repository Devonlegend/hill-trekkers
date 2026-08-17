import type { Metadata } from "next";
import { MountainMark } from "@/components/MountainMark";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern membership, bookings, and community participation with The Hill Trekkers Club.",
};

const SECTIONS = [
  {
    title: "Membership",
    body: [
      "Joining the club is free. Your membership is personal to you and may not be transferred or shared. We may suspend accounts that break the code of conduct or these terms.",
    ],
  },
  {
    title: "Bookings and payment",
    body: [
      "Prices shown are for the date you book. The price is locked at the time of booking and does not change afterwards. Payment is processed by Paystack, and a booking is only confirmed once payment is verified. Seats are limited and held temporarily while you complete payment; an unpaid hold expires automatically.",
      "Refunds and transfers follow the policy stated on each trip. If the club cancels a trip, you receive a full refund of what you paid.",
    ],
  },
  {
    title: "Safety and personal responsibility",
    body: [
      "Hiking and outdoor activities carry inherent risk, including injury and illness. Every member takes part voluntarily and is responsible for their own fitness and preparation. Leaders give briefings and guidance but cannot guarantee your safety. Follow your leader&apos;s instructions and tell them about any medical condition that could affect you on the trail.",
      "If a pre-existing condition could put you or the group at risk, you must tell us before the trip.",
    ],
  },
  {
    title: "Community guidelines",
    body: [
      "Be kind. No hate, harassment, or gatekeeping. Photos and posts you share must be yours or used with permission. We may remove content that breaks these rules and, in serious cases, suspend the account that posted it.",
    ],
  },
  {
    title: "Changes to these terms",
    body: [
      "We may update these terms as the club grows. Significant changes will be announced on the site or by email before they take effect. Continuing to use the club after a change means you accept the updated terms.",
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <section className="bg-forest-deep py-16 text-white md:py-20">
        <div className="container-x">
          <div className="flex items-center gap-2.5">
            <MountainMark />
            <span className="text-[17px] font-bold tracking-tight">Hill Trekkers Club</span>
          </div>
          <h1 className="mt-6 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-5 max-w-xl leading-relaxed text-white/70">
            What joining, booking, and taking part in the club involves.
          </p>
        </div>
      </section>

      <section className="container-x py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-muted-faint">Last updated August 2026</p>
          <div className="mt-10 space-y-12">
            {SECTIONS.map((s) => (
              <div key={s.title}>
                <h2 className="text-xl font-bold tracking-tight text-forest">{s.title}</h2>
                <div className="mt-3 space-y-3 leading-relaxed text-foreground/80">
                  {s.body.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}