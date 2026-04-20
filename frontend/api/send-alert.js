import nodemailer from 'nodemailer';
import https from 'https';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { return res.status(405).json({ error: 'Method Not Allowed' }); }

  const { type, message, motherEmail, motherPhone } = req.body;
  let whatsappStatus = false;
  let emailStatus = false;

  try {
    // 1. WhatsApp
    if (motherPhone && motherPhone.length > 5) {
      let recipient = motherPhone.replace(/[^0-9+]/g, '');
      if (!recipient.startsWith('+')) recipient = '+' + recipient;
      const apiKey = "k8bdaSWZyxSf"; 
      const waUrl = `https://api.textmebot.com/send.php?recipient=${encodeURIComponent(recipient)}&apikey=${apiKey}&text=${encodeURIComponent("🚨 SMART CRADLE ALERT:\n\n" + message)}`;
      
      await new Promise((resolve) => {
        https.get(waUrl, (resp) => { resp.resume(); resolve(); }).on("error", resolve);
      });
      whatsappStatus = true;
    }

    // 2. Email via Nodemailer 
    // HARDCODED to mother's mail as requested
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

    res.status(200).json({ success: true, emailStatus, whatsappStatus });
  } catch (e) {
    console.error("Alert error", e);
    return res.status(500).json({ error: e.message });
  }
}
