import { createId } from '../utils/id';
import { setStudents } from './studentsRepo';
import { setBulletins } from './bulletinsRepo';
import { Student } from '../types/student';
import { Bulletin, BulletinNote } from '../types/bulletin';

function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().slice(0, 10);
}

function randomNom(index: number): string {
  const noms = ['Diallo', 'Camara', 'Konaté', 'Traoré', 'Bah', 'Keita', 'Sylla', 'Barry', 'Soumah', 'Kourouma', 'Conté', 'Sow', 'Cissé', 'Baldé', 'Touré', 'Fofana', 'Diakité', 'Bangoura', 'Doumbouya', 'Kaba'];
  return noms[index % noms.length];
}

function randomPrenom(index: number): string {
  const prenoms = ['Aïcha', 'Mamadou', 'Fatou', 'Ibrahim', 'Mariam', 'Youssouf', 'Nabinta', 'Alpha', 'Aminata', 'Lansana', 'Hawa', 'Oumar', 'Binta', 'Abdoulaye', 'Saran', 'Fanta', 'Moussa', 'Salimatou', 'Idrissa', 'Kadiatou'];
  return prenoms[index % prenoms.length];
}

function randomClasse(): string {
  const classes = ['6ème 1', '6ème 2', '6ème 3', '6ème 4'];
  return classes[Math.floor(Math.random() * classes.length)];
}

function randomMatricule(index: number): string {
  return `MAT${1000 + index}`;
}

function randomNumeroPasse(): string {
  return `${1000 + Math.floor(Math.random() * 9000)}`;
}

function randomNumeroDansClasse(): string {
  return `${1 + Math.floor(Math.random() * 30)}`;
}

function randomNotes(): BulletinNote[] {
  const matieres = [
    { id: 'm1', matiere: 'MALAGASY', coef: '3' },
    { id: 'm2', matiere: 'FRANÇAIS', coef: '2' },
    { id: 'm3', matiere: 'ANGLAIS', coef: '2' },
    { id: 'm4', matiere: 'HISTO-GEO / EC', coef: '3' },
    { id: 'm5', matiere: 'MATHEMATIQUES', coef: '3' },
    { id: 'm6', matiere: 'PHYSIQUE CHIMIE', coef: '2' },
    { id: 'm7', matiere: 'S.V.T.', coef: '3' },
    { id: 'm8', matiere: 'E.P.S.', coef: '1' },
  ];
  return matieres.map((m) => ({
    id: m.id,
    matiere: m.matiere,
    type: 'STANDARD',
    coefficient: m.coef,
    note: '',
    n1: (8 + Math.random() * 10).toFixed(2),
    n2: (8 + Math.random() * 10).toFixed(2),
    exam: (8 + Math.random() * 10).toFixed(2),
  }));
}

export async function generateDemoStudentsAndBulletins() {
  const now = Date.now();
  const annee = new Date().getFullYear();
  const anneeScolaire = `${annee}-${annee + 1}`;
  const students: Student[] = [];
  const bulletins: Bulletin[] = [];
  for (let i = 0; i < 20; i++) {
    const student: Student = {
      id: createId(),
      nom: randomNom(i),
      prenom: randomPrenom(i),
      dateNaissance: randomDate(new Date(2010, 0, 1), new Date(2013, 11, 31)),
      classe: randomClasse(),
      anneeScolaire,
      numeroDansClasse: randomNumeroDansClasse(),
      matricule: randomMatricule(i),
      numeroPasse: randomNumeroPasse(),
      createdAt: now,
      updatedAt: now,
    };
    students.push(student);
    // Un bulletin pour chaque trimestre
    for (let t = 1; t <= 3; t++) {
      bulletins.push({
        id: `${student.id}-T${t}`,
        studentId: student.id,
        trimestre: t as 1 | 2 | 3,
        notes: randomNotes(),
        appreciation: 'Bon travail',
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  await setStudents(students);
  await setBulletins(bulletins);
}
