import type { StoredPdfObject } from "@/lib/storage";

import { LibraryCard } from "./library-card";

type LibraryGridProps = {
  items: StoredPdfObject[];
};

/**
 * Responsive grid of library PDF cards.
 */
export function LibraryGrid({ items }: LibraryGridProps) {
  return (
    <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <li key={item.storagePath}>
          <LibraryCard item={item} />
        </li>
      ))}
    </ul>
  );
}
