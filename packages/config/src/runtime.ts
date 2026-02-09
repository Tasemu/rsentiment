import { getBaseEnv } from "./env.js";

export function isProduction(): boolean {
  return getBaseEnv().NODE_ENV === "production";
}
