"use client";

import { useState } from "react";

import { IconSettings } from "@/components/icons/dashboard-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/dropdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/overlays";
import { ROUTES } from "@/constants";
import { siteConfig } from "@/config";

export function SettingsView() {
  const [displayName, setDisplayName] = useState("Reader");
  const [language, setLanguage] = useState("bn");
  const [fontSize, setFontSize] = useState("md");
  const [speed, setSpeed] = useState("1");
  const [aiTone, setAiTone] = useState("clear");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Tune appearance, reading, audio, and AI preferences."
        breadcrumbs={[
          { label: "Home", href: ROUTES.dashboard },
          { label: "Settings" },
        ]}
      />

      <Tabs defaultValue="general">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="reading">Reading</TabsTrigger>
          <TabsTrigger value="audio">Audio</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-4">
          <Card>
            <CardHeader title="General" description="Basic workspace preferences." />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted">Display name</span>
                <Input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </label>
              <SelectField
                label="Interface language"
                value={language}
                onChange={setLanguage}
                options={[
                  { value: "bn", label: "বাংলা" },
                  { value: "en", label: "English" },
                ]}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-4 space-y-4">
          <Card>
            <CardHeader
              title="Appearance"
              description="Theme follows the header toggle and system preference."
            />
            <div className="flex flex-wrap gap-2">
              <Badge>Light</Badge>
              <Badge>Dark</Badge>
              <Badge tone="accent">System ready</Badge>
            </div>
            <p className="mt-4 text-sm text-muted">
              Use the sun/moon control in the header to switch themes instantly.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="reading" className="mt-4">
          <Card>
            <CardHeader title="Reading preferences" description="Comfort defaults for long documents." />
            <SelectField
              label="Font size"
              value={fontSize}
              onChange={setFontSize}
              className="max-w-xs"
              options={[
                { value: "sm", label: "Small" },
                { value: "md", label: "Medium" },
                { value: "lg", label: "Large" },
              ]}
            />
          </Card>
        </TabsContent>

        <TabsContent value="audio" className="mt-4">
          <Card>
            <CardHeader title="Audio preferences" description="Defaults for the listen player." />
            <SelectField
              label="Default speed"
              value={speed}
              onChange={setSpeed}
              className="max-w-xs"
              options={[
                { value: "0.75", label: "0.75×" },
                { value: "1", label: "1×" },
                { value: "1.25", label: "1.25×" },
                { value: "1.5", label: "1.5×" },
              ]}
            />
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <Card>
            <CardHeader title="AI preferences" description="Tone and detail for summaries and chat." />
            <SelectField
              label="Response style"
              value={aiTone}
              onChange={setAiTone}
              className="max-w-xs"
              options={[
                { value: "clear", label: "Clear & direct" },
                { value: "detailed", label: "Detailed" },
                { value: "brief", label: "Brief" },
              ]}
            />
          </Card>
        </TabsContent>

        <TabsContent value="shortcuts" className="mt-4">
          <Card>
            <CardHeader
              title="Keyboard shortcuts"
              description="Power-user controls across the dashboard."
              action={<IconSettings className="text-muted" />}
            />
            <ul className="divide-y divide-border/70 rounded-xl border border-border/70">
              {[
                ["Open command palette", "⌘ K"],
                ["Toggle sidebar", "⌘ B"],
                ["Quick import", "⌘ I"],
                ["Search", "/"],
              ].map(([action, keys]) => (
                <li
                  key={action}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="text-foreground">{action}</span>
                  <kbd className="rounded-md border border-border bg-surface-muted px-2 py-1 font-mono text-[11px] text-muted">
                    {keys}
                  </kbd>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted">
              Shortcut bindings are placeholders until preferences persist.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="about" className="mt-4">
          <Card>
            <CardHeader title="About" description={siteConfig.description} />
            <div className="space-y-2 text-sm text-muted">
              <p>
                <span className="font-medium text-foreground">{siteConfig.name}</span> — AI
                reading & listening.
              </p>
              <p>Version placeholder · Frontend foundation</p>
            </div>
            <Button variant="outline" size="sm" className="mt-5">
              View documentation later
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
