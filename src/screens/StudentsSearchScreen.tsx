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
import { getStudents, setStudents, addDeletedStudents } from '../storage/studentsRepo';
import { useTheme } from '../theme/ThemeProvider';

type StudentsStackParamList = {
  StudentsList: undefined;
  StudentsSearch: undefined;
  StudentForm: { id?: string } | undefined;
};

type Props = NativeStackScreenProps<StudentsStackParamList, 'StudentsSearch'>;

export default function StudentsSearchScreen({ navigation }: Props) {
  const { theme, hydrateTheme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [students, setLocalStudents] = useState<Student[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      await hydrateTheme();
      const list = await getStudents();
      if (mounted) {
        setLocalStudents(list);
        setLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const hay = `${s.nom} ${s.prenom} ${s.classe} ${s.matricule} ${s.numeroDansClasse}`.toLowerCase();
      return hay.includes(q);
    });
  }, [students, search]);

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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.label}>Rechercher</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Nom, prénom, classe, matricule, numéro…"
            placeholderTextColor={styles._placeholder.color}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View style={styles.itemMain}>
                <Text style={styles.itemName}>
                  {item.nom} {item.prenom}
                </Text>
                <Text style={styles.itemMeta}>
                  {item.classe} · N° {item.numeroDansClasse} · {item.matricule}
                </Text>
              </View>
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
              </View>
            </View>
          )}
          ListEmptyComponent={
            loaded ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  {search.trim()
                    ? 'Aucun résultat pour cette recherche.'
                    : 'Aucun étudiant.'}
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
      <Text
        style={[
          s.smallBtnText,
          props.destructive ? s.smallBtnTextDanger : s.smallBtnTextNormal,
        ]}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    container: { flex: 1, padding: 16, paddingBottom: 48 },
    listContent: { paddingTop: 10, paddingBottom: 48 },
    card: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      marginTop: 10,
      marginBottom: 10,
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
    item: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
      gap: 10,
    },
    itemMain: { gap: 4 },
    itemName: { color: theme.text, fontSize: 15, fontWeight: '700' },
    itemMeta: { color: theme.textMuted, fontSize: 12 },
    itemActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    smallBtn: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
    },
    smallBtnNormal: { borderColor: theme.pillBorder, backgroundColor: theme.inputBg },
    smallBtnDanger: { borderColor: theme.dangerBorder, backgroundColor: theme.dangerBg },
    smallBtnPressed: { opacity: 0.9 },
    smallBtnText: { fontSize: 12, fontWeight: '700' },
    smallBtnTextNormal: { color: theme.text },
    smallBtnTextDanger: { color: theme.dangerText },
    empty: {
      padding: 14,
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 14,
    },
    emptyText: { color: theme.textMuted, fontSize: 13 },
    _placeholder: { color: theme.placeholder },
  });
}

