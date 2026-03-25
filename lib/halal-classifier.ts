export type ClassificationStatus = "halal" | "haram" | "mashbooh";

export interface FlaggedIngredient {
  name: string;
  reason: "haram" | "mashbooh";
  matchedKeyword: string;
}

export interface ClassificationResult {
  status: ClassificationStatus;
  flaggedIngredients: FlaggedIngredient[];
  analyzedText: string;
  evidence: ClassificationEvidence[];
  primaryEvidenceSource: ClassificationEvidenceSource;
}

export type ClassificationEvidenceSource =
  | "product_name"
  | "metadata"
  | "ingredients"
  | "fallback";

export interface ClassificationEvidence {
  source: ClassificationEvidenceSource;
  status: ClassificationStatus;
  rule: string;
  matchedValue: string;
  explanation: string;
}

export interface IngredientAnalysis {
  allIngredients: string[];
  safeIngredients: string[];
  mashboohIngredients: string[];
  haramIngredients: string[];
  flaggedIngredients: FlaggedIngredient[];
}

interface IngredientRule {
  canonical: string;
  status: "haram" | "mashbooh" | "safe";
  aliases: string[];
}

export interface OFFIngredientItem {
  text?: string;
  id?: string;
}

export interface ClassificationMetadata {
  productName?: string;
  brand?: string;
  labels?: string;
  labelTags?: string[];
  categories?: string;
  categoryTags?: string[];
}

const HARAM_INGREDIENT_RULES: IngredientRule[] = [
  { canonical: "pork", status: "haram", aliases: ["pork", "pig", "swine"] },
  { canonical: "lard", status: "haram", aliases: ["lard"] },
  { canonical: "bacon", status: "haram", aliases: ["bacon"] },
  { canonical: "ham", status: "haram", aliases: ["ham"] },
  {
    canonical: "alcohol",
    status: "haram",
    aliases: ["alcohol", "wine", "beer", "liquor", "spirits", "ethanol"],
  },
  { canonical: "blood", status: "haram", aliases: ["blood"] },
  {
    canonical: "carmine",
    status: "haram",
    aliases: ["carmine", "cochineal", "e120"],
  },
  {
    canonical: "gelatin",
    status: "haram",
    aliases: ["e441", "gelatin", "gelatine"],
  },
  {
    canonical: "bone phosphate",
    status: "haram",
    aliases: ["e542", "edible bone phosphate", "bone phosphate"],
  },
  {
    canonical: "shellac",
    status: "haram",
    aliases: ["shellac", "confectioner's glaze", "e904"],
  },
  {
    canonical: "l-cysteine",
    status: "haram",
    aliases: ["l-cysteine", "e920"],
  },
  { canonical: "rennet", status: "haram", aliases: ["rennet"] },
];

const MASHBOOH_INGREDIENT_RULES: IngredientRule[] = [
  {
    canonical: "natural flavors",
    status: "mashbooh",
    aliases: [
      "natural flavor",
      "natural flavors",
      "natural flavoring",
      "natural flavouring",
      "natural flavourings",
    ],
  },
  {
    canonical: "mono and diglycerides",
    status: "mashbooh",
    aliases: [
      "mono and diglycerides",
      "mono- and diglycerides",
      "monoglycerides",
      "diglycerides",
      "e471",
      "e472",
      "e470",
      "e470a",
      "e470b",
      "e471a",
      "e472a",
      "e472b",
      "e472c",
      "e472d",
      "e472e",
      "e472f",
      "e473",
      "e474",
      "e475",
      "e476",
      "e477",
      "e478",
      "e479",
      "e480",
      "e481",
      "e482",
      "e483",
    ],
  },
  { canonical: "whey", status: "mashbooh", aliases: ["whey"] },
  { canonical: "castoreum", status: "mashbooh", aliases: ["castoreum"] },
  {
    canonical: "vanilla extract",
    status: "mashbooh",
    aliases: ["vanilla extract"],
  },
  {
    canonical: "glycerol",
    status: "mashbooh",
    aliases: ["glycerol", "glycerin", "glycerine", "e422"],
  },
  { canonical: "curcumin", status: "mashbooh", aliases: ["e100"] },
  { canonical: "riboflavin", status: "mashbooh", aliases: ["e101"] },
  { canonical: "tartrazine", status: "mashbooh", aliases: ["e102"] },
  { canonical: "quinoline yellow", status: "mashbooh", aliases: ["e104"] },
  { canonical: "sunset yellow", status: "mashbooh", aliases: ["e110"] },
  { canonical: "carmoisine", status: "mashbooh", aliases: ["e122"] },
  { canonical: "amaranth", status: "mashbooh", aliases: ["e123"] },
  { canonical: "ponceau 4r", status: "mashbooh", aliases: ["e124"] },
  { canonical: "erythrosine", status: "mashbooh", aliases: ["e127"] },
  { canonical: "patent blue v", status: "mashbooh", aliases: ["e131"] },
  { canonical: "green s", status: "mashbooh", aliases: ["e142"] },
  { canonical: "vegetable carbon", status: "mashbooh", aliases: ["e153"] },
  { canonical: "alpha carotene", status: "mashbooh", aliases: ["e160a"] },
  { canonical: "capsanthin", status: "mashbooh", aliases: ["e160c"] },
  { canonical: "lycopene", status: "mashbooh", aliases: ["e160d"] },
  { canonical: "beta-apo-8-carotenal", status: "mashbooh", aliases: ["e160e"] },
  {
    canonical: "ethyl ester of beta-apo-8-carotenoic acid",
    status: "mashbooh",
    aliases: ["e160f"],
  },
  { canonical: "flavoxanthin", status: "mashbooh", aliases: ["e161a"] },
  { canonical: "lutein", status: "mashbooh", aliases: ["e161b"] },
  { canonical: "cryptoxanthin", status: "mashbooh", aliases: ["e161c"] },
  { canonical: "rubixanthin", status: "mashbooh", aliases: ["e161d"] },
  { canonical: "violaxanthin", status: "mashbooh", aliases: ["e161e"] },
  { canonical: "rhodoxanthin", status: "mashbooh", aliases: ["e161f"] },
  { canonical: "canthaxanthin", status: "mashbooh", aliases: ["e161g"] },
  { canonical: "beetroot red", status: "mashbooh", aliases: ["e162"] },
  { canonical: "anthocyanins", status: "mashbooh", aliases: ["e163"] },
  { canonical: "calcium carbonate", status: "mashbooh", aliases: ["e170"] },
];

const SAFE_INGREDIENT_RULES: IngredientRule[] = [
  {
    canonical: "caramel color",
    status: "safe",
    aliases: ["e150a", "e150b", "e150c", "e150d", "e150"],
  },
  { canonical: "annatto", status: "safe", aliases: ["e160b"] },
  { canonical: "titanium dioxide", status: "safe", aliases: ["e171"] },
  { canonical: "iron oxides", status: "safe", aliases: ["e172"] },
  { canonical: "aluminium", status: "safe", aliases: ["e173"] },
  { canonical: "silver", status: "safe", aliases: ["e174"] },
  { canonical: "gold", status: "safe", aliases: ["e175"] },
  { canonical: "sorbic acid", status: "safe", aliases: ["e200"] },
  { canonical: "sodium sorbate", status: "safe", aliases: ["e201"] },
  { canonical: "potassium sorbate", status: "safe", aliases: ["e202"] },
  { canonical: "calcium sorbate", status: "safe", aliases: ["e203"] },
  { canonical: "benzoic acid", status: "safe", aliases: ["e210"] },
  { canonical: "sodium benzoate", status: "safe", aliases: ["e211"] },
  { canonical: "potassium benzoate", status: "safe", aliases: ["e212"] },
  { canonical: "calcium benzoate", status: "safe", aliases: ["e213"] },
];

const STRONG_HARAM_PRODUCT_KEYWORDS: string[] = [
  "pork",
  "pig",
  "swine",
  "lard",
  "prosciutto",
  "pancetta",
  "porchetta",
];

const STRONG_HARAM_QUALIFIED_PRODUCT_TERMS = [
  "bacon",
  "ham",
  "pepperoni",
  "salami",
  "chorizo",
] as const;

const STRONG_HARAM_ALCOHOL_PRODUCT_TERMS = [
  "alcoholic beverage",
  "alcoholic beverages",
  "beer",
  "beers",
  "wine",
  "wines",
  "sparkling wine",
  "sparkling wines",
  "prosecco",
  "whiskey",
  "whisky",
  "vodka",
  "rum",
  "gin",
  "champagne",
  "champagnes",
  "brandy",
  "cognac",
  "bourbon",
  "tequila",
  "lager",
  "lagers",
  "ale",
  "ales",
  "stout",
  "stouts",
  "porter",
  "porters",
  "cider",
  "ciders",
  "sake",
  "mead",
  "soju",
  "liqueur",
  "liqueurs",
  "liquor",
  "liquors",
  "spirits",
  "hard seltzer",
  "hard seltzers",
  "malt liquor",
  "malt liquors",
] as const;

const NON_HARAM_QUALIFIERS = [
  "beef",
  "chicken",
  "turkey",
  "vegan",
  "veggie",
  "vegetarian",
  "plant based",
  "plant-based",
  "halal",
] as const;

const NON_HARAM_ALCOHOL_QUALIFIERS = [
  "non alcoholic",
  "non alcohol",
  "alcohol free",
  "alcohol free",
  "alcohol removed",
  "dealcoholized",
  "de alcoholized",
  "zero alcohol",
  "no alcohol",
  "0 0",
  "0 00",
] as const;

const NON_HARAM_ALCOHOL_PRODUCT_PHRASES = [
  "root beer",
  "ginger beer",
  "birch beer",
] as const;

const GENERIC_INGREDIENT_PHRASES = [
  "ingredients",
  "contains",
  "contains 2% or less of",
  "contains less than 2% of",
  "contains less than two percent of",
  "may contain",
  "less than 2% of",
  "less than two percent of",
  "made with",
  "and",
  "or",
] as const;

function checkGelatin(corpus: string): FlaggedIngredient | null {
  if (!corpus.includes("gelatin") && !corpus.includes("gelatine")) return null;

  // Check if it's qualified as halal or fish — treat as mashbooh (unverifiable)
  if (
    corpus.includes("halal gelatin") ||
    corpus.includes("halal gelatine") ||
    corpus.includes("fish gelatin") ||
    corpus.includes("fish gelatine")
  ) {
    return { name: "gelatin", reason: "mashbooh", matchedKeyword: "gelatin" };
  }

  // Unqualified gelatin → haram
  return { name: "gelatin", reason: "haram", matchedKeyword: "gelatin" };
}

function buildCorpus(
  ingredientsText: string,
  ingredientsArray: OFFIngredientItem[],
): string {
  const parts: string[] = [];
  if (ingredientsText) parts.push(ingredientsText);
  for (const ing of ingredientsArray) {
    if (ing.text) parts.push(ing.text);
    if (ing.id) parts.push(ing.id);
  }
  return parts.join(", ").toLowerCase();
}

function titleCaseIngredient(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeIngredientSegment(segment: string): string {
  return segment
    .replace(/\bcontains?\b/gi, "")
    .replace(/\bmay contain\b/gi, "")
    .replace(/\bmade with\b/gi, "")
    .replace(/\bless than \d+% of\b/gi, "")
    .replace(/\bless than two percent of\b/gi, "")
    .replace(/\b\d+(\.\d+)?%\b/g, "")
    .replace(/\b(?:e|ins)[\s-]?(\d{3,4}[a-z]?)\b/gi, "e$1")
    .replace(/\be[\s-](\d{3,4}[a-z]?)\b/gi, "e$1")
    .replace(/[*_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasKeywordMatch(text: string, keyword: string): boolean {
  return new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i").test(text);
}

function findIngredientRule(
  rules: IngredientRule[],
  segment: string,
): IngredientRule | null {
  return (
    rules.find((rule) =>
      rule.aliases.some((alias) => hasKeywordMatch(segment, alias)),
    ) ?? null
  );
}

function normalizeSearchableText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasQualifiedProductMatch(text: string, term: string): boolean {
  if (!hasKeywordMatch(text, term)) {
    return false;
  }

  const qualifiedPatterns = NON_HARAM_QUALIFIERS.map(
    (qualifier) => `\\b${escapeRegExp(qualifier)}\\s+${escapeRegExp(term)}\\b`,
  );

  return !qualifiedPatterns.some((pattern) =>
    new RegExp(pattern, "i").test(text),
  );
}

function hasAlcoholProductMatch(text: string, term: string): boolean {
  if (!hasKeywordMatch(text, term)) {
    return false;
  }

  if (
    NON_HARAM_ALCOHOL_PRODUCT_PHRASES.some((phrase) =>
      hasKeywordMatch(text, phrase),
    )
  ) {
    return false;
  }

  const qualifierPatterns = NON_HARAM_ALCOHOL_QUALIFIERS.map(
    (qualifier) => `\\b${escapeRegExp(qualifier)}\\s+${escapeRegExp(term)}\\b`,
  );

  return !qualifierPatterns.some((pattern) =>
    new RegExp(pattern, "i").test(text),
  );
}

function findStrongProductEvidence(
  metadata: ClassificationMetadata = {},
): ClassificationEvidence | null {
  const normalizedProductName = normalizeSearchableText(
    metadata.productName ?? "",
  );
  const normalizedBrand = normalizeSearchableText(metadata.brand ?? "");
  const searchableText = [normalizedProductName, normalizedBrand]
    .filter(Boolean)
    .join(" ");

  if (!searchableText.trim()) {
    return null;
  }

  const matchedProductKeyword = STRONG_HARAM_PRODUCT_KEYWORDS.find((keyword) =>
    hasKeywordMatch(normalizedProductName, keyword),
  );

  if (matchedProductKeyword) {
    return {
      source: "product_name",
      status: "haram",
      rule: "strong_haram_product_name",
      matchedValue: matchedProductKeyword,
      explanation:
        "The product name contains a strong haram signal, so the item is classified as haram before ingredient fallback rules.",
    };
  }

  const matchedQualifiedProductTerm = STRONG_HARAM_QUALIFIED_PRODUCT_TERMS.find(
    (term) => hasQualifiedProductMatch(normalizedProductName, term),
  );

  if (matchedQualifiedProductTerm) {
    return {
      source: "product_name",
      status: "haram",
      rule: "qualified_haram_product_name",
      matchedValue: matchedQualifiedProductTerm,
      explanation:
        "The product name contains a strongly haram meat term without a non-haram qualifier, so the item is classified as haram before ingredient fallback rules.",
    };
  }

  const matchedAlcoholProductTerm = STRONG_HARAM_ALCOHOL_PRODUCT_TERMS.find(
    (term) => hasAlcoholProductMatch(normalizedProductName, term),
  );

  if (matchedAlcoholProductTerm) {
    return {
      source: "product_name",
      status: "haram",
      rule: "strong_haram_alcohol_product_name",
      matchedValue: matchedAlcoholProductTerm,
      explanation:
        "The product name contains a clearly alcoholic product term without a non-alcoholic qualifier, so the item is classified as haram before ingredient fallback rules.",
    };
  }

  const matchedBrandKeyword = STRONG_HARAM_PRODUCT_KEYWORDS.find((keyword) =>
    hasKeywordMatch(normalizedBrand, keyword),
  );

  if (matchedBrandKeyword) {
    return {
      source: "product_name",
      status: "haram",
      rule: "strong_haram_brand_name",
      matchedValue: matchedBrandKeyword,
      explanation:
        "The brand name contains a strong haram signal, so the item is classified as haram before ingredient fallback rules.",
    };
  }

  return null;
}

function joinMetadataParts(
  values: Array<string | string[] | undefined>,
): string {
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
}

function hasAnyMetadata(metadata: ClassificationMetadata = {}): boolean {
  return Boolean(
    joinMetadataParts([
      metadata.productName,
      metadata.brand,
      metadata.labels,
      metadata.labelTags,
      metadata.categories,
      metadata.categoryTags,
    ]).trim(),
  );
}

function findMetadataEvidence(
  metadata: ClassificationMetadata = {},
): ClassificationEvidence | null {
  const normalizedLabels = normalizeSearchableText(
    joinMetadataParts([metadata.labels, metadata.labelTags]),
  );
  const normalizedCategories = normalizeSearchableText(
    joinMetadataParts([metadata.categories, metadata.categoryTags]),
  );

  if (!normalizedLabels && !normalizedCategories) {
    return null;
  }

  const matchedCategoryKeyword = STRONG_HARAM_PRODUCT_KEYWORDS.find((keyword) =>
    hasKeywordMatch(normalizedCategories, keyword),
  );

  if (matchedCategoryKeyword) {
    return {
      source: "metadata",
      status: "haram",
      rule: "strong_haram_category_metadata",
      matchedValue: matchedCategoryKeyword,
      explanation:
        "Open Food Facts category metadata contains a strong haram signal, so the item is classified as haram before fallback rules.",
    };
  }

  const matchedQualifiedCategoryTerm =
    STRONG_HARAM_QUALIFIED_PRODUCT_TERMS.find((term) =>
      hasQualifiedProductMatch(normalizedCategories, term),
    );

  if (matchedQualifiedCategoryTerm) {
    return {
      source: "metadata",
      status: "haram",
      rule: "qualified_haram_category_metadata",
      matchedValue: matchedQualifiedCategoryTerm,
      explanation:
        "Open Food Facts category metadata contains a strongly haram meat term without a non-haram qualifier, so the item is classified as haram before fallback rules.",
    };
  }

  const matchedAlcoholCategoryTerm = STRONG_HARAM_ALCOHOL_PRODUCT_TERMS.find(
    (term) => hasAlcoholProductMatch(normalizedCategories, term),
  );

  if (matchedAlcoholCategoryTerm) {
    return {
      source: "metadata",
      status: "haram",
      rule: "strong_haram_alcohol_category_metadata",
      matchedValue: matchedAlcoholCategoryTerm,
      explanation:
        "Open Food Facts category metadata contains a clearly alcoholic product term without a non-alcoholic qualifier, so the item is classified as haram before fallback rules.",
    };
  }

  const matchedLabelKeyword = STRONG_HARAM_PRODUCT_KEYWORDS.find((keyword) =>
    hasKeywordMatch(normalizedLabels, keyword),
  );

  if (matchedLabelKeyword) {
    return {
      source: "metadata",
      status: "haram",
      rule: "strong_haram_label_metadata",
      matchedValue: matchedLabelKeyword,
      explanation:
        "Open Food Facts label metadata contains a strong haram signal, so the item is classified as haram before fallback rules.",
    };
  }

  const matchedQualifiedLabelTerm = STRONG_HARAM_QUALIFIED_PRODUCT_TERMS.find(
    (term) => hasQualifiedProductMatch(normalizedLabels, term),
  );

  if (matchedQualifiedLabelTerm) {
    return {
      source: "metadata",
      status: "haram",
      rule: "qualified_haram_label_metadata",
      matchedValue: matchedQualifiedLabelTerm,
      explanation:
        "Open Food Facts label metadata contains a strongly haram meat term without a non-haram qualifier, so the item is classified as haram before fallback rules.",
    };
  }

  const matchedAlcoholLabelTerm = STRONG_HARAM_ALCOHOL_PRODUCT_TERMS.find(
    (term) => hasAlcoholProductMatch(normalizedLabels, term),
  );

  if (matchedAlcoholLabelTerm) {
    return {
      source: "metadata",
      status: "haram",
      rule: "strong_haram_alcohol_label_metadata",
      matchedValue: matchedAlcoholLabelTerm,
      explanation:
        "Open Food Facts label metadata contains a clearly alcoholic product term without a non-alcoholic qualifier, so the item is classified as haram before fallback rules.",
    };
  }

  return null;
}

function extractIngredientSegments(
  ingredientsText: string,
  ingredientsArray: OFFIngredientItem[] = [],
): string[] {
  const source =
    ingredientsText ||
    ingredientsArray.map((item) => item.text ?? item.id ?? "").join(", ");

  return source
    .replace(/[()[\]{}]/g, ",")
    .replace(/[/:]/g, ",")
    .split(/[,;]+/)
    .map(normalizeIngredientSegment)
    .filter((segment) => {
      const lower = segment.toLowerCase();
      if (lower.length < 3) return false;
      if (!/[a-z]/i.test(segment)) return false;
      return !GENERIC_INGREDIENT_PHRASES.some((phrase) => lower === phrase);
    });
}

function getIngredientRule(segment: string): IngredientRule | null {
  const lowerSegment = segment.toLowerCase();

  const gelatinResult = checkGelatin(lowerSegment);
  if (gelatinResult) {
    return gelatinResult.reason === "haram"
      ? {
          canonical: "gelatin",
          status: "haram",
          aliases: ["gelatin", "gelatine", "e441"],
        }
      : {
          canonical: "gelatin",
          status: "mashbooh",
          aliases: ["gelatin", "gelatine", "e441"],
        };
  }

  const haramRule = findIngredientRule(HARAM_INGREDIENT_RULES, lowerSegment);
  if (haramRule) {
    return haramRule;
  }

  const mashboohRule = findIngredientRule(
    MASHBOOH_INGREDIENT_RULES,
    lowerSegment,
  );
  if (mashboohRule) {
    return mashboohRule;
  }

  const safeRule = findIngredientRule(SAFE_INGREDIENT_RULES, lowerSegment);
  if (safeRule) {
    return safeRule;
  }

  return null;
}

export function analyzeIngredients(
  ingredientsText: string,
  ingredientsArray: OFFIngredientItem[] = [],
): IngredientAnalysis {
  const allIngredients = extractIngredientSegments(
    ingredientsText,
    ingredientsArray,
  );
  const safeIngredients: string[] = [];
  const mashboohIngredients: string[] = [];
  const haramIngredients: string[] = [];
  const flaggedIngredients: FlaggedIngredient[] = [];

  for (const ingredient of allIngredients) {
    const rule = getIngredientRule(ingredient);
    const normalizedName = titleCaseIngredient(ingredient);

    if (rule?.status === "haram") {
      haramIngredients.push(titleCaseIngredient(rule.canonical));
      flaggedIngredients.push({
        name: titleCaseIngredient(rule.canonical),
        reason: "haram",
        matchedKeyword: rule.canonical,
      });
      continue;
    }

    if (rule?.status === "mashbooh") {
      mashboohIngredients.push(titleCaseIngredient(rule.canonical));
      flaggedIngredients.push({
        name: titleCaseIngredient(rule.canonical),
        reason: "mashbooh",
        matchedKeyword: rule.canonical,
      });
      continue;
    }

    if (rule?.status === "safe") {
      safeIngredients.push(titleCaseIngredient(rule.canonical));
      continue;
    }

    safeIngredients.push(normalizedName);
  }

  const dedupe = (values: string[]) => Array.from(new Set(values));
  const dedupedFlagged = flaggedIngredients.filter((value, index, values) => {
    return (
      values.findIndex(
        (candidate) => candidate.matchedKeyword === value.matchedKeyword,
      ) === index
    );
  });

  return {
    allIngredients: dedupe(allIngredients.map(titleCaseIngredient)),
    safeIngredients: dedupe(safeIngredients),
    mashboohIngredients: dedupe(mashboohIngredients),
    haramIngredients: dedupe(haramIngredients),
    flaggedIngredients: dedupedFlagged,
  };
}

export function classifyProduct(
  ingredientsText: string,
  ingredientsArray: OFFIngredientItem[] = [],
  metadata: ClassificationMetadata = {},
): ClassificationResult {
  const corpus = buildCorpus(ingredientsText, ingredientsArray);
  const analysis = analyzeIngredients(ingredientsText, ingredientsArray);
  const productEvidence = findStrongProductEvidence(metadata);
  const metadataEvidence = findMetadataEvidence(metadata);
  const hasMetadata = hasAnyMetadata(metadata);

  if (productEvidence) {
    const flaggedIngredients = [
      {
        name: productEvidence.matchedValue,
        reason: "haram" as const,
        matchedKeyword: productEvidence.matchedValue,
      },
      ...analysis.flaggedIngredients,
    ].filter(
      (value, index, values) =>
        values.findIndex(
          (candidate) => candidate.matchedKeyword === value.matchedKeyword,
        ) === index,
    );

    return {
      status: "haram",
      flaggedIngredients,
      analyzedText: corpus,
      evidence: [productEvidence],
      primaryEvidenceSource: "product_name",
    };
  }

  const hasHaram = analysis.flaggedIngredients.some(
    (ingredient) => ingredient.reason === "haram",
  );
  const hasMashbooh = analysis.flaggedIngredients.some(
    (ingredient) => ingredient.reason === "mashbooh",
  );

  const status: ClassificationStatus = hasHaram
    ? "haram"
    : hasMashbooh
      ? "mashbooh"
      : "halal";

  if (hasHaram || hasMashbooh) {
    return {
      status,
      flaggedIngredients: analysis.flaggedIngredients,
      analyzedText: corpus,
      evidence: [
        hasHaram
          ? {
              source: "ingredients",
              status: "haram",
              rule: "haram_ingredient_keyword",
              matchedValue:
                analysis.flaggedIngredients.find(
                  (ingredient) => ingredient.reason === "haram",
                )?.matchedKeyword ?? "haram_keyword",
              explanation:
                "At least one ingredient matched a haram keyword in the classifier.",
            }
          : {
              source: "ingredients",
              status: "mashbooh",
              rule: "mashbooh_ingredient_keyword",
              matchedValue:
                analysis.flaggedIngredients.find(
                  (ingredient) => ingredient.reason === "mashbooh",
                )?.matchedKeyword ?? "mashbooh_keyword",
              explanation:
                "No haram ingredient matched, but at least one doubtful ingredient matched a mashbooh keyword.",
            },
      ],
      primaryEvidenceSource: "ingredients",
    };
  }

  if (metadataEvidence) {
    return {
      status: metadataEvidence.status,
      flaggedIngredients: [
        {
          name: titleCaseIngredient(metadataEvidence.matchedValue),
          reason: metadataEvidence.status === "haram" ? "haram" : "mashbooh",
          matchedKeyword: metadataEvidence.matchedValue,
        },
      ],
      analyzedText: corpus,
      evidence: [metadataEvidence],
      primaryEvidenceSource: "metadata",
    };
  }

  if (!corpus.trim()) {
    return {
      status: "mashbooh",
      flaggedIngredients: [
        {
          name: "No ingredient data available",
          reason: "mashbooh",
          matchedKeyword: "no_data",
        },
      ],
      analyzedText: "",
      evidence: [
        {
          source: "fallback",
          status: "mashbooh",
          rule: hasMetadata
            ? "missing_ingredient_data_inconclusive_metadata"
            : "missing_ingredient_data_no_metadata",
          matchedValue: hasMetadata ? "metadata_inconclusive" : "no_data",
          explanation: hasMetadata
            ? "No usable ingredient data was available, and the remaining product metadata was not strong enough to verify a halal or haram verdict, so the product defaults to mashbooh."
            : "No usable ingredient data or supporting product metadata was available, so the product defaults to mashbooh.",
        },
      ],
      primaryEvidenceSource: "fallback",
    };
  }

  if (!analysis.allIngredients.length) {
    return {
      status: "mashbooh",
      flaggedIngredients: [
        {
          name: "Ingredient data could not be verified",
          reason: "mashbooh",
          matchedKeyword: "unusable_ingredient_data",
        },
      ],
      analyzedText: corpus,
      evidence: [
        {
          source: "fallback",
          status: "mashbooh",
          rule: "unusable_ingredient_data",
          matchedValue: "ingredient_data_unusable",
          explanation:
            "Ingredient data was present but could not be parsed into verifiable ingredients, so the product defaults to mashbooh.",
        },
      ],
      primaryEvidenceSource: "fallback",
    };
  }

  return {
    status: "halal",
    flaggedIngredients: analysis.flaggedIngredients,
    analyzedText: corpus,
    evidence: [
      {
        source: "ingredients",
        status: "halal",
        rule: "no_flagged_ingredient_keywords",
        matchedValue: "ingredients_clear",
        explanation:
          "No haram or mashbooh keywords were found in the ingredient data.",
      },
    ],
    primaryEvidenceSource: "ingredients",
  };
}
