import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Image,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface GetStartedProps {
  onGetStarted: () => void;
}

const GetStarted: React.FC<GetStartedProps> = ({ onGetStarted }) => {
  const handleGetStarted = () => onGetStarted();

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Section - Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/vit-logo-new.png')} // <-- your logo
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Middle Section - Text */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>CampusBuzz</Text>
        <Text style={styles.subtitle}>
          Discover events around your university
        </Text>
      </View>

      {/* Bottom Section - Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleGetStarted}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Screen
  container: {
    flex: 1,
    backgroundColor: '#1a2332', // Dark navy blue
  },

  // Logo block
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
    marginBottom: -70,
  },
  logo: {
    width: width * 0.6,
    height: height * 0.18,
  },

  // Text
  textContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.9,
  },

  // CTA
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  button: {
    backgroundColor: '#3498db',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default GetStarted;
