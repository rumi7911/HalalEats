import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
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
          <View style={styles.searchModeBarRow}>
            <TouchableOpacity
              accessibilityLabel="Close search"
              activeOpacity={0.85}
              onPress={exitSearchMode}
              style={styles.searchModeCollapse}
            >
              <IconSymbol
                color="#F8EDE8"
                name="chevron.left"
                size={26}
                style={styles.searchModeCollapseIcon}
              />
            </TouchableOpacity>

            <View style={styles.searchModeShell}>
              <View style={styles.searchModeFilter}>
                <Image
                  contentFit="contain"
                  source={require("../../assets/eats-logo.png")}
                  style={styles.searchModeFilterLogo}
                />
                <IconSymbol
                  color="#271B14"
                  name="chevron.right"
                  size={18}
                  style={styles.searchModeFilterChevron}
                />
              </View>

              <TextInput
                ref={searchInputRef}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setQuery}
                onSubmitEditing={() => handleLookup(query)}
                placeholder="Search"
                placeholderTextColor="#958983"
                returnKeyType="search"
                style={styles.searchModeInput}
                value={query}
              />

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isLoading}
                onPress={() => handleLookup(query)}
                style={styles.searchModeButton}
              >
                <IconSymbol color="#FFFFFF" name="magnifyingglass" size={24} />
              </TouchableOpacity>
            </View>
          </View>
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

          <View style={styles.searchShell}>
            <TextInput
              ref={searchInputRef}
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setQuery}
              onFocus={enterSearchMode}
              onSubmitEditing={() => handleLookup(query)}
              placeholder="Search for a product"
              placeholderTextColor={SEARCH_TEXT}
              returnKeyType="search"
              style={styles.searchInput}
              value={query}
            />

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isLoading}
              onPress={() => handleLookup(query)}
              style={styles.searchButton}
            >
              <IconSymbol color="#FFFFFF" name="magnifyingglass" size={22} />
            </TouchableOpacity>
          </View>
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
  searchModeBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchModeCollapse: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderCurve: "continuous",
    borderWidth: 2,
    borderColor: "#F8EDE8",
    alignItems: "center",
    justifyContent: "center",
  },
  searchModeCollapseIcon: {
    transform: [{ rotate: "-90deg" }],
  },
  searchModeShell: {
    flex: 1,
    minHeight: 60,
    borderRadius: 30,
    borderCurve: "continuous",
    backgroundColor: "#F7F4F2",
    paddingLeft: 8,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchModeFilter: {
    height: 48,
    minWidth: 96,
    borderRadius: 24,
    borderCurve: "continuous",
    backgroundColor: "#EFE4DE",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  searchModeFilterLogo: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderCurve: "continuous",
  },
  searchModeFilterChevron: {
    transform: [{ rotate: "90deg" }],
  },
  searchModeInput: {
    flex: 1,
    color: "#201915",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "500",
    paddingVertical: 12,
  },
  searchModeButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderCurve: "continuous",
    backgroundColor: SEARCH_BUTTON,
    alignItems: "center",
    justifyContent: "center",
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
  searchShell: {
    width: "100%",
    marginTop: 6,
    backgroundColor: "#F4F4F5",
    borderRadius: 24,
    borderCurve: "continuous",
    paddingLeft: 16,
    paddingRight: 8,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: "#1C1C1E",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "500",
    paddingVertical: 12,
  },
  searchButton: {
    width: 48,
    height: 48,
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
