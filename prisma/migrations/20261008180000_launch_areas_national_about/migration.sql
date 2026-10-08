-- Pääkaupunkiseutu and Turku go live, each with its own mailbox, and the
-- national /tietoa page gets a national text in place of Tampere's.
--
-- Data only: no schema change.

UPDATE "Area" SET "active" = true WHERE "id" IN ('paakaupunkiseutu', 'turku');

-- Area mailboxes, only where nothing has been set yet.
UPDATE "Area" SET "contactInfo" = 'helsinki@kayttajayhteiso.fi' WHERE "id" = 'paakaupunkiseutu' AND "contactInfo" = '';
UPDATE "Area" SET "submissionEmail" = 'helsinki@kayttajayhteiso.fi' WHERE "id" = 'paakaupunkiseutu' AND "submissionEmail" = '';
UPDATE "Area" SET "contactInfo" = 'turku@kayttajayhteiso.fi' WHERE "id" = 'turku' AND "contactInfo" = '';
UPDATE "Area" SET "submissionEmail" = 'turku@kayttajayhteiso.fi' WHERE "id" = 'turku' AND "submissionEmail" = '';

-- The national about text. Replaced only where it is still empty or still
-- the copy of Tampere's that the areas migration left behind, so a text an
-- admin has written at /admin/asetukset is kept. Tampere keeps its own on
-- its Area row. Kept in step with NATIONAL_ABOUT_TEXT in
-- prisma/seed-reference.ts, which covers fresh installs.
UPDATE "SiteSettings" SET "aboutText" = '## Palvelut, vertaistuki ja oma lehti

Kokoamme päihdepalveluiden ajankohtaiset ilmoitukset, palvelut, NA-ryhmät ja yhteisömme kirjoituksia. Jokainen alue tekee niistä oman painetun lehtensä.

Käyttäjäyhteisö pyrkii edustamaan päihdekäyttäjäyhteisöä eri puolilla Suomea, tunnistaen että yhteisömme koostuu ihmisistä, jotka tulevat hyvin erilaisista lähtökohdista ja ovat hyvin erilaisissa tilanteissa. Ensisijaiseksi katsomme tuoda kaikista huono-osaisempien äänen kuuluviin, sillä tiedostamme että juuri huonoimmassa asemassa olevat ovat suurimman uhan alla ja vaarassa menehtyä.

Tärkein meitä ohjaava periaate on siis henkien pelastaminen. Tämän lisäksi pyrimme edistämään yhteisömme hyvinvointia ja parantamaan suhteitamme yhteiskuntaan, muihin yhteisöihin, naapurustoon ja viranomaisiin.

Tiedostamme että päihdepoliittinen tilanne Suomessa kaipaa parannusta ja vaadimme että vertaistemme ääni on mukana kaikessa yhteisöämme koskevissa asioissa.

Toimimme alueittain pääkaupunkiseudulla, Tampereella ja Turussa. Jokaisella alueella on omat yhteystietonsa, palveluhakemistonsa, NA-ryhmänsä ja oma lehtensä – löydät ne alueen omalta sivulta.

Yhteisöömme ovat tervetulleet niin huumeidenkäyttäjät, kuin niitä ennen käyttäneet tai kuka tahansa yhteisöstämme kiinnostunut taho.'
WHERE "id" = 1
  AND ("aboutText" = '' OR "aboutText" = (SELECT "aboutText" FROM "Area" WHERE "id" = 'tampere'));
