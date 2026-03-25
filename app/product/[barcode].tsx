import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { StatusColors } from "@/constants/theme";
import {
  analyzeIngredients,
  ClassificationEvidence,
  ClassificationStatus,
  IngredientAnalysis,
} from "@/lib/halal-classifier";
import { getScanByBarcode, ScanRecord } from "@/lib/database";
import { StoredProductDetails } from "@/lib/open-food-facts";

const SCREEN_COLORS = {
  surface: "#09090B",
  panel: "#121215",
  panelStrong: "#18181B",
  line: "#1D1D23",
  text: "#FAFAFA",
  muted: "#A1A1AA",
  dim: "#71717A",
};

const STATUS_LABELS: Record<ClassificationStatus, string> = {
  halal: "HALAL",
  haram: "HARAM",
  mashbooh: "MASHBOOH",
};

const STATUS_HEADER_TITLES: Record<ClassificationStatus, string> = {
  halal: "Verdict Details",
  haram: "Result",
  mashbooh: "Result",
};

const STATUS_ICONS = {
  halal: "checkmark.seal.fill",
  haram: "xmark.seal.fill",
  mashbooh: "exclamationmark.triangle.fill",
} as const;

const STATUS_NOTES: Record<
  ClassificationStatus,
  { title: string; body: string }
> = {
  halal: {
    title: "Assessment",
    body: "No flagged keywords matched in the ingredient list saved with this scan.",
  },
  haram: {
    title: "Consumption Notice",
    body: "This product contains ingredients derived from prohibited animal sources. Consumption is strictly advised against.",
  },
  mashbooh: {
    title: "Warning",
    body: "Contains ingredients of unknown origin. Plant or animal source remains unverified. Proceed with caution or personal judgment.",
  },
};

type ChipTone =
  | "safe"
  | "warning-solid"
  | "warning-outline"
  | "danger"
  | "neutral";

interface ChipItem {
  label: string;
  tone: ChipTone;
}

export default function ProductDetailScreen() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const insets = useSafeAreaInsets();

  const [record, setRecord] = useState<ScanRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!barcode) return;
    getScanByBarcode(barcode).then((result) => {
      setRecord(result);
      setIsLoading(false);
    });
  }, [barcode]);

  if (isLoading) {
    return (
      <View style={styles.centeredState}>
        <Stack.Screen options={{ title: "", headerShown: false }} />
        <ActivityIndicator size="large" color={StatusColors.halal.background} />
      </View>
    );
  }

  if (!record) {
    return (
      <View style={styles.centeredState}>
        <Stack.Screen options={{ title: "Not Found" }} />
        <Text selectable style={styles.centeredMessage}>
          Product record not found.
        </Text>
      </View>
    );
  }

  const recordData = record;
  const statusPalette = StatusColors[recordData.classification];
  const analysis = analyzeIngredients(recordData.ingredients_text);
  const evidence = parseEvidence(recordData.evidence_json);
  const productDetails = parseProductDetails(recordData.product_details_json);
  const primaryEvidence = evidence[0] ?? null;
  const statusNote = getStatusNote(recordData.classification, primaryEvidence);
  const relativeScanTime = formatRelativeScanTime(recordData.scanned_at);
  const bottomInset =
    insets.bottom + (recordData.classification === "halal" ? 120 : 128);

  const safeIngredients = limitIngredients(
    analysis.safeIngredients,
    recordData.classification === "halal" ? 10 : 6,
  );
  const mashboohIngredients = limitIngredients(analysis.mashboohIngredients, 6);
  const haramIngredients = limitIngredients(analysis.haramIngredients, 6);
  const haramFullList = [
    ...mashboohIngredients.map((label) => ({
      label,
      tone: "warning-outline" as const,
    })),
    ...safeIngredients.map((label) => ({ label, tone: "safe" as const })),
  ];
  const productFactRows = [
    { label: "Generic Name", value: productDetails.genericName },
    { label: "Quantity", value: productDetails.quantity },
    { label: "Serving Size", value: productDetails.servingSize },
    {
      label: "Nutri-Score",
      value: productDetails.nutriScore
        ? `Grade ${productDetails.nutriScore}`
        : "",
    },
    {
      label: "NOVA Group",
      value: productDetails.novaGroup
        ? `Group ${productDetails.novaGroup}`
        : "",
    },
    { label: "Origins", value: joinDisplayValues(productDetails.origins) },
    {
      label: "Made In",
      value: joinDisplayValues(productDetails.countries),
    },
    {
      label: "Manufacturing Places",
      value: joinDisplayValues(productDetails.manufacturingPlaces),
    },
    { label: "Sold At", value: joinDisplayValues(productDetails.stores) },
    {
      label: "EC / Emb Codes",
      value: joinDisplayValues(productDetails.embCodes),
    },
  ].filter((row) => Boolean(row.value));

  async function handleShareReport() {
    await Share.share({
      message: buildShareMessage(recordData, analysis),
    });
  }

  async function handleFindAlternatives() {
    const query = encodeURIComponent(
      `halal alternative to ${recordData.product_name || recordData.brand || "this product"}`,
    );
    await WebBrowser.openBrowserAsync(
      `https://www.google.com/search?q=${query}`,
    );
  }

  async function handleOpenOffProduct() {
    const offUrl =
      productDetails.url ||
      `https://world.openfoodfacts.org/product/${recordData.barcode}`;
    await WebBrowser.openBrowserAsync(offUrl);
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: false,
          title: recordData.product_name || "Product",
        }}
      />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <IconSymbol
            name="chevron.left"
            size={20}
            color={SCREEN_COLORS.text}
          />
        </TouchableOpacity>

        <Text selectable style={styles.headerTitle}>
          {STATUS_HEADER_TITLES[recordData.classification]}
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomInset },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scrollView}
      >
        <View
          style={[
            styles.banner,
            {
              backgroundColor: statusPalette.background,
              boxShadow:
                recordData.classification === "haram"
                  ? "0 8px 32px rgba(255, 61, 0, 0.28)"
                  : undefined,
            },
          ]}
        >
          <Text
            selectable
            style={[styles.bannerTitle, { color: statusPalette.text }]}
          >
            {STATUS_LABELS[recordData.classification]}
          </Text>

          <IconSymbol
            color={statusPalette.text}
            name={STATUS_ICONS[recordData.classification]}
            size={38}
          />
        </View>

        <View style={styles.productSection}>
          <View style={styles.productRow}>
            {recordData.thumbnail_url ? (
              <Image
                contentFit="contain"
                source={{ uri: recordData.thumbnail_url }}
                style={styles.thumbnail}
              />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Text style={styles.thumbnailPlaceholderText}>?</Text>
              </View>
            )}

            <View style={styles.productInfo}>
              <Text numberOfLines={3} selectable style={styles.productName}>
                {recordData.product_name || "Unknown Product"}
              </Text>

              <Text numberOfLines={1} selectable style={styles.productBrand}>
                {recordData.brand || "Brand unavailable"}
              </Text>

              <View style={styles.scanMeta}>
                <IconSymbol
                  color={statusPalette.background}
                  name="checkmark.circle"
                  size={12}
                />
                <Text selectable style={styles.scanMetaText}>
                  Scanned {relativeScanTime}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {primaryEvidence ? (
          <MessageCard accentColor={statusPalette.border}>
            <Text selectable style={styles.cardEyebrow}>
              Why This Verdict
            </Text>
            <Text selectable style={styles.cardBody}>
              {formatEvidenceExplanation(primaryEvidence)}
            </Text>
          </MessageCard>
        ) : null}

        {hasProductDetails(productDetails) ? (
          <>
            <SectionHeading title="Product Facts" />
            {productFactRows.length ? (
              <FactsCard rows={productFactRows} />
            ) : null}

            {productDetails.categories.length ? (
              <DetailChipSection
                title="Categories"
                values={productDetails.categories}
              />
            ) : null}

            {productDetails.labels.length ? (
              <DetailChipSection
                title="Labels"
                values={productDetails.labels}
              />
            ) : null}

            {productDetails.packaging.length ? (
              <DetailChipSection
                title="Packaging"
                values={productDetails.packaging}
              />
            ) : null}

            {productDetails.additives.length ? (
              <DetailChipSection
                title="Additives"
                values={productDetails.additives}
              />
            ) : null}

            {productDetails.traces.length ? (
              <DetailChipSection
                title="Traces"
                values={productDetails.traces}
              />
            ) : null}

            {hasNutritionDetails(productDetails) ? (
              <>
                <SectionHeading title="Nutrition Per 100g/ml" />
                <NutritionGrid details={productDetails} />
              </>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleOpenOffProduct}
              style={styles.offAction}
            >
              <IconSymbol
                color={SCREEN_COLORS.text}
                name="arrow.up.right"
                size={18}
              />
              <Text selectable style={styles.offActionText}>
                View Full Open Food Facts Entry
              </Text>
            </TouchableOpacity>
          </>
        ) : null}

        {recordData.classification === "mashbooh" ? (
          <MessageCard accentColor={statusPalette.border} tone="warning">
            <Text
              selectable
              style={[styles.messageTitle, { color: statusPalette.background }]}
            >
              {statusNote.title}:
            </Text>
            <Text selectable style={styles.messageText}>
              {statusNote.body}
            </Text>
          </MessageCard>
        ) : null}

        {recordData.classification === "halal" ? (
          <>
            <SectionHeading
              accentColor={statusPalette.border}
              title="Ingredient Analysis"
              variant="accent"
            />
            <IngredientWrap
              items={safeIngredients.map((label) => ({
                label,
                tone: "safe" as const,
              }))}
              emptyLabel="No ingredient list was saved for this scan."
            />

            <MessageCard accentColor={statusPalette.border}>
              <Text selectable style={styles.cardEyebrow}>
                {statusNote.title}
              </Text>
              <Text selectable style={styles.cardBody}>
                {statusNote.body}
              </Text>
            </MessageCard>
          </>
        ) : null}

        {recordData.classification === "mashbooh" ? (
          <>
            <SectionHeading title="Ambiguous Ingredients" />
            <IngredientWrap
              items={mashboohIngredients.map((label) => ({
                label,
                tone: "warning-solid" as const,
              }))}
              emptyLabel="No ambiguous ingredients were extracted from the saved ingredient list."
            />

            {safeIngredients.length > 0 ? (
              <>
                <SectionHeading title="Verified Safe Ingredients" />
                <IngredientWrap
                  items={safeIngredients.map((label) => ({
                    label,
                    tone: "safe" as const,
                  }))}
                />
              </>
            ) : null}
          </>
        ) : null}

        {recordData.classification === "haram" ? (
          <>
            <SectionHeading title="Flagged Ingredients" />
            <IngredientWrap
              items={haramIngredients.map((label) => ({
                label,
                tone: "danger" as const,
              }))}
              emptyLabel="No critical ingredients were extracted from the saved ingredient list."
            />

            <SectionHeading title="Full List" />
            <IngredientWrap
              items={haramFullList}
              emptyLabel="No additional ingredients were extracted from the saved ingredient list."
            />

            <MessageCard accentColor={SCREEN_COLORS.line} tone="neutral">
              <View style={styles.noticeRow}>
                <IconSymbol
                  color={SCREEN_COLORS.muted}
                  name="info.circle.fill"
                  size={18}
                />
                <Text selectable style={styles.noticeText}>
                  {statusNote.body}
                </Text>
              </View>
            </MessageCard>
          </>
        ) : null}

        {recordData.ingredients_text ? (
          <MessageCard accentColor={SCREEN_COLORS.line} tone="neutral">
            <Text selectable style={styles.cardEyebrow}>
              Saved Ingredient List
            </Text>
            <Text selectable style={styles.cardBody}>
              {recordData.ingredients_text}
            </Text>
          </MessageCard>
        ) : null}
      </ScrollView>

      {recordData.classification === "halal" ? (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleShareReport}
            style={[
              styles.primaryAction,
              { backgroundColor: statusPalette.background },
            ]}
          >
            <IconSymbol
              color={statusPalette.text}
              name="square.and.arrow.up"
              size={18}
            />
            <Text
              style={[styles.primaryActionText, { color: statusPalette.text }]}
            >
              Share Report
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Scan another product"
            activeOpacity={0.85}
            onPress={() => router.back()}
            style={styles.squareAction}
          >
            <IconSymbol
              color={SCREEN_COLORS.text}
              name="arrow.clockwise"
              size={20}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={[
            styles.bottomBar,
            styles.bottomBarSingle,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleFindAlternatives}
            style={[
              styles.alternativeAction,
              { borderColor: statusPalette.border },
            ]}
          >
            <IconSymbol
              color={statusPalette.border}
              name="magnifyingglass"
              size={18}
            />
            <Text
              style={[
                styles.alternativeActionText,
                { color: statusPalette.border },
              ]}
            >
              Find Halal Alternatives
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function SectionHeading({
  title,
  accentColor,
  variant = "line",
}: {
  title: string;
  accentColor?: string;
  variant?: "accent" | "line";
}) {
  if (variant === "accent") {
    return (
      <View
        style={[
          styles.sectionHeadingAccent,
          { borderLeftColor: accentColor ?? StatusColors.halal.border },
        ]}
      >
        <Text selectable style={styles.sectionHeadingText}>
          {title}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.sectionHeadingLine}>
      <Text selectable style={styles.sectionHeadingTextMuted}>
        {title}
      </Text>
    </View>
  );
}

function IngredientWrap({
  items,
  emptyLabel,
}: {
  items: ChipItem[];
  emptyLabel?: string;
}) {
  if (!items.length && emptyLabel) {
    return (
      <Text selectable style={styles.emptyStateText}>
        {emptyLabel}
      </Text>
    );
  }

  return (
    <View style={styles.chipWrap}>
      {items.map((item) => (
        <IngredientChip item={item} key={`${item.tone}-${item.label}`} />
      ))}
    </View>
  );
}

function DetailChipSection({
  title,
  values,
}: {
  title: string;
  values: string[];
}) {
  return (
    <>
      <SectionHeading title={title} />
      <IngredientWrap
        items={values.map((label) => ({
          label,
          tone: "neutral" as const,
        }))}
      />
    </>
  );
}

function FactsCard({
  rows,
}: {
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <View style={styles.factsCard}>
      {rows.map((row, index) => (
        <View
          key={`${row.label}-${row.value}`}
          style={[
            styles.factRow,
            index < rows.length - 1 ? styles.factRowBorder : null,
          ]}
        >
          <Text selectable style={styles.factLabel}>
            {row.label}
          </Text>
          <Text selectable style={styles.factValue}>
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function NutritionGrid({ details }: { details: StoredProductDetails }) {
  const rows = [
    {
      label: "Energy",
      value:
        details.nutriments.energyKcal100g !== undefined
          ? `${formatNumber(details.nutriments.energyKcal100g)} kcal`
          : "",
    },
    {
      label: "Fat",
      value:
        details.nutriments.fat100g !== undefined
          ? `${formatNumber(details.nutriments.fat100g)} g`
          : "",
    },
    {
      label: "Saturated Fat",
      value:
        details.nutriments.saturatedFat100g !== undefined
          ? `${formatNumber(details.nutriments.saturatedFat100g)} g`
          : "",
    },
    {
      label: "Carbs",
      value:
        details.nutriments.carbohydrates100g !== undefined
          ? `${formatNumber(details.nutriments.carbohydrates100g)} g`
          : "",
    },
    {
      label: "Sugars",
      value:
        details.nutriments.sugars100g !== undefined
          ? `${formatNumber(details.nutriments.sugars100g)} g`
          : "",
    },
    {
      label: "Fiber",
      value:
        details.nutriments.fiber100g !== undefined
          ? `${formatNumber(details.nutriments.fiber100g)} g`
          : "",
    },
    {
      label: "Protein",
      value:
        details.nutriments.proteins100g !== undefined
          ? `${formatNumber(details.nutriments.proteins100g)} g`
          : "",
    },
    {
      label: "Salt",
      value:
        details.nutriments.salt100g !== undefined
          ? `${formatNumber(details.nutriments.salt100g)} g`
          : "",
    },
  ].filter((row) => Boolean(row.value));

  return (
    <View style={styles.nutritionGrid}>
      {rows.map((row) => (
        <View key={row.label} style={styles.nutritionCell}>
          <Text selectable style={styles.nutritionValue}>
            {row.value}
          </Text>
          <Text selectable style={styles.nutritionLabel}>
            {row.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function IngredientChip({ item }: { item: ChipItem }) {
  const chipStyles = getChipStyles(item.tone);
  const iconName =
    item.tone === "safe"
      ? "checkmark.circle"
      : item.tone === "danger"
        ? "exclamationmark.triangle.fill"
        : item.tone === "warning-solid"
          ? "info.circle.fill"
          : null;

  return (
    <View style={[styles.chip, chipStyles.container]}>
      {iconName ? (
        <IconSymbol color={chipStyles.iconColor} name={iconName} size={14} />
      ) : null}
      <Text
        selectable
        style={[styles.chipText, { color: chipStyles.textColor }]}
      >
        {item.label}
      </Text>
    </View>
  );
}

function MessageCard({
  children,
  accentColor,
  tone = "default",
}: {
  children: ReactNode;
  accentColor: string;
  tone?: "default" | "warning" | "neutral";
}) {
  return (
    <View
      style={[
        styles.messageCard,
        {
          backgroundColor:
            tone === "warning"
              ? StatusColors.mashbooh.backgroundMuted
              : SCREEN_COLORS.panel,
          borderColor: accentColor,
        },
      ]}
    >
      {children}
    </View>
  );
}

function getChipStyles(tone: ChipTone) {
  switch (tone) {
    case "danger":
      return {
        container: {
          backgroundColor: StatusColors.haram.background,
          borderColor: StatusColors.haram.border,
        },
        iconColor: StatusColors.haram.text,
        textColor: StatusColors.haram.text,
      };
    case "warning-solid":
      return {
        container: {
          backgroundColor: StatusColors.mashbooh.background,
          borderColor: StatusColors.mashbooh.border,
        },
        iconColor: StatusColors.mashbooh.text,
        textColor: StatusColors.mashbooh.text,
      };
    case "warning-outline":
      return {
        container: {
          backgroundColor: "transparent",
          borderColor: StatusColors.mashbooh.border,
        },
        iconColor: StatusColors.mashbooh.border,
        textColor: SCREEN_COLORS.text,
      };
    case "neutral":
      return {
        container: {
          backgroundColor: SCREEN_COLORS.panel,
          borderColor: SCREEN_COLORS.line,
        },
        iconColor: SCREEN_COLORS.muted,
        textColor: SCREEN_COLORS.text,
      };
    case "safe":
    default:
      return {
        container: {
          backgroundColor: "transparent",
          borderColor: StatusColors.halal.border,
        },
        iconColor: StatusColors.halal.border,
        textColor: SCREEN_COLORS.text,
      };
  }
}

function limitIngredients(values: string[], max: number) {
  return values.slice(0, max);
}

function buildShareMessage(record: ScanRecord, analysis: IngredientAnalysis) {
  const verdict = STATUS_LABELS[record.classification];
  const flagged =
    record.classification === "haram"
      ? analysis.haramIngredients
      : record.classification === "mashbooh"
        ? analysis.mashboohIngredients
        : [];

  const flaggedSummary = flagged.length
    ? `Flagged: ${flagged.join(", ")}`
    : "No flagged keywords found.";

  return [
    `${record.product_name || "Product"}: ${verdict}`,
    record.brand || null,
    flaggedSummary,
    `Scanned ${new Date(record.scanned_at).toLocaleString()}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function parseEvidence(value: string): ClassificationEvidence[] {
  try {
    return JSON.parse(value) as ClassificationEvidence[];
  } catch {
    return [];
  }
}

function formatEvidenceExplanation(evidence: ClassificationEvidence) {
  switch (evidence.source) {
    case "product_name":
      return `Matched strong haram product-name evidence: "${evidence.matchedValue}". ${evidence.explanation}`;
    case "metadata":
      return `Open Food Facts metadata matched "${evidence.matchedValue}". ${evidence.explanation}`;
    case "ingredients":
      return `Ingredient evidence matched "${evidence.matchedValue}". ${evidence.explanation}`;
    case "fallback":
    default:
      return evidence.explanation;
  }
}

function getStatusNote(
  status: ClassificationStatus,
  evidence: ClassificationEvidence | null,
) {
  if (status !== "mashbooh") {
    return STATUS_NOTES[status];
  }

  if (evidence?.source !== "fallback") {
    return STATUS_NOTES.mashbooh;
  }

  if (evidence.rule === "unusable_ingredient_data") {
    return {
      title: "Verification Pending",
      body: "Ingredient data was present but not clear enough to verify the source or processing details. This product remains mashbooh until better ingredient data is available.",
    };
  }

  return {
    title: "Insufficient Data",
    body: "This product did not include enough ingredient or metadata detail to verify a halal or haram verdict. It is marked mashbooh until clearer data is available.",
  };
}

function parseProductDetails(value: string): StoredProductDetails {
  const emptyDetails: StoredProductDetails = {
    genericName: "",
    quantity: "",
    packaging: [],
    categories: [],
    labels: [],
    origins: [],
    manufacturingPlaces: [],
    countries: [],
    embCodes: [],
    stores: [],
    traces: [],
    additives: [],
    servingSize: "",
    nutriScore: "",
    novaGroup: "",
    url: "",
    nutriments: {},
  };

  try {
    const parsed = JSON.parse(value) as Partial<StoredProductDetails>;
    return {
      ...emptyDetails,
      ...parsed,
      nutriments: {
        ...emptyDetails.nutriments,
        ...(parsed.nutriments ?? {}),
      },
    };
  } catch {
    return emptyDetails;
  }
}

function joinDisplayValues(values: string[]) {
  return values.join(", ");
}

function hasProductDetails(details: StoredProductDetails) {
  return Boolean(
    details.genericName ||
    details.quantity ||
    details.servingSize ||
    details.packaging.length ||
    details.categories.length ||
    details.labels.length ||
    details.origins.length ||
    details.manufacturingPlaces.length ||
    details.countries.length ||
    details.embCodes.length ||
    details.stores.length ||
    details.traces.length ||
    details.additives.length ||
    details.nutriScore ||
    details.novaGroup ||
    details.url ||
    hasNutritionDetails(details),
  );
}

function hasNutritionDetails(details: StoredProductDetails) {
  return Object.values(details.nutriments).some(
    (value) => value !== undefined && value !== null,
  );
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatRelativeScanTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_COLORS.surface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 128,
  },
  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SCREEN_COLORS.surface,
    paddingHorizontal: 32,
  },
  centeredMessage: {
    color: SCREEN_COLORS.text,
    fontSize: 16,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: SCREEN_COLORS.line,
  },
  backButton: {
    width: 48,
    height: 48,
    borderWidth: 2,
    borderColor: SCREEN_COLORS.text,
    borderRadius: 4,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SCREEN_COLORS.surface,
  },
  headerTitle: {
    color: SCREEN_COLORS.text,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  headerSpacer: {
    width: 48,
    height: 48,
  },
  banner: {
    minHeight: 120,
    paddingHorizontal: 24,
    paddingVertical: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerTitle: {
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: -1.5,
    textTransform: "uppercase",
  },
  productSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 2,
    borderBottomColor: SCREEN_COLORS.line,
    backgroundColor: SCREEN_COLORS.surface,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: SCREEN_COLORS.text,
    borderRadius: 4,
    borderCurve: "continuous",
    backgroundColor: SCREEN_COLORS.panelStrong,
  },
  thumbnailPlaceholder: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: SCREEN_COLORS.text,
    borderRadius: 4,
    borderCurve: "continuous",
    backgroundColor: SCREEN_COLORS.panelStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailPlaceholderText: {
    color: SCREEN_COLORS.text,
    fontSize: 28,
    fontWeight: "700",
  },
  productInfo: {
    flex: 1,
    minHeight: 80,
    justifyContent: "center",
    gap: 4,
  },
  productName: {
    color: SCREEN_COLORS.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  productBrand: {
    color: SCREEN_COLORS.muted,
    fontSize: 15,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  scanMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 6,
  },
  scanMetaText: {
    color: SCREEN_COLORS.muted,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    fontVariant: ["tabular-nums"],
  },
  sectionHeadingAccent: {
    marginHorizontal: 24,
    marginTop: 32,
    marginBottom: 16,
    paddingLeft: 16,
    borderLeftWidth: 4,
  },
  sectionHeadingLine: {
    marginHorizontal: 24,
    marginTop: 28,
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: SCREEN_COLORS.line,
  },
  sectionHeadingText: {
    color: SCREEN_COLORS.text,
    fontSize: 18,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  sectionHeadingTextMuted: {
    color: SCREEN_COLORS.muted,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 24,
  },
  chip: {
    minHeight: 40,
    borderWidth: 2,
    borderRadius: 4,
    borderCurve: "continuous",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  emptyStateText: {
    color: SCREEN_COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: 24,
  },
  factsCard: {
    marginHorizontal: 16,
    borderWidth: 2,
    borderColor: SCREEN_COLORS.line,
    borderRadius: 4,
    borderCurve: "continuous",
    backgroundColor: SCREEN_COLORS.panel,
    overflow: "hidden",
  },
  factRow: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 8,
  },
  factRowBorder: {
    borderBottomWidth: 2,
    borderBottomColor: SCREEN_COLORS.line,
  },
  factLabel: {
    color: SCREEN_COLORS.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  factValue: {
    color: SCREEN_COLORS.text,
    fontSize: 15,
    lineHeight: 22,
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 16,
  },
  nutritionCell: {
    width: "47%",
    minHeight: 86,
    borderWidth: 2,
    borderColor: SCREEN_COLORS.line,
    borderRadius: 4,
    borderCurve: "continuous",
    backgroundColor: SCREEN_COLORS.panel,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: "space-between",
  },
  nutritionValue: {
    color: SCREEN_COLORS.text,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  nutritionLabel: {
    color: SCREEN_COLORS.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  messageCard: {
    marginHorizontal: 16,
    marginTop: 24,
    borderWidth: 2,
    borderRadius: 4,
    borderCurve: "continuous",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 8,
  },
  messageTitle: {
    fontSize: 15,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  messageText: {
    color: SCREEN_COLORS.text,
    fontSize: 15,
    lineHeight: 26,
  },
  cardEyebrow: {
    color: SCREEN_COLORS.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  cardBody: {
    color: SCREEN_COLORS.text,
    fontSize: 15,
    lineHeight: 24,
  },
  noticeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  noticeText: {
    flex: 1,
    color: SCREEN_COLORS.muted,
    fontSize: 15,
    lineHeight: 26,
  },
  offAction: {
    minHeight: 56,
    marginHorizontal: 16,
    marginTop: 24,
    borderWidth: 2,
    borderColor: SCREEN_COLORS.text,
    borderRadius: 4,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    backgroundColor: SCREEN_COLORS.surface,
  },
  offActionText: {
    color: SCREEN_COLORS.text,
    fontSize: 15,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 12,
    paddingTop: 18,
    paddingHorizontal: 16,
    backgroundColor: "rgba(9, 9, 11, 0.94)",
    borderTopWidth: 2,
    borderTopColor: SCREEN_COLORS.line,
  },
  bottomBarSingle: {
    justifyContent: "center",
  },
  primaryAction: {
    flex: 1,
    minHeight: 56,
    borderRadius: 4,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  squareAction: {
    width: 56,
    height: 56,
    borderWidth: 2,
    borderColor: SCREEN_COLORS.text,
    borderRadius: 4,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SCREEN_COLORS.surface,
  },
  alternativeAction: {
    width: "100%",
    minHeight: 56,
    borderWidth: 2,
    borderRadius: 4,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    backgroundColor: SCREEN_COLORS.surface,
  },
  alternativeActionText: {
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase",
  },
});
