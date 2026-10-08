/**
 * Demo/seed data so the whole workflow (alerts -> articles -> zine) can be
 * tried immediately after install. Everything here is clearly labelled
 * "[DEMO]" and can be removed by deleting these users from /admin/kayttajat
 * (which cascades their alerts/articles/rounds) and deleting the sample
 * edition from the database.
 *
 * Every row here is written with a fixed id and upserted, and any other
 * "[DEMO]" row is deleted at the end. That matters because the container
 * entrypoint re-runs this file on every boot when SEED_DEMO_DATA=true:
 * with plain creates, each restart added another copy of the same demo
 * alerts and articles, and they piled up in the paper.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedReferenceData } from "./seed-reference";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "kayttajayhteiso2026";

async function upsertUser(data: {
  email: string;
  name: string;
  role: "ADMIN" | "MEMBER" | "SERVICE";
  serviceName?: string;
  areaId?: string;
}) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  return prisma.user.upsert({
    where: { email: data.email },
    update: {},
    create: { ...data, passwordHash, active: true },
  });
}

/**
 * Fixed ids for every demo row, so a re-run updates each row in place
 * rather than adding another copy, and anything else marked "[DEMO]" can be
 * recognised as a leftover and swept up.
 */
const DEMO_ID = {
  alertPoikkeusaukiolo: "demo-alert-poikkeusaukiolo",
  alertNaloksonikoulutus: "demo-alert-naloksonikoulutus",
  alertPuhelinPois: "demo-alert-puhelin-pois-kaytosta",
  articleHaavanhoito: "demo-article-haavanhoito",
  articleVertaistuki: "demo-article-vertaistuki",
  roundKeskusta: "demo-round-keskusta",
  roundHervanta: "demo-round-hervanta",
} as const;

const DEMO_IDS = Object.values(DEMO_ID);

/** Demo content is Tampere's, the area these services are in. The demo admin
 * is national, so it can try every area. */
const DEMO_AREA = "tampere";

/**
 * Deletes "[DEMO]" alerts, articles and street rounds that this run did not
 * write — the duplicates left behind by earlier runs, from back when this
 * file created rows unconditionally on every container boot.
 */
async function removeStrayDemoRows(): Promise<void> {
  const stray = { title: { startsWith: "[DEMO]" }, id: { notIn: DEMO_IDS } };
  const [alerts, articles] = await Promise.all([
    prisma.alert.deleteMany({ where: stray }),
    prisma.article.deleteMany({ where: stray }),
  ]);
  const rounds = await prisma.streetRound.deleteMany({
    where: { author: { name: { startsWith: "[DEMO]" } }, id: { notIn: DEMO_IDS } },
  });

  const removed = alerts.count + articles.count + rounds.count;
  if (removed > 0) {
    console.log(
      `Poistettu ${removed} ylimääräistä demo-riviä (${alerts.count} ilmoitusta, ${articles.count} artikkelia, ${rounds.count} kierrosta).`,
    );
  }
}

async function main() {
  const admin = await upsertUser({
    email: "admin@kayttajayhteiso.fi",
    name: "[DEMO] Ylläpitäjä",
    role: "ADMIN",
  });

  const member = await upsertUser({
    email: "jasen@kayttajayhteiso.fi",
    name: "[DEMO] Jäsen Meikäläinen",
    role: "MEMBER",
    areaId: DEMO_AREA,
  });

  const serviceA = await upsertUser({
    email: "nervi@palvelu.fi",
    name: "[DEMO] Nervi yhteyshenkilö",
    role: "SERVICE",
    serviceName: "[DEMO] Nervi – Terveysneuvonta",
    areaId: DEMO_AREA,
  });

  const serviceB = await upsertUser({
    email: "osviitta@palvelu.fi",
    name: "[DEMO] Osviitta yhteyshenkilö",
    role: "SERVICE",
    serviceName: "[DEMO] Kriisikeskus Osviitta",
    areaId: DEMO_AREA,
  });

  // SiteSettings (real org info, logo, about text) is owned by
  // seedReferenceData() below, not demo data.

  const now = new Date();
  const in5days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  const alert1Data = {
    areaId: DEMO_AREA,
    serviceUserId: serviceA.id,
    title: "[DEMO] Poikkeusaukiolo",
    body: "Suljemme poikkeuksellisesti klo 16 torstaina. Kiireellisissä asioissa ota yhteyttä puhelimitse.",
    validUntil: in5days,
    includeInZine: true,
  };
  const alert1 = await prisma.alert.upsert({
    where: { id: DEMO_ID.alertPoikkeusaukiolo },
    update: alert1Data,
    create: { id: DEMO_ID.alertPoikkeusaukiolo, ...alert1Data },
  });

  const alert2Data = {
    areaId: DEMO_AREA,
    serviceUserId: serviceA.id,
    title: "[DEMO] Naloksonikoulutus keskiviikkona",
    body: "Ilmainen naloksonikoulutus keskiviikkona klo 14. Ei ennakkoilmoittautumista.",
    includeInZine: true,
  };
  const alert2 = await prisma.alert.upsert({
    where: { id: DEMO_ID.alertNaloksonikoulutus },
    update: alert2Data,
    create: { id: DEMO_ID.alertNaloksonikoulutus, ...alert2Data },
  });

  const alert3Data = {
    areaId: DEMO_AREA,
    serviceUserId: serviceB.id,
    title: "[DEMO] Puhelinnumero tilapäisesti pois käytöstä",
    body: "Puhelinlinjamme on tilapäisesti pois käytöstä huoltotöiden vuoksi. Käy paikan päällä tai lähetä sähköpostia.",
    includeInZine: true,
  };
  await prisma.alert.upsert({
    where: { id: DEMO_ID.alertPuhelinPois },
    update: alert3Data,
    create: { id: DEMO_ID.alertPuhelinPois, ...alert3Data },
  });

  const article1Data = {
    authorId: member.id,
    title: "[DEMO] Havaintoja kadulta: tarve haavanhoito-ohjaukselle kasvaa",
    body: "## Mitä kuulimme\n\nViime viikkojen katukierroksilla useampi ihminen kysyi haavanhoidosta ja puhtaista sitomistarvikkeista.\n\nMuistutamme, että matalan kynnyksen terveysneuvonnasta saa apua myös haavanhoitoon.\n",
    status: "PUBLISHED" as const,
    includeInZine: true,
  };
  const article1 = await prisma.article.upsert({
    where: { id: DEMO_ID.articleHaavanhoito },
    update: article1Data,
    create: { id: DEMO_ID.articleHaavanhoito, ...article1Data },
  });

  const article2Data = {
    authorId: member.id,
    title: "[DEMO] Miksi vertaistuki toimii",
    body: "Vertaistuki perustuu jaettuun kokemukseen. Tässä artikkelissa kerromme, miksi se on tärkeä osa Käyttäjäyhteisön toimintaa.\n",
    status: "PUBLISHED" as const,
    includeInZine: false,
  };
  await prisma.article.upsert({
    where: { id: DEMO_ID.articleVertaistuki },
    update: article2Data,
    create: { id: DEMO_ID.articleVertaistuki, ...article2Data },
  });

  const round1Data = {
    areaId: DEMO_AREA,
    authorId: member.id,
    date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    participants: "2 jäsentä",
    place: "Keskusta / Tullintori",
    notes:
      "Jaettiin noin 35 lehteä. Useampi mainitsi pitkät jonot eräässä palvelussa. Kaksi kysyi haavanhoidosta. Kiinnostusta naloksonikoulutukseen.",
  };
  await prisma.streetRound.upsert({
    where: { id: DEMO_ID.roundKeskusta },
    update: round1Data,
    create: { id: DEMO_ID.roundKeskusta, ...round1Data },
  });

  const round2Data = {
    areaId: DEMO_AREA,
    authorId: member.id,
    date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    place: "Hervanta",
    notes: "Rauhallinen kierros. Kysyttiin liikkuvan terveysneuvonnan seuraavasta ajankohdasta.",
  };
  await prisma.streetRound.upsert({
    where: { id: DEMO_ID.roundHervanta },
    update: round2Data,
    create: { id: DEMO_ID.roundHervanta, ...round2Data },
  });

  // A sample already-finalized edition, for a past week, so the archive and
  // the "current issue" page have something to show immediately.
  const weekAgoStart = new Date(now);
  weekAgoStart.setDate(weekAgoStart.getDate() - weekAgoStart.getDay() - 6);
  weekAgoStart.setHours(0, 0, 0, 0);
  const weekAgoEnd = new Date(weekAgoStart.getTime() + 6 * 24 * 60 * 60 * 1000);

  const sampleEdition = await prisma.zineEdition.upsert({
    where: { areaId_startDate_endDate: { areaId: DEMO_AREA, startDate: weekAgoStart, endDate: weekAgoEnd } },
    update: {},
    create: {
      areaId: DEMO_AREA,
      startDate: weekAgoStart,
      endDate: weekAgoEnd,
      status: "FINAL",
      publishedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      coverNote: "[DEMO] Esimerkkinumero, joka näyttää miltä automaattisesti koottu lehti näyttää.",
    },
  });

  await prisma.zineItem.upsert({
    where: {
      editionId_contentType_sourceId: {
        editionId: sampleEdition.id,
        contentType: "ALERT",
        sourceId: alert1.id,
      },
    },
    update: {},
    create: {
      editionId: sampleEdition.id,
      contentType: "ALERT",
      sourceId: alert1.id,
      titleSnapshot: alert1.title,
      bodySnapshot: alert1.body,
      authorSnapshot: "[DEMO] Nervi – Terveysneuvonta",
      sortOrder: 0,
    },
  });

  await prisma.zineItem.upsert({
    where: {
      editionId_contentType_sourceId: {
        editionId: sampleEdition.id,
        contentType: "ALERT",
        sourceId: alert2.id,
      },
    },
    update: {},
    create: {
      editionId: sampleEdition.id,
      contentType: "ALERT",
      sourceId: alert2.id,
      titleSnapshot: alert2.title,
      bodySnapshot: alert2.body,
      authorSnapshot: "[DEMO] Nervi – Terveysneuvonta",
      sortOrder: 1,
    },
  });

  await prisma.zineItem.upsert({
    where: {
      editionId_contentType_sourceId: {
        editionId: sampleEdition.id,
        contentType: "ARTICLE",
        sourceId: article1.id,
      },
    },
    update: {},
    create: {
      editionId: sampleEdition.id,
      contentType: "ARTICLE",
      sourceId: article1.id,
      titleSnapshot: article1.title,
      bodySnapshot: article1.body,
      authorSnapshot: "[DEMO] Jäsen Meikäläinen",
      sortOrder: 2,
    },
  });

  await removeStrayDemoRows();
  await seedReferenceData();

  console.log("Seed valmis.");
  console.log(`Kirjaudu osoitteessa /kirjaudu, salasana kaikille demo-tileille: ${DEMO_PASSWORD}`);
  console.log(`  Ylläpitäjä: ${admin.email}`);
  console.log(`  Jäsen:      ${member.email}`);
  console.log(`  Palvelu A:  ${serviceA.email}`);
  console.log(`  Palvelu B:  ${serviceB.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
