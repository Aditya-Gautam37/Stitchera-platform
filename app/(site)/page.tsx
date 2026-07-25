import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16">
      <h1 className="max-w-xl font-display text-4xl font-bold text-ink">
        Stitchera
      </h1>
      <p className="max-w-md text-ink-soft">
        Doorstep tailoring — pickup, stitch, deliver.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/services"
          className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink hover:border-indigo"
        >
          Browse services
        </Link>
        <Link
          href="/book"
          className="rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper hover:bg-indigo-strong"
        >
          Book your stitch
        </Link>
        <Link
          href="/tailor-registration"
          className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink hover:border-indigo"
        >
          Register as a tailor
        </Link>
        <Link
          href="/delivery-registration"
          className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink hover:border-indigo"
        >
          Register as a delivery partner
        </Link>
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        Full homepage hero, service photography, and branding content land in
        the next phase — this is the navigational shell.
      </p>
    </div>
  );
}
