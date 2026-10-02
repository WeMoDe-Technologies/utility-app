import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Kit',
  slug: 'tool-r',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#EDEAE1',
  },
  plugins: [
    'expo-router',
    'expo-font',
    ["expo-av", { "microphonePermission": "Kit uses the microphone to estimate ambient noise levels. No audio is recorded or uploaded." }],
    ["expo-location", { "locationWhenInUsePermission": "Kit uses your location for the compass heading and coordinates. It stays on your device." }],
    'expo-camera',
    [
      'expo-barcode-scanner',
      {
        cameraPermission: 'Allow Kit to access the camera to scan QR codes and barcodes.',
      },
    ],
  ],
  scheme: 'utilitykit',
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#EDEAE1',
    },
    package: 'com.utilitykit.app',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.utilitykit.app',
    infoPlist: {
      NSCameraUsageDescription: 'Kit uses the camera to scan QR codes and barcodes. Nothing is recorded or uploaded.',
    },
  },
  extra: {
    "eas": {
        "projectId": "37e22009-6961-4bc8-a23c-1d55a4f51965"
      }
  },
});
