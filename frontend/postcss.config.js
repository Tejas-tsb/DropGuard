import { fileURLToPath } from 'node:url'

export default {
  plugins: {
    // Resolve relative to this file so npm workspaces use the frontend theme
    // whether Vite is started from the frontend folder or the monorepo root.
    tailwindcss: { config: fileURLToPath(new URL('./tailwind.config.js', import.meta.url)) },
    autoprefixer: {},
  },
}
