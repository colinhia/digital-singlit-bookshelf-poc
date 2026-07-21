import type { Metadata } from "next";
import { getBooks } from "@/data/books";
import MyLibrary from "@/experiences/mylibrary/MyLibrary";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Library | Digital SingLit Bookshelf PoC",
  description: "Curate a personal reading room using the SingLit catalogue.",
};

export default async function MyLibraryPage() {
  const books = await getBooks();
  return <MyLibrary books={books} />;
}

