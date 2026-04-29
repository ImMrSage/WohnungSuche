import { fetchDemoListings } from "./demo-source.js";
import { fetchFileListings } from "./file-source.js";

export async function fetchAllListings(config) {
  const sources = [];

  if (config.enableDemoSource) {
    sources.push(fetchDemoListings());
  }

  sources.push(fetchFileListings(config.dataDir));

  const results = await Promise.all(sources);
  return results.flat();
}
