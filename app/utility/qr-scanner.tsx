import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';

interface QRState {
  history: Array<{ data: string; timestamp: number; type: string }>;
  lastScanned: string;
}

const DEFAULT_STATE: QRState = {
  history: [],
  lastScanned: '',
};

function detectType(data: string): string {
  if (data.startsWith('http://') || data.startsWith('https://')) return 'URL';
  if (data.startsWith('mailto:')) return 'Email';
  if (data.startsWith('tel:')) return 'Phone';
  if (data.startsWith('WIFI:')) return 'WiFi';
  if (data.startsWith('BEGIN:VCARD')) return 'Contact';
  if (/^\+?\d[\d\s\-().]{6,}$/.test(data)) return 'Phone';
  return 'Text';
}

export default function QRScannerScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<QRState>('qrScanner', DEFAULT_STATE);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState(0);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    const now = Date.now();
    if (now - lastScan < 2000) return; // Debounce
    setLastScan(now);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const type = detectType(data);
    setState((p) => ({
      lastScanned: data,
      history: [{ data, timestamp: now, type }, ...p.history].slice(0, 50),
    }));
    setScanning(false);
  };

  const handleCopy = async (data: string) => {
    await Clipboard.setStringAsync(data);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Copied!', 'Text copied to clipboard.');
  };

  const handleOpen = (data: string) => {
    const type = detectType(data);
    if (type === 'URL') {
      Linking.openURL(data);
    } else if (type === 'Email') {
      Linking.openURL(data);
    } else if (type === 'Phone') {
      Linking.openURL(`tel:${data.replace(/\D/g, '')}`);
    }
  };

  if (scanning) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: '#000' }]} edges={['bottom']}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'ean13', 'ean8', 'upc_a'] }}
            onBarcodeScanned={handleBarCodeScanned}
          >
            <View style={styles.scanOverlay}>
              <Pressable
                onPress={() => setScanning(false)}
                style={styles.closeScanBtn}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </Pressable>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.tl]} />
                <View style={[styles.corner, styles.tr]} />
                <View style={[styles.corner, styles.bl]} />
                <View style={[styles.corner, styles.br]} />
              </View>
              <Text style={styles.scanHint}>Align QR code within the frame</Text>
            </View>
          </CameraView>
        ) : (
          <View style={styles.permDenied}>
            <Text style={{ color: '#fff', textAlign: 'center' }}>
              Camera permission required
            </Text>
            <Pressable onPress={requestPermission} style={styles.permBtn}>
              <Text style={{ color: '#0EA5E9', fontWeight: '600' }}>Grant Permission</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="QR Scanner"
        utilityId="qrScanner"
        accentColor="#0EA5E9"
        onClearData={clearState}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Scan Button */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(300)}
          style={styles.scanBtnContainer}
        >
          <Pressable
            onPress={async () => {
              if (!permission?.granted) await requestPermission();
              setScanning(true);
            }}
            style={[styles.bigScanBtn, { backgroundColor: '#0EA5E910', borderColor: '#0EA5E940' }]}
          >
            <View style={[styles.scanIconBg, { backgroundColor: '#0EA5E9' }]}>
              <Ionicons name="qr-code" size={40} color="#fff" />
            </View>
            <Text style={[styles.scanBtnLabel, { color: colors.text }]}>Tap to Scan</Text>
            <Text style={[styles.scanBtnSub, { color: colors.textSecondary }]}>
              QR codes, barcodes & more
            </Text>
          </Pressable>
        </Animated.View>

        {/* Last Scanned */}
        {state.lastScanned ? (
          <Animated.View
            entering={FadeInDown.delay(100).duration(300)}
            style={[styles.lastCard, { backgroundColor: colors.surface, borderColor: '#0EA5E940' }]}
          >
            <View style={styles.lastHeader}>
              <Text style={[styles.lastTitle, { color: '#0EA5E9' }]}>Last Scanned</Text>
              <Text style={[styles.lastType, { color: colors.textSecondary, backgroundColor: colors.muted }]}>
                {detectType(state.lastScanned)}
              </Text>
            </View>
            <Text style={[styles.lastData, { color: colors.text }]} numberOfLines={3}>
              {state.lastScanned}
            </Text>
            <View style={styles.lastActions}>
              <Pressable
                onPress={() => handleCopy(state.lastScanned)}
                style={[styles.actionBtn, { backgroundColor: colors.muted }]}
              >
                <Ionicons name="copy-outline" size={16} color={colors.text} />
                <Text style={[styles.actionBtnText, { color: colors.text }]}>Copy</Text>
              </Pressable>
              {['URL', 'Email', 'Phone'].includes(detectType(state.lastScanned)) && (
                <Pressable
                  onPress={() => handleOpen(state.lastScanned)}
                  style={[styles.actionBtn, { backgroundColor: '#0EA5E920' }]}
                >
                  <Ionicons name="open-outline" size={16} color="#0EA5E9" />
                  <Text style={[styles.actionBtnText, { color: '#0EA5E9' }]}>Open</Text>
                </Pressable>
              )}
            </View>
          </Animated.View>
        ) : null}

        {/* History */}
        {state.history.length > 0 && (
          <Animated.View entering={FadeInDown.delay(150).duration(300)}>
            <Text style={[styles.histTitle, { color: colors.textSecondary }]}>SCAN HISTORY</Text>
            {state.history.slice(0, 10).map((item, i) => (
              <Pressable
                key={i}
                onPress={() => handleCopy(item.data)}
                style={[styles.histRow, { borderBottomColor: colors.border }]}
              >
                <View style={[styles.histIcon, { backgroundColor: '#0EA5E920' }]}>
                  <Ionicons
                    name={
                      item.type === 'URL' ? 'link' :
                      item.type === 'Phone' ? 'call' :
                      item.type === 'Email' ? 'mail' : 'text'
                    }
                    size={14}
                    color="#0EA5E9"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.histData, { color: colors.text }]} numberOfLines={1}>
                    {item.data}
                  </Text>
                  <Text style={[styles.histTime, { color: colors.textTertiary }]}>
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
                <Ionicons name="copy-outline" size={14} color={colors.textTertiary} />
              </Pressable>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.base, gap: spacing.base, paddingBottom: 40 },
  scanBtnContainer: { alignItems: 'center' },
  bigScanBtn: {
    width: '100%',
    borderRadius: radius['2xl'],
    borderWidth: 2,
    paddingVertical: spacing['3xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  scanIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  scanBtnLabel: { fontSize: typography.sizes.xl, fontWeight: '700' },
  scanBtnSub: { fontSize: typography.sizes.sm },
  // Scanner overlay
  scanOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeScanBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 240,
    height: 240,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#0EA5E9',
  },
  tl: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  tr: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  bl: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  br: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  scanHint: {
    color: '#fff',
    marginTop: 24,
    fontSize: 14,
    fontWeight: '500',
  },
  permDenied: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  permBtn: { padding: 12 },
  // Cards
  lastCard: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.base, gap: spacing.sm },
  lastHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastTitle: { fontSize: typography.sizes.sm, fontWeight: '700', letterSpacing: 0.5 },
  lastType: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  lastData: { fontSize: typography.sizes.base, lineHeight: 22 },
  lastActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  histTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: spacing.xs },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  histIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  histData: { fontSize: 14, fontWeight: '500' },
  histTime: { fontSize: 11 },
});
