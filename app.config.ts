import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ToolR',
  slug: 'tool-r',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'cover',
    backgroundColor: '#0A0A0F',
  },
  plugins: [
    'expo-router',
    'expo-font',
    ["expo-av", { "microphonePermission": "Used to measure ambient noise levels." }],
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
    "eas": {
        "projectId": "37e22009-6961-4bc8-a23c-1d55a4f51965"
      }
  },
});
