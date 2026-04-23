import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Student } from '../types/student';
import { createId } from '../utils/id';
import { getStudents, setStudents } from '../storage/studentsRepo';
import { useTheme } from '../theme/ThemeProvider';

type RootStackParamList = {
  StudentsList: undefined;
  StudentsSearch: undefined;
  StudentForm: { id?: string } | undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'StudentForm'> | undefined;

// Theme is provided globally (clair/sombre) via ThemeProvider.

type FormState = Omit<Student, 'id' | 'createdAt' | 'updatedAt'>;
const emptyForm: FormState = {
  nom: '',
  prenom: '',
  dateNaissance: '',
  classe: '',
  anneeScolaire: '',
  numeroDansClasse: '',
  matricule: '',
  numeroPasse: '',
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
    return new Date(`${isoMatch[0]}T00:00:00`);
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
  const frMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(cleaned);
  if (frMatch) {
    return cleaned;
  }
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
    ['anneeScolaire', 'Année scolaire'],
    ['numeroDansClasse', "Numéro de l'étudiant"],
    ['matricule', 'Matricule'],
    ['numeroPasse', 'Numéro de passe'],
  ];

  // Validation des champs requis
  for (const [k, label] of required) {
    if (!form[k].trim()) return `Champ obligatoire: ${label}`;
  }

  // Validation spécifique pour l'année scolaire (format XXXX-XXXX)
  const anneeRegex = /^\d{4}-\d{4}$/;
  if (!anneeRegex.test(form.anneeScolaire.trim())) {
    return 'Format année scolaire invalide. Utilisez le format: 2025-2026';
  }

  // Validation du numéro dans la classe (doit être un nombre positif)
  const numeroClasse = parseInt(form.numeroDansClasse.trim());
  if (isNaN(numeroClasse) || numeroClasse <= 0) {
    return "Le numéro dans la classe doit être un nombre positif";
  }

  // Validation du numéro de passe (doit être numérique)
  const numeroPasse = form.numeroPasse.trim();
  if (!/^\d+$/.test(numeroPasse)) {
    return "Le numéro de passe doit contenir uniquement des chiffres";
  }

  // Validation du matricule (au moins 3 caractères)
  if (form.matricule.trim().length < 3) {
    return "Le matricule doit contenir au moins 3 caractères";
  }

  return null;
}

export default function StudentFormScreen(props?: Props) {
  const { navigation, route } = props || {};
  const { theme, hydrateTheme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const editingId = route?.params?.id;
  const isEditing = Boolean(editingId);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Refs pour la navigation automatique entre champs
  const prenomRef = React.useRef<TextInput>(null);
  const dateRef = React.useRef<View>(null);
  const anneeRef = React.useRef<TextInput>(null);
  const classeRef = React.useRef<TextInput>(null);
  const numeroClasseRef = React.useRef<TextInput>(null);
  const matriculeRef = React.useRef<TextInput>(null);
  const numeroPasseRef = React.useRef<TextInput>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await hydrateTheme();

      if (!editingId) return;
      const list = await getStudents();
      const found = list.find((s) => s.id === editingId);
      if (!found) return;
      if (!mounted) return;
      setForm({
        nom: found.nom,
        prenom: found.prenom,
        dateNaissance: found.dateNaissance,
        classe: found.classe,
        anneeScolaire: found.anneeScolaire,
        numeroDansClasse: found.numeroDansClasse,
        matricule: found.matricule,
        numeroPasse: found.numeroPasse,
      });
    })();
    return () => {
      mounted = false;
    };
  }, [editingId]);

  function onDateChange(e: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (e.type === 'dismissed') return;
    const d = selected ?? new Date();
    setForm((p) => ({ ...p, dateNaissance: formatDateFromDate(d) }));
  }

  function goToHomeSafely() {
    if (navigation?.canGoBack()) {
      navigation.goBack();
      return;
    }
    // When opened from bottom-tab "Ajouter", there is often no stack back entry.
    navigation?.getParent()?.navigate('Accueil' as never);
  }

  async function onSave() {
    const err = validateForm(form);
    if (err) return Alert.alert('Vérification', err);
    if (saving) return;
    setSaving(true);
    try {
      const list = await getStudents();
      const now = Date.now();

      // Vérification d'unicité du matricule
      const matriculeExiste = list.some(
        (s) => s.matricule.trim().toLowerCase() === form.matricule.trim().toLowerCase() && (!isEditing || s.id !== editingId)
      );
      if (matriculeExiste) {
        Alert.alert('Doublon', 'Un étudiant avec ce matricule existe déjà.');
        return;
      }

      if (isEditing && editingId) {
        const next = list.map((s) =>
          s.id === editingId
            ? { ...s, ...form, updatedAt: now }
            : s
        );
        await setStudents(next);
        Alert.alert('Succès', 'Étudiant modifié avec succès');
        goToHomeSafely();
      } else {
        const created: Student = {
          id: createId(),
          ...form,
          createdAt: now,
          updatedAt: now,
        };
        await setStudents([created, ...list]);
        Alert.alert('Succès', 'Étudiant ajouté avec succès');
        // Réinitialiser le formulaire pour permettre un nouvel ajout
        setForm(emptyForm);
      }
    } catch (e) {
      Alert.alert(
        'Erreur',
        "Impossible d'enregistrer pour le moment. Réessaie."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{isEditing ? 'Modifier étudiant' : 'Ajouter étudiant'}</Text>
            <Field
              styles={styles}
              label="Nom"
              value={form.nom}
              onChange={(v) => {
                // Empêche les chiffres dans le nom
                const filtered = v.replace(/\d+/g, '');
                setForm((p) => ({ ...p, nom: filtered }));
              }}
              placeholder="Ex: Diallo"
              returnKeyType="next"
              onSubmitEditing={() => prenomRef.current?.focus()}
              autoCapitalize="words"
            />
            <Field
              ref={prenomRef}
              styles={styles}
              label="Prénom"
              value={form.prenom}
              onChange={(v) => {
                // Empêche les chiffres dans le prénom
                const filtered = v.replace(/\d+/g, '');
                setForm((p) => ({ ...p, prenom: filtered }));
              }}
              placeholder="Ex: Aïcha"
              returnKeyType="next"
              onSubmitEditing={() => setShowDatePicker(true)}
              autoCapitalize="words"
            />
            <DateField
              ref={dateRef}
              styles={styles}
              currentValue={formatDateValue(form.dateNaissance)}
              textColor={theme.text}
              placeholderColor={theme.placeholder}
              onPress={() => setShowDatePicker(true)}
              onSubmitEditing={() => anneeRef.current?.focus()}
            />

            <Field
              ref={anneeRef}
              styles={styles}
              label="Année scolaire"
              value={form.anneeScolaire}
              onChange={(v) => {
                // Formatage automatique pour l'année scolaire
                let formatted = v.replace(/[^0-9-]/g, ''); // Garder seulement chiffres et tiret
                if (formatted.length >= 4 && !formatted.includes('-')) {
                  formatted = formatted.slice(0, 4) + '-' + formatted.slice(4);
                }
                if (formatted.length > 9) {
                  formatted = formatted.slice(0, 9); // Limiter à XXXX-XXXX
                }
                setForm((p) => ({ ...p, anneeScolaire: formatted }));
              }}
              placeholder="Ex: 2025-2026"
              returnKeyType="next"
              onSubmitEditing={() => classeRef.current?.focus()}
              autoCapitalize="none"
              keyboardType="numeric"
              maxLength={9}
            />

            {showDatePicker ? (
              <View style={styles.datePickerWrap}>
                <DateTimePicker
                  value={
                    parseDateValue(form.dateNaissance) ?? new Date()
                  }
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  maximumDate={new Date()}
                />
                {Platform.OS === 'ios' ? (
                  <View style={styles.row}>
                    <ActionButton styles={styles} label="OK" variant="primary" onPress={() => setShowDatePicker(false)} />
                    <ActionButton styles={styles} label="Annuler" variant="ghost" onPress={() => setShowDatePicker(false)} />
                  </View>
                ) : null}
              </View>
            ) : null}

            <Field
              ref={classeRef}
              styles={styles}
              label="Classe"
              value={form.classe}
              onChange={(v) => setForm((p) => ({ ...p, classe: v }))}
              placeholder="Ex: 6ème 1"
              returnKeyType="next"
              onSubmitEditing={() => numeroClasseRef.current?.focus()}
              autoCapitalize="words"
            />
            <Field
              ref={numeroClasseRef}
              styles={styles}
              label="Numéro dans la classe"
              value={form.numeroDansClasse}
              onChange={(v) => setForm((p) => ({ ...p, numeroDansClasse: v.replace(/[^0-9]/g, '') }))}
              placeholder="Ex: 12"
              returnKeyType="next"
              onSubmitEditing={() => matriculeRef.current?.focus()}
              keyboardType="number-pad"
              autoCapitalize="none"
              maxLength={3}
            />
            <Field
              ref={matriculeRef}
              styles={styles}
              label="Matricule"
              value={form.matricule}
              onChange={(v) => setForm((p) => ({ ...p, matricule: v.toUpperCase() }))}
              placeholder="Ex: 0851G-P/R"
              returnKeyType="next"
              onSubmitEditing={() => numeroPasseRef.current?.focus()}
              autoCapitalize="characters"
              maxLength={20}
            />
            <Field
              ref={numeroPasseRef}
              styles={styles}
              label="Numéro de passe"
              value={form.numeroPasse}
              onChange={(v) => setForm((p) => ({ ...p, numeroPasse: v.replace(/[^0-9]/g, '') }))}
              placeholder="Ex: 1234"
              returnKeyType="done"
              onSubmitEditing={onSave}
              keyboardType="number-pad"
              autoCapitalize="none"
              maxLength={10}
            />

            <View style={styles.row}>
              <ActionButton styles={styles} label="Enregistrer" variant="primary" disabled={saving} onPress={onSave} />
              <ActionButton
                styles={styles}
                label="Annuler"
                variant="ghost"
                disabled={saving}
                onPress={goToHomeSafely}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field(props: {
  ref?: React.RefObject<TextInput | null>;
  styles: ReturnType<typeof createStyles>;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  returnKeyType?: 'next' | 'done' | 'default';
  onSubmitEditing?: () => void;
  maxLength?: number;
}) {
  return (
    <View style={props.styles.field}>
      <Text style={props.styles.label}>{props.label}</Text>
      <TextInput
        ref={props.ref}
        value={props.value}
        onChangeText={props.onChange}
        placeholder={props.placeholder}
        placeholderTextColor={props.styles._placeholder.color}
        style={props.styles.input}
        keyboardType={props.keyboardType ?? 'default'}
        autoCapitalize={props.autoCapitalize ?? 'words'}
        autoCorrect={false}
        returnKeyType={props.returnKeyType ?? 'default'}
        onSubmitEditing={props.onSubmitEditing}
        maxLength={props.maxLength}
        blurOnSubmit={false}
      />
    </View>
  );
}

function DateField(props: {
  ref?: React.RefObject<View | null>;
  styles: ReturnType<typeof createStyles>;
  currentValue: string;
  onPress: () => void;
  textColor: string;
  placeholderColor: string;
  onSubmitEditing?: () => void;
}) {
  return (
    <View style={props.styles.field}>
      <Text style={props.styles.label}>Date de naissance</Text>
      <Pressable
        ref={props.ref}
        onPress={props.onPress}
        style={props.styles.input}
      >
        <Text style={{ color: props.currentValue.trim() ? props.textColor : props.placeholderColor }}>
          {props.currentValue.trim() ? formatIsoToFr(props.currentValue.trim()) : 'Sélectionner une date'}
        </Text>
      </Pressable>
    </View>
  );
}

function ActionButton(props: {
  styles: ReturnType<typeof createStyles>;
  label: string;
  onPress: () => void;
  variant: 'primary' | 'ghost';
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      style={({ pressed }) => [
        props.styles.btn,
        props.variant === 'primary' ? props.styles.btnPrimary : props.styles.btnGhost,
        props.disabled ? props.styles.btnDisabled : null,
        pressed && !props.disabled ? props.styles.btnPressed : null,
      ]}
    >
      <Text
        style={[
          props.styles.btnText,
          props.variant === 'primary' ? props.styles.btnTextPrimary : props.styles.btnTextGhost,
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
    listContent: { padding: 16, paddingBottom: 48 },
    card: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      marginTop: 10,
    },
    cardTitle: { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 10 },
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
    _placeholder: { color: theme.placeholder },
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
    btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    btnPrimary: { backgroundColor: theme.primary },
    btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border },
    btnDisabled: { opacity: 0.6 },
    btnPressed: { transform: [{ scale: 0.99 }] },
    btnText: { fontWeight: '700' },
    btnTextPrimary: { color: '#ffffff' },
    btnTextGhost: { color: theme.text },
  });
}

