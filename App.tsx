// App.tsx
import Constants from 'expo-constants';
console.log('SB URL =>', Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL);
console.log('SB KEY present =>', !!Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY);

import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native';

// NOTE: keep your pages barrel import if you already have one.
// We'll import them and then cast to `any` to avoid prop-type mismatch errors
// while you finish wiring up all prop interfaces.
import * as Pages from './pages';

// cast to any to silence TypeScript prop complaints for now.
// Later: replace `any` with proper component prop types.
const GetStarted: any = (Pages as any).GetStarted;
const LanguageChoice: any = (Pages as any).LanguageChoice;
const Login: any = (Pages as any).Login;
const HomeUser: any = (Pages as any).HomeUser;
const Signup: any = (Pages as any).Signup;
const EventDetails: any = (Pages as any).EventDetails;
const Explore: any = (Pages as any).Explore;
const MyEvents: any = (Pages as any).MyEvents;
const CreateEvent: any = (Pages as any).CreateEvent;
const Settings: any = (Pages as any).Settings;
const Profile: any = (Pages as any).Profile;
const RedditTrending: any = (Pages as any).RedditTrending;

export type PageKey =
  | 'getStarted'
  | 'languageChoice'
  | 'login'
  | 'homeUser'
  | 'signup'
  | 'eventDetails'
  | 'explore'
  | 'myEvents'
  | 'createEvent'
  | 'settings'
  | 'profile'
  | 'redditTrending';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('getStarted');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // helper to change current page
  const go = (p: PageKey) => setCurrentPage(p);

  const handleGetStarted = () => go('languageChoice');
  const handleLanguageChoiceNext = () => go('login');
  const handleLanguageChoiceSkip = () => go('login');

  // login/signup handlers (simple navigation for now)
  const handleLogin = () => go('homeUser');
  const handleLoginToSignup = () => go('signup');
  const handleSignup = () => go('homeUser');
  const handleSignupToLogin = () => go('login');

  const handleSettings = () => go('settings');
  const handleHome = () => go('homeUser');
  const handleExplore = () => go('explore');
  const handleCreate = () => go('createEvent');
  const handleMyEvents = () => go('myEvents');
  const handleProfile = () => go('profile');
  const handleRedditTrending = () => go('redditTrending');
  const handleTalk = () => go('redditTrending');

  // keep track of selected event and navigate to details
  // HomeUser will call onEventClick(eventId: string)
  const handleEventClick = (eventId?: string) => {
    if (eventId) setSelectedEventId(eventId);
    go('eventDetails');
  };

  const handleBackFromEventDetails = () => go('homeUser');
  const handleBackFromMyEvents = () => go('homeUser');
  const handleCloseCreateEvent = () => go('homeUser');
  const handleBackFromSettings = () => go('homeUser');
  const handleEditInterests = () => go('languageChoice');
  const handleLogout = () => go('getStarted');

  // admin create callback (CreateEvent will call this after successful insert)
  const handleCreateEvent = (row: any) => {
    console.log('Event created:', row?.id, row?.title);
    setCurrentPage('homeUser');
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'getStarted':
        return <GetStarted onGetStarted={handleGetStarted} />;

      case 'languageChoice':
        return (
          <LanguageChoice
            onNext={handleLanguageChoiceNext}
            onSkip={handleLanguageChoiceSkip}
          />
        );

      case 'login':
        // Login component expects the following props:
        // onLogin, onForgotPassword, onSSO, onGoogle, onRegister
        // we pass simple handlers. If Login has a different signature,
        // update props on the Login component itself.
        return (
          <Login
            onLogin={handleLogin}
            onForgotPassword={() => {}}
            onSSO={() => {}}
            onGoogle={() => {}}
            onRegister={handleLoginToSignup}
          />
        );

      case 'signup':
        // Signup expects: onRegister, onSSO, onGoogle, onLogin
        return (
          <Signup
            onRegister={handleSignup}
            onSSO={() => {}}
            onGoogle={() => {}}
            onLogin={handleSignupToLogin}
          />
        );

      case 'homeUser':
        // HomeUser expects navigation callbacks plus onEventClick(eventId)
        return (
          <HomeUser
            onSettings={handleSettings}
            onHome={handleHome}
            onExplore={handleExplore}
            onCreate={handleCreate}
            onMyEvents={handleMyEvents}
            onProfile={handleProfile}
            onEventClick={handleEventClick}
          />
        );

      case 'eventDetails':
        // EventDetails expects eventId prop along with navigation callbacks
        return (
          <EventDetails
            eventId={selectedEventId}
            onBack={handleBackFromEventDetails}
            onRSVP={() => {}}
            onHome={handleHome}
            onExplore={handleExplore}
            onCreate={handleCreate}
            onMyEvents={handleMyEvents}
            onProfile={handleProfile}
            onTalk={handleTalk}
          />
        );

      case 'explore':
        return (
          <Explore
            onMenu={() => {}}
            onHome={handleHome}
            onExplore={handleExplore}
            onCreate={handleCreate}
            onMyEvents={handleMyEvents}
            onProfile={handleProfile}
            onLocation={() => {}}
          />
        );

      case 'myEvents':
        return (
          <MyEvents
            onBack={handleBackFromMyEvents}
            onHome={handleHome}
            onExplore={handleExplore}
            onCreate={handleCreate}
            onMyEvents={handleMyEvents}
            onProfile={handleProfile}
            onCancelEvent={() => {}}
          />
        );

      case 'createEvent':
        return (
          <CreateEvent
            onClose={handleCloseCreateEvent}
            onHome={handleHome}
            onExplore={handleExplore}
            onCreate={handleCreate}
            onMyEvents={handleMyEvents}
            onProfile={handleProfile}
            onCreateEvent={handleCreateEvent}
          />
        );

      case 'settings':
        return (
          <Settings
            onBack={handleBackFromSettings}
            onHome={handleHome}
            onExplore={handleExplore}
            onCreate={handleCreate}
            onMyEvents={handleMyEvents}
            onProfile={handleProfile}
            onEditInterests={handleEditInterests}
            onLogout={handleLogout}
          />
        );

      case 'profile':
        return (
          <Profile
            onHome={handleHome}
            onExplore={handleExplore}
            onCreate={handleCreate}
            onMyEvents={handleMyEvents}
            onProfile={handleProfile}
            onSettings={handleSettings}
          />
        );

      case 'redditTrending':
        return (
          <RedditTrending
            onHome={handleHome}
            onExplore={handleExplore}
            onCreate={handleCreate}
            onMyEvents={handleMyEvents}
            onProfile={handleProfile}
          />
        );

      default:
        return <GetStarted onGetStarted={handleGetStarted} />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar style="light" />
      {renderCurrentPage()}
    </SafeAreaView>
  );
}
