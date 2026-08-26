import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/week";
import { notFound } from "next/navigation";
import { addExperience } from "./actions";
import { ExperienceForm } from "./experience-form";

export default async function PalveluPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const service = await prisma.directoryService.findUnique({
    where: { id },
    include: { experiences: { orderBy: { createdAt: "desc" } } },
  });
  if (!service) notFound();

  const boundAdd = addExperience.bind(null, service.id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <p className="text-xs uppercase tracking-wide text-accent-2">{service.category}</p>
      <h1 className="text-2xl font-bold">{service.name}</h1>
      {service.address && <p className="mt-1 text-sm text-muted">{service.address}</p>}
      {service.phone && <p className="text-sm text-muted">Puhelin: {service.phone}</p>}
      {service.description && <p className="mt-4 text-sm leading-relaxed">{service.description}</p>}

      <section className="mt-10">
        <h2 className="mb-2 text-lg font-bold">Jätä kokemus</h2>
        <p className="mb-3 text-xs text-muted">
          Kokemukset ovat anonyymejä ja julkisia. Älä kirjoita tunnistettavia henkilötietoja. Enintään 300
          merkkiä.
        </p>
        <ExperienceForm action={boundAdd} />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold">Kokemukset ({service.experiences.length})</h2>
        <ul className="flex flex-col gap-3">
          {service.experiences.map((e) => (
            <li key={e.id} className="rounded border border-line bg-paper p-3 text-sm">
              <p>{e.body}</p>
              <p className="mt-1 text-xs text-muted">{formatDate(e.createdAt)}</p>
            </li>
          ))}
          {service.experiences.length === 0 && (
            <p className="text-sm text-muted">Ei vielä kokemuksia tästä palvelusta.</p>
          )}
        </ul>
      </section>
    </main>
  );
}
