import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'UtilityKit',
  slug: 'utility-kit',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0A0A0F',
  },
  plugins: [
    'expo-router',
    'expo-font',
    ["expo-location", { "locationWhenInUsePermission": "Used to display your GPS coordinates." }],
    'expo-camera',
    [
      'expo-barcode-scanner',
      {
        cameraPermission: 'Allow UtilityKit to access camera for QR scanning.',
      },
    ],
  ],
  scheme: 'utilitykit',
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0A0A0F',
    },
    package: 'com.utilitykit.app',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.utilitykit.app',
    infoPlist: {
      NSCameraUsageDescription: 'Camera is used for QR code scanning.',
    },
  },
  extra: {
    eas: {
      projectId: 'your-project-id',
    },
  },
});
