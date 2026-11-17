import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [tailwindcss(), svelte()],
  // the published build is served from GitHub Pages at /sro_dtes_visualization/
  base: command === 'build' ? '/sro_dtes_visualization/' : '/',
}))
