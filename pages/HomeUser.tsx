// pages/HomeUser.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase'; // adjust path if needed

const { width } = Dimensions.get('window');

interface EventItem {
  id: string;
  title: string;
  description?: string;
  start_time?: string; // ISO timestamp
  time?: string; // friendly string derived from start_time
  end_time?: string;
  location?: string;
  tags?: string[];
  poster_url?: string;
  organizer?: string;
  subreddits?: string[];
  status?: string;
  created_at?: string;
  registration_count?: number;
  category?: string;
}

interface HomeUserProps {
  onSettings: () => void;
  onHome: () => void;
  onExplore: () => void;
  onCreate: () => void;
  onMyEvents: () => void;
  onProfile: () => void;
  onEventClick: (event: EventItem) => void; // now sends full event object
}

const HomeUser: React.FC<HomeUserProps> = ({
  onSettings,
  onHome,
  onExplore,
  onCreate,
  onMyEvents,
  onProfile,
  onEventClick,
}) => {
  const [activeTab, setActiveTab] = useState('home');

  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
  const [trendingEvents, setTrendingEvents] = useState<EventItem[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUpcoming() {
      setLoadingUpcoming(true);
      try {
        const now = new Date().toISOString();
        console.log('[HomeUser] loading upcoming events (event_submissions) since', now);

        const { data, error } = await supabase
          .from('event_submissions')
          .select(
            `id, title, description, start_time, end_time, location, tags, poster_url, organizer, subreddits, status, created_at`
          )
          .gte('start_time', now)
          .in('status', ['approved', 'pending'])
          .order('start_time', { ascending: true })
          .limit(12);

        if (error) {
          console.warn('[HomeUser] fetchUpcoming error', error);
          if (mounted) setUpcomingEvents([]);
        } else {
          console.log('[HomeUser] upcoming rows:', (data || []).length);
          const normalized = (data || []).map((ev: any) => ({
            id: ev.id,
            title: ev.title,
            description: ev.description,
            start_time: ev.start_time,
            end_time: ev.end_time,
            time: ev.start_time ? new Date(ev.start_time).toLocaleString() : ev.time,
            location: ev.location,
            tags: ev.tags,
            poster_url: ev.poster_url,
            organizer: ev.organizer,
            status: ev.status,
            created_at: ev.created_at,
            category: ev.tags?.[0] || undefined,
          }));
          if (mounted) setUpcomingEvents(normalized);
        }
      } catch (err) {
        console.error('[HomeUser] loadUpcoming caught', err);
        if (mounted) setUpcomingEvents([]);
      } finally {
        if (mounted) setLoadingUpcoming(false);
      }
    }

    async function loadTrending() {
      setLoadingTrending(true);
      try {
        console.log('[HomeUser] loading trending - trying view v_event_submission_regcount');
        const { data, error } = await supabase
          .from('v_event_submission_regcount')
          .select('*')
          .order('registration_count', { ascending: false })
          .limit(8);

        if (error || !data) {
          console.warn('[HomeUser] trending view not available or error, falling back to client aggregation', error);
          const now = new Date().toISOString();
          const eventsP = supabase
            .from('event_submissions')
            .select('id,title,start_time,tags,location')
            .gte('start_time', now)
            .in('status', ['approved', 'pending']);
          const regsP = supabase.from('registrations').select('event_id');

          const [eventsRes, regsRes] = await Promise.all([eventsP, regsP]);
          const events = eventsRes.data || [];
          const regs = regsRes.data || [];

          const counts: Record<string, number> = {};
          (regs || []).forEach((r: any) => {
            if (r && r.event_id) counts[r.event_id] = (counts[r.event_id] || 0) + 1;
          });

          const enriched = (events || []).map((ev: any) => ({
            id: ev.id,
            title: ev.title,
            start_time: ev.start_time,
            time: ev.start_time ? new Date(ev.start_time).toLocaleString() : undefined,
            location: ev.location,
            registration_count: counts[ev.id] || 0,
            category: ev.tags?.[0] || undefined,
          }));

          enriched.sort((a: any, b: any) => (b.registration_count || 0) - (a.registration_count || 0));
          if (mounted) setTrendingEvents(enriched.slice(0, 8));
        } else {
          console.log('[HomeUser] trending view rows:', (data || []).length);
          const normalized = (data || []).map((ev: any) => ({
            id: ev.id,
            title: ev.title,
            description: ev.description,
            start_time: ev.start_time,
            time: ev.start_time ? new Date(ev.start_time).toLocaleString() : ev.time,
            location: ev.location,
            registration_count: ev.registration_count ?? 0,
            category: ev.tags?.[0] || undefined,
          }));
          if (mounted) setTrendingEvents(normalized);
        }
      } catch (err) {
        console.error('[HomeUser] loadTrending caught', err);
        if (mounted) setTrendingEvents([]);
      } finally {
        if (mounted) setLoadingTrending(false);
      }
    }

    loadUpcoming();
    loadTrending();

    // Realtime subscriptions
    const upcomingChannel = supabase
      .channel('public:event_submissions_upcoming')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_submissions' },
        (payload: any) => {
          console.log('[realtime] event_submissions change', payload?.event, payload?.new?.id);
          // simple strategy: refetch both lists
          loadUpcoming();
          loadTrending();
        }
      )
      .subscribe();

    const registrationsChannel = supabase
      .channel('public:registrations_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registrations' },
        (payload: any) => {
          console.log('[realtime] registrations change', payload?.event, payload?.new?.id, payload?.old?.id);
          loadTrending();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      try {
        supabase.removeChannel(upcomingChannel);
        supabase.removeChannel(registrationsChannel);
      } catch (e) {
        console.warn('[HomeUser] error removing channels', e);
      }
    };
  }, []);

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    switch (tab) {
      case 'home':
        onHome();
        break;
      case 'explore':
        onExplore();
        break;
      case 'create':
        onCreate();
        break;
      case 'myEvents':
        onMyEvents();
        break;
      case 'profile':
        onProfile();
        break;
    }
  };

  // Pass the full event object now
  const handleEventPress = (event: EventItem) => {
    onEventClick(event);
  };

  const handleJoin = async (eventId: string) => {
    try {
      console.log('[HomeUser] joining event', eventId);
      const { error } = await supabase.from('registrations').insert([{ event_id: eventId }]);
      if (error) {
        console.warn('[HomeUser] join failed', error);
        return;
      }
      // optimistic refresh
      const now = new Date().toISOString();
      const { data: events } = await supabase
        .from('event_submissions')
        .select('*')
        .gte('start_time', now)
        .in('status', ['approved', 'pending'])
        .limit(12);
      if (events) {
        setUpcomingEvents(events.map((ev: any) => ({
          id: ev.id,
          title: ev.title,
          start_time: ev.start_time,
          time: ev.start_time ? new Date(ev.start_time).toLocaleString() : undefined,
          location: ev.location,
          category: ev.tags?.[0] || undefined,
        })));
      }
      const { data: trending } = await supabase
        .from('v_event_submission_regcount')
        .select('*')
        .order('registration_count', { ascending: false })
        .limit(8);
      if (trending) {
        setTrendingEvents(trending.map((ev: any) => ({
          id: ev.id,
          title: ev.title,
          start_time: ev.start_time,
          time: ev.start_time ? new Date(ev.start_time).toLocaleString() : undefined,
          location: ev.location,
          registration_count: ev.registration_count ?? 0,
          category: ev.tags?.[0] || undefined,
        })));
      }
    } catch (err) {
      console.error('[HomeUser] handleJoin error', err);
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'entertainment': return '🎬';
      case 'arts': return '🎨';
      case 'music': return '🎵';
      case 'sports': return '⚽';
      case 'academic': return '📚';
      default: return '🎉';
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'entertainment': return '#e74c3c';
      case 'arts': return '#9b59b6';
      case 'music': return '#f39c12';
      case 'sports': return '#27ae60';
      case 'academic': return '#3498db';
      default: return '#95a5a6';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - removed stats + weather per request */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome back! 👋</Text>
            <Text style={styles.title}>Campus Events</Text>
          </View>
          <TouchableOpacity onPress={onSettings} style={styles.settingsButton}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Location Info (kept, but removed weather) */}
        <View style={styles.locationContainer}>
          <View style={styles.locationInfo}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText}>University City</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Upcoming Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {loadingUpcoming ? (
            <ActivityIndicator color="#3498db" style={{ marginVertical: 12 }} />
          ) : upcomingEvents.length === 0 ? (
            <Text style={{ color: '#8e9aaf', marginBottom: 20 }}>No upcoming events.</Text>
          ) : (
            upcomingEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => handleEventPress(event)}
                activeOpacity={0.7}
              >
                <View style={[styles.categoryIndicator, { backgroundColor: getCategoryColor(event.category) }]} />
                <View style={styles.eventIcon}>
                  <Text style={styles.eventEmoji}>{getCategoryIcon(event.category)}</Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventTime}>{event.time}</Text>
                  <View style={styles.eventMeta}>
                    <Text style={styles.eventLocation}>📍 {event.location}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.joinButton} onPress={() => handleJoin(event.id)}>
                  <Text style={styles.joinButtonText}>Join</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Trending Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Events</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {loadingTrending ? (
            <ActivityIndicator color="#3498db" style={{ marginVertical: 12 }} />
          ) : trendingEvents.length === 0 ? (
            <Text style={{ color: '#8e9aaf', marginBottom: 20 }}>No trending events.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {trendingEvents.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={styles.trendingEventCard}
                  onPress={() => handleEventPress(event)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.trendingEventHeader, { backgroundColor: getCategoryColor(event.category) }]}>
                    <Text style={styles.trendingEventIcon}>{getCategoryIcon(event.category)}</Text>
                  </View>
                  <View style={styles.trendingEventContent}>
                    <Text style={styles.trendingEventTitle}>{event.title}</Text>
                    <Text style={styles.trendingEventTime}>{event.time}</Text>
                    <Text style={styles.trendingEventLocation}>{event.location}</Text>
                    <View style={styles.trendingEventFooter}>
                      <Text style={styles.trendingEventAttendees}>👥 {event.registration_count ?? 0} going</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionCard} onPress={onCreate}>
              <Text style={styles.actionIcon}>➕</Text>
              <Text style={styles.actionText}>Create Event</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={onExplore}>
              <Text style={styles.actionIcon}>🔍</Text>
              <Text style={styles.actionText}>Explore</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={onMyEvents}>
              <Text style={styles.actionIcon}>📅</Text>
              <Text style={styles.actionText}>My Events</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={[styles.navButton, activeTab === 'home' && styles.activeNavButton]}
          onPress={() => handleTabPress('home')}
        >
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={[styles.navLabel, activeTab === 'home' && styles.activeNavLabel]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, activeTab === 'explore' && styles.activeNavButton]}
          onPress={() => handleTabPress('explore')}
        >
          <Text style={styles.navIcon}>🔍</Text>
          <Text style={[styles.navLabel, activeTab === 'explore' && styles.activeNavLabel]}>Explore</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, activeTab === 'create' && styles.activeNavButton]}
          onPress={() => handleTabPress('create')}
        >
          <Text style={styles.navIcon}>➕</Text>
          <Text style={[styles.navLabel, activeTab === 'create' && styles.activeNavLabel]}>Create</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, activeTab === 'myEvents' && styles.activeNavButton]}
          onPress={() => handleTabPress('myEvents')}
        >
          <Text style={styles.navIcon}>📅</Text>
          <Text style={[styles.navLabel, activeTab === 'myEvents' && styles.activeNavLabel]}>My Events</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, activeTab === 'profile' && styles.activeNavButton]}
          onPress={() => handleTabPress('profile')}
        >
          <Text style={styles.navIcon}>👤</Text>
          <Text style={[styles.navLabel, activeTab === 'profile' && styles.activeNavLabel]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#8e9aaf',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e2328',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2f36',
  },
  settingsIcon: {
    fontSize: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 12,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e2328',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a2f36',
  },
  locationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  locationText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  seeAllText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
  },
  eventCard: {
    backgroundColor: '#1e2328',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2f36',
    position: 'relative',
  },
  categoryIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  eventIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2a3441',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginLeft: 8,
  },
  eventEmoji: {
    fontSize: 20,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: '#3498db',
    marginBottom: 8,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventLocation: {
    fontSize: 12,
    color: '#8e9aaf',
    marginRight: 16,
  },
  joinButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  joinButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  horizontalScroll: {
    paddingRight: 20,
  },
  trendingEventCard: {
    backgroundColor: '#1e2328',
    borderRadius: 16,
    width: 200,
    marginRight: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2f36',
  },
  trendingEventHeader: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingEventIcon: {
    fontSize: 28,
  },
  trendingEventContent: {
    padding: 16,
  },
  trendingEventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  trendingEventTime: {
    fontSize: 14,
    color: '#3498db',
    marginBottom: 4,
  },
  trendingEventLocation: {
    fontSize: 12,
    color: '#8e9aaf',
    marginBottom: 12,
  },
  trendingEventFooter: {
    borderTopWidth: 1,
    borderTopColor: '#2a2f36',
    paddingTop: 8,
  },
  trendingEventAttendees: {
    fontSize: 12,
    color: '#8e9aaf',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: '#1e2328',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#2a2f36',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: '#1e2328',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2f36',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeNavButton: {
    backgroundColor: '#2a3441',
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 12,
    color: '#8e9aaf',
  },
  activeNavLabel: {
    color: '#3498db',
  },
});

export default HomeUser;
