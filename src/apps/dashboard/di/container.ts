import { createGlobalContainer } from "@/di/container";
import { APP_CONFIG } from "../config";

export const container = createGlobalContainer(APP_CONFIG);

export type DashboardContainer = typeof container;
