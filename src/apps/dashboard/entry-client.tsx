import { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { SaleorAppsProvider } from "@/lib/client/components/saleor-apps-provider";

import { appBridge } from "./client/app-bridge";
import { AboutView } from "./client/views/about/about-view";
import {
  ConfigurationView,
  configurationLoader,
} from "./client/views/configuration/configuration-view";

const BASENAME = `${window.env?.BASE_PATH ?? ""}/client`;

/**
 * Router is constructed inside a component that only mounts AFTER
 * `SaleorAppsProvider` / `ReadyApp` confirms the AppBridge handshake. The
 * eager loader execution of `createBrowserRouter` would otherwise fire
 * before `appBridge.getState().token` is populated and the request would
 * leave without the auth header.
 */
function Router() {
  const router = useMemo(
    () =>
      createBrowserRouter(
        [
          {
            path: "/app",
            element: <AboutView />,
          },
          {
            path: "/configuration",
            loader: configurationLoader,
            element: <ConfigurationView />,
          },
        ],
        { basename: BASENAME },
      ),
    [],
  );

  return <RouterProvider router={router} />;
}

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(
    <StrictMode>
      <SaleorAppsProvider appBridgeInstance={appBridge}>
        <Router />
      </SaleorAppsProvider>
    </StrictMode>,
  );
}
