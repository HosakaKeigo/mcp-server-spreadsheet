import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    GOOGLE_PROJECT_ID: z.string(),
    MAX_RESPONSE_SIZE: z.string().default("30000"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});