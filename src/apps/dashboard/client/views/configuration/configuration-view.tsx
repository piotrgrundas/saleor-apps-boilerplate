import { zodResolver } from "@hookform/resolvers/zod";
import { actions, useAppBridge } from "@saleor/app-sdk/app-bridge";
import { hc } from "hono/client";
import { useForm } from "react-hook-form";
import { useLoaderData } from "react-router-dom";

import type { ConfigurationRoutes } from "@/apps/dashboard/api/rest/configuration/routes";
import { type AppSettings, appSettingsSchema } from "@/apps/dashboard/config/schema";

export const client = hc<ConfigurationRoutes>(`${window.env?.BASE_PATH ?? ""}/api/configuration`);

const saleorApiUrlParam = new URLSearchParams(window.location.search).get("saleorApiUrl") ?? "";
const saleorDomainParam = saleorApiUrlParam ? new URL(saleorApiUrlParam).hostname : "";

export async function configurationLoader() {
  if (!saleorDomainParam) return { publicApiKey: "", privateApiKey: "" };

  const response = await client.index.$get({
    header: { "saleor-domain": saleorDomainParam },
  });

  if (response.ok) {
    const json = await response.json();
    return json.data;
  }

  return { publicApiKey: "", privateApiKey: "" };
}

export function ConfigurationView() {
  const settings = useLoaderData() as AppSettings;
  const { appBridgeState, appBridge } = useAppBridge();

  const saleorApiUrl = appBridgeState?.saleorApiUrl ?? "";
  const saleorDomain = saleorApiUrl ? new URL(saleorApiUrl).hostname : "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: settings,
  });

  const onSubmit = async (data: AppSettings) => {
    try {
      const response = await client.index.$post({
        header: {
          "saleor-domain": saleorDomain,
        },
        json: data,
      });

      if (response.ok) {
        appBridge?.dispatch(
          actions.Notification({
            status: "success",
            title: "Success",
            text: "Configuration saved",
          }),
        );
      } else {
        appBridge?.dispatch(
          actions.Notification({
            status: "error",
            title: "Error",
            text: "Failed to save configuration",
          }),
        );
      }
    } catch {
      appBridge?.dispatch(
        actions.Notification({
          status: "error",
          title: "Error",
          text: "Failed to save configuration",
        }),
      );
    }
  };

  return (
    <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h1>Configuration</h1>
        <p style={{ color: "#666" }}>Manage your API keys for this Saleor instance.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            border: "1px solid #ddd",
            borderRadius: "0.5rem",
            padding: "1.5rem",
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span>Public API Key</span>
            <input
              {...register("publicApiKey")}
              aria-invalid={!!errors.publicApiKey}
              style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "0.25rem" }}
            />
            {errors.publicApiKey?.message ? (
              <span style={{ color: "#c00", fontSize: "0.875rem" }}>
                {errors.publicApiKey.message}
              </span>
            ) : null}
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span>Private API Key</span>
            <input
              type="password"
              {...register("privateApiKey")}
              aria-invalid={!!errors.privateApiKey}
              style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "0.25rem" }}
            />
            {errors.privateApiKey?.message ? (
              <span style={{ color: "#c00", fontSize: "0.875rem" }}>
                {errors.privateApiKey.message}
              </span>
            ) : null}
          </label>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#000",
                color: "#fff",
                border: "none",
                borderRadius: "0.25rem",
                cursor: isSubmitting ? "default" : "pointer",
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
