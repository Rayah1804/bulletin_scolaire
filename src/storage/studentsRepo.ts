import { Student } from '../types/student';
import { readEncryptedJson, writeEncryptedJson } from './secureDb';
import { createId } from '../utils/id';

const STUDENTS_BACKUP_KEY = 'db:students-backup:v1';
const DELETED_STUDENTS_KEY = 'db:students-deleted:v1';
const FIRST_SETUP_KEY = 'db:first-setup:v1';

function getCurrentSchoolYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const start = month >= 8 ? year : year - 1;
  const end = start + 1;
  return `${start}-${end}`;
}

export async function getStudents(): Promise<Student[]> {
  const data = await readEncryptedJson<any[]>([]);
  const list = Array.isArray(data) ? data : [];

  // Migration: older records used "motDePasse"
  let migrated: Student[] = list
    .map((x) => {
      if (!x || typeof x !== 'object') return null;
      const numeroPasse =
        typeof x.numeroPasse === 'string'
          ? x.numeroPasse
          : typeof x.motDePasse === 'string'
            ? x.motDePasse
            : '';
      return {
        id: String(x.id ?? createId()),
        nom: String(x.nom ?? ''),
        prenom: String(x.prenom ?? ''),
        dateNaissance: String(x.dateNaissance ?? ''),
        classe: String(x.classe ?? ''),
        numeroDansClasse: String(x.numeroDansClasse ?? ''),
        matricule: String(x.matricule ?? ''),
        numeroPasse,
        anneeScolaire: String(x.anneeScolaire ?? getCurrentSchoolYear()),
        createdAt: typeof x.createdAt === 'number' ? x.createdAt : Date.now(),
        updatedAt: typeof x.updatedAt === 'number' ? x.updatedAt : Date.now(),
      } satisfies Student;
    })
    .filter(Boolean) as Student[];

  // Supprimer tous les étudiants d'exemple avec un id commençant par 'sample-student-'
  migrated = migrated.filter((s) => !s.id.startsWith('sample-student-'));

  // If migration changed shape, persist silently.
  if (migrated.length !== list.length) {
    writeEncryptedJson(migrated).catch(() => undefined);
  }

  // Suppression de la génération automatique d'exemples pour éviter tout doublon ou clé non unique.

  return migrated;
}

export async function setStudents(next: Student[]): Promise<void> {
  await writeEncryptedJson(next);
}

export async function backupStudents(next: Student[]): Promise<void> {
  await writeEncryptedJson(next, STUDENTS_BACKUP_KEY);
}

export async function getStudentsBackup(): Promise<Student[] | null> {
  const data = await readEncryptedJson<Student[] | null>(null, STUDENTS_BACKUP_KEY);
  return Array.isArray(data) ? data : null;
}

export async function clearStudentsBackup(): Promise<void> {
  await writeEncryptedJson([], STUDENTS_BACKUP_KEY);
}

export async function getDeletedStudents(): Promise<Student[]> {
  const data = await readEncryptedJson<Student[] | null>(null, DELETED_STUDENTS_KEY);
  return Array.isArray(data) ? data : [];
}

export async function setDeletedStudents(next: Student[]): Promise<void> {
  await writeEncryptedJson(next, DELETED_STUDENTS_KEY);
}

export async function addDeletedStudents(next: Student[]): Promise<void> {
  const current = await getDeletedStudents();
  await setDeletedStudents([...current, ...next]);
}

export async function clearDeletedStudents(): Promise<void> {
  await writeEncryptedJson([], DELETED_STUDENTS_KEY);
}

export async function seedStudentsIfEmpty(): Promise<Student[] | null> {
  const existing = await getStudents();
  const now = Date.now();
  const seedTemplates: Array<
    Omit<Student, 'id' | 'createdAt' | 'updatedAt'>
  > = [
    {
      nom: 'Diallo',
      prenom: 'Aïcha',
      dateNaissance: '2012-05-14',
      classe: '6ème 1',
      anneeScolaire: getCurrentSchoolYear(),
      numeroDansClasse: '12',
      matricule: '0851G-P/R',
      numeroPasse: '1234',
    },
    {
      nom: 'Camara',
      prenom: 'Mamadou',
      dateNaissance: '2011-11-03',
      classe: '6ème 1',
      anneeScolaire: getCurrentSchoolYear(),
      numeroDansClasse: '3',
      matricule: '0852G-P/R',
      numeroPasse: '2233',
    },
    {
      nom: 'Konaté',
      prenom: 'Fatou',
      dateNaissance: '2012-02-21',
      classe: '6ème 2',
      anneeScolaire: getCurrentSchoolYear(),
      numeroDansClasse: '8',
      matricule: '0911G-P/R',
      numeroPasse: '4455',
    },
    {
      nom: 'Traoré',
      prenom: 'Ibrahim',
      dateNaissance: '2011-07-18',
      classe: '6ème 2',
      anneeScolaire: getCurrentSchoolYear(),
      numeroDansClasse: '15',
      matricule: '0912G-P/R',
      numeroPasse: '6677',
    },
    {
      nom: 'Bah',
      prenom: 'Mariam',
      dateNaissance: '2012-10-09',
      classe: '6ème 1',
      anneeScolaire: getCurrentSchoolYear(),
      numeroDansClasse: '6',
      matricule: '0951G-P/R',
      numeroPasse: '1122',
    },
    {
      nom: 'Keita',
      prenom: 'Youssouf',
      dateNaissance: '2011-12-17',
      classe: '6ème 3',
      anneeScolaire: getCurrentSchoolYear(),
      numeroDansClasse: '4',
      matricule: '0952G-P/R',
      numeroPasse: '3344',
    },
    {
      nom: 'Sylla',
      prenom: 'Nabinta',
      dateNaissance: '2012-03-30',
      classe: '6ème 3',
      anneeScolaire: getCurrentSchoolYear(),
      numeroDansClasse: '10',
      matricule: '0953G-P/R',
      numeroPasse: '5566',
    },
    {
      nom: 'Barry',
      prenom: 'Alpha',
      dateNaissance: '2011-08-01',
      classe: '6ème 2',
      anneeScolaire: getCurrentSchoolYear(),
      numeroDansClasse: '2',
      matricule: '0954G-P/R',
      numeroPasse: '7788',
    },
    {
      nom: 'Soumah',
      prenom: 'Aminata',
      dateNaissance: '2012-06-22',
      classe: '6ème 4',
      anneeScolaire: getCurrentSchoolYear(),
      numeroDansClasse: '7',
      matricule: '0955G-P/R',
      numeroPasse: '9900',
    },
    {
      nom: 'Kourouma',
      prenom: 'Lansana',
      dateNaissance: '2011-09-11',
      classe: '6ème 4',
      anneeScolaire: getCurrentSchoolYear(),
      numeroDansClasse: '14',
      matricule: '0956G-P/R',
      numeroPasse: '1010',
    },
    {
      nom: 'Conté',
      prenom: 'Hawa',
      dateNaissance: '2012-01-27',
      classe: '6ème 1',
      anneeScolaire: getCurrentSchoolYear(),
      numeroDansClasse: '18',
      matricule: '0957G-P/R',
      numeroPasse: '2020',
    },
  ];

  const existingMatricules = new Set(existing.map((s) => s.matricule));
  const missing = seedTemplates
    .filter((t) => !existingMatricules.has(t.matricule))
    .map((t) => ({
      id: createId(),
      ...t,
      createdAt: now,
      updatedAt: now,
    }));

  if (missing.length === 0) return null;

  const next = [...existing, ...missing];
  await setStudents(next);
  return next;
}

