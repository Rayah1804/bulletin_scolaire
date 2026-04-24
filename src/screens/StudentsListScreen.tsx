import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Student } from '../types/student';
import { Bulletin } from '../types/bulletin';
import { getStudents, setStudents, addDeletedStudents } from '../storage/studentsRepo';
import { getBulletins } from '../storage/bulletinsRepo';
import { getMaxTrimestres, getTrimestresArray } from '../storage/configRepo';
import { generateDemoStudentsAndBulletins } from '../storage/demoGenerator';
import { useTheme } from '../theme/ThemeProvider';

type RootStackParamList = {
  StudentsList: undefined;
  StudentsSearch: undefined;
  StudentForm: { id?: string } | undefined;
  BulletinForm: { studentId: string } | undefined;
  StudentsTrash: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'StudentsList'>;

export default function StudentsListScreen({ navigation }: Props) {
  const { theme, toggleTheme, hydrateTheme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [students, setLocalStudents] = useState<Student[]>([]);
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'nom' | 'classe' | 'anneeScolaire'>('nom');
  const [maxTrimestres, setMaxTrimestres] = useState<3 | 5>(5);

  async function loadStudents() {
    const list = await getStudents();
    const bulletinList = await getBulletins();
    const configMax = await getMaxTrimestres();
    setMaxTrimestres(configMax);
    setLocalStudents(list);
    setBulletins(bulletinList);
    setLoaded(true);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      await hydrateTheme();
      if (mounted) await loadStudents();
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', async () => {
      await loadStudents();
    });
    return unsub;
  }, [navigation]);

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      if (sortBy === 'nom') {
        return `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`);
      }
      if (sortBy === 'classe') {
        return a.classe.localeCompare(b.classe);
      }
      return a.anneeScolaire.localeCompare(b.anneeScolaire);
    });
  }, [students, sortBy]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedStudents;
    return sortedStudents.filter((s) => {
      const hay = `${s.nom} ${s.prenom} ${s.classe} ${s.anneeScolaire} ${s.numeroDansClasse} ${s.matricule}`.toLowerCase();
      return hay.includes(q);
    });
  }, [search, sortedStudents]);

  const bulletinCounts = useMemo(() => {
    const existingIds = new Set(students.map((s) => s.id));
    const counts = {
      total: 0,
      perTrimester: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>,
    };

    for (const bulletin of bulletins) {
      if (!existingIds.has(bulletin.studentId)) continue;
      if (bulletin.trimestre >= 1 && bulletin.trimestre <= 5) {
        counts.perTrimester[bulletin.trimestre] += 1;
        counts.total += 1;
      }
    }

    return counts;
  }, [students, bulletins]);

  async function confirmDelete(s: Student) {
    Alert.alert('Confirmation', `Supprimer ${s.nom} ${s.prenom} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          const next = students.filter((x) => x.id !== s.id);
          setLocalStudents(next);
          await setStudents(next);
          await addDeletedStudents([s]);
        },
      },
    ]);
  }

  async function seedStudents() {
    Alert.alert(
      'Générer des données de démo',
      'Cela va créer 20 élèves avec bulletins de test. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Générer',
          onPress: async () => {
            await generateDemoStudentsAndBulletins();
            await loadStudents();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.h1}>Liste des étudiant(e)s</Text>
            </View>
            <SmallButton
              styles={styles}
              label="Corbeille"
              destructive
              onPress={() => navigation.navigate('StudentsTrash')}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Rechercher</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Nom, prénom, numéro, matricule..."
              placeholderTextColor={theme.placeholder}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Bulletins enregistrés</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Total :</Text>
              <Text style={styles.statsValue}>{bulletinCounts.total}</Text>
            </View>
            <View style={styles.statsRowWrap}>
              {getTrimestresArray(maxTrimestres).map((trimestre) => (
                <View key={trimestre} style={styles.statsBadge}>
                  <Text style={styles.statsBadgeLabel}>T{trimestre}</Text>
                  <Text style={styles.statsBadgeValue}>{bulletinCounts.perTrimester[trimestre as 1 | 2 | 3 | 4 | 5]}</Text>
                </View>
              ))}
            </View>
          </View>

          <Pressable
            onPress={seedStudents}
            style={({ pressed }) => [{
              backgroundColor: pressed ? '#3a7d44' : '#4CAF50',
              borderRadius: 8,
              paddingVertical: 8,
              paddingHorizontal: 14,
              marginTop: 6,
              alignSelf: 'flex-start',
            }]}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>🎓 Générer 20 élèves (démo)</Text>
          </Pressable>

          <View style={styles.sortRow}>
            {(['nom', 'classe', 'anneeScolaire'] as const).map((option) => (
              <Pressable
                key={option}
                onPress={() => setSortBy(option)}
                style={({ pressed }) => [
                  styles.sortOption,
                  sortBy === option ? styles.sortOptionActive : null,
                  pressed ? { opacity: 0.85 } : null,
                ]}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === option ? styles.sortOptionTextActive : null,
                  ]}
                >
                  {option === 'nom' ? 'Nom' : option === 'classe' ? 'Classe' : 'Année'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.h2}>Liste ({filteredStudents.length})</Text>
        </View>

        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Pressable
                onPress={() => navigation.navigate('BulletinForm', { studentId: item.id })}
                style={({ pressed }) => [styles.itemMain, pressed ? styles.itemPressed : null]}
              >
                <Text style={styles.itemName}>
                  {item.nom} {item.prenom}
                </Text>
                <Text style={styles.itemMeta}>
                  {item.classe} · Année {item.anneeScolaire} · N° {item.numeroDansClasse}
                </Text>
                <Text style={styles.itemMeta}>{item.matricule}</Text>
              </Pressable>
              <View style={styles.itemActions}>
                <SmallButton
                  styles={styles}
                  label="Éditer"
                  onPress={() => navigation.navigate('StudentForm', { id: item.id })}
                />
                <SmallButton
                  styles={styles}
                  label="Supprimer"
                  destructive
                  onPress={() => confirmDelete(item)}
                />
                <SmallButton
                  styles={styles}
                  label="Créer bulletin"
                  onPress={() => navigation.navigate('BulletinForm', { studentId: item.id })}
                />
              </View>
            </View>
          )}
          ListEmptyComponent={
            loaded ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  {search.trim()
                    ? 'Aucun étudiant trouvé pour cette recherche.'
                    : 'Aucun étudiant. Ajoute le premier.'}
                </Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Chargement…</Text>
              </View>
            )
          }
          contentContainerStyle={styles.listContent}
        />
      </View>
    </SafeAreaView>
  );
}

function SmallButton(props: {
  styles: ReturnType<typeof createStyles>;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const s = props.styles;
  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        s.smallBtn,
        props.destructive ? s.smallBtnDanger : s.smallBtnNormal,
        pressed ? s.smallBtnPressed : null,
      ]}
    >
      <Text style={[s.smallBtnText, props.destructive ? s.smallBtnTextDanger : s.smallBtnTextNormal]}>
        {props.label}
      </Text>
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    container: { flex: 1 },
    listContent: { padding: 16, paddingBottom: 120 },
    header: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
    headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    h1: { color: theme.text, fontSize: 22, fontWeight: '700' },
    themeToggle: {
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.inputBg,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeToggleText: { color: theme.text, fontSize: 12, fontWeight: '800' },
    card: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
    },
    label: { color: theme.textMuted, fontSize: 12, marginBottom: 6 },
    input: {
      backgroundColor: theme.inputBg,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.text,
    },
    row: { flexDirection: 'row', gap: 10, marginTop: 10 },
    sectionHeader: { marginTop: 14, marginBottom: 8, paddingHorizontal: 16 },
    h2: { color: theme.text, fontSize: 16, fontWeight: '700' },
    item: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
      marginHorizontal: 16,
      marginBottom: 10,
      gap: 10,
    },
    itemMain: { gap: 4 },
    itemPressed: { opacity: 0.85 },
    itemName: { color: theme.text, fontSize: 15, fontWeight: '700' },
    itemMeta: { color: theme.textMuted, fontSize: 12 },
    itemActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    sortRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 10, paddingHorizontal: 2 },
    sortOption: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.inputBg,
    },
    sortOptionActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    sortOptionText: { fontSize: 12, color: theme.text, fontWeight: '700' },
    sortOptionTextActive: { color: theme.card },
    statsCard: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      marginTop: 10,
    },
    statsTitle: { color: theme.text, fontSize: 13, fontWeight: '700', marginBottom: 8 },
    statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    statsLabel: { color: theme.textMuted, fontSize: 12 },
    statsValue: { color: theme.text, fontSize: 14, fontWeight: '700' },
    statsRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statsBadge: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: theme.inputBg,
      borderWidth: 1,
      borderColor: theme.border,
    },
    statsBadgeLabel: { color: theme.textMuted, fontSize: 11, marginBottom: 4 },
    statsBadgeValue: { color: theme.text, fontSize: 13, fontWeight: '700' },
    smallBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
    smallBtnNormal: { borderColor: theme.pillBorder, backgroundColor: theme.inputBg },
    smallBtnDanger: { borderColor: theme.dangerBorder, backgroundColor: theme.dangerBg },
    smallBtnPressed: { opacity: 0.9 },
    smallBtnText: { fontSize: 12, fontWeight: '700' },
    smallBtnTextNormal: { color: theme.text },
    smallBtnTextDanger: { color: theme.dangerText },
    seedButton: {
      marginTop: 14,
      alignSelf: 'flex-start',
      backgroundColor: theme.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    seedButtonText: {
      color: theme.card,
      fontWeight: '700',
      fontSize: 13,
    },
    empty: {
      padding: 14,
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 14,
      marginHorizontal: 16,
    },
    emptyText: { color: theme.textMuted, fontSize: 13 },
  });
}

