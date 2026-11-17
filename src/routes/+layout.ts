// Tauri no tiene servidor Node: la app corre como SPA (sin SSR).
// prerender genera index.html y overlay.html, una página por ventana.
export const ssr = false;
export const prerender = true;
