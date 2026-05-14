export const getAppIdentifier = (name: string) => `${name.toLowerCase().replace(/\s+/g, "-")}.app`;
