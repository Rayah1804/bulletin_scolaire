import React, { useMemo, useState } from 'react';
import {
  Alert,
  Appearance,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Student } from '../types/student';
import { readEncryptedJson, writeEncryptedJson } from '../storage/secureDb';
import { createId } from '../utils/id';

type FormState = Omit<Student, 'id' | 'createdAt' | 'updatedAt'>;

const emptyForm: FormState = {
  nom: '',
  prenom: '',
  dateNaissance: '',
  classe: '',
  numeroDansClasse: '',
  matricule: '',
  numeroPasse: '',
  anneeScolaire: '',
};

function formatDateFromDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseDateValue(value: string): Date | null {
  const cleaned = value.trim();
  const isoMatch = /^\d{4}-\d{2}-\d{2}$/.exec(cleaned);
  if (isoMatch) {
    return new Date(`${cleaned}T00:00:00`);
  }
  const frMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(cleaned);
  if (frMatch) {
    return new Date(`${frMatch[3]}-${frMatch[2]}-${frMatch[1]}T00:00:00`);
  }
  return null;
}

function formatDateValue(value: string): string {
  const cleaned = value.trim();
  const isoMatch = /^\d{4}-\d{2}-\d{2}$/.exec(cleaned);
  if (isoMatch) {
    const [y, m, d] = cleaned.split('-');
    return `${d}/${m}/${y}`;
  }
  if (/^(\d{2})\/(\d{2})\/(\d{4})$/.test(cleaned)) return cleaned;
  return cleaned;
}

function formatIsoToFr(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  return value;
}

function validateForm(form: FormState): string | null {
  const required: Array<[keyof FormState, string]> = [
    ['nom', 'Nom'],
    ['prenom', 'Prénom'],
    ['dateNaissance', 'Date de naissance'],
    ['classe', 'Classe'],
    ['numeroDansClasse', "Numéro de l'étudiant"],
    ['matricule', 'Matricule'],
    ['numeroPasse', 'Numéro de passe'],
  ];
  for (const [k, label] of required) {
    if (!form[k].trim()) return `Champ obligatoire: ${label}`;
  }
  return null;
}

type ThemeName = 'dark' | 'light';
const THEME_KEY = 'ui:theme';

type Theme = {
  name: ThemeName;
  bg: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  placeholder: string;
  inputBg: string;
  primary: string;
  dangerBorder: string;
  dangerBg: string;
  dangerText: string;
  pillBorder: string;
};

const darkTheme: Theme = {
  name: 'dark',
  bg: '#0b1220',
  card: '#0f1b33',
  border: '#203152',
  text: '#ffffff',
  textMuted: '#b7c0d6',
  placeholder: '#6f7a96',
  inputBg: '#0b1220',
  primary: '#3b82f6',
  dangerBorder: '#5b1b1b',
  dangerBg: '#220b0b',
  dangerText: '#ffb4b4',
  pillBorder: '#2a3d63',
};

const lightTheme: Theme = {
  name: 'light',
  bg: '#f6f7fb',
  card: '#ffffff',
  border: '#d6dbe8',
  text: '#0b1220',
  textMuted: '#4a5672',
  placeholder: '#7683a3',
  inputBg: '#ffffff',
  primary: '#2563eb',
  dangerBorder: '#f1c3c3',
  dangerBg: '#fff4f4',
  dangerText: '#8a1f1f',
  pillBorder: '#cfd6ea',
};

export default function StudentsScreen() {
  const systemScheme = useColorScheme();
  const [themeName, setThemeName] = useState<ThemeName | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [search, setSearch] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);

  const isEditing = editingId !== null;

  const theme: Theme = useMemo(() => {
    const resolved: ThemeName =
      themeName ?? (systemScheme === 'light' ? 'light' : 'dark');
    return resolved === 'light' ? lightTheme : darkTheme;
  }, [themeName, systemScheme]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const title = useMemo(
    () => (isEditing ? 'Modifier étudiant' : 'Ajouter étudiant'),
    [isEditing]
  );

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const savedTheme = (await AsyncStorage.getItem(THEME_KEY)) as
        | ThemeName
        | null;
      if (mounted && (savedTheme === 'dark' || savedTheme === 'light')) {
        setThemeName(savedTheme);
      }

      // Migration: older records used "motDePasse"
      const data = await readEncryptedJson<any[]>([]);
      if (mounted) {
        const list = Array.isArray(data) ? data : [];
        const migrated: Student[] = list
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
              anneeScolaire: String(x.anneeScolaire ?? ''),
              createdAt: typeof x.createdAt === 'number' ? x.createdAt : Date.now(),
              updatedAt: typeof x.updatedAt === 'number' ? x.updatedAt : Date.now(),
            } satisfies Student;
          })
          .filter(Boolean) as Student[];

        setStudents(migrated);
        setLoaded(true);
        // Persist once after migration to drop old keys.
        writeEncryptedJson(migrated).catch(() => undefined);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function persist(next: Student[]) {
    setStudents(next);
    await writeEncryptedJson(next);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(s: Student) {
    setEditingId(s.id);
    setForm({
      nom: s.nom,
      prenom: s.prenom,
      dateNaissance: s.dateNaissance,
      classe: s.classe,
      numeroDansClasse: s.numeroDansClasse,
      matricule: s.matricule,
      numeroPasse: s.numeroPasse,
      anneeScolaire: s.anneeScolaire,
    });
  }

  async function onSave() {
    const err = validateForm(form);
    if (err) {
      Alert.alert('Vérification', err);
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const now = Date.now();
      const normalized: FormState = {
        ...form,
dateNaissance: formatDateValue(form.dateNaissance),
      };

      if (isEditing && editingId) {
        const next = students.map((s) =>
          s.id === editingId
            ? {
                ...s,
                ...normalized,
                updatedAt: now,
              }
            : s
        );
        await persist(next);
        Alert.alert('Succès', 'Étudiant modifié avec succès');
        resetForm();
      } else {
        const created: Student = {
          id: createId(),
          ...normalized,
          createdAt: now,
          updatedAt: now,
        };
        const next = [created, ...students];
        await persist(next);
        Alert.alert('Succès', 'Étudiant ajouté avec succès');
        resetForm();
      }
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(s: Student) {
    Alert.alert(
      'Confirmation',
      `Supprimer ${s.nom} ${s.prenom} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const next = students.filter((x) => x.id !== s.id);
            await persist(next);
          },
        },
      ],
      { cancelable: true }
    );
  }

  const Header = (
    <View style={styles.header}>
      <View style={styles.headerTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>Gestion des étudiants</Text>
          <Text style={styles.sub}>
            Données enregistrées localement sur le téléphone (privées).
          </Text>
        </View>
        <Pressable
          onPress={async () => {
            const next: ThemeName = theme.name === 'dark' ? 'light' : 'dark';
            setThemeName(next);
            await AsyncStorage.setItem(THEME_KEY, next);
            Appearance.setColorScheme(next);
          }}
          style={({ pressed }) => [
            styles.themeToggle,
            pressed ? { opacity: 0.9 } : null,
          ]}
        >
          <Text style={styles.themeToggleText}>
            {theme.name === 'dark' ? 'Clair' : 'Sombre'}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const hay =
        `${s.nom} ${s.prenom} ${s.classe} ${s.matricule} ${s.numeroDansClasse}`.toLowerCase();
      return hay.includes(q);
    });
  }, [students, search]);

  function onDateChange(e: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (e.type === 'dismissed') return;
    const d = selected ?? new Date();
    setForm((p) => ({ ...p, dateNaissance: formatDateFromDate(d) }));
  }

  function formatIsoToFr(value: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-');
      return `${day}/${month}/${year}`;
    }
    return value;
  }

  function DateField(props: {
    label: string;
    isoValue: string;
    onPress: () => void;
  }) {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{props.label}</Text>
        <Pressable
          onPress={props.onPress}
          style={({ pressed }) => [
            styles.input,
            pressed ? { opacity: 0.95 } : null,
          ]}
        >
          <Text
            style={{
              color: props.isoValue.trim()
                ? styles._text.color
                : styles._placeholder.color,
            }}
          >
            {props.isoValue.trim()
              ? formatIsoToFr(props.isoValue.trim())
              : 'Sélectionner une date'}
          </Text>
        </Pressable>
      </View>
    );
  }

  function Field(props: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    keyboardType?: 'default' | 'number-pad';
    secureTextEntry?: boolean;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  }) {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{props.label}</Text>
        <TextInput
          value={props.value}
          onChangeText={props.onChange}
          placeholder={props.placeholder}
          placeholderTextColor={styles._placeholder.color}
          style={styles.input}
          keyboardType={props.keyboardType ?? 'default'}
          secureTextEntry={props.secureTextEntry}
          autoCapitalize={props.autoCapitalize ?? 'words'}
          autoCorrect={false}
        />
      </View>
    );
  }

  function Button(props: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    variant: 'primary' | 'ghost' | 'danger';
  }) {
    return (
      <Pressable
        onPress={props.onPress}
        disabled={props.disabled}
        style={({ pressed }) => [
          styles.btn,
          props.variant === 'primary'
            ? styles.btnPrimary
            : props.variant === 'danger'
            ? styles.btnDanger
            : styles.btnGhost,
          props.disabled ? styles.btnDisabled : null,
          pressed && !props.disabled ? styles.btnPressed : null,
        ]}
      >
        <Text
          style={[
            styles.btnText,
            props.variant === 'primary'
              ? styles.btnTextPrimary
              : props.variant === 'danger'
              ? styles.btnTextDanger
              : styles.btnTextGhost,
          ]}
        >
          {props.label}
        </Text>
      </Pressable>
    );
  }

  function SmallButton(props: {
    label: string;
    onPress: () => void;
    destructive?: boolean;
  }) {
    return (
      <Pressable
        onPress={props.onPress}
        style={({ pressed }) => [
          styles.smallBtn,
          props.destructive ? styles.smallBtnDanger : styles.smallBtnNormal,
          pressed ? styles.smallBtnPressed : null,
        ]}
      >
        <Text
          style={[
            styles.smallBtnText,
            props.destructive
              ? styles.smallBtnTextDanger
              : styles.smallBtnTextNormal,
          ]}
        >
          {props.label}
        </Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ListHeaderComponent={
            <View>
              {Header}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{title}</Text>

                <ScrollView keyboardShouldPersistTaps="handled">
                  <Field
                    label="Nom"
                    value={form.nom}
                    onChange={(v) => setForm((p) => ({ ...p, nom: v }))}
                    placeholder="Ex: Diallo"
                  />
                  <Field
                    label="Prénom"
                    value={form.prenom}
                    onChange={(v) => setForm((p) => ({ ...p, prenom: v }))}
                    placeholder="Ex: Aïcha"
                  />
                  <DateField
                    label="Date de naissance"
                    isoValue={form.dateNaissance}
                    onPress={() => setShowDatePicker(true)}
                  />
                  {showDatePicker ? (
                    <View style={styles.datePickerWrap}>
                      <DateTimePicker
                        value={
                          /^\d{4}-\d{2}-\d{2}$/.test(form.dateNaissance)
                            ? new Date(`${form.dateNaissance}T00:00:00`)
                            : new Date()
                        }
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onDateChange}
                        maximumDate={new Date()}
                      />
                      {Platform.OS === 'ios' ? (
                        <View style={styles.row}>
                          <Button
                            label="OK"
                            variant="primary"
                            onPress={() => setShowDatePicker(false)}
                          />
                          <Button
                            label="Annuler"
                            variant="ghost"
                            onPress={() => setShowDatePicker(false)}
                          />
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                  <Field
                    label="Classe"
                    value={form.classe}
                    onChange={(v) => setForm((p) => ({ ...p, classe: v }))}
                    placeholder="Ex: 6ème 1"
                  />
                  <Field
                    label="Numéro dans la classe"
                    value={form.numeroDansClasse}
                    onChange={(v) =>
                      setForm((p) => ({ ...p, numeroDansClasse: v }))
                    }
                    placeholder="Ex: 12"
                    keyboardType="number-pad"
                  />
                  <Field
                    label="Matricule"
                    value={form.matricule}
                    onChange={(v) => setForm((p) => ({ ...p, matricule: v }))}
                    placeholder="Ex: 0851G-P/R"
                    autoCapitalize="characters"
                  />
                  <Field
                    label="Numéro de passe"
                    value={form.numeroPasse}
                    onChange={(v) =>
                      setForm((p) => ({ ...p, numeroPasse: v }))
                    }
                    placeholder="Ex: 1234"
                    keyboardType="number-pad"
                    autoCapitalize="none"
                  />

                  <View style={styles.row}>
                    <Button
                      label={isEditing ? 'Enregistrer' : "Ajouter l'étudiant"}
                      variant="primary"
                      disabled={!loaded || saving}
                      onPress={onSave}
                    />
                    <Button
                      label={isEditing ? 'Annuler' : 'Réinitialiser'}
                      variant="ghost"
                      disabled={saving}
                      onPress={resetForm}
                    />
                  </View>
                </ScrollView>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.h2}>
                  Étudiants ({filtered.length})
                </Text>
              </View>

              <View style={styles.searchWrap}>
                <Text style={styles.label}>Rechercher</Text>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Nom, prénom, classe, matricule, numéro…"
                  placeholderTextColor="#6f7a96"
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
          }
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
                <SmallButton label="Éditer" onPress={() => startEdit(item)} />
                <SmallButton
                  label="Supprimer"
                  destructive
                  onPress={() => confirmDelete(item)}
                />
                <SmallButton
                  label="Créer bulletin"
                  onPress={() =>
                    Alert.alert(
                      'À faire',
                      'Écran "Créer bulletin" sera branché ensuite.'
                    )
                  }
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
                    : 'Aucun étudiant. Ajoute le premier via le formulaire.'}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    listContent: { padding: 16, paddingBottom: 48 },
    header: { paddingVertical: 8, gap: 6 },
    headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    h1: { color: theme.text, fontSize: 22, fontWeight: '700' },
    sub: { color: theme.textMuted, fontSize: 13 },
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
      marginTop: 10,
    },
    cardTitle: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 10,
    },
    field: { marginBottom: 10 },
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
    datePickerWrap: {
      marginTop: -4,
      marginBottom: 10,
      padding: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.inputBg,
    },
    row: { flexDirection: 'row', gap: 10, marginTop: 6 },
    btn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnPrimary: { backgroundColor: theme.primary },
    btnDanger: {
      backgroundColor: theme.dangerBg,
      borderWidth: 1,
      borderColor: theme.dangerBorder,
    },
    btnGhost: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.border,
    },
    btnDisabled: { opacity: 0.6 },
    btnPressed: { transform: [{ scale: 0.99 }] },
    btnText: { fontWeight: '700' },
    btnTextPrimary: { color: '#ffffff' },
    btnTextDanger: { color: theme.dangerText },
    btnTextGhost: { color: theme.text },
    sectionHeader: { marginTop: 14, marginBottom: 8 },
    h2: { color: theme.text, fontSize: 16, fontWeight: '700' },
    searchWrap: { marginBottom: 10 },
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

    // Internal helpers (avoid passing theme everywhere)
    _placeholder: { color: theme.placeholder },
    _text: { color: theme.text },
  });
}

