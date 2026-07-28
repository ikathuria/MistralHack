import { existsSync, renameSync, rmSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'

// vite-plugin-cesium copies Cesium's static assets into `<outDir>/<base>/cesium`,
// treating the base as a real subdirectory. GitHub Pages, however, serves the
// contents of outDir *as* the base — so a URL of /RealityShift/cesium/Cesium.js
// resolves to dist/cesium/Cesium.js, not dist/RealityShift/cesium/Cesium.js, and
// every Cesium request 404s (a blank globe, with the app otherwise working).
//
// This hoists the directory back up one level after the bundle is written.
function hoistCesiumOutOfBase(base: string): Plugin {
  return {
    name: 'hoist-cesium-out-of-base',
    apply: 'build',
    closeBundle() {
      const segment = base.replace(/^\/|\/$/g, '')
      if (!segment) return // base is '/', nothing nested

      const outDir = resolve(__dirname, 'dist')
      const nested = join(outDir, segment)
      const from = join(nested, 'cesium')
      const to = join(outDir, 'cesium')
      if (!existsSync(from)) return

      rmSync(to, { recursive: true, force: true })
      renameSync(from, to)

      // Remove the wrapper directory only if the plugin left nothing else there.
      if (existsSync(nested) && readdirSync(nested).length === 0) {
        rmSync(nested, { recursive: true, force: true })
      }
    },
  }
}

// GitHub Pages serves this project from https://<user>.github.io/RealityShift/,
// so production assets need the repo path as their base. Dev stays at '/' — a
// base of '/RealityShift/' would move the dev server under that path too.
// Overridable via VITE_BASE so a custom domain, or a fork with a different repo
// name, doesn't require editing this file.
// Keyed on `mode`, not `command`: `vite preview` runs with command === 'serve'
// but mode === 'production', so keying on command would serve the production
// build at '/' while its HTML references '/RealityShift/' — every asset 404s and
// falls through to the SPA fallback, which looks like a broken build.
export default defineConfig(({ mode }) => {
  const base = process.env.VITE_BASE ?? (mode === 'production' ? '/RealityShift/' : '/')
  return {
    base,
    plugins: [react(), cesium(), hoistCesiumOutOfBase(base)],
  }
})
