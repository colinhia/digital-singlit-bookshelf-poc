import type { Metadata } from "next";
import { getBooks } from "@/data/books";
import { mainBookshelf } from "@/data/bookshelves";
import Library from "@/experiences/singlit/Library";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The SingLit Room",
  description: "Step inside a digital library of Singapore literature.",
};

export default async function CollectionPage() {
  const books = await getBooks();
  return <Library books={books} bookshelf={mainBookshelf} />;
}
