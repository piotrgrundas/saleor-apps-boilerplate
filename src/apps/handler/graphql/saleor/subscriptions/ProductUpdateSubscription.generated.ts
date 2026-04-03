import * as Types from "../../../../../graphql/saleor/schema";

import { DocumentTypeDecoration } from "@graphql-typed-document-node/core";
export type ProductUpdatedSubscriptionVariables = Types.Exact<{ [key: string]: never }>;

export type ProductUpdatedSubscription = {
  __typename?: "Subscription";
  event?:
    | { __typename?: "AccountChangeEmailRequested" }
    | { __typename?: "AccountConfirmationRequested" }
    | { __typename?: "AccountConfirmed" }
    | { __typename?: "AccountDeleteRequested" }
    | { __typename?: "AccountDeleted" }
    | { __typename?: "AccountEmailChanged" }
    | { __typename?: "AccountSetPasswordRequested" }
    | { __typename?: "AddressCreated" }
    | { __typename?: "AddressDeleted" }
    | { __typename?: "AddressUpdated" }
    | { __typename?: "AppDeleted" }
    | { __typename?: "AppInstalled" }
    | { __typename?: "AppStatusChanged" }
    | { __typename?: "AppUpdated" }
    | { __typename?: "AttributeCreated" }
    | { __typename?: "AttributeDeleted" }
    | { __typename?: "AttributeUpdated" }
    | { __typename?: "AttributeValueCreated" }
    | { __typename?: "AttributeValueDeleted" }
    | { __typename?: "AttributeValueUpdated" }
    | { __typename?: "CalculateTaxes" }
    | { __typename?: "CategoryCreated" }
    | { __typename?: "CategoryDeleted" }
    | { __typename?: "CategoryUpdated" }
    | { __typename?: "ChannelCreated" }
    | { __typename?: "ChannelDeleted" }
    | { __typename?: "ChannelMetadataUpdated" }
    | { __typename?: "ChannelStatusChanged" }
    | { __typename?: "ChannelUpdated" }
    | { __typename?: "CheckoutCreated" }
    | { __typename?: "CheckoutFilterShippingMethods" }
    | { __typename?: "CheckoutFullyAuthorized" }
    | { __typename?: "CheckoutFullyPaid" }
    | { __typename?: "CheckoutMetadataUpdated" }
    | { __typename?: "CheckoutUpdated" }
    | { __typename?: "CollectionCreated" }
    | { __typename?: "CollectionDeleted" }
    | { __typename?: "CollectionMetadataUpdated" }
    | { __typename?: "CollectionUpdated" }
    | { __typename?: "CustomerCreated" }
    | { __typename?: "CustomerMetadataUpdated" }
    | { __typename?: "CustomerUpdated" }
    | { __typename?: "DraftOrderCreated" }
    | { __typename?: "DraftOrderDeleted" }
    | { __typename?: "DraftOrderUpdated" }
    | { __typename?: "FulfillmentApproved" }
    | { __typename?: "FulfillmentCanceled" }
    | { __typename?: "FulfillmentCreated" }
    | { __typename?: "FulfillmentMetadataUpdated" }
    | { __typename?: "FulfillmentTrackingNumberUpdated" }
    | { __typename?: "GiftCardCreated" }
    | { __typename?: "GiftCardDeleted" }
    | { __typename?: "GiftCardExportCompleted" }
    | { __typename?: "GiftCardMetadataUpdated" }
    | { __typename?: "GiftCardSent" }
    | { __typename?: "GiftCardStatusChanged" }
    | { __typename?: "GiftCardUpdated" }
    | { __typename?: "InvoiceDeleted" }
    | { __typename?: "InvoiceRequested" }
    | { __typename?: "InvoiceSent" }
    | { __typename?: "ListStoredPaymentMethods" }
    | { __typename?: "MenuCreated" }
    | { __typename?: "MenuDeleted" }
    | { __typename?: "MenuItemCreated" }
    | { __typename?: "MenuItemDeleted" }
    | { __typename?: "MenuItemUpdated" }
    | { __typename?: "MenuUpdated" }
    | { __typename?: "OrderBulkCreated" }
    | { __typename?: "OrderCancelled" }
    | { __typename?: "OrderConfirmed" }
    | { __typename?: "OrderCreated" }
    | { __typename?: "OrderExpired" }
    | { __typename?: "OrderFilterShippingMethods" }
    | { __typename?: "OrderFulfilled" }
    | { __typename?: "OrderFullyPaid" }
    | { __typename?: "OrderFullyRefunded" }
    | { __typename?: "OrderMetadataUpdated" }
    | { __typename?: "OrderPaid" }
    | { __typename?: "OrderRefunded" }
    | { __typename?: "OrderUpdated" }
    | { __typename?: "PageCreated" }
    | { __typename?: "PageDeleted" }
    | { __typename?: "PageTypeCreated" }
    | { __typename?: "PageTypeDeleted" }
    | { __typename?: "PageTypeUpdated" }
    | { __typename?: "PageUpdated" }
    | { __typename?: "PaymentAuthorize" }
    | { __typename?: "PaymentCaptureEvent" }
    | { __typename?: "PaymentConfirmEvent" }
    | { __typename?: "PaymentGatewayInitializeSession" }
    | { __typename?: "PaymentGatewayInitializeTokenizationSession" }
    | { __typename?: "PaymentListGateways" }
    | { __typename?: "PaymentMethodInitializeTokenizationSession" }
    | { __typename?: "PaymentMethodProcessTokenizationSession" }
    | { __typename?: "PaymentProcessEvent" }
    | { __typename?: "PaymentRefundEvent" }
    | { __typename?: "PaymentVoidEvent" }
    | { __typename?: "PermissionGroupCreated" }
    | { __typename?: "PermissionGroupDeleted" }
    | { __typename?: "PermissionGroupUpdated" }
    | { __typename?: "ProductCreated" }
    | { __typename?: "ProductDeleted" }
    | { __typename?: "ProductExportCompleted" }
    | { __typename?: "ProductMediaCreated" }
    | { __typename?: "ProductMediaDeleted" }
    | { __typename?: "ProductMediaUpdated" }
    | { __typename?: "ProductMetadataUpdated" }
    | {
        __typename?: "ProductUpdated";
        product?: {
          __typename?: "Product";
          id: string;
          name: string;
          slug: string;
          updatedAt: any;
        } | null;
      }
    | { __typename?: "ProductVariantBackInStock" }
    | { __typename?: "ProductVariantCreated" }
    | { __typename?: "ProductVariantDeleted" }
    | { __typename?: "ProductVariantMetadataUpdated" }
    | { __typename?: "ProductVariantOutOfStock" }
    | { __typename?: "ProductVariantStockUpdated" }
    | { __typename?: "ProductVariantUpdated" }
    | { __typename?: "PromotionCreated" }
    | { __typename?: "PromotionDeleted" }
    | { __typename?: "PromotionEnded" }
    | { __typename?: "PromotionRuleCreated" }
    | { __typename?: "PromotionRuleDeleted" }
    | { __typename?: "PromotionRuleUpdated" }
    | { __typename?: "PromotionStarted" }
    | { __typename?: "PromotionUpdated" }
    | { __typename?: "SaleCreated" }
    | { __typename?: "SaleDeleted" }
    | { __typename?: "SaleToggle" }
    | { __typename?: "SaleUpdated" }
    | { __typename?: "ShippingListMethodsForCheckout" }
    | { __typename?: "ShippingPriceCreated" }
    | { __typename?: "ShippingPriceDeleted" }
    | { __typename?: "ShippingPriceUpdated" }
    | { __typename?: "ShippingZoneCreated" }
    | { __typename?: "ShippingZoneDeleted" }
    | { __typename?: "ShippingZoneMetadataUpdated" }
    | { __typename?: "ShippingZoneUpdated" }
    | { __typename?: "ShopMetadataUpdated" }
    | { __typename?: "StaffCreated" }
    | { __typename?: "StaffDeleted" }
    | { __typename?: "StaffSetPasswordRequested" }
    | { __typename?: "StaffUpdated" }
    | { __typename?: "StoredPaymentMethodDeleteRequested" }
    | { __typename?: "ThumbnailCreated" }
    | { __typename?: "TransactionCancelationRequested" }
    | { __typename?: "TransactionChargeRequested" }
    | { __typename?: "TransactionInitializeSession" }
    | { __typename?: "TransactionItemMetadataUpdated" }
    | { __typename?: "TransactionProcessSession" }
    | { __typename?: "TransactionRefundRequested" }
    | { __typename?: "TranslationCreated" }
    | { __typename?: "TranslationUpdated" }
    | { __typename?: "VoucherCodeExportCompleted" }
    | { __typename?: "VoucherCodesCreated" }
    | { __typename?: "VoucherCodesDeleted" }
    | { __typename?: "VoucherCreated" }
    | { __typename?: "VoucherDeleted" }
    | { __typename?: "VoucherMetadataUpdated" }
    | { __typename?: "VoucherUpdated" }
    | { __typename?: "WarehouseCreated" }
    | { __typename?: "WarehouseDeleted" }
    | { __typename?: "WarehouseMetadataUpdated" }
    | { __typename?: "WarehouseUpdated" }
    | null;
};

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>["__apiType"]>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const ProductUpdatedDocument = new TypedDocumentString(`
    subscription ProductUpdated {
  event {
    ... on ProductUpdated {
      product {
        id
        name
        slug
        updatedAt
      }
    }
  }
}
    `) as unknown as TypedDocumentString<
  ProductUpdatedSubscription,
  ProductUpdatedSubscriptionVariables
>;
