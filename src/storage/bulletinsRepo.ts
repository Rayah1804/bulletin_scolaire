import { Bulletin, BulletinNote } from '../types/bulletin';
import { readEncryptedJson, writeEncryptedJson } from './secureDb';

const BULLETIN_KEY = 'db:bulletins:v1';
const BULLETIN_FIRST_SETUP_KEY = 'db:bulletin-first-setup:v1';

const TRIMESTRES: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min: number, max: number): number {
  const value = Math.random() * (max - min) + min;
  return Math.round(value * 10) / 10;
}

function clampGrade(value: number): number {
  return Math.min(20, Math.max(4, Math.round(value * 10) / 10));
}

function formatGrade(value: number): string {
  const integerPart = Math.floor(value);
  const decimalPart = value - integerPart;

  let finalDecimal = 0;
  if (decimalPart >= 0.75) {
    finalDecimal = 0.75;
  } else if (decimalPart >= 0.5) {
    finalDecimal = 0.5;
  } else if (decimalPart >= 0.25) {
    finalDecimal = 0.5; // Arrondi vers le haut à 0.5
  } else {
    finalDecimal = 0;
  }

  const finalValue = integerPart + finalDecimal;
  return finalValue.toFixed(2).replace('.', ',');
}

function createStableSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 10000;
  }
  return hash;
}

function createVariedBulletinNotes(notes: BulletinNote[], trimestre: number, seed: number): BulletinNote[] {
  return notes.map((note, index) => {
    const baseN1 = note.n1 ? Number(String(note.n1).replace(',', '.')) : randomDecimal(8, 16);
    const baseN2 = note.n2 ? Number(String(note.n2).replace(',', '.')) : randomDecimal(8, 16);
    const baseExam = note.exam ? Number(String(note.exam).replace(',', '.')) : randomDecimal(8, 16);

    // Tendance plus prononcée par trimestre pour créer des écarts réalistes
    const trend = (trimestre - 1) * 1.2; // Augmenté de 0.5 à 1.2

    // Variation individuelle par matière et élève
    const subjectOffset = ((seed + index * 7) % 11 - 5) * 0.3;
    const trimestreVariation = randomDecimal(-2.5, 2.5); // Variation plus importante

    const n1 = clampGrade(baseN1 + trimestreVariation + trend + subjectOffset + randomDecimal(-0.8, 0.8));
    const n2 = clampGrade(baseN2 + trimestreVariation + trend + subjectOffset / 1.2 + randomDecimal(-0.8, 0.8));
    const exam = clampGrade(baseExam + trimestreVariation + trend * 0.8 + subjectOffset / 1.5 + randomDecimal(-0.5, 0.5));

    return {
      ...note,
      n1: formatGrade(n1),
      n2: formatGrade(n2),
      exam: formatGrade(exam),
    };
  });
}

function createBulletinVariant(baseBulletin: Bulletin, trimestre: number): Bulletin {
  const studentSeed = createStableSeed(baseBulletin.studentId) + trimestre * 7;
  return {
    ...baseBulletin,
    id: `${baseBulletin.studentId}-bulletin-${trimestre}`,
    trimestre: trimestre as 1 | 2 | 3 | 4 | 5,
    notes: createVariedBulletinNotes(baseBulletin.notes, trimestre, studentSeed),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function createSampleBulletinTemplates(now: number): Omit<Bulletin, 'id' | 'trimestre'>[] {
  return [
    {
      studentId: 'sample-student-1',
      notes: [
        { id: 'm1', matiere: 'MALAGASY', type: 'STANDARD', coefficient: '3', note: '', n1: '15', n2: '16', exam: '14' },
        { id: 'm2', matiere: 'FRANÇAIS', type: 'STANDARD', coefficient: '2', note: '', n1: '12', n2: '13', exam: '11' },
        { id: 'm3', matiere: 'ANGLAIS', type: 'STANDARD', coefficient: '2', note: '', n1: '14', n2: '15', exam: '13' },
        { id: 'm4', matiere: 'HISTO-GEO / EC', type: 'STANDARD', coefficient: '3', note: '', n1: '10', n2: '11', exam: '12' },
        { id: 'm5', matiere: 'MATHEMATIQUES', type: 'STANDARD', coefficient: '3', note: '', n1: '16', n2: '17', exam: '18' },
        { id: 'm6', matiere: 'PHYSIQUE CHIMIE', type: 'STANDARD', coefficient: '2', note: '', n1: '13', n2: '14', exam: '15' },
        { id: 'm7', matiere: 'S.V.T.', type: 'STANDARD', coefficient: '3', note: '', n1: '14', n2: '15', exam: '16' },
        { id: 'm8', matiere: 'E.P.S.', type: 'STANDARD', coefficient: '1', note: '', n1: '17', n2: '18', exam: '19' },
      ],
      appreciation: 'Excellent travail. Continuez ainsi.',
      createdAt: now,
      updatedAt: now,
    },
    {
      studentId: 'sample-student-2',
      notes: [
        { id: 'm1', matiere: 'MALAGASY', type: 'STANDARD', coefficient: '3', note: '', n1: '14', n2: '15', exam: '13' },
        { id: 'm2', matiere: 'FRANÇAIS', type: 'STANDARD', coefficient: '2', note: '', n1: '11', n2: '12', exam: '10' },
        { id: 'm3', matiere: 'ANGLAIS', type: 'STANDARD', coefficient: '2', note: '', n1: '13', n2: '14', exam: '12' },
        { id: 'm4', matiere: 'HISTO-GEO / EC', type: 'STANDARD', coefficient: '3', note: '', n1: '9', n2: '10', exam: '11' },
        { id: 'm5', matiere: 'MATHEMATIQUES', type: 'STANDARD', coefficient: '3', note: '', n1: '15', n2: '16', exam: '17' },
        { id: 'm6', matiere: 'PHYSIQUE CHIMIE', type: 'STANDARD', coefficient: '2', note: '', n1: '12', n2: '13', exam: '14' },
        { id: 'm7', matiere: 'S.V.T.', type: 'STANDARD', coefficient: '3', note: '', n1: '13', n2: '14', exam: '15' },
        { id: 'm8', matiere: 'E.P.S.', type: 'STANDARD', coefficient: '1', note: '', n1: '16', n2: '17', exam: '18' },
      ],
      appreciation: 'Bon travail. Peut mieux faire en francais.',
      createdAt: now,
      updatedAt: now,
    },
    {
      studentId: 'sample-student-3',
      notes: [
        { id: 'm1', matiere: 'MALAGASY', type: 'STANDARD', coefficient: '3', note: '', n1: '13', n2: '14', exam: '12' },
        { id: 'm2', matiere: 'FRANÇAIS', type: 'STANDARD', coefficient: '2', note: '', n1: '10', n2: '11', exam: '9' },
        { id: 'm3', matiere: 'ANGLAIS', type: 'STANDARD', coefficient: '2', note: '', n1: '12', n2: '13', exam: '11' },
        { id: 'm4', matiere: 'HISTO-GEO / EC', type: 'STANDARD', coefficient: '3', note: '', n1: '8', n2: '9', exam: '10' },
        { id: 'm5', matiere: 'MATHEMATIQUES', type: 'STANDARD', coefficient: '3', note: '', n1: '14', n2: '15', exam: '16' },
        { id: 'm6', matiere: 'PHYSIQUE CHIMIE', type: 'STANDARD', coefficient: '2', note: '', n1: '11', n2: '12', exam: '13' },
        { id: 'm7', matiere: 'S.V.T.', type: 'STANDARD', coefficient: '3', note: '', n1: '12', n2: '13', exam: '14' },
        { id: 'm8', matiere: 'E.P.S.', type: 'STANDARD', coefficient: '1', note: '', n1: '15', n2: '16', exam: '17' },
      ],
      appreciation: 'Bon potentiel, travaille regulierement.',
      createdAt: now,
      updatedAt: now,
    },
    {
      studentId: 'sample-student-4',
      notes: [
        { id: 'm1', matiere: 'MALAGASY', type: 'STANDARD', coefficient: '3', note: '', n1: '16', n2: '17', exam: '15' },
        { id: 'm2', matiere: 'FRANÇAIS', type: 'STANDARD', coefficient: '2', note: '', n1: '14', n2: '15', exam: '13' },
        { id: 'm3', matiere: 'ANGLAIS', type: 'STANDARD', coefficient: '2', note: '', n1: '15', n2: '16', exam: '14' },
        { id: 'm4', matiere: 'HISTO-GEO / EC', type: 'STANDARD', coefficient: '3', note: '', n1: '12', n2: '13', exam: '14' },
        { id: 'm5', matiere: 'MATHEMATIQUES', type: 'STANDARD', coefficient: '3', note: '', n1: '18', n2: '19', exam: '17' },
        { id: 'm6', matiere: 'PHYSIQUE CHIMIE', type: 'STANDARD', coefficient: '2', note: '', n1: '15', n2: '16', exam: '14' },
        { id: 'm7', matiere: 'S.V.T.', type: 'STANDARD', coefficient: '3', note: '', n1: '16', n2: '17', exam: '15' },
        { id: 'm8', matiere: 'E.P.S.', type: 'STANDARD', coefficient: '1', note: '', n1: '18', n2: '19', exam: '20' },
      ],
      appreciation: 'Tres bon resultat, maintenez le rythme.',
      createdAt: now,
      updatedAt: now,
    },
    {
      studentId: 'sample-student-5',
      notes: [
        { id: 'm1', matiere: 'MALAGASY', type: 'STANDARD', coefficient: '3', note: '', n1: '13', n2: '13', exam: '12' },
        { id: 'm2', matiere: 'FRANÇAIS', type: 'STANDARD', coefficient: '2', note: '', n1: '12', n2: '12', exam: '11' },
        { id: 'm3', matiere: 'ANGLAIS', type: 'STANDARD', coefficient: '2', note: '', n1: '14', n2: '13', exam: '13' },
        { id: 'm4', matiere: 'HISTO-GEO / EC', type: 'STANDARD', coefficient: '3', note: '', n1: '10', n2: '10', exam: '11' },
        { id: 'm5', matiere: 'MATHEMATIQUES', type: 'STANDARD', coefficient: '3', note: '', n1: '15', n2: '14', exam: '16' },
        { id: 'm6', matiere: 'PHYSIQUE CHIMIE', type: 'STANDARD', coefficient: '2', note: '', n1: '13', n2: '13', exam: '14' },
        { id: 'm7', matiere: 'S.V.T.', type: 'STANDARD', coefficient: '3', note: '', n1: '14', n2: '14', exam: '15' },
        { id: 'm8', matiere: 'E.P.S.', type: 'STANDARD', coefficient: '1', note: '', n1: '17', n2: '18', exam: '19' },
      ],
      appreciation: 'Stabilite satisfaisante, a renforcer en francais.',
      createdAt: now,
      updatedAt: now,
    },
    {
      studentId: 'sample-student-6',
      notes: [
        { id: 'm1', matiere: 'MALAGASY', type: 'STANDARD', coefficient: '3', note: '', n1: '12', n2: '13', exam: '12' },
        { id: 'm2', matiere: 'FRANÇAIS', type: 'STANDARD', coefficient: '2', note: '', n1: '11', n2: '12', exam: '11' },
        { id: 'm3', matiere: 'ANGLAIS', type: 'STANDARD', coefficient: '2', note: '', n1: '13', n2: '12', exam: '12' },
        { id: 'm4', matiere: 'HISTO-GEO / EC', type: 'STANDARD', coefficient: '3', note: '', n1: '9', n2: '10', exam: '10' },
        { id: 'm5', matiere: 'MATHEMATIQUES', type: 'STANDARD', coefficient: '3', note: '', n1: '13', n2: '14', exam: '15' },
        { id: 'm6', matiere: 'PHYSIQUE CHIMIE', type: 'STANDARD', coefficient: '2', note: '', n1: '12', n2: '13', exam: '13' },
        { id: 'm7', matiere: 'S.V.T.', type: 'STANDARD', coefficient: '3', note: '', n1: '13', n2: '13', exam: '14' },
        { id: 'm8', matiere: 'E.P.S.', type: 'STANDARD', coefficient: '1', note: '', n1: '16', n2: '16', exam: '17' },
      ],
      appreciation: 'Besoin de plus de rigueur, bonne volonte.',
      createdAt: now,
      updatedAt: now,
    },
    {
      studentId: 'sample-student-7',
      notes: [
        { id: 'm1', matiere: 'MALAGASY', type: 'STANDARD', coefficient: '3', note: '', n1: '15', n2: '14', exam: '14' },
        { id: 'm2', matiere: 'FRANÇAIS', type: 'STANDARD', coefficient: '2', note: '', n1: '12', n2: '13', exam: '12' },
        { id: 'm3', matiere: 'ANGLAIS', type: 'STANDARD', coefficient: '2', note: '', n1: '15', n2: '14', exam: '13' },
        { id: 'm4', matiere: 'HISTO-GEO / EC', type: 'STANDARD', coefficient: '3', note: '', n1: '11', n2: '11', exam: '12' },
        { id: 'm5', matiere: 'MATHEMATIQUES', type: 'STANDARD', coefficient: '3', note: '', n1: '17', n2: '16', exam: '18' },
        { id: 'm6', matiere: 'PHYSIQUE CHIMIE', type: 'STANDARD', coefficient: '2', note: '', n1: '14', n2: '13', exam: '15' },
        { id: 'm7', matiere: 'S.V.T.', type: 'STANDARD', coefficient: '3', note: '', n1: '15', n2: '14', exam: '16' },
        { id: 'm8', matiere: 'E.P.S.', type: 'STANDARD', coefficient: '1', note: '', n1: '18', n2: '17', exam: '19' },
      ],
      appreciation: 'Progres constant, continuez.',
      createdAt: now,
      updatedAt: now,
    },
    {
      studentId: 'sample-student-8',
      notes: [
        { id: 'm1', matiere: 'MALAGASY', type: 'STANDARD', coefficient: '3', note: '', n1: '14', n2: '13', exam: '13' },
        { id: 'm2', matiere: 'FRANÇAIS', type: 'STANDARD', coefficient: '2', note: '', n1: '11', n2: '10', exam: '10' },
        { id: 'm3', matiere: 'ANGLAIS', type: 'STANDARD', coefficient: '2', note: '', n1: '13', n2: '12', exam: '12' },
        { id: 'm4', matiere: 'HISTO-GEO / EC', type: 'STANDARD', coefficient: '3', note: '', n1: '10', n2: '10', exam: '11' },
        { id: 'm5', matiere: 'MATHEMATIQUES', type: 'STANDARD', coefficient: '3', note: '', n1: '16', n2: '15', exam: '16' },
        { id: 'm6', matiere: 'PHYSIQUE CHIMIE', type: 'STANDARD', coefficient: '2', note: '', n1: '13', n2: '12', exam: '14' },
        { id: 'm7', matiere: 'S.V.T.', type: 'STANDARD', coefficient: '3', note: '', n1: '14', n2: '13', exam: '15' },
        { id: 'm8', matiere: 'E.P.S.', type: 'STANDARD', coefficient: '1', note: '', n1: '17', n2: '18', exam: '18' },
      ],
      appreciation: 'Bonnes bases, renforcez le devoir a la maison.',
      createdAt: now,
      updatedAt: now,
    },
    {
      studentId: 'sample-student-9',
      notes: [
        { id: 'm1', matiere: 'MALAGASY', type: 'STANDARD', coefficient: '3', note: '', n1: '15', n2: '15', exam: '14' },
        { id: 'm2', matiere: 'FRANÇAIS', type: 'STANDARD', coefficient: '2', note: '', n1: '13', n2: '14', exam: '13' },
        { id: 'm3', matiere: 'ANGLAIS', type: 'STANDARD', coefficient: '2', note: '', n1: '14', n2: '15', exam: '13' },
        { id: 'm4', matiere: 'HISTO-GEO / EC', type: 'STANDARD', coefficient: '3', note: '', n1: '11', n2: '12', exam: '12' },
        { id: 'm5', matiere: 'MATHEMATIQUES', type: 'STANDARD', coefficient: '3', note: '', n1: '17', n2: '17', exam: '18' },
        { id: 'm6', matiere: 'PHYSIQUE CHIMIE', type: 'STANDARD', coefficient: '2', note: '', n1: '14', n2: '14', exam: '15' },
        { id: 'm7', matiere: 'S.V.T.', type: 'STANDARD', coefficient: '3', note: '', n1: '15', n2: '15', exam: '16' },
        { id: 'm8', matiere: 'E.P.S.', type: 'STANDARD', coefficient: '1', note: '', n1: '18', n2: '18', exam: '19' },
      ],
      appreciation: 'Bon dossier, gardez la constance.',
      createdAt: now,
      updatedAt: now,
    },
    {
      studentId: 'sample-student-10',
      notes: [
        { id: 'm1', matiere: 'MALAGASY', type: 'STANDARD', coefficient: '3', note: '', n1: '13', n2: '14', exam: '13' },
        { id: 'm2', matiere: 'FRANÇAIS', type: 'STANDARD', coefficient: '2', note: '', n1: '12', n2: '13', exam: '12' },
        { id: 'm3', matiere: 'ANGLAIS', type: 'STANDARD', coefficient: '2', note: '', n1: '13', n2: '14', exam: '13' },
        { id: 'm4', matiere: 'HISTO-GEO / EC', type: 'STANDARD', coefficient: '3', note: '', n1: '10', n2: '11', exam: '11' },
        { id: 'm5', matiere: 'MATHEMATIQUES', type: 'STANDARD', coefficient: '3', note: '', n1: '16', n2: '16', exam: '17' },
        { id: 'm6', matiere: 'PHYSIQUE CHIMIE', type: 'STANDARD', coefficient: '2', note: '', n1: '13', n2: '13', exam: '14' },
        { id: 'm7', matiere: 'S.V.T.', type: 'STANDARD', coefficient: '3', note: '', n1: '14', n2: '14', exam: '15' },
        { id: 'm8', matiere: 'E.P.S.', type: 'STANDARD', coefficient: '1', note: '', n1: '17', n2: '17', exam: '18' },
      ],
      appreciation: 'Très bon comportement et sérieux.',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function deduplicateBulletins(bulletins: Bulletin[]): Bulletin[] {
  const seen = new Set<string>();
  return bulletins.filter((bulletin) => {
    const key = `${bulletin.studentId}-${bulletin.trimestre}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function ensureAllTrimesterBulletins(existing: Bulletin[]): Bulletin[] {
  const groupedByStudent = existing.reduce<Record<string, Bulletin[]>>((acc, bulletin) => {
    acc[bulletin.studentId] = acc[bulletin.studentId] || [];
    acc[bulletin.studentId].push(bulletin);
    return acc;
  }, {});

  const result: Bulletin[] = [];

  Object.entries(groupedByStudent).forEach(([studentId, bulletins]) => {
    const presentTrimestres = new Set(bulletins.map((b) => b.trimestre));
    if (presentTrimestres.size === 0) {
      return;
    }

    const baseBulletin = bulletins.find((b) => b.trimestre === 1) ?? bulletins[0];
    if (!baseBulletin) {
      return;
    }

    TRIMESTRES.forEach((trimestre) => {
      const existingBulletin = bulletins.find((b) => b.trimestre === trimestre);

      if (existingBulletin) {
        // Bulletin existe déjà, on le garde tel quel pour éviter les doublons
        result.push(existingBulletin);
      } else {
        // Créer le bulletin manquant
        result.push(createBulletinVariant(baseBulletin, trimestre));
      }
    });
  });

  return result;
}

export async function getBulletins(): Promise<Bulletin[]> {
  const data = await readEncryptedJson<Bulletin[]>([], BULLETIN_KEY);
  let bulletins = Array.isArray(data) ? data : [];

  if (bulletins.length === 0) {
    try {
      const setupCompleted = await readEncryptedJson<boolean>(false, BULLETIN_FIRST_SETUP_KEY);
      if (!setupCompleted) {
        // Only on first setup - add sample bulletins and mark as done
        const now = Date.now();
        const templates = createSampleBulletinTemplates(now);
        const sampleBulletins: Bulletin[] = templates.flatMap((template, index) =>
          TRIMESTRES.map((trimestre) => {
            const baseBulletin = {
              ...template,
              trimestre,
              id: `sample-bulletin-${index + 1}-${trimestre}`,
            } as Bulletin;

            return trimestre === 1
              ? baseBulletin
              : {
                  ...baseBulletin,
                  notes: createVariedBulletinNotes(template.notes, trimestre, createStableSeed(template.studentId) + index + trimestre),
                };
          })
        );
        bulletins.push(...sampleBulletins);
        await setBulletins(bulletins);
        // Mark setup as completed - never add sample data again
        await writeEncryptedJson(true, BULLETIN_FIRST_SETUP_KEY);
      }
    } catch (error) {
      console.error('Erreur lors de la gestion des données d\'exemple de bulletins:', error);
    }
  } else {
    const completed = ensureAllTrimesterBulletins(bulletins);
    if (completed.length !== bulletins.length) {
      bulletins = completed;
      await setBulletins(bulletins);
    }
  }

  // Toujours dédupliquer pour être sûr
  bulletins = deduplicateBulletins(bulletins);

  return bulletins;
}

export async function setBulletins(next: Bulletin[]): Promise<void> {
  await writeEncryptedJson(next, BULLETIN_KEY);
}

export async function getStudentBulletin(
  studentId: string,
  trimestre: number
): Promise<Bulletin | undefined> {
  const list = await getBulletins();
  return list.find((b) => b.studentId === studentId && b.trimestre === trimestre);
}

export async function saveBulletin(bulletin: Bulletin): Promise<void> {
  const list = await getBulletins();
  const next = [
    bulletin,
    ...list.filter(
      (item) => !(item.studentId === bulletin.studentId && item.trimestre === bulletin.trimestre)
    ),
  ];
  await setBulletins(next);
}
