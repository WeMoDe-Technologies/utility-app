import React, { useCallback, useRef, useState } from 'react';
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

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { Notice, useHaptic, toast } from '@/components/ui';
import { spacing, radius, typography, border } from '@/theme';

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
  const haptic = useHaptic();
  // A ref, not state: the camera fires the callback many times per second and
  // a state update wouldn't land before the next frame's check.
  const lastScanRef = useRef(0);

  const handleBarCodeScanned = useCallback(
    ({ data }: { data: string }) => {
      const now = Date.now();
      if (!data || now - lastScanRef.current < 1500) return;
      lastScanRef.current = now;
      haptic('success');
      const type = detectType(data);
      setState((p) => ({
        lastScanned: data,
        // Don't stack duplicates of the same code back to back
        history: [{ data, timestamp: now, type }, ...p.history.filter((h) => h.data !== data)].slice(0, 50),
      }));
      setScanning(false);
      toast(`${type} scanned`);
    },
    [setState, haptic],
  );

  const handleCopy = useCallback(
    async (data: string) => {
      await Clipboard.setStringAsync(data);
      haptic('success');
      toast('Copied to clipboard');
    },
    [haptic],
  );

  /**
   * Opening a scanned link sends the user somewhere a stranger's QR code chose,
   * so it always asks first and shows the destination in full.
   */
  const handleOpen = useCallback((data: string) => {
    const type = detectType(data);
    const url =
      type === 'Phone' && !data.startsWith('tel:')
        ? `tel:${data.replace(/[^\d+]/g, '')}`
        : data;

    Alert.alert(
      `Open this ${type.toLowerCase()}?`,
      url,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open',
          onPress: async () => {
            try {
              const supported = await Linking.canOpenURL(url);
              if (!supported) {
                toast("This device can't open that link", 'error');
                return;
              }
              await Linking.openURL(url);
            } catch {
              toast("Couldn't open that link", 'error');
            }
          },
        },
      ],
    );
  }, []);

  const startScanning = useCallback(async () => {
    haptic('light');
    if (!permission?.granted) {
      const result = await requestPermission();
      // Don't drop the user onto a black camera view they can't use
      if (!result.granted) {
        toast('Camera access is needed to scan', 'error');
        return;
      }
    }
    lastScanRef.current = 0;
    setScanning(true);
  }, [permission?.granted, requestPermission, haptic]);

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
            <Ionicons name="camera-outline" size={40} color="#fff" />
            <Text style={styles.permTitle}>Camera access needed</Text>
            <Text style={styles.permBody}>
              {permission?.canAskAgain === false
                ? 'Enable camera access for Kit in your device settings, then come back.'
                : 'Kit uses the camera only to read codes. Nothing is uploaded or stored.'}
            </Text>
            {permission?.canAskAgain === false ? (
              <Pressable onPress={() => Linking.openSettings()} style={styles.permBtn}>
                <Text style={styles.permBtnTxt}>Open settings</Text>
              </Pressable>
            ) : (
              <Pressable onPress={requestPermission} style={styles.permBtn}>
                <Text style={styles.permBtnTxt}>Grant permission</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setScanning(false)} style={styles.permBtn}>
              <Text style={[styles.permBtnTxt, { color: '#8A8377' }]}>Go back</Text>
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
        accentColor="#27566B"
        onClearData={clearState}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Scan Button */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(300)}
          style={styles.scanBtnContainer}
        >
          <Pressable
            onPress={startScanning}
            accessibilityRole="button"
            accessibilityLabel="Scan a QR code or barcode"
            style={[styles.bigScanBtn, { backgroundColor: '#27566B10', borderColor: '#27566B40' }]}
          >
            <View style={[styles.scanIconBg, { backgroundColor: '#27566B' }]}>
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
            style={[styles.lastCard, { backgroundColor: colors.surface, borderColor: '#27566B40' }]}
          >
            <View style={styles.lastHeader}>
              <Text style={[styles.lastTitle, { color: '#27566B' }]}>Last Scanned</Text>
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
                  style={[styles.actionBtn, { backgroundColor: '#27566B20' }]}
                >
                  <Ionicons name="open-outline" size={16} color="#27566B" />
                  <Text style={[styles.actionBtnText, { color: '#27566B' }]}>Open</Text>
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
                <View style={[styles.histIcon, { backgroundColor: '#27566B20' }]}>
                  <Ionicons
                    name={
                      item.type === 'URL' ? 'link' :
                      item.type === 'Phone' ? 'call' :
                      item.type === 'Email' ? 'mail' : 'text'
                    }
                    size={14}
                    color="#27566B"
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
    borderColor: '#27566B',
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
  permDenied: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  permTitle: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  permBody: { color: '#D3CEC1', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  permBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  permBtnTxt: { color: '#27566B', fontWeight: '700', fontSize: 15 },
  // Cards
  lastCard: { borderRadius: radius.xl, borderWidth: border.base, padding: spacing.base, gap: spacing.sm },
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
    borderRadius: radius.sm,
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
