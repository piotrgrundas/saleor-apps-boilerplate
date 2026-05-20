import type { AppBridge } from "@saleor/app-sdk/app-bridge";
import { AppBridgeProvider, useAppBridge } from "@saleor/app-sdk/app-bridge";
import { type ReactNode, useEffect, useState } from "react";

function ReadyApp({ children }: { children: ReactNode }) {
  const { appBridge, appBridgeState } = useAppBridge();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!appBridge || isReady) return;

    const state = appBridge.getState();

    /**
     * Empty `saleorApiUrl` = SPA is not inside a Saleor iframe. Skip the
     * handshake gate and run in standalone-dev mode (requires the SPA to
     * call APIs that tolerate missing auth, e.g. dev-bypassed middleware).
     */
    if (!state.saleorApiUrl) {
      setIsReady(true);
      return;
    }

    if (state.ready) {
      setIsReady(true);
    }
  }, [appBridge, appBridgeState, isReady]);

  if (!isReady) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
        Initializing…
      </div>
    );
  }

  return <>{children}</>;
}

export function SaleorAppsProvider({
  appBridgeInstance,
  children,
}: {
  appBridgeInstance: AppBridge;
  children: ReactNode;
}) {
  return (
    <AppBridgeProvider appBridgeInstance={appBridgeInstance}>
      <ReadyApp>{children}</ReadyApp>
    </AppBridgeProvider>
  );
}
