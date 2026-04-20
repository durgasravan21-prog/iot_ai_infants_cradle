const axios = require('axios');
const nodemailer = require('nodemailer');
require('dotenv').config();

// ─── Email Setup ───────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendTestCryingAlert() {
  const emailRecipient = process.env.EMAIL_RECEIVER;
  const whatsappRecipient = process.env.WHATSAPP_PHONE;
  const whatsappApiKey = process.env.WHATSAPP_API_KEY;

  const subject = "Smart Cradle Alert: Baby is crying";
  const message = "🍼 Alert: Your baby is crying! Please check the cradle immediately.";

  console.log("🚀 Starting Crying Alert Test...");

  // 1. Send Email
  try {
    await transporter.sendMail({
      from: `"Smart Cradle" <${process.env.EMAIL_USER}>`,
      to: emailRecipient,
      subject: subject,
      text: message,
    });
    console.log("  ✅ EMAIL: Sent successfully to " + emailRecipient);
  } catch (err) {
    console.error("  ❌ EMAIL: Failed - " + err.message);
  }

  // 2. Send WhatsApp
  let formattedWhatsapp = whatsappRecipient;
  if (formattedWhatsapp && !formattedWhatsapp.startsWith("+")) {
    formattedWhatsapp = "+" + formattedWhatsapp;
  }

  try {
    const url = `https://api.textmebot.com/send.php?recipient=${encodeURIComponent(formattedWhatsapp)}&apikey=${whatsappApiKey}&text=${encodeURIComponent(message)}`;
    const response = await axios.get(url);
    if (response.data.includes("Success")) {
        console.log("  ✅ WHATSAPP: Sent successfully to " + formattedWhatsapp);
    } else {
        console.log("  ❌ WHATSAPP: API Response - " + response.data);
    }
  } catch (err) {
    console.error("  ❌ WHATSAPP: Failed - " + err.message);
  }

  console.log("\n🏁 Test Complete.");
}

sendTestCryingAlert();
