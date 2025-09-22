import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  image: string;
}

interface MyEventsProps {
  onBack: () => void;
  onHome: () => void;
  onExplore: () => void;
  onCreate: () => void;
  onMyEvents: () => void;
  onProfile: () => void;
  onCancelEvent: (eventId: string) => void;
}

const MyEvents: React.FC<MyEventsProps> = ({
  onBack,
  onHome,
  onExplore,
  onCreate,
  onMyEvents,
  onProfile,
  onCancelEvent,
}) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const upcomingEvents: Event[] = [
    {
      id: '1',
      title: 'Campus Movie Night',
      date: 'Fri, May 10',
      time: '7:00 PM',
      image: '👩‍🦰',
    },
    {
      id: '2',
      title: 'Student Art Exhibition',
      date: 'Sat, May 11',
      time: '2:00 PM',
      image: '🖼️',
    },
    {
      id: '3',
      title: 'Campus Cleanup',
      date: 'Sun, May 12',
      time: '10:00 AM',
      image: '🌳',
    },
  ];

  const pastEvents: Event[] = [
    {
      id: '4',
      title: 'Tech Meetup',
      date: 'Mon, May 6',
      time: '6:00 PM',
      image: '💻',
    },
    {
      id: '5',
      title: 'Sports Tournament',
      date: 'Wed, May 8',
      time: '3:00 PM',
      image: '⚽',
    },
  ];

  const handleTabPress = (tab: string) => {
    setActiveTab(tab as 'upcoming' | 'past');
  };

  const handleCancelEvent = (eventId: string) => {
    onCancelEvent(eventId);
  };

  const renderEventCard = (event: Event) => (
    <View key={event.id} style={styles.eventCard}>
      <View style={styles.eventImage}>
        <Text style={styles.eventImageText}>{event.image}</Text>
      </View>
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventDateTime}>{event.date} · {event.time}</Text>
      </View>
      <TouchableOpacity 
        style={styles.cancelButton}
        onPress={() => handleCancelEvent(event.id)}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Events</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => handleTabPress('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => handleTabPress('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'upcoming' ? (
          <View>
            {upcomingEvents.map(renderEventCard)}
          </View>
        ) : (
          <View>
            {pastEvents.map(renderEventCard)}
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={[styles.navButton, false && styles.activeNavButton]}
          onPress={onHome}
        >
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, false && styles.activeNavButton]}
          onPress={onExplore}
        >
          <Text style={styles.navIcon}>🔍</Text>
          <Text style={styles.navLabel}>Explore</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, false && styles.activeNavButton]}
          onPress={onCreate}
        >
          <Text style={styles.navIcon}>➕</Text>
          <Text style={styles.navLabel}>Create</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, true && styles.activeNavButton]}
          onPress={onMyEvents}
        >
          <View style={styles.myEventsContainer}>
            <Text style={styles.navIcon}>📅</Text>
            <View style={styles.eventCountBadge}>
              <Text style={styles.eventCountText}>12</Text>
            </View>
          </View>
          <Text style={[styles.navLabel, true && styles.activeNavLabel]}>My Events</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, false && styles.activeNavButton]}
          onPress={onProfile}
        >
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2332', // Dark navy blue
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  backButton: {
    padding: 5,
  },
  backIcon: {
    fontSize: 24,
    color: '#ffffff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 34, // Same width as back button for centering
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3498db',
  },
  tabText: {
    color: '#bdc3c7',
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  eventCard: {
    backgroundColor: '#34495e',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventImage: {
    width: 50,
    height: 50,
    backgroundColor: '#4a5568',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  eventImageText: {
    fontSize: 24,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  eventDateTime: {
    color: '#bdc3c7',
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: '#1e2328',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#34495e',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeNavButton: {
    backgroundColor: '#34495e',
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 12,
    color: '#bdc3c7',
  },
  activeNavLabel: {
    color: '#3498db',
  },
  myEventsContainer: {
    position: 'relative',
  },
  eventCountBadge: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventCountText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default MyEvents;
