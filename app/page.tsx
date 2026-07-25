import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col items-start justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold">Stitchera</h1>
      <p className="text-zinc-600">
        Doorstep tailoring — pickup, stitch, deliver.
      </p>
      <div className="flex gap-4">
        <Link
          href="/services"
          className="rounded border px-4 py-2 text-sm font-medium"
        >
          Browse services
        </Link>
        <Link
          href="/login"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
