import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ImageRequireSource,
  ImageURISource,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getStudents } from '../storage/studentsRepo';
import { saveBulletin, getBulletins } from '../storage/bulletinsRepo';
import { getMaxTrimestres, getTrimestresArray, updateMaxTrimestres, getPeriodName, updatePeriodName } from '../storage/configRepo';
import { Picker } from '@react-native-picker/picker';
import { Bulletin } from '../types/bulletin';
import { Student } from '../types/student';
import { createId } from '../utils/id';
import { logoLeftBase64, logoTopBase64 } from '../utils/logosBase64';
import { useTheme } from '../theme/ThemeProvider';

type StudentsStackParamList = {
  StudentsList: undefined;
  StudentsSearch: undefined;
  StudentForm: { id?: string } | undefined;
  BulletinForm: { studentId: string } | undefined;
};

type Props = NativeStackScreenProps<StudentsStackParamList, 'BulletinForm'>;

const defaultMatieres = [
  { id: 'm1', matiere: 'MALAGASY', coefficient: 3 },
  { id: 'm2', matiere: 'FRANÇAIS', coefficient: 2 },
  { id: 'm3', matiere: 'ANGLAIS', coefficient: 2 },
  { id: 'm4', matiere: 'HISTO-GEO / EC', coefficient: 3 },
  { id: 'm5', matiere: 'MATHEMATIQUES', coefficient: 3 },
  { id: 'm6', matiere: 'PHYSIQUE CHIMIE', coefficient: 2 },
  { id: 'm7', matiere: 'S.V.T.', coefficient: 3 },
  { id: 'm8', matiere: 'E.P.S.', coefficient: 1 },
];

type MatiereRow = {
  id: string;
  matiere: string;
  coefficient: string;
  n1: string | null;
  n2: string | null;
  exam: string | null;
  signature: string | null;
};

export default function BulletinFormScreen({ navigation, route }: Props) {
    // Gestion du changement de nombre de trimestres
    const handleMaxTrimestresChange = (value: 3 | 5) => {
      setTrimestre(1); // reset au 1er trimestre en premier
      setMaxTrimestres(value);
      updateMaxTrimestres(value); // asynchrone mais pas besoin d'attendre pour l'UI
      setRefreshKey(prev => prev + 1);
    };
  const { theme, hydrateTheme } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const styles = React.useMemo(() => createStyles(theme, width), [theme, width]);

  const studentId = route.params?.studentId ?? '';
  const [student, setStudent] = useState<Student | null>(null);
  const [schoolYear, setSchoolYear] = useState('');
  const [maxTrimestres, setMaxTrimestres] = useState<3 | 5>(5);
  const [periodName, setPeriodName] = useState('TRIMESTRE');
  const [trimestre, setTrimestre] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [matieres, setMatieres] = useState<MatiereRow[]>(defaultMatieres.map((m) => ({
    ...m,
    coefficient: String(m.coefficient),
    n1: null,
    n2: null,
    exam: null,
    signature: null,
  })));
  const [appreciation, setAppreciation] = useState('');
  const [saving, setSaving] = useState(false);
  const [studentBulletins, setStudentBulletins] = useState<Bulletin[]>([]);
  const [classBulletins, setClassBulletins] = useState<Bulletin[]>([]);

  const formattedDate = student?.dateNaissance ? (() => {
    const [year, month, day] = student.dateNaissance.split('-');
    return `${day}/${month}/${year}`;
  })() : '';
  const [columnN1, setColumnN1] = useState('N1');
  const [columnN2, setColumnN2] = useState('N2');
  const [columnExam, setColumnExam] = useState('EXAM');
  const [showNumeroPasse, setShowNumeroPasse] = useState(false);
  const [numeroPasseLabel, setNumeroPasseLabel] = useState('N° de passe');
  const [selectedMatieres, setSelectedMatieres] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await hydrateTheme();
      const max = await getMaxTrimestres();
      const pName = await getPeriodName();
      if (!mounted) return;
      setMaxTrimestres(max);
      setPeriodName(pName);
      
      if (!studentId) return;
      const list = await getStudents();
      const found = list.find((s) => s.id === studentId);
      if (!mounted) return;
      setStudent(found ?? null);
      setSchoolYear(found?.anneeScolaire ?? '');
      
      const bulletins = await getBulletins();
      const studentBulletins = bulletins.filter((b) => b.studentId === studentId);
      const classBulletins = bulletins.filter((b) => {
        const owner = list.find((s) => s.id === b.studentId);
        return owner?.classe === found?.classe;
      });
      setStudentBulletins(studentBulletins);
      setClassBulletins(classBulletins);
      
      const current = studentBulletins.find((b) => b.trimestre === trimestre);
      if (current) {
        loadBulletinData(current);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [studentId, refreshKey]);

  useEffect(() => {
    // Recharger quand trimestre change
    const current = studentBulletins.find((b) => b.trimestre === trimestre);
    if (current) {
      loadBulletinData(current);
    } else {
      // Reset form
      setMatieres(defaultMatieres.map((m) => ({
        ...m,
        coefficient: String(m.coefficient),
        n1: null,
        n2: null,
        exam: null,
        signature: null,
      })));
      setAppreciation('');
    }
  }, [trimestre, studentBulletins]);

  function loadBulletinData(bulletin: Bulletin) {
    const rows = bulletin.notes.map((note) => ({
      id: note.id,
      matiere: note.matiere,
      coefficient: String(note.coefficient),
      n1: note.n1 ?? null,
      n2: note.n2 ?? null,
      exam: note.exam ?? null,
      signature: note.signature ?? null,
    }));
    setMatieres(rows);
    setAppreciation(bulletin.appreciation);
  }

  function parseNoteValue(value?: string | null): number | null {
    if (!value) return null;
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }

  // Calcul de MG selon la formule
  function calculateMG(row: MatiereRow): number | null {
    const n1 = parseNoteValue(row.n1);
    const n2 = parseNoteValue(row.n2);
    const exam = parseNoteValue(row.exam);
    if (n1 === null || n2 === null || exam === null) return null;
    const sum = n1 + n2 + exam;
    const coefficient = Number(row.coefficient) || 1;
    if (coefficient === 3) return sum;
    if (coefficient === 2) return (sum / 3) * 2;
    if (coefficient === 1) return sum / 3;
    return null;
  }

  const { totalMG, totalCoeff, moyenneGenerale } = useMemo(() => {
    let total = 0;
    let coeff = 0;
    matieres.forEach((row) => {
      const mg = calculateMG(row);
      if (mg !== null) {
        total += mg;
        coeff += Number(row.coefficient) || 0;
      }
    });
    const moy = coeff > 0 ? total / coeff : 0;
    return { totalMG: total, totalCoeff: coeff, moyenneGenerale: moy };
  }, [matieres]);

  function averageBulletin(bulletin: Bulletin): number | null {
    let total = 0;
    let coeff = 0;
    bulletin.notes.forEach((note) => {
      const n1 = parseNoteValue(note.n1);
      const n2 = parseNoteValue(note.n2);
      const exam = parseNoteValue(note.exam);
      const coefficient = Number(note.coefficient) || 1;
      if (n1 === null || n2 === null || exam === null) return;
      const sum = n1 + n2 + exam;
      const mg = coefficient === 3 ? sum : coefficient === 2 ? (sum / 3) * 2 : sum / 3;
      total += mg;
      coeff += coefficient;
    });
    return coeff > 0 ? total / coeff : null;
  }

  function computeRank(trimestreNumber: number) {
    if (!student) return null;
    const sameClass = classBulletins.filter((b) => b.trimestre === trimestreNumber);
    const ranked = sameClass
      .map((b) => ({
        bulletin: b,
        moyenne: averageBulletin(b),
      }))
      .filter((item) => item.moyenne !== null)
      .sort((a, b) => (b.moyenne! - a.moyenne!));
    const position = ranked.findIndex((item) => item.bulletin.studentId === studentId) + 1;
    return {
      position: position > 0 ? position : null,
      total: ranked.length,
      moyenne: position > 0 ? ranked[position - 1].moyenne : null,
    };
  }

  const rankInfo = useMemo(() => computeRank(trimestre), [classBulletins, trimestre, studentId, student]);

  const studentBulletinsSummary = useMemo(() => {
    return studentBulletins
      .filter((b) => b.trimestre <= maxTrimestres)
      .map((bulletin) => ({
        bulletin,
        moyenne: averageBulletin(bulletin),
        rank: computeRank(bulletin.trimestre),
      }))
      .sort((a, b) => a.bulletin.trimestre - b.bulletin.trimestre);
  }, [studentBulletins, classBulletins, studentId, student, maxTrimestres]);

  const annualAverage = useMemo(() => {
    const notes = studentBulletinsSummary.filter((item) => item.moyenne !== null);
    if (notes.length === 0) return null;
    const total = notes.reduce((sum, item) => sum + (item.moyenne ?? 0), 0);
    return total / notes.length;
  }, [studentBulletinsSummary]);

  const latestBulletinSummary = useMemo(() => {
    if (studentBulletinsSummary.length === 0) return null;
    return studentBulletinsSummary[studentBulletinsSummary.length - 1];
  }, [studentBulletinsSummary]);

  const evolutionInfo = useMemo(() => {
    if (!student) return [] as Array<{ trimestre: number; moyenne: number | null; position: number | null; total: number; classement: string }>;
    return getTrimestresArray(maxTrimestres).map((tri) => {
      const rank = computeRank(tri);
      const moyenne = rank?.moyenne ?? null;
      let classement = '';
      if (moyenne !== null) {
        if (moyenne >= 14) classement = 'Félicitations';
        else if (moyenne >= 12) classement = 'Tableau d\'honneur';
        else classement = 'Encouragements';
      }
      return {
        trimestre: tri,
        moyenne,
        position: rank?.position ?? null,
        total: rank?.total ?? 0,
        classement,
      };
    });
  }, [classBulletins, studentId, student, maxTrimestres]);

  const trimestreInfo = useMemo(() => {
    let classement = '';
    if (moyenneGenerale >= 14) classement = 'Félicitations';
    else if (moyenneGenerale >= 12) classement = 'Tableau d\'honneur';
    else classement = 'Encouragements';
    return { classement };
  }, [moyenneGenerale]);

  function updateMatiere(id: string, field: keyof MatiereRow, value: string | number | null) {
    setMatieres((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        let newValue = value;
        // Validation pour les champs de note
        if (field === 'n1' || field === 'n2' || field === 'exam') {
          if (newValue !== null && newValue !== '') {
            let num = Number(String(newValue).replace(',', '.'));
            if (num > 20) {
              num = 20;
              Alert.alert('Note invalide', 'La note ne peut pas dépasser 20.');
            }
            if (num < 0) num = 0;
            newValue = String(num).replace('.', ',');
          }
        }
        return {
          ...row,
          [field]:
            field === 'matiere' || field === 'coefficient'
              ? String(newValue)
              : newValue === null || newValue === ''
                ? null
                : String(newValue),
        };
      })
    );
  }

  function addMatiere() {
    setMatieres((prev) => [
      ...prev,
      {
        id: createId(),
        matiere: 'Nouvelle matière',
        coefficient: '1',
        n1: null,
        n2: null,
        exam: null,
        signature: null,
      },
    ]);
  }

  function removeMatiere(id: string) {
    setMatieres((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.id !== id)));
    setSelectedMatieres((prev) => prev.filter((selectedId) => selectedId !== id));
  }

  function toggleMatiereSelection(id: string) {
    setSelectedMatieres((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  }

  function removeSelectedMatieres() {
    if (selectedMatieres.length === 0) {
      Alert.alert('Sélection vide', 'Veuillez sélectionner au moins une matière à supprimer.');
      return;
    }
    setMatieres((prev) => prev.filter((row) => !selectedMatieres.includes(row.id)));
    setSelectedMatieres([]);
  }

  function refreshCalculations() {
    setRefreshKey(prev => prev + 1);
  }



  async function onSave() {
    if (!student) {
      Alert.alert('Erreur', 'Etudiant introuvable.');
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const now = Date.now();
      const bulletinNotes = matieres.map((row) => ({
        id: row.id,
        matiere: row.matiere,
        type: 'STANDARD',
        coefficient: String(row.coefficient),
        note: '',
        n1: row.n1 !== null ? row.n1 : '',
        n2: row.n2 !== null ? row.n2 : '',
        exam: row.exam !== null ? row.exam : '',
        signature: row.signature ?? '',
      }));
      const bulletin: Bulletin = {
        id: createId(),
        studentId,
        trimestre,
        notes: bulletinNotes,
        appreciation,
        createdAt: now,
        updatedAt: now,
      };
      await saveBulletin(bulletin);
      const updatedBulletins = await getBulletins();
      const students = await getStudents();
      setStudentBulletins(updatedBulletins.filter((b) => b.studentId === studentId));
      setClassBulletins(updatedBulletins.filter((b) => {
        const ownerData = students.find((s) => s.id === b.studentId);
        return ownerData?.classe === student?.classe;
      }));
      Alert.alert('Succès', 'Bulletin enregistré.');
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  }

  async function exportWithFormat(format: 'A4' | 'A5') {
    if (!student) return;
    try {
      const html = await generateBulletinHtml(format);
      const width = format === 'A4' ? 595 : 420;
      const height = format === 'A4' ? 842 : 595;
      const file = await Print.printToFileAsync({ html, width, height });
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Bulletin ${student.nom} ${student.prenom} - T${trimestre}`,
      });
    } catch (error) {
      const content = formatBulletinText();
      await Share.share({
        message: content,
        title: `Bulletin ${student.nom} ${student.prenom} - T${trimestre}`,
      });
    }
  }

  function onExport() {
    if (!student) return;
    Alert.alert(
      'Format du PDF',
      'Choisissez le format du bulletin à exporter :',
      [
        { text: 'A4 (Standard)', onPress: () => exportWithFormat('A4') },
        { text: 'A5 (Compact)', onPress: () => exportWithFormat('A5') },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  }

  function formatBulletinText(): string {
    if (!student) return '';
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '....................';
      if (dateStr.includes('/')) return dateStr;
      if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts;
          return `${day}/${month}/${year}`;
        }
      }
      return dateStr;
    };
    const lines: string[] = [];
    lines.push('===== BULLETIN SCOLAIRE =====');
    lines.push(`Nom: ${student.nom}`);
    lines.push(`Prénom: ${student.prenom}`);
    lines.push(`Classe: ${student.classe}`);
    lines.push(`N°: ${student.numeroDansClasse}`);
    lines.push(`Matricule: ${student.matricule}`);
    if (showNumeroPasse) {
      lines.push(`${numeroPasseLabel}: ${student.numeroPasse}`);
    }
    lines.push(`Année scolaire: ${schoolYear}`);
    lines.push(`${periodName}: ${trimestre}`);
    lines.push('');
    lines.push('MATIERES | Coef | N1 | N2 | EXAM | MG | Signature');
    lines.push('-'.repeat(80));
    matieres.forEach((row) => {
      const mg = calculateMG(row);
      lines.push(
        `${row.matiere} | ${row.coefficient} | ${row.n1 ?? ''} | ${row.n2 ?? ''} | ${row.exam ?? ''} | ${mg !== null ? mg.toFixed(2).replace('.', ',') : ''} | ${row.signature ?? ''}`
      );
    });
    lines.push('-'.repeat(80));
    lines.push(`Total coefficient: ${totalCoeff}`);
    lines.push(`Moyenne générale: ${moyenneGenerale.toFixed(2).replace('.', ',')}`);
    lines.push(`Rang: ${rankInfo?.position ?? '—'} / ${rankInfo?.total ?? '—'}`);
    if (appreciation.trim()) lines.push(`Appréciation: ${appreciation}`);
    if (trimestreInfo) lines.push(`Décision: ${trimestreInfo.classement}`);
    lines.push('');
    lines.push('Signatures:');
    lines.push('Les Parents,   Le Directeur');
    lines.push('RAKOTOMAVO Naliarison Miarantsoa');
    if (trimestre === maxTrimestres && evolutionInfo.some((item) => item.moyenne !== null || item.position !== null)) {
      lines.push('');
      lines.push('ÉVOLUTION DES MOYENNES :');
      evolutionInfo.forEach((item) => {
        lines.push(`${periodName.substring(0, 4)}${item.trimestre} : ${item.moyenne !== null ? item.moyenne.toFixed(2).replace('.', ',') : '—'} / Position ${item.position ?? '—'} / ${item.total} élèves / Classement: ${item.classement}`);
      });
    }
    return lines.join('\n');
  }

  async function generateBulletinHtml(format: 'A4' | 'A5' = 'A4'): Promise<string> {
    if (!student) return '';
    const isA5 = format === 'A5';
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '....................';
      if (dateStr.includes('/')) return dateStr;
      if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts;
          return `${day}/${month}/${year}`;
        }
      }
      return dateStr;
    };
    const rows = matieres
      .map((row) => {
        const mg = calculateMG(row);
        return `
          <tr>
            <td class="matiere">${row.matiere}</td>
            <td>${row.coefficient}</td>
            <td>${row.n1 ?? ''}</td>
            <td>${row.n2 ?? ''}</td>
            <td>${row.exam ?? ''}</td>
            <td>${mg !== null ? mg.toFixed(2).replace('.', ',') : ''}</td>
            <td class="signature">${row.signature ?? ''}</td>
          </tr>`;
      })
      .join('');

    const termLabel =
      trimestre === maxTrimestres
        ? `${periodName} FINAL`
        : trimestre === 1
        ? `PREMIER ${periodName}`
        : trimestre === 2
        ? `DEUXIÈME ${periodName}`
        : trimestre === 3
        ? `TROISIÈME ${periodName}`
        : `QUATRIÈME ${periodName}`;

    const decision = trimestreInfo?.classement ?? '';
    const check = (label: string) => (decision === label ? '☑' : '☐');

    // Historique des bulletins pour le trimestre final
    let historySection = '';
    if (trimestre === maxTrimestres && studentBulletinsSummary.length > 0) {
      const historyRows = studentBulletinsSummary
        .filter((item) => item.moyenne !== null)
        .map((item) => {
          const evo = evolutionInfo.find(e => e.trimestre === item.bulletin.trimestre);
          return `
          <tr>
            <td>${periodName.substring(0, 4)}${item.bulletin.trimestre}</td>
            <td>${item.moyenne?.toFixed(2).replace('.', ',') ?? ''}</td>
            <td>${item.rank?.position ?? ''}</td>
            <td>${item.rank?.total ?? ''}</td>
            <td>${evo?.classement ?? ''}</td>
          </tr>`;
        })
        .join('');

      historySection = `
        <div class="history-title">HISTORIQUE DES ÉVALUATIONS</div>
        <table class="history-table">
          <thead>
            <tr>
              <th>Période</th>
              <th>Moyenne</th>
              <th>Rang</th>
              <th>Total élèves</th>
              <th>Classement</th>
            </tr>
          </thead>
          <tbody>
            ${historyRows}
          </tbody>
        </table>
        <div class="annual-average">Moyenne annuelle : ${annualAverage?.toFixed(2).replace('.', ',') ?? '—'}</div>
      `;
    }

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; color: #000; margin: ${isA5 ? '10px 14px' : '16px 24px'}; font-size: ${isA5 ? '9px' : '12px'}; }
            .top-logo { text-align: center; margin-bottom: ${isA5 ? '8px' : '16px'}; }
            .top-logo img { width: ${isA5 ? '80px' : '120px'}; max-width: ${isA5 ? '80px' : '120px'}; height: auto; display: inline-block; }
            .header { display: flex; justify-content: center; align-items: center; gap: 8px; margin-bottom: 4px; }
            .logo-left-box { width: 60px; min-width: 60px; }
            .logo-left-box img { width: 100%; height: auto; display: block; }
            .header-center { flex: 1; text-align: center; }
            .header-top { font-weight: 700; font-size: ${isA5 ? '10px' : '14px'}; letter-spacing: 0.6px; line-height: 1.3; margin-bottom: 2px; }
            .header-sub { font-size: ${isA5 ? '9px' : '13px'}; margin-top: 2px; }
            .main-title { font-size: ${isA5 ? '18px' : '26px'}; font-weight: 800; margin: 6px 0 6px; letter-spacing: 0.8px; }
            .subtitle { font-size: 12px; margin-top: 2px; }
            .student-row { margin: 6px 0; font-size: 12px; }
            .student-row strong { text-decoration: underline; }
            .student-grid { display: grid; grid-template-columns: repeat(3, minmax(120px, 1fr)); gap: 10px; margin: 12px 0 16px; }
            .student-grid div { font-size: 12px; }
            .term-title { text-align: center; font-size: 24px; font-weight: 700; margin: 12px 0 12px; letter-spacing: 0.5px; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #000; padding: 6px 5px; text-align: center; font-size: 12px; }
            th { font-weight: 700; }
            .matiere-col { width: 34%; }
            .coef-col { width: 8%; }
            .note-col { width: 10%; }
            .mg-col { width: 10%; }
            .sig-col { width: 28%; }
            .matiere { text-align: left; font-weight: 700; }
            .signature { text-align: left; }
            .total-row td { font-weight: 700; }
            .rang { text-align: center; margin-top: 14px; font-size: 13px; font-weight: 700; }
            .appreciation { text-align: left; margin-top: 14px; font-size: 13px; font-weight: 700; }
            .decision { margin-top: 14px; display: flex; justify-content: flex-start; align-items: flex-start; font-size: 13px; gap: 16px; }
            .decision-title { font-weight: 700; min-width: 170px; }
            .decision-cols { display: flex; gap: 12px; flex-wrap: wrap; }
            .decision-option { padding: 10px 12px; border: 1px solid #000; border-radius: 12px; min-width: 140px; text-align: left; }
            .decision-option.selected { background-color: #e7f2ff; border-color: #2563eb; box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.2); font-weight: 700; }
            .decision-option span { display: inline-block; margin-right: 6px; }
            .date-line { text-align: center; margin-top: 18px; font-size: 13px; }
            .signature-title { text-align: center; font-size: 13px; margin-top: 4px; }
            .sign-grid { display: flex; justify-content: space-between; margin-top: 12px; font-size: 13px; font-weight: 600; }
            .director-sign {
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              gap: 22px;
            }
            .director-sign strong {
              margin-top: 12px;
              display: block;
            }
            .history-title { text-align: center; font-size: 18px; font-weight: 700; margin: 20px 0 10px; }
            .history-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            .history-table th, .history-table td { border: 1px solid #000; padding: 4px; text-align: center; font-size: 11px; }
            .annual-average { text-align: center; font-size: 13px; font-weight: 700; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="top-logo">
            <img src="${logoTopBase64}" alt="Logo central" />
          </div>
          <div class="header">
            <div class="logo-left-box">
              <img src="${logoLeftBase64}" alt="Logo gauche" />
            </div>
            <div class="header-center">
              <div class="header-top">CIRCONSCRIPTION SCOLAIRE AMBATOLAMPY</div>
              <div class="header-sub">ZAP MORARANO</div>
              <div class="main-title">CEG FIERENANA — 104 150 010</div>
              <div class="subtitle">Année scolaire : ${schoolYear || '..............'}</div>
            </div>
          </div>

          <div class="student-row"><strong>Nom et prénoms</strong> : ${student.nom} ${student.prenom}</div>
          <div class="student-row"><strong>Date de naissance</strong> : ${formatDate(student.dateNaissance)}</div>
          <div class="student-grid">
            <div><strong>CLASSE</strong> : ${student.classe}</div>
            <div><strong>N°</strong> : ${student.numeroDansClasse}</div>
            <div><strong>N° matricule</strong> : ${student.matricule}</div>
          </div>
          ${showNumeroPasse ? `<div class="student-row"><strong>${numeroPasseLabel}</strong> : ${student.numeroPasse}</div>` : ''}

          <div class="term-title">${termLabel}</div>

          <table>
            <thead>
              <tr>
                <th class="matiere-col">MATIERES</th>
                <th class="coef-col">Coef</th>
                <th class="note-col">N1</th>
                <th class="note-col">N2</th>
                <th class="note-col">EXAM</th>
                <th class="mg-col">MG</th>
                <th class="sig-col">Appréciations<br/>Et signatures</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              <tr class="total-row">
                <td class="matiere">TOTAL</td>
                <td>${totalCoeff}</td>
                <td></td>
                <td></td>
                <td></td>
                <td>${totalMG.toFixed(2).replace('.', ',')}</td>
                <td class="signature">Moy : ${moyenneGenerale.toFixed(2).replace('.', ',')}</td>
              </tr>
            </tbody>
          </table>

          <div class="rang">RANG : ${rankInfo?.position ?? '........'} / ${rankInfo?.total ?? '........'} élèves.</div>

          ${appreciation.trim() ? `<div class="appreciation">Appréciation: ${appreciation}</div>` : ''}

          ${historySection}

          <div class="decision">
            <div class="decision-title">Décision du Conseil de classe :</div>
            <div class="decision-cols">
              <div class="decision-option selected">
                <span>☑</span>${decision || '—'}
              </div>
            </div>
          </div>

          <div class="date-line">Fierenana, le .......................................</div>
          <div class="signature-title">Signatures.</div>
          <div class="sign-grid">
            <div>Les Parents,</div>
            <div class="director-sign">
              <div>Le Directeur</div>
              <div>_____________________________</div>
              <strong>RAKOTOMAVO Naliarison Miarantsoa</strong>
            </div>
          </div>
        </body>
      </html>`;
  }

  function goBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.getParent()?.navigate('Accueil' as never);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={{ padding: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', flexWrap: 'wrap', gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ marginRight: 10, fontWeight: 'bold' }}>Nombre de périodes :</Text>
          <Picker
            selectedValue={maxTrimestres}
            style={{ width: 120 }}
            onValueChange={(itemValue) => handleMaxTrimestresChange(itemValue)}
            mode="dropdown"
          >
            <Picker.Item label="3" value={3} />
            <Picker.Item label="5" value={5} />
          </Picker>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ marginRight: 10, fontWeight: 'bold' }}>Terme :</Text>
          <TextInput
            style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, width: 120, color: '#000' }}
            value={periodName}
            onChangeText={(t) => {
              const val = t.toUpperCase();
              setPeriodName(val);
              updatePeriodName(val);
            }}
            placeholder="TRIMESTRE"
          />
        </View>
      </View>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={[styles.content, isTablet && styles.contentTablet]} keyboardShouldPersistTaps="handled">
          {/* En-tête étudiant */}
          {student && (
            <View style={[styles.headerCard, isTablet && styles.headerCardTablet]}>
              <View style={styles.centeredLogoRow}>
                <Image source={require('../../assets/logo2.jpg')} style={styles.logoCentered} resizeMode="contain" />
              </View>
              <View style={styles.headerLogoRow}>
                <Image source={require('../../assets/logo1.jpg')} style={styles.logoLeft} resizeMode="contain" />
                <View style={styles.headerTitleColumn}>
                  <Text style={styles.schoolName}>CIRCULATION SCOLAIRE AMBATOLAMPY</Text>
                  <Text style={styles.schoolName}>ZAP MORARANO</Text>
                  <Text style={styles.ceg}>CEG FIERENANA – 104 150 010</Text>
                </View>
                <View style={styles.headerYearColumn}>
                  <Text style={styles.label}>Année scolaire:</Text>
                  <TextInput
                    style={styles.yearInput}
                    placeholder="Ex: 2025-2026"
                    placeholderTextColor={theme.placeholder}
                    value={schoolYear}
                    onChangeText={(v) => {
                      let formatted = v.replace(/[^0-9-]/g, '');
                      if (formatted.length >= 4 && !formatted.includes('-')) {
                        formatted = formatted.slice(0, 4) + '-' + formatted.slice(4);
                      }
                      if (formatted.length > 9) {
                        formatted = formatted.slice(0, 9);
                      }
                      setSchoolYear(formatted);
                    }}
                    keyboardType="numeric"
                    maxLength={9}
                  />
                </View>
              </View>
              <View style={styles.studentHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Nom et prénoms:</Text>
                  <Text style={styles.studentNameLarge}>
                    {student.nom} {student.prenom}
                  </Text>
                </View>

              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.label}>Date de naissance:</Text>
                  <Text style={styles.value}>{formattedDate || '....................'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.label}>CLASSE:</Text>
                  <Text style={styles.value}>{student.classe}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.label}>N°:</Text>
                  <Text style={styles.value}>{student.numeroDansClasse}</Text>
                </View>
                {showNumeroPasse && (
                  <View style={styles.metaItem}>
                    <TextInput
                      style={styles.labelInput}
                      value={numeroPasseLabel}
                      onChangeText={setNumeroPasseLabel}
                      placeholder="N° de passe"
                      placeholderTextColor={theme.placeholder}
                    />
                    <Text style={styles.value}>{student.numeroPasse}</Text>
                  </View>
                )}
                <View style={styles.metaItem}>
                  <Text style={styles.label}>N°MATRICULE:</Text>
                  <Text style={styles.value}>{student.matricule}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Sélection trimestre */}
          <View style={styles.trimestreContainer}>
            <Text style={styles.label}>TRIMESTRE</Text>
            <View style={styles.tabRow}>
              {getTrimestresArray(maxTrimestres).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setTrimestre(value as 1 | 2 | 3 | 4 | 5)}
                  style={({ pressed }) => [
                    styles.trimestreButton,
                    trimestre === value ? styles.trimestreButtonActive : null,
                    pressed ? styles.btnPressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.trimestreText,
                      trimestre === value ? styles.trimestreTextActive : null,
                    ]}
                  >
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Tableau des matières */}
          <View style={styles.tableCard}>
            <Text style={styles.tableTitle}>
              {trimestre === maxTrimestres ? `${periodName} FINAL` :
                trimestre === 1 ? `PREMIER ${periodName}` :
                trimestre === 2 ? `DEUXIÈME ${periodName}` :
                trimestre === 3 ? `TROISIÈME ${periodName}` :
                `QUATRIÈME ${periodName}`}
            </Text>
            <ScrollView horizontal={!isTablet} showsHorizontalScrollIndicator={false}>
              <View style={[styles.tableInner, isTablet && styles.tableInnerFull]}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, styles.cellSelect]}>Sel</Text>
                  <Text style={[styles.tableCell, styles.cellMatiere]}>MATIERES</Text>
                  <Text style={[styles.tableCell, styles.cellCoef]}>Coef</Text>
                  <TextInput
                    value={columnN1}
                    onChangeText={setColumnN1}
                    style={[styles.tableCell, styles.cellNote, styles.headerInput]}
                  />
                  <TextInput
                    value={columnN2}
                    onChangeText={setColumnN2}
                    style={[styles.tableCell, styles.cellNote, styles.headerInput]}
                  />
                  <TextInput
                    value={columnExam}
                    onChangeText={setColumnExam}
                    style={[styles.tableCell, styles.cellNote, styles.headerInput]}
                  />
                  <Text style={[styles.tableCell, styles.cellMG]}>MG</Text>
                  <Text style={[styles.tableCell, styles.cellSignature]}>APPRÉCIATION / SIGN.</Text>
                </View>
                {matieres.map((row, index) => {
                  const mg = calculateMG(row);
                  return (
                    <View key={row.id} style={styles.tableRow}>
                      <Pressable
                        onPress={() => toggleMatiereSelection(row.id)}
                        style={[
                          styles.tableCell,
                          styles.cellSelect,
                          selectedMatieres.includes(row.id) ? styles.selectCellActive : styles.selectCell,
                        ]}
                      >
                        <Text style={styles.selectText}>
                          {selectedMatieres.includes(row.id) ? '✓' : ''}
                        </Text>
                      </Pressable>
                      <TextInput
                        value={row.matiere}
                        onChangeText={(value) => updateMatiere(row.id, 'matiere', value)}
                        style={[styles.tableCell, styles.cellMatiere, styles.input]}
                        placeholderTextColor={theme.placeholder}
                      />
                      <TextInput
                        value={String(row.coefficient)}
                        onChangeText={(value) => updateMatiere(row.id, 'coefficient', value)}
                        style={[styles.tableCell, styles.cellCoef, styles.input]}
                        keyboardType="number-pad"
                      />
                      <TextInput
                        value={row.n1 !== null ? String(row.n1).replace('.', ',') : ''}
                        onChangeText={(value) => updateMatiere(row.id, 'n1', value === '' ? null : value)}
                        placeholder="0"
                        placeholderTextColor={theme.placeholder}
                        style={[styles.tableCell, styles.cellNote, styles.input, styles.editableInput]}
                        keyboardType="decimal-pad"
                        editable={!saving}
                      />
                      <TextInput
                        value={row.n2 !== null ? String(row.n2).replace('.', ',') : ''}
                        onChangeText={(value) => updateMatiere(row.id, 'n2', value === '' ? null : value)}
                        placeholder="0"
                        placeholderTextColor={theme.placeholder}
                        style={[styles.tableCell, styles.cellNote, styles.input, styles.editableInput]}
                        keyboardType="decimal-pad"
                        editable={!saving}
                      />
                      <TextInput
                        value={row.exam !== null ? String(row.exam).replace('.', ',') : ''}
                        onChangeText={(value) => updateMatiere(row.id, 'exam', value === '' ? null : value)}
                        placeholder="0"
                        placeholderTextColor={theme.placeholder}
                        style={[styles.tableCell, styles.cellNote, styles.input, styles.editableInput]}
                        keyboardType="decimal-pad"
                        editable={!saving}
                      />
                      <Text style={[styles.tableCell, styles.cellMG, styles.mgValue]}>
                        {mg !== null ? mg.toFixed(2).replace('.', ',') : '—'}
                      </Text>
                      <TextInput
                        value={row.signature ?? ''}
                        onChangeText={(value) => updateMatiere(row.id, 'signature', value)}
                        style={[styles.tableCell, styles.cellSignature, styles.input, styles.signatureInput]}
                      />
                    </View>
                  );
                })}
                <View style={styles.totalRow}>
                  <Text style={[styles.tableCell, styles.cellMatiere, styles.totalText]}>TOTAL</Text>
                  <Text style={[styles.tableCell, styles.cellCoef, styles.totalText]}>{totalCoeff}</Text>
                  <Text style={[styles.tableCell, styles.cellNote, { opacity: 0 }]} />
                  <Text style={[styles.tableCell, styles.cellNote, { opacity: 0 }]} />
                  <Text style={[styles.tableCell, styles.cellNote, { opacity: 0 }]} />
                  <Text style={[styles.tableCell, styles.cellMG, styles.totalValue]}>{totalMG.toFixed(2).replace('.', ',')}</Text>
                  <Text style={[styles.tableCell, styles.cellSignature, { opacity: 0 }]} />
                </View>
              </View>
            </ScrollView>
          </View>

          {/* Moyenne générale */}
          <View style={styles.resultCard}>
            <Text style={styles.label}>Moyenne générale</Text>
            <Text style={styles.bigValue}>{moyenneGenerale.toFixed(2).replace('.', ',')} / 20</Text>
          </View>
          <View style={styles.rankCard}>
            <Text style={styles.label}>Rang</Text>
            <Text style={styles.rankValue}>{rankInfo?.position != null ? `Rang ${rankInfo.position} / ${rankInfo.total}` : '—'}</Text>
          </View>

          {trimestre === maxTrimestres && (
            <View style={styles.card}>
              <Text style={styles.label}>Historique des bulletins</Text>
              {studentBulletinsSummary.length === 0 ? (
                <Text style={styles.infoText}>Aucun bulletin enregistré pour cet élève.</Text>
              ) : (
                studentBulletinsSummary.map(({ bulletin, moyenne, rank }) => {
                  const evo = evolutionInfo.find(e => e.trimestre === bulletin.trimestre);
                  return (
                    <View key={bulletin.id} style={styles.historyRow}>
                      <Text style={styles.historyCell}>{periodName.substring(0, 4)}{bulletin.trimestre}</Text>
                      <Text style={styles.historyValue}>Moyenne: {moyenne !== null ? moyenne.toFixed(2).replace('.', ',') : '—'}</Text>
                      <Text style={styles.historyValue}>Rang: {rank?.position != null ? `${rank.position} / ${rank.total}` : '—'}</Text>
                      <Text style={styles.historyValue}>Décision: {evo?.classement || '—'}</Text>
                    </View>
                  );
                })
              )}
              {annualAverage !== null && (
                <Text style={styles.historyFooter}>
                  Moyenne annuelle: {annualAverage.toFixed(2).replace('.', ',')} / 20
                </Text>
              )}
              {latestBulletinSummary && (
                <Text style={styles.historyFooter}>
                  Bulletin final disponible: T{latestBulletinSummary.bulletin.trimestre}
                </Text>
              )}
            </View>
          )}

          {/* Appréciation et classement */}
          <View style={styles.card}>
            <Text style={styles.label}>Appréciation et signatures</Text>
            <TextInput
              value={appreciation}
              onChangeText={setAppreciation}
              style={[styles.textArea, { color: theme.text }]}
              multiline
            />
            {trimestreInfo && (
              <View style={styles.classementBox}>
                <Text style={styles.classementLabel}>Décision du Conseil de classe:</Text>
                <Text style={[styles.classementValue,
                  trimestreInfo.classement === 'Félicitations' ? styles.congratulations :
                  trimestreInfo.classement === 'Tableau d\'honneur' ? styles.honor : null
                ]}>
                  ☑ {trimestreInfo.classement}
                </Text>
              </View>
            )}
          </View>

          {/* Boutons */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={addMatiere}
              style={({ pressed }) => [styles.actionBtn, styles.actionBtnSecondary, pressed ? styles.btnPressed : null]}
            >
              <Text style={styles.actionBtnTextSecondary}>+ Ajouter matière</Text>
            </Pressable>
            <Pressable
              onPress={removeSelectedMatieres}
              style={({ pressed }) => [styles.actionBtn, styles.actionBtnDanger, pressed ? styles.btnPressed : null]}
            >
              <Text style={styles.actionBtnTextDanger}>Supprimer matières sélectionnées</Text>
            </Pressable>
            <Pressable
              onPress={refreshCalculations}
              style={({ pressed }) => [styles.actionBtn, styles.actionBtnSecondary, pressed ? styles.btnPressed : null]}
            >
              <Text style={styles.actionBtnTextSecondary}>🔄 Rafraîchir</Text>
            </Pressable>
          </View>
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => setShowNumeroPasse((prev) => !prev)}
              style={({ pressed }) => [
                styles.actionBtn,
                showNumeroPasse ? styles.actionBtnPrimary : styles.actionBtnSecondary,
                pressed ? styles.btnPressed : null,
              ]}
            >
              <Text style={[styles.actionBtnTextSecondary, showNumeroPasse ? styles.actionBtnTextPrimary : null]}>
                {showNumeroPasse ? '✓ N° de passe visible' : 'Afficher N° de passe'}
              </Text>
            </Pressable>
            <Pressable
              onPress={onExport}
              style={({ pressed }) => [styles.actionBtn, styles.actionBtnSecondary, pressed ? styles.btnPressed : null]}
            >
              <Text style={styles.actionBtnTextSecondary}>📥 Exporter</Text>
            </Pressable>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              onPress={onSave}
              disabled={!student || saving}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.actionBtnPrimary,
                saving ? styles.btnDisabled : null,
                pressed ? styles.btnPressed : null,
              ]}
            >
              <Text style={styles.actionBtnTextPrimary}>✓ Enregistrer</Text>
            </Pressable>
            <Pressable
              onPress={goBack}
              style={({ pressed }) => [styles.actionBtn, styles.actionBtnGhost, pressed ? styles.btnPressed : null]}
            >
              <Text style={styles.actionBtnTextGhost}>Retour</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>['theme'], screenWidth: number) {
  // Dimensionner les colonnes en fonction de la taille de l'écran
  const getColumnWidths = () => {
    if (screenWidth < 350) {
      // Très petits écrans
      return {
        matiere: 80,
        coef: 30,
        note: 35,
        mg: 40,
        signature: 80,
        minWidth: 350,
      };
    } else if (screenWidth < 500) {
      // Petits téléphones
      return {
        matiere: 100,
        coef: 35,
        note: 40,
        mg: 45,
        signature: 100,
        minWidth: 420,
      };
    } else if (screenWidth < 768) {
      // Grands téléphones
      return {
        matiere: 150,
        coef: 50,
        note: 50,
        mg: 60,
        signature: 150,
        minWidth: 610,
      };
    } else {
      // Tablettes et desktop
      return {
        matiere: Math.max(150, screenWidth * 0.25),
        coef: Math.max(50, screenWidth * 0.08),
        note: Math.max(50, screenWidth * 0.1),
        mg: Math.max(60, screenWidth * 0.12),
        signature: Math.max(150, screenWidth * 0.25),
        minWidth: screenWidth - 48,
      };
    }
  };
  const cols = getColumnWidths();
  
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 12, paddingBottom: 120 },
    contentTablet: { alignItems: 'center', paddingHorizontal: 24 },
    headerCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 6,
      padding: 12,
      marginBottom: 12,
    },
    headerCardTablet: { width: 820 },
    headerLogoRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
    centeredLogoRow: { alignItems: 'center', marginBottom: 8 },
    logo: { width: 64, height: 64 },
    logoLeft: { width: 64, height: 64, marginRight: 12 },
    logoCentered: { width: 80, height: 80 },
    headerTitleColumn: { flex: 1, alignItems: 'center' },
    headerYearColumn: { minWidth: 160, alignItems: 'flex-end' },
    yearSelection: { flexDirection: 'column', gap: 4, marginTop: 4 },
    yearOption: {
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 6,
      backgroundColor: theme.inputBg,
    },
    yearOptionActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    yearOptionPressed: { opacity: 0.7 },
    yearOptionText: { fontSize: 10, color: theme.text },
    yearOptionTextActive: { color: theme.card, fontWeight: '700' },
    schoolName: { fontSize: 11, fontWeight: '700', color: theme.text, textAlign: 'center' },
    ceg: { fontSize: 10, fontWeight: '600', color: theme.text, textAlign: 'center', marginBottom: 8 },
    studentHeaderRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
    studentNameLarge: { fontSize: 14, fontWeight: '700', color: theme.text },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    metaItem: { flex: 1, minWidth: 100 },
    value: { fontSize: 11, fontWeight: '600', color: theme.text },
    label: { fontSize: 10, color: theme.textMuted },
    yearInput: { borderWidth: 1, borderColor: theme.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginTop: 4, width: 140, color: theme.text, backgroundColor: theme.inputBg },
    trimestreContainer: { marginBottom: 12 },
    tabRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    trimestreButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.inputBg,
      marginRight: 8,
      minWidth: 42,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trimestreButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    trimestreText: { fontWeight: '700', color: theme.text, fontSize: 13 },
    trimestreTextActive: { color: theme.card },
    tableCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 6,
      marginBottom: 12,
      overflow: 'hidden',
    },
    tableTitle: { fontSize: 12, fontWeight: '700', color: theme.text, padding: 8, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: theme.border },
    tableInner: { minWidth: cols.minWidth },
    tableInnerFull: { width: '100%' },
    tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.inputBg },
    tableCell: { fontSize: 10, paddingVertical: 6, paddingHorizontal: 4, textAlign: 'center', color: theme.text },
    cellMatiere: { width: cols.matiere, minWidth: 80, textAlign: 'left', paddingLeft: 8 },
    cellCoef: { width: cols.coef, minWidth: 30 },
    cellNote: { width: cols.note, minWidth: 35 },
    cellMG: { width: cols.mg, minWidth: 40 },
    cellSignature: { width: cols.signature, minWidth: 80 },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.border, alignItems: 'center' },
    input: { padding: 4, fontSize: 10, color: theme.text, borderRightWidth: 1, borderRightColor: theme.border, backgroundColor: theme.inputBg },
    editableInput: { borderWidth: 1, borderColor: theme.border, borderRadius: 3 },
    signatureInput: { minWidth: 110 },
    headerInput: { padding: 4, fontSize: 10, fontWeight: '700', color: theme.text, textAlign: 'center', backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.border, borderRadius: 3 },
    labelInput: { padding: 4, fontSize: 11, color: theme.text, borderWidth: 1, borderColor: theme.border, borderRadius: 6, backgroundColor: theme.inputBg, marginBottom: 6 },
    mgValue: { fontWeight: '700', backgroundColor: theme.inputBg },
    cellSelect: { width: 32, minWidth: 32, textAlign: 'center', alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: theme.border, backgroundColor: theme.inputBg },
    selectCell: { backgroundColor: theme.inputBg },
    selectCellActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    selectText: { fontWeight: '700', color: theme.card },
    actionBtnDanger: { backgroundColor: theme.dangerBg, borderColor: theme.dangerBorder, borderWidth: 1 },
    actionBtnTextDanger: { fontSize: 13, fontWeight: '700', color: theme.dangerText },
    removeBtn: {
      width: 30,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 15,
      marginLeft: 6,
      borderWidth: 1,
      borderColor: theme.dangerText,
      backgroundColor: theme.dangerBg,
    },
    removeBtnText: { color: theme.dangerText, fontWeight: '900', fontSize: 16 },
    totalRow: { flexDirection: 'row', backgroundColor: theme.inputBg, borderTopWidth: 2, borderTopColor: theme.text },
    totalText: { fontWeight: '700', fontSize: 11 },
    totalValue: { fontWeight: '700', fontSize: 11 },
    resultCard: {
      backgroundColor: theme.primary,
      borderRadius: 6,
      padding: 12,
      marginBottom: 12,
      alignItems: 'center',
    },
    rankCard: {
      backgroundColor: theme.card,
      borderRadius: 6,
      padding: 12,
      marginBottom: 12,
      alignItems: 'center',
    },
    rankValue: { fontSize: 18, fontWeight: '700', color: theme.text },
    bigValue: { fontSize: 20, fontWeight: '700', color: theme.card },
    card: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 6,
      padding: 12,
      marginBottom: 12,
    },
    textArea: {
      minHeight: 60,
      backgroundColor: theme.inputBg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 8,
      fontSize: 11,
      textAlignVertical: 'top',
      marginBottom: 10,
    },
    classementBox: { paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.border },
    classementLabel: { fontSize: 10, fontWeight: '600', color: theme.textMuted, marginBottom: 4 },
    classementValue: { fontSize: 12, fontWeight: '700', color: theme.text },
    congratulations: { color: '#22c55e' },
    honor: { color: '#3b82f6' },
    actionRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    actionBtnPrimary: { backgroundColor: theme.primary },
    actionBtnSecondary: { backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.border },
    actionBtnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border },
    actionBtnTextPrimary: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
    actionBtnTextSecondary: { fontSize: 13, fontWeight: '700', color: theme.text },
    actionBtnTextGhost: { fontSize: 13, fontWeight: '700', color: theme.text },
    btnDisabled: { opacity: 0.5 },
    btnPressed: { transform: [{ scale: 0.98 }] },
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.border },
    historyLabel: { fontSize: 11, fontWeight: '700', color: theme.text },
    historyValue: { fontSize: 11, color: theme.text },
    historyFooter: { fontSize: 11, color: theme.text, marginTop: 8, fontWeight: '700' },
    infoText: { fontSize: 11, color: theme.textMuted, marginTop: 8 },
  });
}
