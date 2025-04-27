import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    GOOGLE_PROJECT_ID: z.string(),
    /**
     * For mac OS, /Users/$Username/.config/gcloud/application_default_credentials.json
     */
    GOOGLE_APPLICATION_CREDENTIALS: z.string(),
    MAX_RESPONSE_SIZE: z.string().default("30000"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
