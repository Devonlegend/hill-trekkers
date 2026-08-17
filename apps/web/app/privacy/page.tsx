import type { Metadata } from "next";
import { MountainMark } from "@/components/MountainMark";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How The Hill Trekkers Club collects, uses, and protects your personal information.",
};

const SECTIONS = [
  {
    title: "What we collect",
    body: [
      "When you join the club we collect your name, email address, phone number, and the emergency contact details you choose to provide. When you book a trip we record the booking, the price you paid, and the payment confirmation. Card numbers are never stored on our servers — they are handled by our payment provider, Paystack.",
      "If you post to the community, we also keep the text and photos you share and the time you posted them.",
    ],
  },
  {
    title: "How we use it",
    body: [
      "We use your details to run the club: confirming bookings, sending trip reminders and receipts, contacting your emergency contact if something happens on a trek, and keeping the community safe and welcoming.",
      "We do not sell your personal information. We only share it with the services needed to operate — payment processing, email delivery, and file storage — and only as far as they need it.",
    ],
  },
  {
    title: "How long we keep it",
    body: [
      "Booking and payment records are kept for as long as we have a legal or accounting reason to. Community posts stay until you delete them or ask us to. You can request deletion of your account and data at any time.",
    ],
  },
  {
    title: "Your rights",
    body: [
      "You can ask us to show you, correct, or delete the personal data we hold about you. Email the address below and we will respond within a reasonable time.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <section className="bg-forest-deep py-16 text-white md:py-20">
        <div className="container-x">
          <div className="flex items-center gap-2.5">
            <MountainMark />
            <span className="text-[17px] font-bold tracking-tight">Hill Trekkers Club</span>
          </div>
          <h1 className="mt-6 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-5 max-w-xl leading-relaxed text-white/70">
            The short version: we keep your data to run the club, we don&apos;t sell it,
            and you can ask us to delete it.
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
            <div>
              <h2 className="text-xl font-bold tracking-tight text-forest">Contact</h2>
              <p className="mt-3 leading-relaxed text-foreground/80">
                Questions about this policy? Email us at{" "}
                <a href="mailto:hello@hilltrekkersclub.com" className="font-semibold text-trail-deep hover:underline">
                  hello@hilltrekkersclub.com
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}