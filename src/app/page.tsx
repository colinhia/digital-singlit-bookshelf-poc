import { books } from "@/data/books";
import { mainBookshelf } from "@/data/bookshelves";
import Library from "@/components/Library";

export default function Home() {
  return <Library books={books} bookshelf={mainBookshelf} />;
}
