// No product photography exists yet (services.image_url is null across the
// board) — these are simple line-art garment silhouettes standing in until
// real photos are uploaded per-service. Deliberately garments, not tools:
// a picture of the actual kurta/blouse is informative; a scissors or
// needle-and-thread icon would be exactly the genre cliché the design
// direction rules out.
const SILHOUETTES = {
  kurta: (
    <path d="M9 2.5c0 1-1.4 1.6-1.4 3v1.2L5 8.5V21h14V8.5l-2.6-1.8V5.5c0-1.4-1.4-2-1.4-3M9 2.5c.6.9 1.6 1.4 3 1.4s2.4-.5 3-1.4M9 2.5L7.6 6.7M15 2.5l1.4 4.2" />
  ),
  blouse: (
    <path d="M8 3l-3 3 2 3v12h10V9l2-3-3-3-2 2h-4l-2-2z" />
  ),
  saree: (
    <path d="M6 4h5l7 15-3 1.5L9 8 6 14 4 13z" />
  ),
  garment: (
    <path d="M8 3L5 6l2 2.5V21h10V8.5L19 6l-3-3-1.5 1.5h-5L8 3z" />
  ),
} as const;

export type Silhouette = keyof typeof SILHOUETTES;

export function GarmentIcon({
  type = "garment",
  className,
}: {
  type?: Silhouette;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      {SILHOUETTES[type]}
    </svg>
  );
}

export function silhouetteFor(garmentType: string): Silhouette {
  const key = garmentType.toLowerCase();
  if (key === "kurta") return "kurta";
  if (key === "blouse") return "blouse";
  if (key === "saree") return "saree";
  return "garment";
}
