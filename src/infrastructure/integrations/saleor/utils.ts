import { Maybe } from "@/lib/utils/types";

export const getAppIdentifier = (name: string) => `${name.toLowerCase().replace(/\s+/g, "-")}.app`;

export const getTranslation = <K extends PropertyKey>(
  key: K,
  type: Maybe<
    Partial<Record<K, unknown>> & {
      translation?: Maybe<Partial<Record<K, unknown>>>;
    }
  >,
) => {
  const pick = (value: unknown) => (typeof value === "string" ? value : undefined);
  const translation = pick(type?.translation?.[key]);
  const direct = pick(type?.[key]);
  return (translation || direct || "").trim();
};
