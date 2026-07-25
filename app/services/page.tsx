import { createClient } from "@/lib/supabase/server";

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: services, error } = await supabase
    .from("services")
    .select("id, name, name_hi, category, garment_type, base_price, est_days")
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-semibold">Services</h1>
        <p className="mt-4 text-red-600">
          Failed to load services: {error.message}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Services</h1>
      <ul className="mt-6 divide-y">
        {services.map((service) => (
          <li key={service.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{service.name}</p>
              <p className="text-sm text-zinc-500">
                {service.category} · {service.garment_type} · {service.est_days} days
              </p>
            </div>
            <p className="font-medium">₹{service.base_price}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
