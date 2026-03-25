import { OFFIngredientItem } from "./halal-classifier";

const OPEN_FOOD_FACTS_BASE_URL = "https://world.openfoodfacts.org";
const OPEN_FOOD_FACTS_SEARCH_URL = "https://search.openfoodfacts.org/search";
const DEFAULT_HEADERS = {
  "User-Agent": "HalalEats/1.0",
};
const BARCODE_REGEX = /^\d{8,14}$/;

export interface OFFProduct {
  code?: string;
  product_name?: string;
  generic_name?: string;
  brands?: string;
  quantity?: string;
  packaging?: string;
  ingredients_text?: string;
  ingredients?: OFFIngredientItem[];
  labels?: string;
  labels_tags?: string[];
  categories?: string;
  categories_tags?: string[];
  origins?: string;
  manufacturing_places?: string;
  countries?: string;
  emb_codes?: string;
  stores?: string;
  traces?: string;
  serving_size?: string;
  additives_tags?: string[];
  nutrition_grades?: string;
  nova_group?: number | string;
  url?: string;
  nutriments?: {
    "energy-kcal_100g"?: number | string;
    energy_100g?: number | string;
    fat_100g?: number | string;
    "saturated-fat_100g"?: number | string;
    carbohydrates_100g?: number | string;
    sugars_100g?: number | string;
    fiber_100g?: number | string;
    proteins_100g?: number | string;
    salt_100g?: number | string;
  };
  image_front_thumb_url?: string;
  image_thumb_url?: string;
}

export interface StoredProductDetails {
  genericName: string;
  quantity: string;
  packaging: string[];
  categories: string[];
  labels: string[];
  origins: string[];
  manufacturingPlaces: string[];
  countries: string[];
  embCodes: string[];
  stores: string[];
  traces: string[];
  additives: string[];
  servingSize: string;
  nutriScore: string;
  novaGroup: string;
  url: string;
  nutriments: {
    energyKcal100g?: number;
    fat100g?: number;
    saturatedFat100g?: number;
    carbohydrates100g?: number;
    sugars100g?: number;
    fiber100g?: number;
    proteins100g?: number;
    salt100g?: number;
  };
}

interface OFFProductResponse {
  status: number;
  status_verbose: string;
  product?: OFFProduct;
}

interface OFFSearchResponse {
  count?: number;
  page?: number;
  page_count?: number;
  products?: OFFProduct[];
}

interface OFFSearchALiciousHit {
  code?: string;
  product_name?: string;
  brands?: string[] | string;
  image_front_thumb_url?: string;
  image_thumb_url?: string;
}

interface OFFSearchALiciousResponse {
  hits?: OFFSearchALiciousHit[];
}

export interface OFFResolvedProduct {
  barcode: string;
  product: OFFProduct;
}

export class ProductNotFoundError extends Error {
  constructor(barcode: string) {
    super(`Product not found: ${barcode}`);
    this.name = "ProductNotFoundError";
  }
}

export class ProductSearchNotFoundError extends Error {
  constructor(query: string) {
    super(`No products matched: ${query}`);
    this.name = "ProductSearchNotFoundError";
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: DEFAULT_HEADERS,
    });
  } catch {
    throw new NetworkError(
      "Unable to connect. Check your internet connection.",
    );
  }

  if (!response.ok) {
    throw new NetworkError(`Server error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function normalizeValue(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeBrands(
  brands: string[] | string | undefined,
): string | undefined {
  if (Array.isArray(brands)) {
    return brands.join(", ");
  }

  return brands;
}

function normalizeSearchHit(hit: OFFSearchALiciousHit): OFFProduct {
  return {
    code: hit.code,
    product_name: hit.product_name,
    brands: normalizeBrands(hit.brands),
    image_front_thumb_url: hit.image_front_thumb_url,
    image_thumb_url: hit.image_thumb_url,
  };
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      if (/^e\d{3,4}[a-z]?$/i.test(part)) {
        return part.toUpperCase();
      }

      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function normalizeTagLabel(tag: string): string {
  return toTitleCase(
    tag
      .replace(/^[a-z]{2}:/i, "")
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function normalizeList(values: Array<string | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .flatMap((value) => value?.split(",") ?? [])
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeTagList(tags?: string[]): string[] {
  return Array.from(
    new Set((tags ?? []).map(normalizeTagLabel).filter(Boolean)),
  );
}

function toNumber(value: number | string | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

export function extractProductDetails(
  product: OFFProduct,
): StoredProductDetails {
  const nutriments = product.nutriments ?? {};
  const categories = normalizeList([product.categories]);
  const labels = normalizeList([product.labels]);

  return {
    genericName: product.generic_name?.trim() ?? "",
    quantity: product.quantity?.trim() ?? "",
    packaging: normalizeList([product.packaging]),
    categories: categories.length
      ? categories
      : normalizeTagList(product.categories_tags),
    labels: labels.length ? labels : normalizeTagList(product.labels_tags),
    origins: normalizeList([product.origins]),
    manufacturingPlaces: normalizeList([product.manufacturing_places]),
    countries: normalizeList([product.countries]),
    embCodes: normalizeList([product.emb_codes]),
    stores: normalizeList([product.stores]),
    traces: normalizeList([product.traces]),
    additives: normalizeTagList(product.additives_tags),
    servingSize: product.serving_size?.trim() ?? "",
    nutriScore: (product.nutrition_grades ?? "").trim().toUpperCase(),
    novaGroup:
      product.nova_group === undefined || product.nova_group === null
        ? ""
        : String(product.nova_group).trim(),
    url:
      product.url?.trim() ||
      (product.code
        ? `${OPEN_FOOD_FACTS_BASE_URL}/product/${product.code}`
        : ""),
    nutriments: {
      energyKcal100g: toNumber(nutriments["energy-kcal_100g"]),
      fat100g: toNumber(nutriments.fat_100g),
      saturatedFat100g: toNumber(nutriments["saturated-fat_100g"]),
      carbohydrates100g: toNumber(nutriments.carbohydrates_100g),
      sugars100g: toNumber(nutriments.sugars_100g),
      fiber100g: toNumber(nutriments.fiber_100g),
      proteins100g: toNumber(nutriments.proteins_100g),
      salt100g: toNumber(nutriments.salt_100g),
    },
  };
}

function scoreSearchMatch(query: string, product: OFFProduct): number {
  const normalizedQuery = normalizeValue(query);
  const normalizedName = normalizeValue(product.product_name);
  const normalizedBrands = normalizeValue(product.brands);
  const tokens = normalizedQuery.split(" ").filter(Boolean);

  let score = 0;

  if (!normalizedQuery) return score;

  if (product.code === query.trim()) score += 1000;

  if (normalizedName === normalizedQuery) score += 500;
  else if (normalizedName.startsWith(normalizedQuery)) score += 350;
  else if (normalizedName.includes(normalizedQuery)) score += 220;

  if (normalizedBrands === normalizedQuery) score += 400;
  else if (normalizedBrands.startsWith(normalizedQuery)) score += 260;
  else if (normalizedBrands.includes(normalizedQuery)) score += 180;

  for (const token of tokens) {
    if (normalizedName.includes(token)) score += 40;
    if (normalizedBrands.includes(token)) score += 30;
  }

  if (product.product_name) score += 10;
  if (product.brands) score += 5;
  if (product.ingredients_text) score += 3;
  if (product.image_front_thumb_url || product.image_thumb_url) score += 2;

  return score;
}

export async function fetchProduct(barcode: string): Promise<OFFProduct> {
  const data = await fetchJson<OFFProductResponse>(
    `${OPEN_FOOD_FACTS_BASE_URL}/api/v0/product/${barcode}.json`,
  );

  if (data.status === 0 || !data.product) {
    throw new ProductNotFoundError(barcode);
  }

  return data.product;
}

export async function searchProducts(
  query: string,
  pageSize = 12,
): Promise<OFFProduct[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  try {
    const data = await fetchJson<OFFSearchALiciousResponse>(
      `${OPEN_FOOD_FACTS_SEARCH_URL}?q=${encodeURIComponent(
        trimmedQuery,
      )}&page_size=${pageSize}&fields=code,product_name,brands,image_front_thumb_url,image_thumb_url`,
    );

    const hits = (data.hits ?? [])
      .map(normalizeSearchHit)
      .filter((product) => Boolean(product.code));

    if (hits.length > 0) {
      return hits;
    }
  } catch (error) {
    if (!(error instanceof NetworkError)) {
      throw error;
    }
  }

  const legacyData = await fetchJson<OFFSearchResponse>(
    `${OPEN_FOOD_FACTS_BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(
      trimmedQuery,
    )}&search_simple=1&action=process&json=1&page_size=${pageSize}`,
  );

  return (legacyData.products ?? []).filter((product) => Boolean(product.code));
}

export async function searchProduct(query: string): Promise<string> {
  const matches = await searchProducts(query, 16);
  const bestMatch = matches
    .map((product) => ({
      barcode: product.code ?? "",
      score: scoreSearchMatch(query, product),
    }))
    .sort((left, right) => right.score - left.score)[0];

  if (!bestMatch?.barcode) {
    throw new ProductSearchNotFoundError(query);
  }

  return bestMatch.barcode;
}

export async function findProductByQuery(
  query: string,
): Promise<OFFResolvedProduct> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    throw new ProductSearchNotFoundError(query);
  }

  if (BARCODE_REGEX.test(trimmedQuery)) {
    const product = await fetchProduct(trimmedQuery);
    return { barcode: trimmedQuery, product };
  }

  const barcode = await searchProduct(trimmedQuery);
  const product = await fetchProduct(barcode);

  return { barcode, product };
}
