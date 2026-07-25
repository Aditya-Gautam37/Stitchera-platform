export function StarDisplay({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span aria-label={`${rating} out of 5 stars`} className="text-marigold">
      {"★".repeat(rounded)}
      <span className="text-line">{"★".repeat(5 - rounded)}</span>
    </span>
  );
}
