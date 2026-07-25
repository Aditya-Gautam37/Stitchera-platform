const FAQS = [
  {
    q: "How does pickup and delivery work?",
    a: "Book a service, and our team picks up your garment from your address, takes it to a verified local tailor, and delivers it back once it's ready.",
  },
  {
    q: "Do I need to know my measurements?",
    a: "No — if you don't have saved measurements, our pickup team takes them at your doorstep when they collect your garment.",
  },
  {
    q: "How do I pay?",
    a: "Payment options are shown at checkout when you book — details there are always current.",
  },
  {
    q: "How do I track my order?",
    a: "If you're signed in, open My Orders. If not, use Track Order in the header with your order number and phone.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-3xl font-bold text-ink">
        Frequently asked questions
      </h1>
      <div className="mt-8 flex flex-col divide-y divide-line-soft">
        {FAQS.map((item) => (
          <details key={item.q} className="group py-4">
            <summary className="cursor-pointer list-none font-medium text-ink marker:content-none">
              {item.q}
            </summary>
            <p className="mt-2 text-sm text-ink-soft">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
