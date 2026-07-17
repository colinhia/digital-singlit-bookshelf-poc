import { neon } from "@neondatabase/serverless";
import type { Book, Language } from "@/types/library";

interface BookRow {
  serial_number: number;
  language: Language;
  barcode: string;
  title: string;
  author: string;
  location_code: string;
  call_number: string;
}

export async function getBooks(): Promise<Book[]> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured. Connect the Neon database to this environment.");
  }

  const sql = neon(connectionString);
  const rows = await sql`
    SELECT serial_number, language, barcode, title, author, location_code, call_number
    FROM books
    ORDER BY serial_number ASC
  ` as BookRow[];

  return rows.map((row) => ({
    serialNumber: row.serial_number,
    language: row.language,
    barcode: row.barcode,
    title: row.title,
    author: row.author,
    locationCode: row.location_code,
    callNumber: row.call_number,
  }));
}
