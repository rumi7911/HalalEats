import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState, type RefObject } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  ActivityIndicator,
  Keyboard,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { classifyProduct } from "@/lib/halal-classifier";
import { saveScan } from "@/lib/database";
import {
  extractProductDetails,
  fetchProduct,
  findProductByQuery,
  NetworkError,
  OFFProduct,
  ProductNotFoundError,
  ProductSearchNotFoundError,
} from "@/lib/open-food-facts";

const BARCODE_REGEX = /^\d{8,14}$/;
const CAMERA_SURFACE = "#0A0A0A";
const PANEL_SURFACE = "#353536";
const CARD_SURFACE = "#040404";
const SEARCH_BUTTON = "#2B1F18";
const SEARCH_TEXT = "#8E8E93";

interface LiquidSearchBarProps {
  active: boolean;
  canEdit: boolean;
  inputRef?: RefObject<TextInput | null>;
  onChangeText: (value: string) => void;
  onCollapse?: () => void;
  onFocus?: () => void;
  onOpen?: () => void;
  onSubmit: () => void;
  placeholder: string;
  showCollapse?: boolean;
  value: string;
}

function LiquidSearchBar({
  active,
  canEdit,
  inputRef,
  onChangeText,
  onCollapse,
  onFocus,
  onOpen,
  onSubmit,
  placeholder,
  showCollapse = false,
  value,
}: LiquidSearchBarProps) {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: 180 });
  }, [active, progress]);

  const animatedShellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.985 + progress.value * 0.015 }],
    boxShadow: `0 ${10 + progress.value * 6}px ${32 + progress.value * 12}px rgba(0, 0, 0, ${0.16 + progress.value * 0.1})`,
  }));

  return (
    <View style={styles.liquidSearchRow}>
      {showCollapse ? (
        <TouchableOpacity
          accessibilityLabel="Close search"
          activeOpacity={0.85}
          onPress={onCollapse}
          style={styles.liquidCollapse}
        >
          <BlurView
            intensity={30}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />
          <IconSymbol color="#F8EDE8" name="chevron.left" size={24} />
        </TouchableOpacity>
      ) : null}

      <Animated.View
        style={[
          styles.liquidShell,
          active && styles.liquidShellActive,
          animatedShellStyle,
        ]}
      >
        <BlurView
          intensity={active ? 44 : 32}
          style={StyleSheet.absoluteFill}
          tint="light"
        />

        <View style={styles.liquidFilterChip}>
          <BlurView
            intensity={active ? 22 : 14}
            style={StyleSheet.absoluteFill}
            tint="light"
          />
          <Image
            contentFit="contain"
            source={require("../../assets/eats-logo.png")}
            style={styles.liquidFilterLogo}
          />
          <IconSymbol color="#271B14" name="chevron.right" size={16} />
        </View>

        {canEdit ? (
          <TextInput
            ref={inputRef}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={onChangeText}
            onFocus={onFocus}
            onSubmitEditing={onSubmit}
            placeholder={placeholder}
            placeholderTextColor="#8C837C"
            returnKeyType="search"
            style={styles.liquidInput}
            value={value}
          />
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onOpen}
            style={styles.liquidDisplayTrigger}
          >
            <Text
              numberOfLines={1}
              selectable
              style={[
                styles.liquidDisplayText,
                !value && styles.liquidDisplayPlaceholder,
              ]}
            >
              {value || placeholder}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={canEdit ? onSubmit : onOpen}
          style={styles.liquidSearchButton}
        >
          <BlurView
            intensity={22}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />
          <IconSymbol color="#FFFFFF" name="magnifyingglass" size={22} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isTorchEnabled, setIsTorchEnabled] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const lastScannedRef = useRef<string | null>(null);
  const searchInputRef = useRef<TextInput | null>(null);

  const cameraHeight = Math.max(260, Math.min(height * 0.38, width * 0.86));

  async function saveAndOpen(barcode: string, product: OFFProduct) {
    const result = classifyProduct(
      product.ingredients_text ?? "",
      product.ingredients ?? [],
      {
        productName: product.product_name,
        brand: product.brands,
        labels: product.labels,
        labelTags: product.labels_tags,
        categories: product.categories,
        categoryTags: product.categories_tags,
      },
    );

    await saveScan({
      barcode,
      product_name: product.product_name ?? "",
      brand: product.brands ?? "",
      classification: result.status,
      ingredients_text: product.ingredients_text ?? "",
      flagged_ingredients: result.flaggedIngredients,
      evidence: result.evidence,
      product_details: extractProductDetails(product),
      thumbnail_url:
        product.image_front_thumb_url ?? product.image_thumb_url ?? "",
    });

    router.push(`/product/${barcode}`);
  }

  async function handleScannedBarcode(barcode: string) {
    if (!BARCODE_REGEX.test(barcode)) return;
    if (isLoading || lastScannedRef.current === barcode) return;

    lastScannedRef.current = barcode;
    setError(null);
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const product = await fetchProduct(barcode);
      await saveAndOpen(barcode, product);
    } catch (err) {
      if (err instanceof ProductNotFoundError) {
        setError("Product not found. Try another barcode.");
      } else if (err instanceof NetworkError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        lastScannedRef.current = null;
      }, 2000);
    }
  }

  async function handleLookup(rawValue: string) {
    const trimmedValue = rawValue.trim();
    if (!trimmedValue || isLoading) return;

    setError(null);
    setIsLoading(true);
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { barcode, product } = await findProductByQuery(trimmedValue);
      await saveAndOpen(barcode, product);
    } catch (err) {
      if (err instanceof ProductSearchNotFoundError) {
        setError("No products matched that search.");
      } else if (err instanceof ProductNotFoundError) {
        setError("Product not found. Try another barcode or product name.");
      } else if (err instanceof NetworkError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  function enterSearchMode() {
    setIsSearchMode(true);
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }

  function exitSearchMode() {
    Keyboard.dismiss();
    setIsSearchMode(false);
  }

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: PANEL_SURFACE }]} />
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={[
          styles.permissionScreen,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Image
          contentFit="contain"
          source={require("../../assets/eats-logo.png")}
          style={styles.permissionLogo}
        />
        <Text selectable style={styles.permissionTitle}>
          Camera Access Required
        </Text>
        <Text selectable style={styles.permissionMessage}>
          Eats needs camera access to scan product barcodes.
        </Text>

        {permission.canAskAgain ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={requestPermission}
            style={styles.permissionButton}
          >
            <Text style={styles.permissionButtonText}>Allow Camera</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => Linking.openSettings()}
            style={styles.permissionButton}
          >
            <Text style={styles.permissionButtonText}>Open Settings</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (isSearchMode) {
    return (
      <View style={styles.searchModeScreen}>
        <View
          style={[styles.searchModeHeader, { paddingTop: insets.top + 18 }]}
        >
          <LiquidSearchBar
            active
            canEdit
            inputRef={searchInputRef}
            onChangeText={setQuery}
            onCollapse={exitSearchMode}
            onFocus={undefined}
            onSubmit={() => handleLookup(query)}
            placeholder="Search"
            showCollapse
            value={query}
          />
        </View>

        <View style={styles.searchModeBody}>
          <Text selectable style={styles.searchModeHint}>
            Search a product,{"\n"}a brand or a barcode
          </Text>

          {error ? (
            <View style={[styles.errorBanner, styles.searchModeErrorBanner]}>
              <Text selectable style={styles.errorText}>
                {error}
              </Text>
            </View>
          ) : null}
        </View>

        {isLoading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#FFFFFF" size="large" />
            <Text style={styles.loadingText}>Looking up product...</Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.cameraSection,
          { height: cameraHeight + insets.top + 24 },
        ]}
      >
        <CameraView
          barcodeScannerSettings={{
            barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"],
          }}
          enableTorch={isTorchEnabled}
          facing="back"
          onBarcodeScanned={({ data }) => handleScannedBarcode(data)}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.cameraOverlay, { paddingTop: insets.top + 18 }]}>
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />

          <View style={styles.scanTarget}>
            <View style={styles.scanTargetInner}>
              <IconSymbol color="#FFFFFF" name="barcode.viewfinder" size={42} />
            </View>
          </View>

          <TouchableOpacity
            accessibilityLabel={
              isTorchEnabled ? "Turn flashlight off" : "Turn flashlight on"
            }
            activeOpacity={0.85}
            onPress={() => setIsTorchEnabled((value) => !value)}
            style={[
              styles.torchButton,
              isTorchEnabled && styles.torchButtonActive,
            ]}
          >
            <IconSymbol
              color="#FFFFFF"
              name={isTorchEnabled ? "bolt.fill" : "bolt.slash.fill"}
              size={20}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[styles.panelSection, { paddingBottom: insets.bottom + 20 }]}
      >
        <View style={styles.brandCard}>
          <Image
            contentFit="contain"
            source={require("../../assets/eats-logo.png")}
            style={styles.brandLogo}
          />

          <Text selectable style={styles.brandTitle}>
            Eats
          </Text>

          <Text selectable style={styles.brandSubtitle}>
            Scan a barcode or search for a product
          </Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Text selectable style={styles.errorText}>
                {error}
              </Text>
            </View>
          ) : null}

          <LiquidSearchBar
            active={false}
            canEdit={false}
            onChangeText={setQuery}
            onOpen={enterSearchMode}
            onSubmit={() => handleLookup(query)}
            placeholder="Search for a product"
            value={query}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#FFFFFF" size="large" />
          <Text style={styles.loadingText}>Looking up product...</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PANEL_SURFACE,
  },
  searchModeScreen: {
    flex: 1,
    backgroundColor: PANEL_SURFACE,
  },
  searchModeHeader: {
    backgroundColor: "#241B16",
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  searchModeBody: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 30,
  },
  searchModeHint: {
    color: "#F1E5DE",
    fontSize: 22,
    lineHeight: 31,
    fontWeight: "800",
  },
  searchModeErrorBanner: {
    marginTop: 24,
  },
  permissionScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PANEL_SURFACE,
    paddingHorizontal: 24,
    gap: 16,
  },
  permissionLogo: {
    width: 120,
    height: 120,
    borderRadius: 28,
    borderCurve: "continuous",
  },
  permissionTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    textAlign: "center",
  },
  permissionMessage: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },
  permissionButton: {
    marginTop: 8,
    minHeight: 54,
    minWidth: 200,
    borderRadius: 16,
    borderCurve: "continuous",
    backgroundColor: SEARCH_BUTTON,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  cameraSection: {
    backgroundColor: CAMERA_SURFACE,
    overflow: "hidden",
  },
  cameraOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  corner: {
    position: "absolute",
    width: 52,
    height: 52,
    borderColor: "#FFFFFF",
    opacity: 0.96,
  },
  cornerTopLeft: {
    top: 72,
    left: 18,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  cornerTopRight: {
    top: 72,
    right: 18,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  cornerBottomLeft: {
    bottom: 42,
    left: 18,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  cornerBottomRight: {
    bottom: 42,
    right: 18,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  scanTarget: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderCurve: "continuous",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  scanTargetInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  torchButton: {
    position: "absolute",
    right: 22,
    bottom: 54,
    width: 56,
    height: 56,
    borderRadius: 18,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.42)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.36)",
  },
  torchButtonActive: {
    backgroundColor: "rgba(255, 214, 10, 0.26)",
    borderColor: "rgba(255, 214, 10, 0.92)",
  },
  panelSection: {
    flex: 1,
    backgroundColor: PANEL_SURFACE,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  brandCard: {
    flex: 1,
    backgroundColor: CARD_SURFACE,
    borderRadius: 30,
    borderCurve: "continuous",
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: "center",
    gap: 10,
    boxShadow: "0 -8px 24px rgba(0, 0, 0, 0.16)",
  },
  brandLogo: {
    width: 92,
    height: 92,
    borderRadius: 24,
    borderCurve: "continuous",
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  brandSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  errorBanner: {
    width: "100%",
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: "rgba(255, 91, 91, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 91, 91, 0.35)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  errorText: {
    color: "#FFD5D5",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  liquidSearchRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  liquidCollapse: {
    width: 54,
    height: 54,
    overflow: "hidden",
    borderRadius: 27,
    borderCurve: "continuous",
    borderWidth: 1.5,
    borderColor: "rgba(248, 237, 232, 0.78)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  liquidShell: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 28,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    backgroundColor: "rgba(255,255,255,0.24)",
    paddingLeft: 8,
    paddingRight: 8,
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  liquidShellActive: {
    borderColor: "rgba(255,255,255,0.48)",
    backgroundColor: "rgba(255,255,255,0.34)",
  },
  liquidFilterChip: {
    height: 46,
    minWidth: 98,
    overflow: "hidden",
    borderRadius: 23,
    borderCurve: "continuous",
    backgroundColor: "rgba(239, 228, 222, 0.82)",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  liquidFilterLogo: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderCurve: "continuous",
  },
  liquidInput: {
    flex: 1,
    color: "#201915",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "500",
    paddingVertical: 12,
  },
  liquidDisplayTrigger: {
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  liquidDisplayText: {
    color: "#201915",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "500",
  },
  liquidDisplayPlaceholder: {
    color: SEARCH_TEXT,
  },
  liquidSearchButton: {
    width: 48,
    height: 48,
    overflow: "hidden",
    borderRadius: 24,
    borderCurve: "continuous",
    backgroundColor: SEARCH_BUTTON,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
