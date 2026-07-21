import { getBooks } from "@/data/books";
import { mainBookshelf } from "@/data/bookshelves";
import Library from "@/experiences/singlit/Library";

export const dynamic = "force-dynamic";

export default async function Home() {
  const books = await getBooks();
  return <Library books={books} bookshelf={mainBookshelf} />;
}
