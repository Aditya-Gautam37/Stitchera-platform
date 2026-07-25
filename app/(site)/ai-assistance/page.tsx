import Link from "next/link";

const TOOLS = [
  {
    href: "/ai-assistance/body-type",
    title: "Know your fit",
    description:
      "A couple of quick questions on garment and fit, matched straight to services we actually offer.",
  },
  {
    href: "/ai-assistance/style-finder",
    title: "Find the right service",
    description:
      "Tell us what you need and your budget — matched against Stitchera's live catalog and prices.",
  },
];

export default function AiAssistancePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-ink">AI Assistance</h1>
      <p className="mt-2 text-ink-soft">
        Two guided tools to help you land on the right booking — instant,
        matched against our own catalog, no upload or wait involved.
      </p>

      <ul className="mt-8 flex flex-col gap-4">
        {TOOLS.map((tool) => (
          <li key={tool.href}>
            <Link
              href={tool.href}
              className="block rounded border border-line bg-paper p-5 hover:border-indigo"
            >
              <p className="font-display text-lg font-bold text-ink">
                {tool.title}
              </p>
              <p className="mt-1 text-sm text-ink-soft">{tool.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
