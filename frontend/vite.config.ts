import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dev-save-styles',
      configureServer(server) {
        server.middlewares.use('/__save_dev_edits', (req, res) => {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
             const filePath = path.resolve(__dirname, './dev-edits.json');
             let edits = [];
             if (fs.existsSync(filePath)) {
               try { edits = JSON.parse(fs.readFileSync(filePath, 'utf-8')) } catch(e){}
             }
             try {
               edits.push({ timestamp: new Date().toISOString(), ...JSON.parse(body) });
               fs.writeFileSync(filePath, JSON.stringify(edits, null, 2));
               res.end('saved');
             } catch(err) {
               res.statusCode = 500;
               res.end('error');
             }
          })
        })
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
