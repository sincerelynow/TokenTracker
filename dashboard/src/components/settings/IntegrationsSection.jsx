import React, { useState } from "react";
import { Check, Plug, RefreshCw, Unplug } from "lucide-react";
import { triggerLocalSync } from "../../lib/api";
import { copy } from "../../lib/copy";
import { Button, ConfirmModal } from "../../ui/components";
import { SectionCard, SettingsRow } from "./Controls.jsx";

export function IntegrationsSection({ integrationState }) {
  const { integrations, error, pendingProvider, mutate, refresh = async () => {} } = integrationState;
  const [uninstallTarget, setUninstallTarget] = useState(null);
  const [syncState, setSyncState] = useState("idle");
  const [syncError, setSyncError] = useState(null);

  const runMutation = async (provider, action) => {
    try {
      await mutate(provider, action);
      if (action === "uninstall") setUninstallTarget(null);
    } catch {
      // The hook exposes the error in this section.
    }
  };

  const syncNow = async () => {
    setSyncState("syncing");
    setSyncError(null);
    try {
      await triggerLocalSync();
      await refresh();
      setSyncState("success");
    } catch (nextError) {
      setSyncError(nextError);
      setSyncState("error");
    }
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title={copy("settings.integrations.title")}
        subtitle={copy("settings.integrations.subtitle")}
        action={
          <Button type="button" size="sm" variant="secondary" onClick={syncNow} disabled={syncState === "syncing"}>
            {syncState === "success" ? <Check className="mr-1.5 h-4 w-4" aria-hidden /> : <RefreshCw className={`mr-1.5 h-4 w-4 ${syncState === "syncing" ? "animate-spin" : ""}`} aria-hidden />}
            {syncState === "syncing" ? copy("settings.integrations.syncing") : copy("settings.integrations.sync_now")}
          </Button>
        }
      >
        {integrations.map((integration) => {
          const pending = pendingProvider === integration.id;
          const status = integration.installed
            ? copy("settings.integrations.status.installed")
            : integration.detected
              ? copy("settings.integrations.status.available")
              : copy("settings.integrations.status.not_detected");
          return (
            <SettingsRow
              key={integration.id}
              label={integration.label}
              hint={`${status} · ${integration.detail}`}
              control={integration.actionable ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={Boolean(pendingProvider)}
                  onClick={() => integration.installed
                    ? setUninstallTarget(integration)
                    : runMutation(integration.id, "install")}
                >
                  {integration.installed ? <Unplug className="mr-1.5 h-4 w-4" aria-hidden /> : <Plug className="mr-1.5 h-4 w-4" aria-hidden />}
                  {pending
                    ? copy("settings.integrations.working")
                    : integration.installed
                      ? copy("settings.integrations.uninstall")
                      : copy("settings.integrations.install")}
                </Button>
              ) : null}
            />
          );
        })}
        {error ? <p role="alert" className="py-2 text-xs text-red-600 dark:text-red-400">{copy("settings.integrations.error", { error: error.message })}</p> : null}
        {syncState === "success" ? <p role="status" className="py-2 text-xs text-emerald-600 dark:text-emerald-400">{copy("settings.integrations.sync_success")}</p> : null}
        {syncState === "error" ? <p role="alert" className="py-2 text-xs text-red-600 dark:text-red-400">{copy("settings.integrations.sync_error", { error: syncError?.message || "" })}</p> : null}
      </SectionCard>

      <ConfirmModal
        open={Boolean(uninstallTarget)}
        title={copy("settings.integrations.confirm.title")}
        description={copy("settings.integrations.confirm.description", { provider: uninstallTarget?.label || "" })}
        confirmLabel={copy("settings.integrations.uninstall")}
        cancelLabel={copy("settings.integrations.cancel")}
        destructive
        busy={pendingProvider === uninstallTarget?.id}
        onConfirm={() => runMutation(uninstallTarget.id, "uninstall")}
        onCancel={() => setUninstallTarget(null)}
      />
    </div>
  );
}
