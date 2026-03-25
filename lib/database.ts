import * as SQLite from "expo-sqlite";
import {
  ClassificationEvidence,
  ClassificationStatus,
  FlaggedIngredient,
} from "./halal-classifier";
import { StoredProductDetails } from "./open-food-facts";

export interface ScanRecord {
  id: number;
  barcode: string;
  product_name: string;
  brand: string;
  classification: ClassificationStatus;
  ingredients_text: string;
  flagged_ingredients_json: string;
  evidence_json: string;
  product_details_json: string;
  thumbnail_url: string;
  scanned_at: string;
}

export interface SaveScanInput {
  barcode: string;
  product_name: string;
  brand: string;
  classification: ClassificationStatus;
  ingredients_text: string;
  flagged_ingredients: FlaggedIngredient[];
  evidence: ClassificationEvidence[];
  product_details: StoredProductDetails;
  thumbnail_url: string;
}

let db: SQLite.SQLiteDatabase | null = null;

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("halaleats.db");
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT NOT NULL,
      product_name TEXT NOT NULL DEFAULT '',
      brand TEXT NOT NULL DEFAULT '',
      classification TEXT NOT NULL,
      ingredients_text TEXT NOT NULL DEFAULT '',
      flagged_ingredients_json TEXT NOT NULL DEFAULT '[]',
      evidence_json TEXT NOT NULL DEFAULT '[]',
      product_details_json TEXT NOT NULL DEFAULT '{}',
      thumbnail_url TEXT NOT NULL DEFAULT '',
      scanned_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_scans_barcode ON scans(barcode);
  `);
  await ensureColumn(
    db,
    "scans",
    "evidence_json",
    "TEXT NOT NULL DEFAULT '[]'",
  );
  await ensureColumn(
    db,
    "scans",
    "product_details_json",
    "TEXT NOT NULL DEFAULT '{}'",
  );
  return db;
}

async function ensureColumn(
  database: SQLite.SQLiteDatabase,
  tableName: string,
  columnName: string,
  definition: string,
): Promise<void> {
  const columns = await database.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${tableName})`,
  );

  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  await database.execAsync(
    `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`,
  );
}

export async function saveScan(input: SaveScanInput): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO scans (barcode, product_name, brand, classification,
       ingredients_text, flagged_ingredients_json, evidence_json, product_details_json, thumbnail_url, scanned_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(barcode) DO UPDATE SET
       product_name = excluded.product_name,
       brand = excluded.brand,
       classification = excluded.classification,
       ingredients_text = excluded.ingredients_text,
       flagged_ingredients_json = excluded.flagged_ingredients_json,
       evidence_json = excluded.evidence_json,
       product_details_json = excluded.product_details_json,
       thumbnail_url = excluded.thumbnail_url,
       scanned_at = excluded.scanned_at`,
    [
      input.barcode,
      input.product_name,
      input.brand,
      input.classification,
      input.ingredients_text,
      JSON.stringify(input.flagged_ingredients),
      JSON.stringify(input.evidence),
      JSON.stringify(input.product_details),
      input.thumbnail_url,
      now,
    ],
  );
}

export async function getRecentScans(limit = 20): Promise<ScanRecord[]> {
  const database = await getDatabase();
  return database.getAllAsync<ScanRecord>(
    `SELECT * FROM scans ORDER BY scanned_at DESC LIMIT ?`,
    [limit],
  );
}

export async function getScanByBarcode(
  barcode: string,
): Promise<ScanRecord | null> {
  const database = await getDatabase();
  return database.getFirstAsync<ScanRecord>(
    `SELECT * FROM scans WHERE barcode = ?`,
    [barcode],
  );
}

export async function clearAllScans(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM scans`);
}
