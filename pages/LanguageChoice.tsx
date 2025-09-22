import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';

interface Interest {
  id: string;
  label: string;
}

interface LanguageChoiceProps {
  onNext: () => void;
  onSkip: () => void;
}

const LanguageChoice: React.FC<LanguageChoiceProps> = ({ onNext, onSkip }) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const interests: Interest[] = [
    { id: '1', label: 'Music' },
    { id: '2', label: 'Tech' },
    { id: '3', label: 'Sports' },
    { id: '4', label: 'Career' },
    { id: '5', label: 'Arts' },
    { id: '6', label: 'Food' },
    { id: '7', label: 'Gaming' },
    { id: '8', label: 'Social' },
    { id: '9', label: 'Academic' },
    { id: '10', label: 'Volunteer' },
    { id: '11', label: 'Travel' },
    { id: '12', label: 'Fitness' },
  ];

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev => {
      if (prev.includes(interestId)) {
        return prev.filter(id => id !== interestId);
      } else {
        return [...prev, interestId];
      }
    });
  };

  const handleNext = () => {
    if (selectedInterests.length >= 3) {
      // Navigation logic will go here
      console.log('Next pressed with interests:', selectedInterests);
      onNext();
    }
  };

  const handleSkip = () => {
    // Skip logic will go here
    console.log('Skip pressed');
    onSkip();
  };

  const canProceed = selectedInterests.length >= 3;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>What are you interested in?</Text>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.subtitle}>
        Select at least 3 interests to personalize your feed
      </Text>

      {/* Interest Selection Area */}
      <ScrollView style={styles.interestsContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.interestsGrid}>
          {interests.map((interest) => (
            <TouchableOpacity
              key={interest.id}
              style={[
                styles.interestButton,
                selectedInterests.includes(interest.id) && styles.selectedInterest,
              ]}
              onPress={() => toggleInterest(interest.id)}
            >
              <Text style={[
                styles.interestText,
                selectedInterests.includes(interest.id) && styles.selectedInterestText,
              ]}>
                {interest.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Action Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            !canProceed && styles.disabledButton,
          ]}
          onPress={handleNext}
          disabled={!canProceed}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2332', // Dark blue/black background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  skipText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
    lineHeight: 22,
  },
  interestsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  interestButton: {
    backgroundColor: '#34495e', // Dark grey
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 15,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedInterest: {
    backgroundColor: '#3498db', // Bright blue when selected
    borderColor: '#3498db',
  },
  interestText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedInterestText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  nextButton: {
    backgroundColor: '#3498db',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#7f8c8d',
    opacity: 0.6,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default LanguageChoice;
