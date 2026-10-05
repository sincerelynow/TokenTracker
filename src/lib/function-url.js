const PROD_API_URL = "https://srctyff5.us-east.insforge.app";

const PROD_FUNCTIONS_URL = "https://srctyff5.function2.insforge.app";

// Use only the production deployment verified by the platform. A custom or
// self-hosted API keeps its proxy route instead of sending credentials elsewhere.
function functionUrlFor(baseUrl, slug) {
  const root = String(baseUrl || "").trim().replace(/\/$/, "");
  return root === PROD_API_URL
    ? `${PROD_FUNCTIONS_URL}/${slug}`
    : `${root}/functions/${slug}`;
}

async function fetchFunctionResponse(url, init = {}, fetchImpl = fetch) {
  const response = await fetchImpl(url, init);
  const method = String(init.method || "GET").toUpperCase();
  const target = new URL(String(url));
  if (response.status === 404 && (method === "GET" || method === "HEAD")
      && target.origin === PROD_FUNCTIONS_URL) {
    const legacy = new URL(`${PROD_API_URL}/functions${target.pathname}`);
    legacy.search = target.search;
    return fetchImpl(legacy.toString(), init);
  }
  return response;
}

module.exports = { functionUrlFor, fetchFunctionResponse };
