export type BulletinNote = {
  id: string;
  matiere: string;
  type: string;
  coefficient: string;
  note: string;
  n1?: string;
  n2?: string;
  exam?: string;
  signature?: string;
};

export type Bulletin = {
  id: string;
  studentId: string;
  trimestre: 1 | 2 | 3 | 4 | 5;
  notes: BulletinNote[];
  appreciation: string;
  createdAt: number;
  updatedAt: number;
};
