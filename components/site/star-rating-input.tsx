// A plain radio group styled as stars — not a custom click-handler widget,
// so it keeps native keyboard nav, a real :focus-visible ring per option,
// and a working label/input association for screen readers, matching the
// engineering bar's accessibility requirement without extra JS.
export function StarRatingInput({
  name,
  label,
}: {
  name: string;
  label: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm font-medium text-ink">{label}</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="cursor-pointer text-2xl text-line-soft has-[:checked]:text-marigold has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus"
          >
            <input
              type="radio"
              name={name}
              value={n}
              required
              className="sr-only"
            />
            <span aria-hidden="true">★</span>
            <span className="sr-only">{n} star{n === 1 ? "" : "s"}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
