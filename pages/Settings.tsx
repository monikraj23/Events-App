import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

interface SettingsProps {
  onBack: () => void;
  onHome: () => void;
  onExplore: () => void;
  onCreate: () => void;
  onMyEvents: () => void;
  onProfile: () => void;
  onEditInterests: () => void;
  onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({
  onBack,
  onHome,
  onExplore,
  onCreate,
  onMyEvents,
  onProfile,
  onEditInterests,
  onLogout,
}) => {
  const [eventNotifications, setEventNotifications] = useState(true);
  const [weatherAlerts, setWeatherAlerts] = useState(true);
  const [locationTracking, setLocationTracking] = useState(true);

  const handleToggle = (setting: string, value: boolean) => {
    switch (setting) {
      case 'eventNotifications':
        setEventNotifications(value);
        break;
      case 'weatherAlerts':
        setWeatherAlerts(value);
        break;
      case 'locationTracking':
        setLocationTracking(value);
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Event Notifications</Text>
              <Text style={styles.settingSubtitle}>
                Get notified about new events and updates
              </Text>
            </View>
            <Switch
              value={eventNotifications}
              onValueChange={(value) => handleToggle('eventNotifications', value)}
              trackColor={{ false: '#4a5568', true: '#3498db' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Weather Alerts</Text>
              <Text style={styles.settingSubtitle}>
                Receive alerts for weather changes that may affect outdoor events
              </Text>
            </View>
            <Switch
              value={weatherAlerts}
              onValueChange={(value) => handleToggle('weatherAlerts', value)}
              trackColor={{ false: '#4a5568', true: '#3498db' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Location Tracking</Text>
              <Text style={styles.settingSubtitle}>
                Allow the app to track your location for personalized event recommendations
              </Text>
            </View>
            <Switch
              value={locationTracking}
              onValueChange={(value) => handleToggle('locationTracking', value)}
              trackColor={{ false: '#4a5568', true: '#3498db' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={onEditInterests}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Edit Interests</Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={[styles.navButton, true && styles.activeNavButton]}
          onPress={onHome}
        >
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={[styles.navLabel, true && styles.activeNavLabel]}>Home</Text>
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
          style={[styles.navButton, false && styles.activeNavButton]}
          onPress={onMyEvents}
        >
          <Text style={styles.navIcon}>📅</Text>
          <Text style={styles.navLabel}>My Events</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#34495e',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 5,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#bdc3c7',
    lineHeight: 20,
  },
  arrowIcon: {
    fontSize: 20,
    color: '#ffffff',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: '#2c3e50',
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
});

export default Settings;
