import { getEnv } from "./env.js";

export function isProduction(): boolean {
  return getEnv().NODE_ENV === "production";
}
