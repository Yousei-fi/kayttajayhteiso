import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/week";
import { banIp } from "../kokemukset/actions";
import { deleteArticleComment } from "./actions";

const PAGE_SIZE = 50;

/**
 * Comments on articles, newest first. Articles are national, so every admin
 * sees all of them. IP bans are shared with Kokemukset and listed there.
 */
export default async function AdminKommentitPage({ searchParams }: PageProps<"/admin/kommentit">) {
  await requireUser("ADMIN");
  const sp = await searchParams;
  const haku = typeof sp.haku === "string" ? sp.haku.trim().slice(0, 100) : "";
  const ip = typeof sp.ip === "string" ? sp.ip.trim() : "";
  const sivu = Math.max(1, Number.parseInt(typeof sp.sivu === "string" ? sp.sivu : "", 10) || 1);

  const where: Prisma.ArticleCommentWhereInput = {
    ...(haku ? { OR: [{ body: { contains: haku } }, { nickname: { contains: haku } }] } : {}),
    ...(ip ? { ipAddress: ip } : {}),
  };
  const query = (changes: Record<string, string | number | null>) => {
    const q = new URLSearchParams();
    const params: Record<string, string | number | null> = { haku, ip, ...changes };
    for (const [k, v] of Object.entries(params)) if (v && !(k === "sivu" && v === 1)) q.set(k, String(v));
    const s = q.toString();
    return s ? `/admin/kommentit?${s}` : "/admin/kommentit";
  };

  const [comments, total] = await Promise.all([
    prisma.articleComment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (sivu - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { article: { select: { id: true, title: true } } },
    }),
    prisma.articleComment.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Kommentit</h1>
      <p className="mb-4 text-sm text-muted">
        Anonyymit kommentit artikkeleihin. Poista asiattomat tai tunnistetietoja sisältävät, ja estä tarvittaessa
        lähettäjän IP-osoite. Estot koskevat myös kokemuksia, ja ne listataan{" "}
        <Link href="/admin/kokemukset" className="underline">
          Kokemukset-sivulla
        </Link>
        .
      </p>

      <form method="get" action="/admin/kommentit" className="mb-3 flex flex-wrap gap-2 text-sm">
        <input
          type="search"
          name="haku"
          defaultValue={haku}
          placeholder="Hae tekstistä tai nimimerkistä"
          className="min-w-0 flex-1 rounded border border-line bg-paper p-2"
        />
        <input
          type="search"
          name="ip"
          defaultValue={ip}
          placeholder="IP-osoite"
          className="w-40 rounded border border-line bg-paper p-2"
        />
        <button type="submit" className="rounded bg-accent-2 px-4 py-2 font-semibold text-white">
          Hae
        </button>
      </form>
      <p className="mb-3 text-sm">
        <strong>{total}</strong> kommenttia
        {(haku || ip) && (
          <>
            {" "}
            ·{" "}
            <Link href="/admin/kommentit" className="text-accent-2 underline">
              Tyhjennä haku
            </Link>
          </>
        )}
      </p>

      <ul className="flex flex-col gap-2">
        {comments.map((c) => (
          <li key={c.id} className="rounded border border-line bg-paper p-3">
            <p className="text-xs text-muted">
              <Link href={`/artikkelit/${c.article.id}`} className="text-accent-2 hover:underline">
                {c.article.title}
              </Link>{" "}
              · {c.nickname || "Nimetön"}
            </p>
            <p className="mt-1 whitespace-pre-line text-sm">{c.body}</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span>
                {formatDateTime(c.createdAt)} · IP:{" "}
                {c.ipAddress ? (
                  <Link href={query({ ip: c.ipAddress, sivu: null })} className="hover:underline" title="Kaikki tästä osoitteesta">
                    {c.ipAddress}
                  </Link>
                ) : (
                  "tuntematon"
                )}
              </span>
              <div className="flex items-center gap-3">
                {c.ipAddress && (
                  <form action={banIp} className="flex items-center gap-1">
                    <input type="hidden" name="ipAddress" value={c.ipAddress} />
                    <select name="days" defaultValue="7" className="rounded border border-line bg-paper px-1 py-0.5 text-xs">
                      <option value="1">1 pv</option>
                      <option value="7">7 pv</option>
                      <option value="30">30 pv</option>
                    </select>
                    <button type="submit" className="text-danger underline">
                      Estä IP
                    </button>
                  </form>
                )}
                <form action={deleteArticleComment.bind(null, c.id)}>
                  <button type="submit" className="text-danger underline">
                    Poista
                  </button>
                </form>
              </div>
            </div>
          </li>
        ))}
        {comments.length === 0 && <p className="text-sm text-muted">Ei kommentteja.</p>}
      </ul>

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Sivut">
          {sivu > 1 ? (
            <Link href={query({ sivu: sivu - 1 })} className="text-accent-2 underline">
              ← Uudemmat
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Sivu {Math.min(sivu, pages)} / {pages}
          </span>
          {sivu < pages ? (
            <Link href={query({ sivu: sivu + 1 })} className="text-accent-2 underline">
              Vanhemmat →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
