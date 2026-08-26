/**
 * Creates (or promotes) an admin account without needing an existing
 * admin to be logged in — for first-time setup or recovery.
 *
 * Interactive:   node scripts/create-admin.mjs
 * Non-interactive (e.g. inside a running container):
 *   node scripts/create-admin.mjs --name "Ylläpitäjä" --email admin@example.com --password "vähintään8merkkiä"
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import readline from "readline/promises";
import { stdin, stdout } from "process";

const prisma = new PrismaClient();

function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      args[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();
  let { name, email, password } = args;

  if (!name || !email || !password) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    // Plain sequential rl.question() calls don't work reliably with
    // piped/non-TTY stdin (Node fires all buffered 'line' events eagerly,
    // so lines arriving before a question is asked get dropped). Pulling
    // from the readline async iterator instead asks for lines on demand,
    // which works correctly for both a real terminal and piped input.
    const lines = rl[Symbol.asyncIterator]();
    const ask = async (prompt) => {
      stdout.write(prompt);
      const { value, done } = await lines.next();
      return done ? "" : value;
    };

    console.log("Luodaan uusi ylläpitäjätunnus (tai ylennetään olemassa oleva käyttäjä ylläpitäjäksi).");
    console.log("Huom: salasana näkyy näytöllä tässä vaiheessa.\n");
    name = name || (await ask("Nimi: "));
    email = email || (await ask("Sähköposti: "));
    while (!password || password.length < 8) {
      password = await ask("Salasana (vähintään 8 merkkiä): ");
      if (password.length < 8) console.log("Liian lyhyt salasana, yritä uudelleen.");
    }
    rl.close();
  }

  name = name.trim();
  email = email.trim().toLowerCase();

  if (!name || !email || password.length < 8) {
    console.error("Nimi, sähköposti ja vähintään 8 merkin salasana vaaditaan.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { role: "ADMIN", active: true, passwordHash, name },
    });
    console.log(`\nPäivitetty: ${email} on nyt aktiivinen ylläpitäjä uudella salasanalla.`);
  } else {
    await prisma.user.create({
      data: { name, email, passwordHash, role: "ADMIN", active: true },
    });
    console.log(`\nLuotu uusi ylläpitäjätunnus: ${email}`);
  }

  console.log("Kirjaudu osoitteessa /kirjaudu.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
