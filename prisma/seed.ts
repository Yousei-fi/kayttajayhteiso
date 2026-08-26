/**
 * Demo/seed data so the whole workflow (alerts -> articles -> zine) can be
 * tried immediately after install. Everything here is clearly labelled
 * "[DEMO]" and can be removed by deleting these users from /admin/kayttajat
 * (which cascades their alerts/articles/rounds) and deleting the sample
 * edition from the database.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "kayttajayhteiso2026";

async function upsertUser(data: {
  email: string;
  name: string;
  role: "ADMIN" | "MEMBER" | "SERVICE";
  serviceName?: string;
}) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  return prisma.user.upsert({
    where: { email: data.email },
    update: {},
    create: { ...data, passwordHash, active: true },
  });
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
  });

  const serviceA = await upsertUser({
    email: "nervi@palvelu.fi",
    name: "[DEMO] Nervi yhteyshenkilö",
    role: "SERVICE",
    serviceName: "[DEMO] Nervi – Terveysneuvonta",
  });

  const serviceB = await upsertUser({
    email: "osviitta@palvelu.fi",
    name: "[DEMO] Osviitta yhteyshenkilö",
    role: "SERVICE",
    serviceName: "[DEMO] Kriisikeskus Osviitta",
  });

  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      orgName: "Tampereen Käyttäjäyhteisö",
      description:
        "Vertaistoimintaa ja tiedonvälitystä huumeita käyttäville ja heidän läheisilleen Tampereella.",
      contactInfo: "info@kayttajayhteiso.fi",
      socialInfo: "@tampereenkayttajayhteiso",
      backPageText:
        "**Haittojen vähentäminen:**\n\n- Älä käytä yksin.\n- Naloksoni pelastaa hengen yliannostuksessa.\n- Terveysneuvontapisteistä saa puhtaita välineitä maksutta.\n",
    },
  });

  const now = new Date();
  const in5days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  const alert1 = await prisma.alert.create({
    data: {
      serviceUserId: serviceA.id,
      title: "[DEMO] Poikkeusaukiolo",
      body: "Suljemme poikkeuksellisesti klo 16 torstaina. Kiireellisissä asioissa ota yhteyttä puhelimitse.",
      validUntil: in5days,
      includeInZine: true,
    },
  });

  const alert2 = await prisma.alert.create({
    data: {
      serviceUserId: serviceA.id,
      title: "[DEMO] Naloksonikoulutus keskiviikkona",
      body: "Ilmainen naloksonikoulutus keskiviikkona klo 14. Ei ennakkoilmoittautumista.",
      includeInZine: true,
    },
  });

  await prisma.alert.create({
    data: {
      serviceUserId: serviceB.id,
      title: "[DEMO] Puhelinnumero tilapäisesti pois käytöstä",
      body: "Puhelinlinjamme on tilapäisesti pois käytöstä huoltotöiden vuoksi. Käy paikan päällä tai lähetä sähköpostia.",
      includeInZine: true,
    },
  });

  const article1 = await prisma.article.create({
    data: {
      authorId: member.id,
      title: "[DEMO] Havaintoja kadulta: tarve haavanhoito-ohjaukselle kasvaa",
      body: "## Mitä kuulimme\n\nViime viikkojen katukierroksilla useampi ihminen kysyi haavanhoidosta ja puhtaista sitomistarvikkeista.\n\nMuistutamme, että matalan kynnyksen terveysneuvonnasta saa apua myös haavanhoitoon.\n",
      status: "PUBLISHED",
      includeInZine: true,
    },
  });

  await prisma.article.create({
    data: {
      authorId: member.id,
      title: "[DEMO] Miksi vertaistuki toimii",
      body: "Vertaistuki perustuu jaettuun kokemukseen. Tässä artikkelissa kerromme, miksi se on tärkeä osa Tampereen Käyttäjäyhteisön toimintaa.\n",
      status: "PUBLISHED",
      includeInZine: false,
    },
  });

  await prisma.streetRound.create({
    data: {
      authorId: member.id,
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      participants: "2 jäsentä",
      area: "Keskusta / Tullintori",
      notes:
        "Jaettiin noin 35 lehteä. Useampi mainitsi pitkät jonot eräässä palvelussa. Kaksi kysyi haavanhoidosta. Kiinnostusta naloksonikoulutukseen.",
    },
  });

  await prisma.streetRound.create({
    data: {
      authorId: member.id,
      date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      area: "Hervanta",
      notes: "Rauhallinen kierros. Kysyttiin liikkuvan terveysneuvonnan seuraavasta ajankohdasta.",
    },
  });

  // A sample already-finalized edition, for a past week, so the archive and
  // the "current issue" page have something to show immediately.
  const weekAgoStart = new Date(now);
  weekAgoStart.setDate(weekAgoStart.getDate() - weekAgoStart.getDay() - 6);
  weekAgoStart.setHours(0, 0, 0, 0);
  const weekAgoEnd = new Date(weekAgoStart.getTime() + 6 * 24 * 60 * 60 * 1000);

  const sampleEdition = await prisma.zineEdition.upsert({
    where: { startDate_endDate: { startDate: weekAgoStart, endDate: weekAgoEnd } },
    update: {},
    create: {
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
