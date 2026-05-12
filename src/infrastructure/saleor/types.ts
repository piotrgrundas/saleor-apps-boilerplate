export interface SaleorAppManifest {
  id: string;
  version: string;
  name: string;
  about?: string;
  permissions: string[];
  appUrl: string;
  configurationUrl?: string;
  tokenTargetUrl: string;
  dataPrivacy?: string;
  dataPrivacyUrl?: string;
  homepageUrl?: string;
  supportUrl?: string;
  brand?: {
    logo: {
      default: string;
    };
  };
  author?: string;
  webhooks?: SaleorWebhookManifest[];
  extensions?: SaleorExtensionManifest[];
}

export interface SaleorWebhookManifest {
  name: string;
  asyncEvents?: string[];
  syncEvents?: string[];
  query: string;
  targetUrl: string;
  isActive: boolean;
}

export interface SaleorExtensionManifest {
  label: string;
  mount: string;
  target: string;
  permissions: string[];
  url: string;
}
