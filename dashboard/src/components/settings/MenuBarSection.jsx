import { Link } from "react-router-dom";
import { Activity, ArrowUpRight, Download, RefreshCw } from "lucide-react";
import { useNativeSettings } from "../../hooks/use-native-settings.js";
import { STATUSPAGE_URL } from "../../lib/config";
import { copy } from "../../lib/copy";
import { cn } from "../../lib/cn";
import { isNativeWindowsApp } from "../../lib/native-bridge.js";
import { SectionCard, SettingsRow, ToggleSwitch } from "./Controls.jsx";

export function MenuBarSection() {
  const { available, settings, setSetting, runAction } = useNativeSettings();
  if (!available) return null;
  const isWindows = isNativeWindowsApp();

  // showStats + animatedIcon live on the Widgets page (Menu Bar section) where
  // they sit next to the live preview. This section keeps only the system-level
  // toggles + actions that don't have a visual analogue.
  const launchAtLogin = Boolean(settings?.launchAtLogin);
  const toastOnReset = settings?.toastOnReset !== false;
  const confettiOnReset = settings?.confettiOnReset !== false;
  const launchAtLoginSupported = settings?.launchAtLoginSupported !== false;
  const autoUpdateEnabled = settings?.autoUpdateEnabled !== false;
  const updateStatus = settings?.updateStatus || null;
  const updateBusy = Boolean(settings?.updateBusy);
  const isSyncing = Boolean(settings?.isSyncing);

  return (
    <SectionCard title={copy("settings.section.menubar")}>
      {!isWindows ? (
        <>
          <SettingsRow
            label={copy("settings.menubar.appearance")}
            hint={copy("settings.menubar.appearanceHint")}
            control={
              <Link
                to="/widgets"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-oai-gray-200 px-3 text-xs font-medium text-oai-gray-700 no-underline transition-colors hover:bg-oai-gray-100 dark:border-oai-gray-800 dark:text-oai-gray-300 dark:hover:bg-oai-gray-800"
              >
                {copy("settings.menubar.appearanceLink")}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />
          <SettingsRow
            label={copy("settings.menubar.toastOnReset")}
            hint={copy("settings.menubar.toastOnResetHint")}
            control={
              <ToggleSwitch
                checked={toastOnReset}
                onChange={() => setSetting("toastOnReset", !toastOnReset)}
                ariaLabel={copy("settings.menubar.toastOnReset")}
              />
            }
          />
          <SettingsRow
            label={copy("settings.menubar.confettiOnReset")}
            hint={copy("settings.menubar.confettiOnResetHint")}
            control={
              <ToggleSwitch
                checked={confettiOnReset}
                onChange={() => setSetting("confettiOnReset", !confettiOnReset)}
                ariaLabel={copy("settings.menubar.confettiOnReset")}
              />
            }
          />
        </>
      ) : null}
      {launchAtLoginSupported ? (
        <SettingsRow
          label={copy("settings.menubar.launchAtLogin")}
          hint={copy("settings.menubar.launchAtLoginHint")}
          control={
            <ToggleSwitch
              checked={launchAtLogin}
              onChange={() => setSetting("launchAtLogin", !launchAtLogin)}
              ariaLabel={copy("settings.menubar.launchAtLogin")}
            />
          }
        />
      ) : null}
      <SettingsRow
        label={copy("settings.menubar.syncNow")}
        hint={copy("settings.menubar.syncNowHint")}
        control={
          <button
            type="button"
            onClick={() => runAction("syncNow")}
            disabled={isSyncing}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-oai-gray-200 px-3 text-xs font-medium text-oai-gray-700 transition-colors hover:bg-oai-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-oai-gray-800 dark:text-oai-gray-300 dark:hover:bg-oai-gray-800"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} aria-hidden />
            {isSyncing ? copy("settings.menubar.syncing") : copy("settings.menubar.syncNow")}
          </button>
        }
      />
      {isWindows ? (
        <>
          <SettingsRow
            label={copy("settings.menubar.autoUpdate")}
            hint={copy("settings.menubar.autoUpdateHint")}
            control={
              <ToggleSwitch
                checked={autoUpdateEnabled}
                onChange={() => setSetting("autoUpdateEnabled", !autoUpdateEnabled)}
                ariaLabel={copy("settings.menubar.autoUpdate")}
              />
            }
          />
          <SettingsRow
            label={copy("settings.menubar.updates")}
            hint={updateStatus || undefined}
            control={
              <button
                type="button"
                onClick={() => runAction("checkForUpdates")}
                disabled={updateBusy}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-oai-gray-200 px-3 text-xs font-medium text-oai-gray-700 transition-colors hover:bg-oai-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-oai-gray-800 dark:text-oai-gray-300 dark:hover:bg-oai-gray-800"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                {copy("settings.menubar.checkUpdates")}
              </button>
            }
          />
        </>
      ) : null}
    </SectionCard>
  );
}

export function NativeAppFooter() {
  const { available, settings, runAction } = useNativeSettings();
  const showNativeInfo = available && settings?.version;
  const nativePlatform = settings?.platform || "macos";
  const currentVersion = import.meta.env.VITE_APP_VERSION || "0.64.2";

  return (
    <div className="mt-6 flex flex-col items-center justify-center gap-4 text-xs text-oai-gray-500 dark:text-oai-gray-500">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {showNativeInfo ? (
          <>
            <span>
              {nativePlatform === "windows"
                ? copy("settings.menubar.updates.footerCore", { version: settings.version })
                : copy("settings.menubar.updates.footerCombined", {
                    barVersion: settings.version,
                    coreVersion: currentVersion,
                  })}
            </span>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={() => runAction("openAbout")}
              className="underline-offset-2 transition-colors hover:text-oai-gray-700 hover:underline dark:hover:text-oai-gray-300"
            >
              GitHub
            </button>
            <span aria-hidden>·</span>
          </>
        ) : (
          <>
            <span>{copy("settings.menubar.updates.footerCore", { version: currentVersion })}</span>
            <span aria-hidden>·</span>
          </>
        )}
        <a
          href={STATUSPAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 underline-offset-2 transition-colors hover:text-oai-gray-700 hover:underline dark:hover:text-oai-gray-300"
        >
          <Activity className="h-3.5 w-3.5" aria-hidden />
          {copy("settings.footer.statusPage")}
        </a>
      </div>
    </div>
  );
}
