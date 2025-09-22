// pages/Explore.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

interface EventRow {
  id: string;
  title: string;
  description?: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string;
  tags?: string[] | null;
  status?: string;
  created_at?: string;
}

interface ExploreProps {
  onMenu: () => void;
  onHome: () => void;
  onExplore: () => void;
  onCreate: () => void;
  onMyEvents: () => void;
  onProfile: () => void;
  onLocation: () => void;
}

const FILTERS = [
  'all',
  'today',
  'tomorrow',
  'thisWeek',
  'nextWeek',
  'sports',
  'tech',
  'cultural',
  'workshops',
  'hackathons',
] as const;
type FilterKey = typeof FILTERS[number];

const Explore: React.FC<ExploreProps> = ({
  onMenu,
  onHome,
  onExplore,
  onCreate,
  onMyEvents,
  onProfile,
  onLocation,
}) => {
  const [activeTab, setActiveTab] = useState('explore');
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const buildTimeRange = (filter: FilterKey) => {
    const now = new Date();
    if (filter === 'today') {
      const s = new Date(now);
      s.setHours(0, 0, 0, 0);
      const e = new Date(now);
      e.setHours(23, 59, 59, 999);
      return { start: s.toISOString(), end: e.toISOString() };
    }
    if (filter === 'tomorrow') {
      const s = new Date(now);
      s.setDate(s.getDate() + 1);
      s.setHours(0, 0, 0, 0);
      const e = new Date(s);
      e.setHours(23, 59, 59, 999);
      return { start: s.toISOString(), end: e.toISOString() };
    }
    if (filter === 'thisWeek') {
      const s = new Date(now);
      s.setHours(0, 0, 0, 0);
      // end: this Sunday
      const e = new Date(now);
      const daysUntilSunday = 7 - e.getDay();
      e.setDate(e.getDate() + daysUntilSunday);
      e.setHours(23, 59, 59, 999);
      return { start: s.toISOString(), end: e.toISOString() };
    }
    if (filter === 'nextWeek') {
      // next week's Monday -> next week's Sunday
      const s = new Date(now);
      const daysUntilNextMonday = (8 - s.getDay()) % 7 || 7;
      s.setDate(s.getDate() + daysUntilNextMonday);
      s.setHours(0, 0, 0, 0);
      const e = new Date(s);
      e.setDate(e.getDate() + 6);
      e.setHours(23, 59, 59, 999);
      return { start: s.toISOString(), end: e.toISOString() };
    }
    return null;
  };

  const fetchEvents = useCallback(
    async (opts?: { bypassLoading?: boolean }) => {
      if (!opts?.bypassLoading) setLoading(true);
      try {
        // start query
        let query: any = supabase.from('event_submissions').select('*');

        // only pending/approved (development-friendly)
        query = query.in('status', ['approved', 'pending']);

        // time filters
        const timeRange = buildTimeRange(activeFilter);
        if (timeRange) {
          query = query.gte('start_time', timeRange.start).lte('start_time', timeRange.end);
        } else {
          // default show future events
          const now = new Date().toISOString();
          query = query.gte('start_time', now);
        }

        // category filters (tags contains)
        if (['sports', 'tech', 'cultural', 'workshops', 'hackathons'].includes(activeFilter)) {
          // tags column is an array text[] in your schema — use contains
          query = query.contains('tags', [activeFilter]);
        }

        // search (title OR location)
        const search = searchText.trim();
        if (search) {
          // use ilike with .or syntax: "title.ilike.%foo%,location.ilike.%foo%"
          // careful: no spaces around comma
          const q = `%${search}%`;
          query = query.or(`title.ilike.${q},location.ilike.${q}`);
        }

        // order
        query = query.order('start_time', { ascending: true });

        const { data, error } = await query;
        if (error) {
          console.warn('fetchEvents error', error);
          setEvents([]);
        } else {
          const rows = (data || []) as EventRow[];
          // normalize tags to lowercase strings
          setEvents(
            rows.map((r) => ({
              ...r,
              tags: (r.tags || []).map((t) => (typeof t === 'string' ? t.toLowerCase() : String(t))),
            }))
          );
        }
      } catch (e) {
        console.error('fetchEvents caught', e);
        setEvents([]);
      } finally {
        if (!opts?.bypassLoading) setLoading(false);
      }
    },
    [activeFilter, searchText]
  );

  // initial load + whenever filter/search changes (debounced)
  useEffect(() => {
    // debounce (400ms)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    // small immediate fetch if user toggles filter (no debounce) — helps UX
    if (searchText === '') {
      // immediate for empty search to show results quickly when filter changes
      fetchEvents();
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetchEvents();
    }, 400) as unknown as number;

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [activeFilter, searchText, fetchEvents]);

  // realtime subscription
  useEffect(() => {
    // subscribe to all changes on event_submissions and refetch
    const channel = supabase
      .channel('public:event_submissions_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_submissions' },
        () => {
          // keep lightweight: do quick refetch
          fetchEvents({ bypassLoading: true });
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        // ignore
      }
    };
  }, [fetchEvents]);

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

  const getCategoryIcon = (category?: string) => {
    if (!category) return '🎉';
    switch (category.toLowerCase()) {
      case 'sports':
        return '⚽';
      case 'tech':
        return '💻';
      case 'cultural':
        return '🎭';
      case 'workshops':
        return '🛠️';
      case 'hackathons':
        return '👩‍💻';
      default:
        return '🎉';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Explore Events</Text>
          <Text style={styles.headerSubtitle}>Campus</Text>
        </View>
        <TouchableOpacity onPress={onMenu} style={styles.menuButton}>
          <Text style={styles.menuIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search events, locations..."
              placeholderTextColor="#8e9aaf"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              autoCapitalize="none"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Text style={{ color: '#3498db' }}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Map placeholder */}
        <View style={styles.mapSection}>
          <View style={styles.mapContainer}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>Campus Map</Text>
              <TouchableOpacity style={styles.viewToggle}>
                <Text style={styles.viewToggleText}>List View</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.mapPlaceholder} />
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            {FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterButton, activeFilter === filter && styles.activeFilter]}
                onPress={() => setActiveFilter(filter as FilterKey)}
              >
                <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>
                  {filter === 'all'
                    ? 'All'
                    : filter === 'thisWeek'
                    ? 'This Week'
                    : filter === 'nextWeek'
                    ? 'Next Week'
                    : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.filterButton]}
              onPress={() => {
                setActiveFilter('all');
                setSearchText('');
              }}
            >
              <Text style={styles.filterText}>Reset</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Events list */}
        <View style={styles.eventsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby Events</Text>
            <Text style={styles.eventCount}>{events.length} events</Text>
          </View>

          {loading ? (
            <ActivityIndicator color="#3498db" style={{ marginVertical: 12 }} />
          ) : events.length === 0 ? (
            <Text style={{ color: '#8e9aaf' }}>No events match your filters.</Text>
          ) : (
            events.map((event) => (
              <TouchableOpacity key={event.id} style={styles.eventCard}>
                <View style={styles.eventIcon}>
                  <Text style={styles.eventEmoji}>{getCategoryIcon(event.tags?.[0] ?? undefined)}</Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventTime}>
                    {event.start_time ? new Date(event.start_time).toLocaleString() : ''}
                  </Text>
                  <Text style={styles.eventLocation}>📍 {event.location}</Text>
                </View>
                <TouchableOpacity style={styles.eventAction}>
                  <Text style={styles.eventActionText}>Join</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNavigation}>
        {['home', 'explore', 'create', 'myEvents', 'profile'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.navButton, activeTab === tab && styles.activeNavButton]}
            onPress={() => handleTabPress(tab)}
          >
            <Text style={styles.navIcon}>
              {tab === 'home' ? '🏠' : tab === 'explore' ? '🔍' : tab === 'create' ? '➕' : tab === 'myEvents' ? '📅' : '👤'}
            </Text>
            <Text style={[styles.navLabel, activeTab === tab && styles.activeNavLabel]}>
              {tab === 'myEvents' ? 'My Events' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
  headerSubtitle: { fontSize: 16, color: '#8e9aaf' },
  menuButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1e2328', justifyContent: 'center', alignItems: 'center' },
  menuIcon: { fontSize: 20 },
  scrollContainer: { flex: 1 },
  searchSection: { paddingHorizontal: 20, marginBottom: 12 },
  searchBar: {
    backgroundColor: '#1e2328', borderRadius: 16, flexDirection: 'row',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: '#2a2f36',
  },
  searchIcon: { fontSize: 18, marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: '#ffffff' },
  mapSection: { paddingHorizontal: 20, marginBottom: 16 },
  mapContainer: { backgroundColor: '#1e2328', borderRadius: 20, overflow: 'hidden' },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#2a2f36' },
  mapTitle: { fontSize: 18, fontWeight: '600', color: '#ffffff' },
  viewToggle: { backgroundColor: '#3498db', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  viewToggleText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  mapPlaceholder: { height: 200, backgroundColor: '#2a3441' },
  filterSection: { marginBottom: 16 },
  filterContent: { paddingHorizontal: 20 },
  filterButton: {
    backgroundColor: '#1e2328', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24,
    marginRight: 12, borderWidth: 1, borderColor: '#2a2f36',
  },
  activeFilter: { backgroundColor: '#3498db', borderColor: '#3498db' },
  filterText: { color: '#8e9aaf', fontSize: 14, fontWeight: '500' },
  activeFilterText: { color: '#ffffff' },
  eventsSection: { paddingHorizontal: 20, paddingBottom: 100 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  eventCount: { fontSize: 14, color: '#8e9aaf' },
  eventCard: {
    backgroundColor: '#1e2328', borderRadius: 16, padding: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#2a2f36',
  },
  eventIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#2a3441', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  eventEmoji: { fontSize: 20 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 4 },
  eventTime: { fontSize: 14, color: '#3498db', marginBottom: 4 },
  eventLocation: { fontSize: 12, color: '#8e9aaf' },
  eventAction: { backgroundColor: '#3498db', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  eventActionText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  bottomNavigation: { flexDirection: 'row', backgroundColor: '#1e2328', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#2a2f36' },
  navButton: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  activeNavButton: { backgroundColor: '#2a3441' },
  navIcon: { fontSize: 20, marginBottom: 4 },
  navLabel: { fontSize: 12, color: '#8e9aaf' },
  activeNavLabel: { color: '#3498db' },
});

export default Explore;
