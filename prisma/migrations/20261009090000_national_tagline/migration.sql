-- The national /tietoa text leads with the new tagline and with posting
-- experiences of services. Only the opening heading and paragraph are
-- swapped, and only where they are still exactly what
-- 20261008180000_launch_areas_national_about put there, so an admin's own
-- rewrite is kept. Kept in step with NATIONAL_ABOUT_TEXT in
-- prisma/seed-reference.ts, which covers fresh installs.
--
-- Data only: no schema change.

UPDATE "SiteSettings" SET "aboutText" = REPLACE(
  "aboutText",
  '## Palvelut, vertaistuki ja oma lehti

Kokoamme päihdepalveluiden ajankohtaiset ilmoitukset, palvelut, NA-ryhmät ja yhteisömme kirjoituksia. Jokainen alue tekee niistä oman painetun lehtensä.',
  '## Vertaislähtöistä haittoja vähentävää aktivismia

Kokoamme jokaisen alueen päihdepalveluiden ajankohtaiset ilmoitukset, palvelut ja NA-ryhmät – ja ennen kaikkea yhteisömme kokemukset niistä. Kuka tahansa voi kertoa sivustolla nimettömästi, miten palvelussa kohdeltiin, ja lukea muiden kokemukset ennen kuin lähtee. Jokainen alue tekee kaikesta tästä myös oman painetun lehtensä.'
)
WHERE "id" = 1;
