import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Student } from '../types/student';
import { getStudents, setStudents, getDeletedStudents, setDeletedStudents, clearDeletedStudents } from '../storage/studentsRepo';
import { getBulletins, setBulletins } from '../storage/bulletinsRepo';
import { useTheme } from '../theme/ThemeProvider';

type StudentsStackParamList = {
  StudentsList: undefined;
  StudentsSearch: undefined;
  StudentForm: { id?: string } | undefined;
  BulletinForm: { studentId: string } | undefined;
  StudentsTrash: undefined;
};

type Props = NativeStackScreenProps<StudentsStackParamList, 'StudentsTrash'>;

export default function StudentsTrashScreen({ navigation }: Props) {
  const { theme, hydrateTheme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [students, setLocalStudents] = useState<Student[]>([]);
  const [backup, setBackup] = useState<Student[] | null>(null);
  const [deletedStudents, setDeletedStudentsState] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await hydrateTheme();
      const [list, deleted] = await Promise.all([getStudents(), getDeletedStudents()]);
      if (!mounted) return;
      setLocalStudents(list);
      setDeletedStudentsState(deleted);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function restoreDeletedStudents() {
    if (deletedStudents.length === 0) {
      Alert.alert('Aucun étudiant', 'Aucun étudiant supprimé à restaurer.');
      return;
    }

    Alert.alert(
      'Restaurer les étudiants supprimés',
      'Restaurer les étudiants supprimés va les remettre dans la liste principale.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Restaurer',
          onPress: async () => {
            try {
              const currentList = await getStudents();
              const restored = [...currentList, ...deletedStudents];
              await setStudents(restored);
              await clearDeletedStudents();
              setLocalStudents(restored);
              setDeletedStudentsState([]);
              Alert.alert('Succès', 'Les étudiants supprimés ont été restaurés.');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de restaurer les étudiants supprimés.');
            }
          },
        },
      ]
    );
  }

  async function deleteDefinitively() {
    if (deletedStudents.length === 0) {
      Alert.alert('Corbeille vide', 'Aucun étudiant supprimé à supprimer définitivement.');
      return;
    }

    Alert.alert(
      'Suppression définitive',
      'Cette action supprime définitivement les étudiants de la corbeille. Cette opération est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const allBulletins = await getBulletins();
              const deletedIds = new Set(deletedStudents.map(s => s.id));
              const remainingBulletins = allBulletins.filter(b => !deletedIds.has(b.studentId));
              await setBulletins(remainingBulletins);

              await clearDeletedStudents();
              setDeletedStudentsState([]);
              Alert.alert('Succès', 'La corbeille a été vidée définitivement et les bulletins associés ont été supprimés.');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer définitivement les étudiants de la corbeille.');
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Corbeille des étudiants</Text>
          <Text style={styles.subtitle}>Seuls les étudiants supprimés apparaissent ici.</Text>
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            onPress={deleteDefinitively}
            style={({ pressed }) => [
              styles.dangerButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.dangerButtonText}>Suppression définitive</Text>
          </Pressable>
          <Pressable
            onPress={restoreDeletedStudents}
            style={({ pressed }) => [
              styles.restoreButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.restoreButtonText}>Restaurer</Text>
          </Pressable>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Étudiants supprimés</Text>
          <Text style={styles.infoText}>{deletedStudents.length} étudiant(s) dans la corbeille.</Text>
        </View>

        <FlatList
          data={deletedStudents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.itemName}>{item.nom} {item.prenom}</Text>
              <Text style={styles.itemMeta}>{item.classe} · {item.matricule}</Text>
            </View>
          )}
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Aucun étudiant supprimé.</Text>
              </View>
            )
          }
          contentContainerStyle={styles.listContent}
        />
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    container: { flex: 1, padding: 16 },
    header: { marginBottom: 20 },
    title: { color: theme.text, fontSize: 22, fontWeight: '700' },
    subtitle: { color: theme.textMuted, marginTop: 6, fontSize: 13 },
    buttonRow: { flexDirection: 'row', gap: 10, marginVertical: 14 },
    dangerButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: theme.dangerBg,
      borderWidth: 1,
      borderColor: theme.dangerBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dangerButtonText: { color: theme.dangerText, fontWeight: '700' },
    restoreButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    restoreButtonText: { color: theme.text, fontWeight: '700' },
    buttonPressed: { opacity: 0.85 },
    infoCard: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
    },
    infoTitle: { color: theme.text, fontSize: 13, fontWeight: '700', marginTop: 6 },
    infoText: { color: theme.textMuted, fontSize: 12, marginTop: 4 },
    listContent: { paddingBottom: 120 },
    item: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
    },
    itemName: { color: theme.text, fontSize: 14, fontWeight: '700' },
    itemMeta: { color: theme.textMuted, fontSize: 12, marginTop: 4 },
    empty: {
      padding: 14,
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 14,
    },
    emptyText: { color: theme.textMuted, fontSize: 13 },
  });
}
