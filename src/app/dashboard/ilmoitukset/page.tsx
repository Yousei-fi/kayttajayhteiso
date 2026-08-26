import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/week";
import { duplicateAlert, archiveAlert } from "./actions";

export default async function IlmoituksetPage({
  searchParams,
}: {
  searchParams: Promise<{ muut?: string }>;
}) {
  const user = await requireUser("SERVICE", "MEMBER", "ADMIN");
  const { muut } = await searchParams;

  const isServiceOwnView = user.role === "SERVICE" && muut !== "1";

  const alerts = await prisma.alert.findMany({
    where: isServiceOwnView
      ? { serviceUserId: user.id }
      : user.role === "SERVICE"
        ? { serviceUserId: { not: user.id }, archived: false }
        : { archived: false },
    orderBy: { createdAt: "desc" },
    include: { service: true },
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">
          {isServiceOwnView ? "Omat ilmoitukset" : "Palveluiden ilmoitukset"}
        </h1>
        <div className="flex gap-3 text-sm">
          {user.role === "SERVICE" && (
            <>
              <Link href="/dashboard/ilmoitukset" className={!muut ? "font-semibold underline" : "underline"}>
                Omat
              </Link>
              <Link href="/dashboard/ilmoitukset?muut=1" className={muut ? "font-semibold underline" : "underline"}>
                Muiden palveluiden
              </Link>
            </>
          )}
          {user.role === "SERVICE" && (
            <Link href="/dashboard/ilmoitukset/uusi" className="rounded bg-accent px-3 py-1.5 font-semibold text-white">
              Tee ilmoitus
            </Link>
          )}
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {alerts.map((a) => (
          <li key={a.id} className={`rounded border border-line bg-paper p-3 ${a.archived ? "opacity-50" : ""}`}>
            <p className="text-xs uppercase tracking-wide text-accent-2">
              {a.service.serviceName || a.service.name}
            </p>
            {isServiceOwnView ? (
              <Link href={`/dashboard/ilmoitukset/${a.id}`} className="font-semibold hover:underline">
                {a.title}
              </Link>
            ) : (
              <p className="font-semibold">{a.title}</p>
            )}
            <p className="mt-1 text-sm">{a.body}</p>
            <p className="mt-1 text-xs text-muted">
              Luotu {formatDate(a.createdAt)}
              {a.validUntil ? ` · voimassa ${formatDate(a.validUntil)} asti` : ""}
              {a.archived ? " · Arkistoitu" : ""}
            </p>
            {isServiceOwnView && (
              <form action={duplicateAlert.bind(null, a.id)} className="mt-2 inline-block">
                <button type="submit" className="text-xs text-accent-2 underline">
                  Kahdenna uudeksi ilmoitukseksi
                </button>
              </form>
            )}
            {isServiceOwnView && !a.archived && (
              <form action={archiveAlert.bind(null, a.id)} className="mt-2 ml-3 inline-block">
                <button type="submit" className="text-xs text-muted underline">
                  Arkistoi
                </button>
              </form>
            )}
          </li>
        ))}
        {alerts.length === 0 && <p className="text-sm text-muted">Ei ilmoituksia.</p>}
      </ul>
    </div>
  );
}
