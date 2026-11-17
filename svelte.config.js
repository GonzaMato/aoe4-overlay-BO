// Tauri no tiene servidor Node, así que se genera un sitio estático (adapter-static).
// Las dos páginas (gestión y overlay) se prerenderizan: ver src/routes/+layout.ts.
// Más info: https://v2.tauri.app/start/frontend/sveltekit/
import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
  },
};

export default config;
