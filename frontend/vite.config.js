import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import nodemailer from 'nodemailer';
import https from 'https';

// A small vite plugin to handle local '/api/send-alert' without needing the big backend
function localAlertsPlugin() {
  return {
    name: 'configure-server-alerts',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/send-alert' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', async () => {
            try {
              const { type, message, motherEmail, motherPhone } = JSON.parse(body);
              let whatsappStatus = false;
              let emailStatus = false;

              // Send WhatsApp
              if (motherPhone && motherPhone.length > 5) {
                let phone = motherPhone.replace(/[^0-9+]/g, '');
                if (!phone.startsWith('+')) phone = '+' + phone;
                const apiKey = "k8bdaSWZyxSf";
                const waUrl = `https://api.textmebot.com/send.php?recipient=${encodeURIComponent(phone)}&apikey=${apiKey}&text=${encodeURIComponent("🚨 SMART CRADLE ALERT:\n\n" + message)}`;
                
                await new Promise((resolve) => {
                  https.get(waUrl, (resp) => { resp.resume(); resolve(); }).on("error", resolve);
                });
                whatsappStatus = true;
              }

              // Send Email (Hardcoded as requested)
              const targetEmail = "challagollasridevi@gmail.com";
              const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: 'durgasravan21@gmail.com', pass: 'wyxreandmrcqsoju' },
              });
              await transporter.sendMail({
                from: '"Smart Cradle AI" <durgasravan21@gmail.com>',
                to: targetEmail,
                subject: `🚨 Smart Cradle Alert: ${type}`,
                text: message,
                html: `<h2>Smart Cradle Alert</h2><p><b>Type:</b> ${type}</p><p>${message}</p>`
              });
              emailStatus = true;

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, emailStatus, whatsappStatus }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          next();
        }
      });
    }
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localAlertsPlugin()],
  server: {
    port: 5173,
    proxy: {
      "/socket.io": {
        target: "http://localhost:4000",
        ws: true,
      },
      // Note: Replaced generic /api proxy with specific rules or let plugin handle it
    },
  },
});
