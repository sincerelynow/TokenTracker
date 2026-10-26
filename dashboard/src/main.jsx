import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { InsforgeAuthProvider } from "./contexts/InsforgeAuthContext.jsx";
import { AccountViewProvider } from "./contexts/AccountViewContext.jsx";
import { LocaleProvider } from "./ui/foundation/LocaleProvider.jsx";
import { CurrencyProvider } from "./ui/foundation/CurrencyProvider.jsx";
import { TokenFormatProvider } from "./ui/foundation/TokenFormatProvider.jsx";
import App from "./App.jsx";
import { initAnalytics } from "./lib/analytics.js";
import { loadRuntimeInsforgeConfig } from "./lib/insforge-config";
import { initSentry } from "./lib/sentry.js";
import { DashboardRouteError } from "./components/DashboardRouteError.jsx";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";
import "@fontsource/geist-mono/700.css";
import "@fontsource/geist-mono/900.css";
import "./styles.css";

async function startDashboard() {
  await loadRuntimeInsforgeConfig();
  initSentry();
  initAnalytics();

  // Use createElement so adjacent JSX tags do not trip the UI copy scanner.
  const router = createBrowserRouter([
    {
      path: "*",
      element: React.createElement(App),
      errorElement: React.createElement(DashboardRouteError),
    },
  ]);

  createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <LocaleProvider>
        <TokenFormatProvider>
          <CurrencyProvider>
            <InsforgeAuthProvider>
              <AccountViewProvider>
                <RouterProvider router={router} />
              </AccountViewProvider>
            </InsforgeAuthProvider>
          </CurrencyProvider>
        </TokenFormatProvider>
      </LocaleProvider>
    </React.StrictMode>,
  );
}

void startDashboard();
