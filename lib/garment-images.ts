// Real photography stand-ins, sourced from Unsplash (free License — no
// attribution required, but credited here for the record):
//   kurta:   "Man in a blue kurta and pants, Bihar, India" by Noor Alam
//            https://unsplash.com/photos/sLRFg-VC2FY
//   default: "Tailor at an industrial sewing machine in a busy workshop"
//            by Luba Glazunova — https://unsplash.com/photos/hl8EFKDlbKw
// Unsplash has no free, in-progress work shot specific to blouse/saree
// stitching, so those garment types fall back to the general workshop
// photo rather than a mismatched portrait. Swap these for real Stitchera
// photography (or per-service services.image_url) whenever it exists.
const GARMENT_TYPE_IMAGES: Record<string, string> = {
  kurta: "https://images.unsplash.com/photo-1770359993283-a2c2f386584e?fm=jpg&q=80&w=1200&auto=format&fit=crop",
};

export const DEFAULT_TAILORING_IMAGE =
  "https://images.unsplash.com/photo-1768746350424-ee28a364dcf5?fm=jpg&q=80&w=1200&auto=format&fit=crop";

export function imageForGarmentType(garmentType?: string | null) {
  if (!garmentType) return DEFAULT_TAILORING_IMAGE;
  return GARMENT_TYPE_IMAGES[garmentType.toLowerCase()] ?? DEFAULT_TAILORING_IMAGE;
}
