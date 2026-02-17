import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const SEDER_HEBREW: Record<string, string> = {
  Zeraim: 'זרעים',
  Moed: 'מועד',
  Nashim: 'נשים',
  Nezikin: 'נזיקין',
  Kodashim: 'קדשים',
  Tahorot: 'טהרות',
};

// Massekhtot à peupler (pour l'instant uniquement Megillah et Sukkah)
const SEED_MASSEKHTOT = ['Megillah', 'Sukkah'];

async function main() {
  const shasPath = path.resolve(__dirname, '../../../shas.json');
  const shas = JSON.parse(fs.readFileSync(shasPath, 'utf8'));

  for (let i = 0; i < shas.sedarim.length; i++) {
    const sederData = shas.sedarim[i];

    // Vérifier si ce seder contient une masekhet qu'on veut peupler
    const hasTarget = sederData.massekhtot.some((m: any) =>
      SEED_MASSEKHTOT.includes(m.name)
    );
    if (!hasTarget) continue;

    // Créer le seder
    const seder = await prisma.seder.upsert({
      where: { name: sederData.name },
      update: {},
      create: {
        name: sederData.name,
        hebrewName: SEDER_HEBREW[sederData.name] || '',
        order: i + 1,
      },
    });
    console.log(`Seder: ${seder.name}`);

    for (const mData of sederData.massekhtot) {
      if (!SEED_MASSEKHTOT.includes(mData.name)) continue;

      // Créer la masekhet
      const masekhet = await prisma.masekhet.upsert({
        where: { name: mData.name },
        update: {},
        create: {
          sederId: seder.id,
          name: mData.name,
          hebrewName: mData.hebrewName,
          amudim: mData.amudim,
          dappim: mData.dappim,
          range: mData.range,
        },
      });
      console.log(`  Masekhet: ${masekhet.name} (${mData.amudim} amudim)`);

      // Générer tous les amoudim
      const lastDaf = mData.dappim;
      const lastSide = mData.amudim % 2 === 1 ? 'a' : 'b';
      let count = 0;

      for (let daf = 2; daf <= lastDaf; daf++) {
        for (const side of ['a', 'b']) {
          // Ne pas dépasser le dernier amoud
          if (daf === lastDaf && side === 'b' && lastSide === 'a') break;

          await prisma.amud.upsert({
            where: {
              masekhetId_daf_side: {
                masekhetId: masekhet.id,
                daf,
                side,
              },
            },
            update: {},
            create: {
              masekhetId: masekhet.id,
              daf,
              side,
            },
          });
          count++;
        }
      }
      console.log(`    ${count} amudim créés`);
    }
  }

  console.log('\nSeed structure terminé.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
