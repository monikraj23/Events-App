# Even App VIT - React Native Mobile App

A modern React Native mobile application built with Expo for VIT University students to discover and manage events.

## Features

- **Modern UI/UX**: Clean, intuitive interface with Material Design principles
- **Event Discovery**: Browse upcoming events with search functionality
- **User Authentication**: Simple login system with profile management
- **Responsive Design**: Optimized for both Android and iOS devices
- **Navigation**: Bottom tab navigation between Home and Profile screens
- **Event Cards**: Beautiful event display with emojis and detailed information

## Screens

### 1. Login Screen
- Email and password input fields
- Clean, modern design with purple theme
- Simple authentication flow

### 2. Home Screen
- Header with app title and subtitle
- Search bar for filtering events
- Event cards displaying:
  - Event emoji icon
  - Event title
  - Date and location
  - Tap to view details

### 3. Profile Screen
- User profile information
- Profile management options
- Logout functionality

## Tech Stack

- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and tools
- **TypeScript**: Type-safe JavaScript
- **JSX**: React component syntax
- **StyleSheet**: React Native styling system

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo Go app on your mobile device

### Installation

1. Navigate to the project directory:
   ```bash
   cd EvenApp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Scan the QR code with Expo Go app on your mobile device

### Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator (macOS only)
- `npm run web` - Run in web browser

## Project Structure

```
EvenApp/
├── App.tsx              # Main application component
├── package.json         # Dependencies and scripts
├── app.json            # Expo configuration
├── tsconfig.json       # TypeScript configuration
├── assets/             # Images and static files
└── node_modules/       # Installed packages
```

## Customization

### Adding New Events
Edit the `events` array in `App.tsx` to add or modify events:

```typescript
const events = [
  { 
    id: 5, 
    title: 'New Event', 
    date: 'Jan 15, 2025', 
    location: 'New Location', 
    image: '🎉' 
  },
  // ... more events
];
```

### Styling
All styles are defined in the `StyleSheet.create()` object at the bottom of `App.tsx`. You can modify colors, spacing, and layout by editing these styles.

### Adding New Screens
To add new screens:
1. Create a new render function (e.g., `renderNewScreen()`)
2. Add the screen to the `renderContent()` switch statement
3. Add navigation buttons to the bottom navigation

## Development Tips

- Use Expo Go for rapid development and testing
- The app automatically reloads when you save changes
- Use the React Native Debugger for advanced debugging
- Test on both Android and iOS devices for cross-platform compatibility

## Next Steps

Potential enhancements for future versions:
- Backend integration for real event data
- Push notifications for event reminders
- Event registration and RSVP functionality
- Social features and event sharing
- Calendar integration
- Offline support

## Support

For issues or questions:
1. Check the Expo documentation: https://docs.expo.dev/
2. Review React Native documentation: https://reactnative.dev/
3. Check the project's GitHub repository

---

Built with ❤️ for VIT University students
