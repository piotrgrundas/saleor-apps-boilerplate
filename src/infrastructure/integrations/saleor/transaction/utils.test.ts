import { describe, expect } from "vite-plus/test";

import {
  getFailureEventType,
  getRequestEventType,
  getSuccessEventType,
} from "@/infrastructure/integrations/saleor/transaction/utils";
import { it } from "@/lib/test/it";

describe("transaction utils", () => {
  it("returns correct success event types", () => {
    expect(getSuccessEventType("CHARGE")).toBe("CHARGE_SUCCESS");
    expect(getSuccessEventType("REFUND")).toBe("REFUND_SUCCESS");
    expect(getSuccessEventType("CANCEL")).toBe("CANCEL_SUCCESS");
  });

  it("returns correct failure event types", () => {
    expect(getFailureEventType("CHARGE")).toBe("CHARGE_FAILURE");
    expect(getFailureEventType("REFUND")).toBe("REFUND_FAILURE");
  });

  it("returns correct request event types", () => {
    expect(getRequestEventType("CHARGE")).toBe("CHARGE_REQUEST");
    expect(getRequestEventType("REFUND")).toBe("REFUND_REQUEST");
  });
});
