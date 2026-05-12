import { AppBridgeProvider, useAppBridge } from "@saleor/app-sdk/app-bridge";
import type { PropsWithChildren } from "react";

function ReadyApp({ children }: PropsWithChildren) {
  const { appBridgeState } = useAppBridge();
  const isReady = appBridgeState?.ready ?? false;

  // Support standalone development mode (set SALEOR_UI_APP_TOKEN env var)
  const devToken = window.SALEOR_UI_APP_TOKEN;
  const isStandalone = !appBridgeState?.saleorApiUrl && devToken;

  if (!isReady && !isStandalone) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>Loading...</div>
    );
  }

  return <>{children}</>;
}

export function SaleorAppsProvider({ children }: PropsWithChildren) {
  return (
    <AppBridgeProvider>
      <ReadyApp>{children}</ReadyApp>
    </AppBridgeProvider>
  );
}
