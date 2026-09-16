import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/week";
import { isOnBreak } from "@/lib/na-meetings";
import { notFound } from "next/navigation";

export default async function NaRyhmaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const meeting = await prisma.naMeeting.findUnique({ where: { id } });
  if (!meeting) notFound();

  const onBreak = isOnBreak(meeting);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <p className="text-xs uppercase tracking-wide text-accent-2">
        {meeting.weekday} klo {meeting.time}
        {meeting.durationMinutes ? ` · ${meeting.durationMinutes} min` : ""}
      </p>
      <h1 className="text-2xl font-bold">{meeting.name}</h1>
      {meeting.address && (
        <p className="mt-1 text-sm text-muted">
          {meeting.address}
          {meeting.postalCode ? `, ${meeting.postalCode}` : ""} {meeting.city}
        </p>
      )}
      {onBreak && (
        <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm font-semibold text-danger">
          Tauolla {formatDate(meeting.onBreakUntil!)} asti.
        </p>
      )}
      {meeting.formats && <p className="mt-3 text-sm">{meeting.formats}</p>}
      {meeting.notes && <p className="mt-3 text-sm leading-relaxed">{meeting.notes}</p>}
      {meeting.mapLink && (
        <a
          href={meeting.mapLink}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm text-accent-2 underline"
        >
          Avaa kartassa
        </a>
      )}
      {meeting.sourceUrl && (
        <p className="mt-4 text-xs text-muted">
          Tiedot:{" "}
          <a href={meeting.sourceUrl} target="_blank" rel="noreferrer" className="underline">
            nasuomi.org
          </a>
        </p>
      )}
    </main>
  );
}
