export default function ContactPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-display text-3xl font-bold text-ink">
        Contact us
      </h1>
      <p className="mt-3 text-ink-soft">
        Have a question about an order, a booking, or becoming a partner?
        Reach us on WhatsApp and we&apos;ll get back to you.
      </p>
      <a
        href="https://wa.me/910000000000"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper hover:bg-indigo-strong"
      >
        Message us on WhatsApp
      </a>
      <p className="mt-8 text-sm text-ink-soft">
        Prefer live chat? <a href="/live-chat" className="text-indigo underline">Open live chat support</a>.
      </p>
    </div>
  );
}
