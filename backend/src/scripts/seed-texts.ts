import { PrismaClient } from '@prisma/client';
import * as https from 'https';

const prisma = new PrismaClient();

function fetch(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Invalid JSON from ${url}`));
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function seedAmudTexts(masekhetName: string) {
  const masekhet = await prisma.masekhet.findUnique({
    where: { name: masekhetName },
  });
  if (!masekhet) {
    console.error(`Masekhet ${masekhetName} non trouvée en DB. Lancer seed:structure d'abord.`);
    return;
  }

  const amudim = await prisma.amud.findMany({
    where: { masekhetId: masekhet.id },
    orderBy: [{ daf: 'asc' }, { side: 'asc' }],
  });

  console.log(`\n=== ${masekhetName} : ${amudim.length} amudim à peupler ===\n`);

  for (const amud of amudim) {
    const ref = `${masekhetName}.${amud.daf}${amud.side}`;

    // Vérifier si déjà peuplé
    const existing = await prisma.amudSegment.count({ where: { amudId: amud.id } });
    if (existing > 0) {
      console.log(`  ${ref} — déjà peuplé, skip`);
      continue;
    }

    // 1. Récupérer la Guemara
    try {
      const gemaraUrl = `https://www.sefaria.org/api/v3/texts/${encodeURIComponent(ref)}`;
      const gemaraData = await fetch(gemaraUrl);
      await sleep(200);

      const segments: string[] = gemaraData.versions?.[0]?.text || [];

      for (let i = 0; i < segments.length; i++) {
        if (!segments[i]) continue;
        await prisma.amudSegment.create({
          data: {
            amudId: amud.id,
            position: i,
            textHe: segments[i],
          },
        });
      }

      // 2. Récupérer Rashi
      const rashiRef = `Rashi_on_${masekhetName}.${amud.daf}${amud.side}`;
      const rashiUrl = `https://www.sefaria.org/api/texts/${encodeURIComponent(rashiRef)}`;
      const rashiData = await fetch(rashiUrl);
      await sleep(200);

      // Rashi he[] peut être un tableau de tableaux (par ligne) ou un tableau simple
      const rashiHe = rashiData.he || [];

      if (Array.isArray(rashiHe) && rashiHe.length > 0) {
        if (Array.isArray(rashiHe[0])) {
          // Tableau de tableaux : rashiHe[ligne][commentaire]
          for (let line = 0; line < rashiHe.length; line++) {
            const comments = rashiHe[line];
            if (!Array.isArray(comments)) continue;
            for (let ci = 0; ci < comments.length; ci++) {
              if (!comments[ci]) continue;
              await prisma.rashiSegment.create({
                data: {
                  amudId: amud.id,
                  line: line + 1,
                  commentIndex: ci,
                  textHe: comments[ci],
                },
              });
            }
          }
        } else {
          // Tableau simple : c'est une seule ligne de Rashi
          for (let ci = 0; ci < rashiHe.length; ci++) {
            if (!rashiHe[ci]) continue;
            await prisma.rashiSegment.create({
              data: {
                amudId: amud.id,
                line: 1,
                commentIndex: ci,
                textHe: rashiHe[ci],
              },
            });
          }
        }
      }

      const rashiCount = await prisma.rashiSegment.count({ where: { amudId: amud.id } });
      console.log(`  ${ref} — ${segments.length} segments, ${rashiCount} rashi`);
    } catch (err: any) {
      console.error(`  ${ref} — ERREUR: ${err.message}`);
    }
  }
}

async function main() {
  const massekhtot = ['Megillah', 'Sukkah'];

  for (const name of massekhtot) {
    await seedAmudTexts(name);
  }

  console.log('\nSeed texts terminé.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
