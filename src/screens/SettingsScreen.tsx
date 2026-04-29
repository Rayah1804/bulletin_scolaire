import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const [pdfDir, setPdfDir] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const savedDir = await AsyncStorage.getItem('pdfExportDir');
      if (savedDir) setPdfDir(savedDir);
    })();
  }, []);

  const chooseDirectory = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: false,
      });
      if (result.type === 'success' && result.uri) {
        // On enlève le nom du fichier pour ne garder que le dossier
        const dir = result.uri.substring(0, result.uri.lastIndexOf('/') + 1);
        await AsyncStorage.setItem('pdfExportDir', dir);
        setPdfDir(dir);
        Alert.alert('Succès', 'Dossier d\'export PDF enregistré.');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de choisir le dossier.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Paramètres</Text>
      <Text style={styles.label}>Dossier d'export PDF actuel :</Text>
      <Text style={styles.value}>{pdfDir || 'Non défini (Bulletin par défaut)'}</Text>
      <Pressable style={styles.button} onPress={chooseDirectory}>
        <Text style={styles.buttonText}>Choisir un dossier PDF</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
  label: { fontSize: 16, marginBottom: 8 },
  value: { fontSize: 14, marginBottom: 24, color: '#333' },
  button: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
});
