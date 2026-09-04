import React, { useEffect, useMemo, useState } from "react";
import { FolderPlus, Save, Trash2 } from "lucide-react";
import { copy } from "../../lib/copy";
import { Button } from "../../ui/components";
import { SectionCard } from "./Controls.jsx";

function editableRoots(roots) {
  return (roots || [])
    .filter((root) => root.origin !== "wsl")
    .map((root) => ({ path: root.path, key: root.key, label: root.label }));
}

export function CodexRootsSettings({ rootsState }) {
  const { roots, saving, error, max_roots: maxRoots = 16, save } = rootsState;
  const [drafts, setDrafts] = useState(() => editableRoots(roots));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDrafts(editableRoots(roots));
  }, [roots]);

  const duplicateIndexes = useMemo(() => {
    const seen = new Map();
    const duplicates = new Set();
    drafts.forEach((value, index) => {
      const key = value.path.trim().replace(/[\\/]+$/, "").toLowerCase();
      if (!key) return;
      if (seen.has(key)) {
        duplicates.add(seen.get(key));
        duplicates.add(index);
      } else {
        seen.set(key, index);
      }
    });
    return duplicates;
  }, [drafts]);

  const updateDraft = (index, value) => {
    setSaved(false);
    setDrafts((current) => current.map((entry, entryIndex) => (
      entryIndex === index ? { ...entry, path: value } : entry
    )));
  };

  const submit = async () => {
    setSaved(false);
    try {
      await save(drafts);
      setSaved(true);
    } catch {
      // The hook exposes the server error in this section.
    }
  };

  return (
    <SectionCard
      title={copy("settings.codex_roots.title")}
      subtitle={copy("settings.codex_roots.subtitle")}
      action={
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setDrafts((current) => [...current, { path: "" }])}
          disabled={saving || drafts.length >= maxRoots}
          title={copy("settings.codex_roots.add")}
        >
          <FolderPlus className="mr-1.5 h-4 w-4" aria-hidden />
          {copy("settings.codex_roots.add")}
        </Button>
      }
    >
      <div className="space-y-3 py-3">
        {drafts.map(function renderRoot(value, index) {
          const state = roots?.find(function findRoot(root) { return root.path === value.path; });
          const duplicate = duplicateIndexes.has(index);
          return (
            <div key={index} className="flex min-w-0 items-start gap-2">
              <div className="min-w-0 flex-1">
                <input
                  value={value.path}
                  onChange={(event) => updateDraft(index, event.target.value)}
                  aria-label={copy("settings.codex_roots.path", { index: index + 1 })}
                  placeholder={copy("settings.codex_roots.placeholder")}
                  className="h-9 w-full rounded-md border border-oai-gray-200 bg-white px-3 text-sm text-oai-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-oai-brand-500 dark:border-oai-gray-700 dark:bg-oai-gray-900 dark:text-oai-gray-100"
                />
                <p className={`mt-1 text-xs ${duplicate ? "text-red-600 dark:text-red-400" : "text-oai-gray-500 dark:text-oai-gray-400"}`}>
                  {duplicate
                    ? copy("settings.codex_roots.duplicate")
                    : state?.has_sessions || state?.has_archived_sessions
                      ? copy("settings.codex_roots.detected")
                      : copy("settings.codex_roots.not_detected")}
                </p>
                {value.label ? (
                  <p className="mt-1 text-xs text-oai-gray-500 dark:text-oai-gray-400">
                    {copy("settings.codex_roots.stats_label", { label: value.label })}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setDrafts((current) => current.filter((_, entryIndex) => entryIndex !== index))}
                disabled={saving || drafts.length <= 1}
                aria-label={copy("settings.codex_roots.remove", { index: index + 1 })}
                title={copy("settings.codex_roots.remove", { index: index + 1 })}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-oai-gray-200 text-oai-gray-500 hover:bg-oai-gray-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-oai-gray-700 dark:hover:bg-oai-gray-800"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          );
        })}
        {(roots || []).filter((root) => root.origin === "wsl").map((root) => (
          <p key={root.path} className="text-xs text-oai-gray-500 dark:text-oai-gray-400">
            {copy("settings.codex_roots.wsl_detected", { path: root.path })}
          </p>
        ))}
        <div className="flex items-center justify-end gap-3 pt-1">
          {error ? <p role="alert" className="min-w-0 flex-1 text-xs text-red-600 dark:text-red-400">{copy("settings.codex_roots.error", { error: error.message })}</p> : null}
          {saved ? <p role="status" className="text-xs text-emerald-600 dark:text-emerald-400">{copy("settings.codex_roots.saved")}</p> : null}
          <Button type="button" size="sm" onClick={submit} disabled={saving || drafts.some((value) => !value.path.trim()) || duplicateIndexes.size > 0}>
            <Save className="mr-1.5 h-4 w-4" aria-hidden />
            {saving ? copy("settings.codex_roots.saving") : copy("settings.codex_roots.save")}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
