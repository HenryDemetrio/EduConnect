const BASE_URL = import.meta.env.VITE_API_URL || "https://localhost:7071";

export async function apiRequest(path, options = {}) {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const token = localStorage.getItem("token");

  const headers = new Headers(options.headers || {});
  if (!headers.has("accept")) headers.set("accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const isFormData = options.body instanceof FormData;
  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const resp = await fetch(url, { ...options, headers });

  if (resp.status === 204) return null;

  const contentType = resp.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!resp.ok) {
    let payload = null;
    try {
      payload = isJson ? await resp.json() : await resp.text();
    } catch {
      payload = null;
    }
    const err = new Error("API Error");
    err.status = resp.status;
    err.payload = payload;
    throw err;
  }

  return isJson ? resp.json() : resp.text();
}

export async function apiJson(path, method = "GET", body = null) {
  return apiRequest(path, {
    method,
    body: body ? JSON.stringify(body) : null,
  });
}

export async function apiDownloadPdf(path, filename = "arquivo.pdf") {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const token = localStorage.getItem("token");

  const headers = new Headers();
  headers.set("accept", "application/pdf");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const resp = await fetch(url, { method: "GET", headers });
  if (!resp.ok) {
    const err = new Error("Download Error");
    err.status = resp.status;
    throw err;
  }

  const blob = await resp.blob();
  const blobUrl = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
}
