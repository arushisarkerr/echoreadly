"use client";

import { useState } from "react";

import {
  IconListen,
  IconPause,
  IconPlay,
  IconStop,
} from "@/components/icons/dashboard-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress";
import { SelectField } from "@/components/ui/dropdown";
import { ROUTES } from "@/constants";

export function ListenView() {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState("1");
  const [voice, setVoice] = useState("alloy");
  const [language, setLanguage] = useState("bn");
  const [volume, setVolume] = useState(80);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Listen"
        description="A premium player surface for natural AI audio."
        breadcrumbs={[
          { label: "Home", href: ROUTES.dashboard },
          { label: "Listen" },
        ]}
      />

      <Card className="overflow-hidden">
        <div className="border-b border-border/70 bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--accent)_16%,transparent),_transparent_60%)] px-5 py-6 sm:px-6">
          <Badge tone="accent">Now playing</Badge>
          <h2 className="font-display mt-3 text-2xl font-semibold text-foreground">
            No track selected
          </h2>
          <p className="mt-1 text-sm text-muted">
            Current track metadata will appear here.
          </p>
        </div>

        <div className="space-y-5 px-5 py-6 sm:px-6">
          <ProgressBar value={0} label="Playback position" />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="icon"
              aria-label={playing ? "Pause" : "Play"}
              onClick={() => setPlaying((value) => !value)}
            >
              {playing ? <IconPause /> : <IconPlay />}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Stop"
              onClick={() => setPlaying(false)}
            >
              <IconStop />
            </Button>
            <Button variant="outline" size="sm">
              Resume
            </Button>
            <label className="ml-auto flex items-center gap-2 text-xs text-muted">
              Volume
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="w-28 accent-[var(--accent)]"
                aria-label="Volume"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <SelectField
              label="Speed"
              value={speed}
              onChange={setSpeed}
              options={[
                { value: "0.75", label: "0.75×" },
                { value: "1", label: "1×" },
                { value: "1.25", label: "1.25×" },
                { value: "1.5", label: "1.5×" },
                { value: "2", label: "2×" },
              ]}
            />
            <SelectField
              label="Voice"
              value={voice}
              onChange={setVoice}
              options={[
                { value: "alloy", label: "Alloy" },
                { value: "verse", label: "Verse" },
                { value: "nova", label: "Nova" },
              ]}
            />
            <SelectField
              label="Language"
              value={language}
              onChange={setLanguage}
              options={[
                { value: "bn", label: "বাংলা" },
                { value: "en", label: "English" },
              ]}
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Queue" description="Up next while you listen." />
          <EmptyState
            icon={<IconListen />}
            title="Queue is empty"
            description="Queued chapters and documents will show here."
            className="py-10"
          />
        </Card>
        <Card>
          <CardHeader title="Playlist" description="Saved listening sets." />
          <EmptyState
            title="No playlists yet"
            description="Create playlists later to group related listens."
            className="py-10"
          />
        </Card>
      </div>
    </div>
  );
}
