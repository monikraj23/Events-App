import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';

interface Badge {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
}

interface PastEvent {
  id: string;
  title: string;
  location: string;
  icon: string;
  date: string;
}

interface ProfileProps {
  onHome: () => void;
  onExplore: () => void;
  onCreate: () => void;
  onMyEvents: () => void;
  onProfile: () => void;
  onSettings: () => void;
}

const Profile: React.FC<ProfileProps> = ({
  onHome,
  onExplore,
  onCreate,
  onMyEvents,
  onProfile,
  onSettings,
}) => {
  const [activeTab, setActiveTab] = useState('profile');

  const interests = [
    { name: 'Music', icon: '🎵', color: '#f39c12' },
    { name: 'Sports', icon: '⚽', color: '#27ae60' },
    { name: 'Technology', icon: '💻', color: '#3498db' },
    { name: 'Arts', icon: '🎨', color: '#9b59b6' },
    { name: 'Social', icon: '👥', color: '#e74c3c' }
  ];
  
  const badges: Badge[] = [
    {
      id: '1',
      title: 'Event Enthusiast',
      subtitle: 'Attended 5 events',
      icon: '🎉',
      color: '#3498db',
    },
    {
      id: '2',
      title: 'Campus Explorer',
      subtitle: 'Visited 3 locations',
      icon: '🗺️',
      color: '#27ae60',
    },
    {
      id: '3',
      title: 'Social Butterfly',
      subtitle: 'Met 10 new people',
      icon: '🦋',
      color: '#9b59b6',
    },
  ];

  const pastEvents: PastEvent[] = [
    {
      id: '1',
      title: 'TechTalk: AI Future',
      location: 'Campus Center',
      icon: '💻',
      date: 'Oct 10, 2024',
    },
    {
      id: '2',
      title: 'Open Mic Night',
      location: 'Student Union',
      icon: '🎤',
      date: 'Oct 8, 2024',
    },
    {
      id: '3',
      title: 'Book Club Meeting',
      location: 'Library',
      icon: '📚',
      date: 'Oct 5, 2024',
    },
  ];

  const stats = [
    { label: 'Events Attended', value: '15', icon: '🎯' },
    { label: 'Events Hosted', value: '3', icon: '🎪' },
    { label: 'Friends Made', value: '28', icon: '👥' },
  ];

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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={onSettings} style={styles.settingsButton}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarEmoji}>👨‍💼</Text>
              </View>
              <View style={styles.onlineIndicator} />
            </View>
            <Text style={styles.name}>Ethan Carter</Text>
            <Text style={styles.email}>ethan.carter@university.edu</Text>
            <Text style={styles.joinDate}>Member since September 2024</Text>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Activity</Text>
          <View style={styles.statsContainer}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <Text style={styles.statIcon}>{stat.icon}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Interests Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <TouchableOpacity>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.interestsContainer}>
            {interests.map((interest, index) => (
              <View key={index} style={[styles.interestTag, { borderColor: interest.color }]}>
                <Text style={styles.interestIcon}>{interest.icon}</Text>
                <Text style={styles.interestText}>{interest.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Badges Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesScroll}>
            {badges.map((badge) => (
              <View key={badge.id} style={styles.badgeCard}>
                <View style={[styles.badgeIconContainer, { backgroundColor: badge.color }]}>
                  <Text style={styles.badgeIcon}>{badge.icon}</Text>
                </View>
                <Text style={styles.badgeTitle}>{badge.title}</Text>
                <Text style={styles.badgeSubtitle}>{badge.subtitle}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Past Events Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Events</Text>
            <TouchableOpacity onPress={onMyEvents}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {pastEvents.map((event) => (
            <TouchableOpacity key={event.id} style={styles.eventCard}>
              <View style={styles.eventIconContainer}>
                <Text style={styles.eventEmoji}>{event.icon}</Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventLocation}>📍 {event.location}</Text>
                <Text style={styles.eventDate}>📅 {event.date}</Text>
              </View>
              <View style={styles.eventStatus}>
                <Text style={styles.eventStatusText}>Attended</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton} onPress={onCreate}>
              <Text style={styles.actionIcon}>➕</Text>
              <Text style={styles.actionText}>Create Event</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={onMyEvents}>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileSection: {
    marginBottom: 32,
  },
  profileCard: {
    backgroundColor: '#1e2328',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2f36',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4a6741',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#2a2f36',
  },
  avatarEmoji: {
    fontSize: 40,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#27ae60',
    borderWidth: 3,
    borderColor: '#1e2328',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#8e9aaf',
    marginBottom: 8,
  },
  joinDate: {
    fontSize: 14,
    color: '#8e9aaf',
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
  editText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
  },
  seeAllText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#1e2328',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#2a2f36',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8e9aaf',
    textAlign: 'center',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  interestTag: {
    backgroundColor: '#1e2328',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  interestIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  interestText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  badgesScroll: {
    paddingRight: 20,
  },
  badgeCard: {
    backgroundColor: '#1e2328',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: 140,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#2a2f36',
  },
  badgeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeIcon: {
    fontSize: 24,
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeSubtitle: {
    fontSize: 12,
    color: '#8e9aaf',
    textAlign: 'center',
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
  },
  eventIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2a3441',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
  eventLocation: {
    fontSize: 12,
    color: '#8e9aaf',
    marginBottom: 2,
  },
  eventDate: {
    fontSize: 12,
    color: '#8e9aaf',
  },
  eventStatus: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  eventStatusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
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
    fontSize: 14,
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

export default Profile;