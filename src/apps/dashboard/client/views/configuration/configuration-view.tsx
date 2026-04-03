import { zodResolver } from "@hookform/resolvers/zod";
import { actions, useAppBridge } from "@saleor/app-sdk/app-bridge";
import { Box, Button, Input, Text } from "@saleor/macaw-ui";
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
    <Box padding={8} display="flex" flexDirection="column" gap={6}>
      <Box>
        <Text as="h1" size={7}>
          Configuration
        </Text>
        <Text as="p" size={4} color="default2">
          Manage your API keys for this Saleor instance.
        </Text>
      </Box>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Box
          display="flex"
          flexDirection="column"
          gap={5}
          borderWidth={1}
          borderStyle="solid"
          borderColor="default1"
          borderRadius={4}
          padding={6}
        >
          <Input
            label="Public API Key"
            {...register("publicApiKey")}
            error={!!errors.publicApiKey}
            helperText={errors.publicApiKey?.message}
          />

          <Input
            type="password"
            label="Private API Key"
            {...register("privateApiKey")}
            error={!!errors.privateApiKey}
            helperText={errors.privateApiKey?.message}
          />

          <Box>
            <Button type="submit" disabled={isSubmitting} size="large">
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </Box>
        </Box>
      </form>
    </Box>
  );
}
