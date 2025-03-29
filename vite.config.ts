import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron/simple'
import renderer from 'vite-plugin-electron-renderer'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  return {
    server: {
      port: 8000,
    },
    plugins: [
      vue(),
      electron({
        main: {
          // Shortcut of `build.lib.entry`.
          entry: 'electron/main.ts',
          vite: {
            build: {
              rollupOptions: {
                external: ['better-sqlite3'],
                plugins: [
                  {
                    name: 'native-modules',
                    resolveId(source) {
                      if (source === 'better-sqlite3') {
                        return { id: 'better-sqlite3', external: true }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        preload: {
          // Shortcut of `build.rollupOptions.input`.
          // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
          input: path.join(__dirname, 'electron/preload.ts'),
        },
        // Ployfill the Electron and Node.js API for Renderer process.
        // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
        // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
        renderer: process.env.NODE_ENV === 'test'
          // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
          ? undefined
          : {},
      }),
      renderer(),
      // 添加分析插件，仅在analyze模式下启用
      mode === 'analyze' && visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
    ],
    resolve: {
      alias: {
        'electron': 'electron',
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
    },
    build: {
      // 启用源码映射以便调试
      sourcemap: command === 'serve',
      // 启用CSS代码分割
      cssCodeSplit: true,
      // 配置Rollup选项
      rollupOptions: {
        output: {
          // 手动分块策略
          manualChunks: {
            'vue-vendor': ['vue'],
            'ant-design': ['ant-design-vue', '@ant-design/icons-vue'],
            'db-related': ['better-sqlite3', 'bindings', 'file-uri-to-path'],
            'utils': ['colord', 'electron-log'],
          },
          // 自定义chunk文件名格式
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        },
      },
      // 设置chunk大小警告阈值
      chunkSizeWarningLimit: 600,
      // 压缩选项
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,  // 生产环境下移除console
          drop_debugger: true  // 移除debugger语句
        }
      },
    },
    // 优化依赖预构建
    optimizeDeps: {
      include: ['vue', 'ant-design-vue', '@ant-design/icons-vue'],
    }
  }
})
