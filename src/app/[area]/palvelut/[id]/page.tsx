import Link from "next/link";
import { areaDb } from "@/lib/db";
import { areaPath, requireArea } from "@/lib/area";
import { notFound } from "next/navigation";
import { addExperience } from "./actions";
import { ExperienceForm } from "@/components/experience-form";
import { ExperiencePost } from "@/components/experience-post";

const SHOWN_EXPERIENCES = 10;

export default async function PalveluPage({ params }: PageProps<"/[area]/palvelut/[id]">) {
  const { area: slug, id } = await params;
  const area = await requireArea(slug);

  const service = await areaDb(area.id).directoryService.findUnique({
    where: { id },
    include: {
      experiences: { orderBy: { createdAt: "desc" }, take: SHOWN_EXPERIENCES },
      _count: { select: { experiences: true } },
    },
  });
  if (!service) notFound();

  const boundAdd = addExperience.bind(null, area.id, service.id);
  const total = service._count.experiences;
  const boardHref = areaPath(area, `/kokemukset?palvelu=${service.id}`);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <p className="text-xs uppercase tracking-wide text-accent-2">{service.category}</p>
      <h1 className="text-2xl font-bold">{service.name}</h1>
      {service.address && <p className="mt-1 text-sm text-muted">{service.address}</p>}
      {service.phone && <p className="text-sm text-muted">Puhelin: {service.phone}</p>}
      {service.description && <p className="mt-4 text-sm leading-relaxed">{service.description}</p>}

      <section className="mt-10 rounded-lg border-2 border-accent bg-paper p-4">
        <h2 className="mb-2 text-lg font-bold">Kerro kokemuksesi tästä palvelusta</h2>
        <ExperienceForm action={boundAdd} />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold">Kokemukset ({total})</h2>
        <div className="flex flex-col gap-3">
          {service.experiences.map((e) => (
            <ExperiencePost key={e.id} body={e.body} createdAt={e.createdAt} />
          ))}
          {total === 0 && <p className="text-sm text-muted">Ei vielä kokemuksia tästä palvelusta.</p>}
        </div>
        {total > service.experiences.length && (
          <Link href={boardHref} className="mt-4 inline-block text-sm text-accent-2 underline">
            Lue kaikki {total} kokemusta
          </Link>
        )}
      </section>
    </main>
  );
}
