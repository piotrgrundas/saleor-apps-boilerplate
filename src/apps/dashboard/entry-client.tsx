import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { SaleorAppsProvider } from "@/lib/client/components/saleor-apps-provider";

import { AboutView } from "./client/views/about/about-view";
import {
  ConfigurationView,
  configurationLoader,
} from "./client/views/configuration/configuration-view";

const basePath = window.env?.BASE_PATH ?? "";

const router = createBrowserRouter(
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
  {
    basename: `${basePath}/client`,
  },
);

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(
    <StrictMode>
      <SaleorAppsProvider>
        <RouterProvider router={router} />
      </SaleorAppsProvider>
    </StrictMode>,
  );
}
