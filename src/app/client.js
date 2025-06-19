import { createClient } from "@sanity/client";

export default createClient({
  projectId: "hk3ruh08",
  dataset: "production",
  useCdn: true,
  apiVersion: "2023-01-01",
});
