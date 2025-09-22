// pages/EventDetails.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { supabase } from '../lib/supabase';

interface EventDetailsProps {
  eventId?: string | { id?: string } | null;
  onBack: () => void;
  onRSVP: () => void;
}

interface EventRow {
  id: string;
  title?: string | null;
  description?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  price?: string | null;
  organizer?: string | null;
  tags?: string[] | null;
  attendees?: number | null;
  capacity?: number | null;
}

type RedditRow = {
  id: string;
  reddit_id: string;
  subreddit: string;
  type: 'post' | 'comment';
  title?: string | null;
  body?: string | null;
  author?: string | null;
  sentiment?: number | null;
  created_utc?: string | null;
  payload?: any;
};

const EventDetails: React.FC<EventDetailsProps> = ({ eventId, onBack, onRSVP }) => {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRSVPed, setIsRSVPed] = useState(false);

  const [discussions, setDiscussions] = useState<RedditRow[]>([]);
  const [loadingDisc, setLoadingDisc] = useState(false);

  // normalize eventId
  const normalizeId = (raw?: string | { id?: string } | null): string | null => {
    if (!raw) return null;
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'object') {
      if (raw.id && typeof raw.id === 'string') return raw.id;
      return null;
    }
    return null;
  };

  const safeId = normalizeId(eventId);

  // fetch event + discussions
  useEffect(() => {
    if (!safeId) return;

    let mounted = true;

    const fetchEvent = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('event_submissions')
        .select('*')
        .eq('id', safeId)
        .single();

      if (error) {
        console.error('[EventDetails] fetch event error', error);
        if (mounted) {
          setErrorMsg(error.message);
          setEvent(null);
        }
      } else if (mounted) {
        setEvent(data as EventRow);
      }
      if (mounted) setLoading(false);
    };

    const fetchDiscussions = async () => {
      setLoadingDisc(true);
      const { data, error } = await supabase
        .from('reddit_comments')
        .select('*')
        .eq('event_id', safeId)
        .order('created_utc', { ascending: false })
        .limit(200);

      if (error) {
        console.error('[EventDetails] fetch discussions error', error);
        if (mounted) setDiscussions([]);
      } else if (mounted) {
        setDiscussions(data as RedditRow[]);
      }
      if (mounted) setLoadingDisc(false);
    };

    fetchEvent();
    fetchDiscussions();

    // realtime subscription
    const channel = supabase
      .channel(`event_discussions_${safeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reddit_comments',
          filter: `event_id=eq.${safeId}`,
        },
        (payload) => {
          setDiscussions((prev) => [payload.new as RedditRow, ...prev]);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [safeId]);

  const handleRSVP = () => {
    setIsRSVPed((s) => !s);
    onRSVP();
  };

  const openReddit = async (row: RedditRow) => {
    const permalink = row?.payload?.permalink;
    const url = permalink ? `https://www.reddit.com${permalink}` : row?.payload?.url;
    if (!url) {
      Alert.alert('No link available for this reddit item.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Open link failed', String(e));
    }
  };

  // === UI render states ===
  if (!safeId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event Details</Text>
        </View>
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>Invalid event id.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event Details</Text>
        </View>
        <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 48 }} />
      </SafeAreaView>
    );
  }

  if (errorMsg) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event Details</Text>
        </View>
        <View style={styles.placeholderContainer}>
          <Text style={[styles.placeholderText, { color: '#f66' }]}>Error</Text>
          <Text style={styles.placeholderSub}>{errorMsg}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event Details</Text>
        </View>
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>Event not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // === Main UI ===
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{event.title ?? 'Untitled Event'}</Text>
          <Text style={styles.organizerText}>Organized by {event.organizer ?? 'Organizer'}</Text>
          <Text style={styles.eventDescription}>{event.description ?? 'No description.'}</Text>

          {/* Stats */}
          <View style={styles.statsSection}>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>👥</Text>
              <Text style={styles.statNumber}>{event.attendees ?? 0}</Text>
              <Text style={styles.statLabel}>Going</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>💰</Text>
              <Text style={styles.statNumber}>{event.price ?? 'Free'}</Text>
              <Text style={styles.statLabel}>Price</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>📍</Text>
              <Text style={styles.statNumber}>{event.location ?? 'TBA'}</Text>
              <Text style={styles.statLabel}>Location</Text>
            </View>
          </View>
        </View>

        {/* Reddit Discussion */}
        <View style={styles.discussionSection}>
          <Text style={styles.sectionTitle}>Discussion (Reddit)</Text>
          {loadingDisc ? (
            <ActivityIndicator color="#3498db" />
          ) : discussions.length === 0 ? (
            <Text style={{ color: '#8e9aaf' }}>No reddit posts/comments yet.</Text>
          ) : (
            discussions.map((row) => (
              <TouchableOpacity
                key={row.id}
                style={styles.commentRow}
                onPress={() => openReddit(row)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.commentAuthor}>
                    {row.author ?? row.subreddit} • {row.type}
                  </Text>
                  {row.title ? <Text style={styles.commentTitle}>{row.title}</Text> : null}
                  <Text style={styles.commentBody} numberOfLines={3}>
                    {row.body}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* RSVP Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.rsvpButton, isRSVPed && styles.rsvpButtonActive]}
          onPress={handleRSVP}
        >
          <Text style={styles.rsvpButtonText}>
            {isRSVPed ? '✓ Going' : 'RSVP Now'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'space-between',
  },
  backButton: { padding: 8, backgroundColor: '#1e2328', borderRadius: 8 },
  backIcon: { color: '#fff', fontSize: 18 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  content: { flex: 1, paddingHorizontal: 16 },
  placeholderContainer: { padding: 40, alignItems: 'center' },
  placeholderText: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  placeholderSub: { color: '#8e9aaf' },
  eventInfo: { marginBottom: 20 },
  eventTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 8 },
  organizerText: { color: '#8e9aaf', marginBottom: 12 },
  eventDescription: { color: '#ecf0f1', marginBottom: 18 },
  statsSection: { flexDirection: 'row', marginBottom: 18 },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#1e2328',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  statIcon: { fontSize: 18, marginBottom: 6 },
  statNumber: { color: '#3498db', fontWeight: '700', fontSize: 16 },
  statLabel: { color: '#8e9aaf', fontSize: 12 },
  discussionSection: { marginTop: 20, marginBottom: 80 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  commentRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2f36',
  },
  commentAuthor: { color: '#8e9aaf', fontSize: 12, marginBottom: 4 },
  commentTitle: { color: '#fff', fontWeight: '700' },
  commentBody: { color: '#ecf0f1', marginTop: 4 },
  bottomSection: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#2a2f36',
  },
  rsvpButton: {
    backgroundColor: '#3498db',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  rsvpButtonActive: { backgroundColor: '#27ae60' },
  rsvpButtonText: { color: '#fff', fontWeight: '700' },
});

export default EventDetails;
