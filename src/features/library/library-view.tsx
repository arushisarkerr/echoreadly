"use client";

import { useState } from "react";

import {
  IconFile,
  IconGrid,
  IconList,
  IconSearch,
  IconStar,
} from "@/components/icons/dashboard-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dropdown, DropdownItem, SelectField } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/constants";

export function LibraryView() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [filter, setFilter] = useState("all");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Library"
        description="Search, sort, and browse every imported document."
        breadcrumbs={[
          { label: "Home", href: ROUTES.dashboard },
          { label: "Library" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <IconGrid />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              aria-label="List view"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <IconList />
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, tag, or language…"
            leftSlot={<IconSearch />}
            aria-label="Search library"
          />
        </div>
        <SelectField
          label="Sort"
          value={sort}
          onChange={setSort}
          className="lg:w-44"
          options={[
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
            { value: "title", label: "Title" },
            { value: "duration", label: "Duration" },
          ]}
        />
        <SelectField
          label="Filter"
          value={filter}
          onChange={setFilter}
          className="lg:w-44"
          options={[
            { value: "all", label: "All sources" },
            { value: "pdf", label: "PDF" },
            { value: "web", label: "Websites" },
            { value: "youtube", label: "YouTube" },
            { value: "favorites", label: "Favorites" },
          ]}
        />
        <Dropdown label="Bulk actions" align="right">
          <DropdownItem>Multi select</DropdownItem>
          <DropdownItem>Rename</DropdownItem>
          <DropdownItem>Duplicate</DropdownItem>
          <DropdownItem>Delete</DropdownItem>
        </Dropdown>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge>Tags</Badge>
        <Badge tone="accent">Favorites</Badge>
        <Badge>Language</Badge>
        <Badge>Duration</Badge>
      </div>

      <EmptyState
        icon={<IconFile />}
        title="No documents in your library"
        description="Document cards will show a thumbnail, title, language, duration, created date, tags, and favorite controls."
        action={
          <Button
            variant="secondary"
            leftIcon={<IconStar className="size-3.5" />}
          >
            Mark favorites later
          </Button>
        }
      />

      <Card>
        <p className="text-sm text-muted">
          Pagination controls will appear here when your library grows. Grid and
          list layouts are ready via the view toggles above.
        </p>
      </Card>
    </div>
  );
}
