import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getAllAreas, isNationalAdmin } from "@/lib/area";
import { createUser, toggleUserActive, resetUserPassword, setUserArea } from "./actions";
import { formatDate } from "@/lib/week";

const roleLabel: Record<string, string> = {
  ADMIN: "Ylläpitäjä",
  MEMBER: "Jäsen",
  SERVICE: "Palvelutili",
};

export default async function KayttajatPage() {
  const admin = await requireUser("ADMIN");
  const national = isNationalAdmin(admin);
  // An area admin sees and manages their own area's accounts only.
  const [users, areas] = await Promise.all([
    prisma.user.findMany({
      where: national ? undefined : { areaId: admin.areaId },
      orderBy: { createdAt: "asc" },
    }),
    getAllAreas(),
  ]);
  const areaName = (id: string | null) => areas.find((a) => a.id === id)?.name;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-bold">Uusi käyttäjä</h1>
        <form action={createUser} className="grid max-w-xl gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Nimi / yhteyshenkilö
            <input name="name" required className="rounded border border-line bg-paper px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Sähköposti
            <input type="email" name="email" required className="rounded border border-line bg-paper px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Rooli
            <select name="role" className="rounded border border-line bg-paper px-3 py-2">
              <option value="MEMBER">Jäsen</option>
              <option value="SERVICE">Palvelutili</option>
              <option value="ADMIN">Ylläpitäjä</option>
            </select>
          </label>
          {national && (
            <label className="flex flex-col gap-1 text-sm font-medium">
              Alue
              <select name="areaId" className="rounded border border-line bg-paper px-3 py-2">
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
                <option value="">Ei aluetta (valtakunnallinen)</option>
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm font-medium">
            Palvelun nimi (palvelutileille)
            <input name="serviceName" className="rounded border border-line bg-paper px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
            Salasana (vähintään 8 merkkiä)
            <input type="password" name="password" required minLength={8} className="rounded border border-line bg-paper px-3 py-2" />
          </label>
          <button type="submit" className="sm:col-span-2 rounded bg-accent px-4 py-2 font-semibold text-white">
            Luo käyttäjä
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Käyttäjät</h2>
        <ul className="flex flex-col gap-2">
          {users.map((u) => (
            <li key={u.id} className="rounded border border-line bg-paper p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {u.serviceName || u.name}{" "}
                    <span className="text-xs font-normal text-muted">
                      ({roleLabel[u.role]} · {areaName(u.areaId) ?? "valtakunnallinen"})
                    </span>
                  </p>
                  <p className="text-xs text-muted">
                    {u.email} · liittynyt {formatDate(u.createdAt)} · {u.active ? "Aktiivinen" : "Ei aktiivinen"}
                  </p>
                </div>
                <form action={toggleUserActive.bind(null, u.id)}>
                  <button type="submit" className="text-sm text-accent-2 underline">
                    {u.active ? "Poista käytöstä" : "Aktivoi"}
                  </button>
                </form>
              </div>
              {national && (
                <form action={setUserArea.bind(null, u.id)} className="mt-2 flex items-center gap-2 text-sm">
                  <select
                    name="areaId"
                    defaultValue={u.areaId ?? ""}
                    className="rounded border border-line bg-paper px-2 py-1"
                  >
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                    <option value="">Ei aluetta (valtakunnallinen)</option>
                  </select>
                  <button type="submit" className="rounded border border-line px-2 py-1 text-xs font-semibold">
                    Vaihda alue
                  </button>
                </form>
              )}
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-muted">Aseta uusi salasana</summary>
                <form action={resetUserPassword.bind(null, u.id)} className="mt-2 flex gap-2">
                  <input type="password" name="password" minLength={8} required className="rounded border border-line bg-paper px-3 py-1.5" />
                  <button type="submit" className="rounded border border-line px-3 py-1.5 text-sm font-semibold">
                    Tallenna
                  </button>
                </form>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
