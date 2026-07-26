import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { adminButtonClass } from "@/components/ui/admin-styles";
import { updateService } from "../actions";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();
  const supabase = await createClient();

  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", id)
    .single();

  if (!service) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{service.name}</h1>
      <form action={updateService} className="flex max-w-md flex-col gap-4">
        <input type="hidden" name="service_id" value={service.id} />
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            type="text"
            name="name"
            defaultValue={service.name}
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Name (Hindi)
          <input
            type="text"
            name="name_hi"
            defaultValue={service.name_hi ?? ""}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Category
          <input
            type="text"
            name="category"
            defaultValue={service.category}
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Garment type
          <input
            type="text"
            name="garment_type"
            defaultValue={service.garment_type}
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Description
          <textarea
            name="description"
            defaultValue={service.description ?? ""}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Base price (₹)
          <input
            type="number"
            name="base_price"
            min={0}
            step="0.01"
            defaultValue={service.base_price}
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Estimated days
          <input
            type="number"
            name="est_days"
            min={1}
            defaultValue={service.est_days}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Sort order
          <input
            type="number"
            name="sort_order"
            defaultValue={service.sort_order}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={service.is_active}
          />
          Active (visible to customers)
        </label>
        <button type="submit" className={`w-fit ${adminButtonClass("primary", "md")}`}>
          Save changes
        </button>
      </form>
    </div>
  );
}
