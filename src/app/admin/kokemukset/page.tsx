import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/week";
import { deleteExperience } from "./actions";
import Link from "next/link";

export default async function AdminKokemuksetPage() {
  await requireUser("ADMIN");

  const experiences = await prisma.serviceExperience.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { service: { select: { id: true, name: true } } },
  });

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Kokemukset (Tampereen palvelut)</h1>
      <p className="mb-4 text-sm text-muted">
        Anonyymit julkiset kommentit palveluista. Poista asiattomat tai tunnistetietoja sisältävät viestit.
      </p>
      <ul className="flex flex-col gap-2">
        {experiences.map((e) => (
          <li key={e.id} className="rounded border border-line bg-paper p-3">
            <p className="text-sm">{e.body}</p>
            <div className="mt-2 flex items-center justify-between text-xs text-muted">
              <span>
                <Link href={`/palvelut/${e.service.id}`} className="text-accent-2 hover:underline">
                  {e.service.name}
                </Link>{" "}
                · {formatDate(e.createdAt)}
              </span>
              <form action={deleteExperience.bind(null, e.id)}>
                <button type="submit" className="text-danger underline">
                  Poista
                </button>
              </form>
            </div>
          </li>
        ))}
        {experiences.length === 0 && <p className="text-sm text-muted">Ei kokemuksia.</p>}
      </ul>
    </div>
  );
}
