import { CURRENT_CONSENT_VERSION } from "@/lib/consent";

// DRAFT — pending legal review. This is placeholder text so the consent
// checkbox at signup has something real to link to; it is not the
// reviewed policy Stitchera will actually operate under.
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded border border-marigold-strong bg-paper p-4 text-sm font-medium text-marigold-strong">
        DRAFT — pending legal review. This page describes what we collect
        and why in plain language; it is not final policy text.
      </div>

      <h1 className="mt-6 font-display text-2xl font-bold text-ink">
        Privacy Policy
      </h1>
      <p className="mt-1 text-xs text-ink-soft">
        Draft version {CURRENT_CONSENT_VERSION}
      </p>

      <div className="mt-6 flex flex-col gap-6 text-sm text-ink-soft">
        <section>
          <h2 className="font-medium text-ink">What we collect</h2>
          <p className="mt-1">
            Your name, phone number, email, home address, and body
            measurements — collected when you create an account, book a
            service, or save measurements for reuse.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-ink">Why we collect it</h2>
          <p className="mt-1">
            To arrange pickup and delivery of your garments, to share the
            right measurements with the tailor stitching your order, and to
            let our pickup and delivery staff reach you and find your
            address.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-ink">Who can see it</h2>
          <p className="mt-1">
            Your address and contact details are shared with the staff
            handling your order and the tailor assigned to it, only for as
            long as that order is active. Your measurements are visible to
            you and to staff recording or using them for your bookings.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-ink">Deleting your data</h2>
          <p className="mt-1">
            You can request deletion of your account and data from your{" "}
            dashboard. We&apos;ll confirm with you before anything is
            removed, since deleting an account with active orders needs to
            be handled carefully.
          </p>
        </section>
      </div>
    </div>
  );
}
