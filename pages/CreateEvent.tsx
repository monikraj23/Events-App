// pages/CreateEvent.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';

// ---------- Config ----------
const STORAGE_BUCKET = 'Posters'; // 👈 your bucket name (case-sensitive)

// ---------- Helpers ----------
const todayISO = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

function isoFromDateAndHour(dateYMD: string, hour: number) {
  const [y, m, d] = dateYMD.split('-').map(Number);
  const dt = new Date(y, (m - 1), d, hour, 0, 0, 0);
  return dt.toISOString();
}
function addHoursISO(iso: string, hours: number) {
  const d = new Date(iso);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}
function prettyDate(ymd: string) {
  const d = new Date(ymd + 'T00:00:00');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}
function two(n: number) { return n < 10 ? `0${n}` : `${n}`; }

const HOURS = Array.from({ length: 24 }, (_, h) => h); // 0..23

// ---------- Debug helper ----------
async function testInsertNow() {
  const now = new Date();
  const end = new Date(now.getTime() + 2 * 3600 * 1000);

  const { data, error, status } = await supabase
    .from('event_submissions')
    .insert([{
      title: 'Button Test',
      description: 'quick test',
      start_time: now.toISOString(),
      end_time: end.toISOString(),
      location: 'Test Hall',
      tags: ['quick'],
      status: 'pending',
    }])
    .select('*')
    .single();

  if (error) {
    console.log('[testInsert] status:', status, 'error:', error);
    Alert.alert('Insert failed', `${status} ${error.code ?? ''} ${error.message}`);
  } else {
    console.log('[testInsert] OK:', data);
    Alert.alert('OK', `Row id: ${data.id}`);
  }
}

// ---------- Component ----------
type CreateEventProps = {
  onClose?: () => void;
  onHome?: () => void;
  onExplore?: () => void;
  onCreate?: () => void;
  onMyEvents?: () => void;
  onProfile?: () => void;
  onCreateEvent?: (row: any) => void;
};

const CreateEvent: React.FC<CreateEventProps> = ({
  onClose = () => {},
  onHome = () => {},
  onExplore = () => {},
  onCreate = () => {},
  onMyEvents = () => {},
  onProfile = () => {},
  onCreateEvent,
}) => {
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [capacity, setCapacity] = useState('');
  const [location, setLocation] = useState('');

  // Date + Time
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours());

  // Poster
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [posterUploading, setPosterUploading] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);

  const canCreateEvent = !!title.trim() && !!description.trim() && !!location.trim();

  const markedDates: Record<string, any> = useMemo(
    () => ({ [selectedDate]: { selected: true, selectedColor: '#3498db' } }),
    [selectedDate]
  );

  // ---- Poster upload to Supabase Storage (bucket: Posters) ----
  const pickAndUploadPoster = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Please allow photo library access to upload a poster.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.95,
        base64: Platform.OS !== 'web', // base64 only needed on native
      });
      if (result.canceled) return;

      const asset = result.assets[0];

      // Derive extension & content-type
      const extRaw = asset.fileName?.split('.').pop()?.toLowerCase();
      const ext = extRaw && ['png', 'jpg', 'jpeg', 'webp'].includes(extRaw) ? extRaw : 'jpg';
      let contentType = asset.mimeType || (ext === 'jpg' ? 'image/jpeg' : `image/${ext}`);

      const path = `events/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      setPosterUploading(true);

      let bytes: ArrayBuffer;
      if (Platform.OS === 'web') {
        const resp = await fetch(asset.uri);
        const blob = await resp.blob();
        contentType = blob.type || contentType;
        bytes = await blob.arrayBuffer();
      } else {
        const b64 =
          asset.base64 ??
          (await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 }));
        bytes = decode(b64);
      }

      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, bytes, { contentType, upsert: false });

      if (upErr) {
        console.error('[upload] error', upErr);
        Alert.alert('Upload failed', upErr.message);
        return;
      }

      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      setPosterUrl(pub.publicUrl);
      Alert.alert('Poster uploaded', 'Your poster is set.');
    } catch (e: any) {
      console.error('[upload] exception', e);
      Alert.alert('Upload error', e?.message ?? 'Could not upload poster.');
    } finally {
      setPosterUploading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!canCreateEvent || saving) return;

    try {
      setSaving(true);

      const startISO = isoFromDateAndHour(selectedDate, selectedHour);
      if (Number.isNaN(new Date(startISO).getTime())) {
        Alert.alert('Invalid date/time', 'Please pick a valid date and time.');
        return;
      }

      const endISO = addHoursISO(startISO, 2); // default +2h
      const tags = category.trim() ? [category.trim()] : [];

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        start_time: startISO,
        end_time: endISO,
        location: location.trim(),
        tags,                        // text[]
        status: 'pending' as const,  // review state
        raw_payload: { capacity: capacity || null },
        poster_url: posterUrl,       // 👈 now saved with the submission
      };

      console.log('[CreateEvent] inserting payload =>', payload);

      const { data, error, status } = await supabase
        .from('event_submissions')
        .insert([payload])
        .select('id, title, status, created_at')
        .single();

      if (error) {
        console.log('[event_submissions.insert] status:', status, 'error:', error);
        Alert.alert('Error', error.message);
        return;
      }

      onCreateEvent?.(data);

      // Reset form
      setTitle('');
      setDescription('');
      setCategory('');
      setCapacity('');
      setLocation('');
      setSelectedDate(todayISO);
      setSelectedHour(new Date().getHours());
      setPosterUrl(null);

      Alert.alert('Success', `Event "${data.title}" saved.`);
    } catch (e: any) {
      console.error('[event_submissions.insert] exception', e);
      Alert.alert('Error', e?.message ?? 'Failed to create event.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Event</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 24 + 72 }} showsVerticalScrollIndicator={false}>
          <View style={styles.inputSection}>
            {/* Title */}
            <TextInput
              style={styles.input}
              placeholder="Event Title"
              placeholderTextColor="#9ca3af"
              value={title}
              onChangeText={setTitle}
            />

            {/* Description */}
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Event Description"
              placeholderTextColor="#9ca3af"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            {/* Category */}
            <TextInput
              style={styles.input}
              placeholder="Category (used as tag)"
              placeholderTextColor="#9ca3af"
              value={category}
              onChangeText={setCategory}
            />

            {/* Date */}
            <Text style={styles.sectionLabel}>Date</Text>
            <Calendar
              onDayPress={(d: any) => setSelectedDate(d.dateString)}
              markedDates={markedDates}
              minDate={todayISO}
              theme={{
                calendarBackground: '#2c3e50',
                dayTextColor: '#ecf0f1',
                monthTextColor: '#ecf0f1',
                textSectionTitleColor: '#bdc3c7',
                selectedDayBackgroundColor: '#3498db',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#e67e22',
                arrowColor: '#ecf0f1',
              }}
              style={styles.calendar}
            />
            <Text style={styles.helperText}>Selected: {prettyDate(selectedDate)}</Text>

            {/* Time */}
            <Text style={styles.sectionLabel}>Start Time</Text>
            <View style={styles.timeGrid}>
              {HOURS.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[styles.timeCell, selectedHour === h && styles.timeCellActive]}
                  onPress={() => setSelectedHour(h)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.timeText, selectedHour === h && styles.timeTextActive]}>{two(h)}:00</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Capacity + Location */}
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 12 }]}
                placeholder="Capacity (optional)"
                placeholderTextColor="#9ca3af"
                value={capacity}
                onChangeText={setCapacity}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Location"
                placeholderTextColor="#9ca3af"
                value={location}
                onChangeText={setLocation}
              />
            </View>

            {/* Poster preview + uploader */}
            {posterUrl ? (
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <Image source={{ uri: posterUrl }} style={{ width: '100%', height: 160, borderRadius: 10 }} resizeMode="cover" />
                <Text style={{ color: '#9ca3af', marginTop: 6 }}>Poster set ✓</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.uploadButton, posterUploading && styles.disabledButton]}
              activeOpacity={0.85}
              onPress={pickAndUploadPoster}
              disabled={posterUploading}
            >
              <Text style={styles.uploadButtonText}>
                {posterUploading ? 'Uploading…' : posterUrl ? 'Replace Poster' : 'Upload Poster'}
              </Text>
            </TouchableOpacity>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.createButton, (!canCreateEvent || saving) && styles.disabledButton]}
              onPress={handleCreateEvent}
              disabled={!canCreateEvent || saving}
              activeOpacity={0.85}
            >
              <Text style={styles.createButtonText}>{saving ? 'Saving…' : 'Create Event'}</Text>
            </TouchableOpacity>

            {/* DEBUG: one-tap insert */}
            <TouchableOpacity
              onPress={testInsertNow}
              style={[styles.createButton, { marginTop: 12, backgroundColor: '#e67e22' }]}
              activeOpacity={0.85}
            >
              <Text style={styles.createButtonText}>TEST INSERT</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2332' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15 },
  closeButton: { padding: 5 },
  closeIcon: { fontSize: 24, color: '#ffffff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 34 },
  content: { flex: 1, paddingHorizontal: 20 },
  inputSection: { backgroundColor: '#2c3e50', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#34495e' },
  input: { backgroundColor: '#34495e', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, marginBottom: 15, fontSize: 16, color: '#ffffff', borderWidth: 1, borderColor: '#4a5568' },
  multilineInput: { textAlignVertical: 'top' },
  sectionLabel: { color: '#bdc3c7', fontSize: 12, marginBottom: 8, marginTop: 6 },
  helperText: { color: '#9ca3af', fontSize: 12, marginBottom: 12 },
  calendar: { borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  timeCell: { width: '19%', alignItems: 'center', paddingVertical: 10, backgroundColor: '#34495e', borderRadius: 8, borderWidth: 1, borderColor: '#4a5568', marginBottom: 8 },
  timeCellActive: { backgroundColor: '#3498db', borderColor: '#3498db' },
  timeText: { color: '#ecf0f1', fontWeight: '600' },
  timeTextActive: { color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  uploadButton: { backgroundColor: '#34495e', borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#4a5568' },
  uploadButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '500' },
  createButton: { backgroundColor: '#3498db', borderRadius: 25, paddingVertical: 16, alignItems: 'center', marginBottom: 4 },
  disabledButton: { opacity: 0.6 },
  createButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
});

export default CreateEvent;