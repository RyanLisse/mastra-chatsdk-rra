// import type { StagehandConfig } from "stagehand";

const config: any = {
  env: "LOCAL", // or "BROWSERBASE"
  apiKey: process.env.STAGEHAND_API_KEY,
  projectId: process.env.STAGEHAND_PROJECT_ID,
  verbose: 1,
  debugDom: true,
  headless: process.env.CI === "true",
  domSettleTimeoutMs: 30_000,
};

export default config;