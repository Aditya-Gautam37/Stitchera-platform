import { createClient } from "@/lib/supabase/server";
import { StarDisplay } from "@/components/site/star-display";

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  customer_display_name: string;
  reviewee_display_name: string;
  reviewee_type: "tailor" | "delivery_partner";
  created_at: string;
};

export default async function ReviewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const columns =
    "id, rating, comment, customer_display_name, reviewee_display_name, reviewee_type, created_at";

  const { data: feed } = await supabase
    .from("reviews")
    .select(columns)
    .order("created_at", { ascending: false })
    .limit(30);

  let ownReviews: ReviewRow[] | null = null;
  if (user) {
    const { data } = await supabase
      .from("reviews")
      .select(columns)
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });
    ownReviews = data;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-ink">Reviews</h1>
      <p className="mt-1 text-sm text-ink-soft">
        What customers are saying about Stitchera&apos;s tailors and delivery
        partners.
      </p>

      {user && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo">
            Your reviews
          </h2>
          {!ownReviews?.length ? (
            <p className="mt-2 text-sm text-ink-soft">
              You haven&apos;t reviewed an order yet — once one is delivered,
              you can rate it from the order page.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line-soft">
              {ownReviews.map((r) => (
                <ReviewItem key={r.id} review={r} />
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo">
          Recent reviews
        </h2>
        {!feed?.length ? (
          <p className="mt-2 text-sm text-ink-soft">No reviews yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line-soft">
            {feed.map((r) => (
              <ReviewItem key={r.id} review={r} showReviewer />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ReviewItem({
  review,
  showReviewer,
}: {
  review: ReviewRow;
  showReviewer?: boolean;
}) {
  return (
    <li className="py-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-ink">
          {review.reviewee_display_name}
          <span className="ml-2 text-xs font-normal uppercase tracking-wide text-ink-soft">
            {review.reviewee_type === "tailor" ? "Tailor" : "Delivery partner"}
          </span>
        </p>
        <StarDisplay rating={review.rating} />
      </div>
      {review.comment && (
        <p className="mt-1 text-sm text-ink">{review.comment}</p>
      )}
      <p className="mt-1 text-xs text-ink-soft">
        {showReviewer ? `${review.customer_display_name} · ` : ""}
        {new Date(review.created_at).toLocaleDateString()}
      </p>
    </li>
  );
}
