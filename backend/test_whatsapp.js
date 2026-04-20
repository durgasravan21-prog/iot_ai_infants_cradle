const axios = require('axios');
require('dotenv').config();

async function sendTestWhatsApp() {
  const phone = process.env.WHATSAPP_PHONE;
  const apikey = process.env.WHATSAPP_API_KEY;

  console.log(`Phone: ${phone ? phone.length : 'null'} chars, Key: ${apikey ? apikey.length : 'null'} chars`);
  if (!phone || phone.includes("XX") || !apikey) {
    console.error("WhatsApp not configured properly in .env");
    return;
  }

  const message = "✅ Smart Cradle Test: WhatsApp alerts are now ACTIVE for this device. You will receive notifications here.";
  const encodedMsg = encodeURIComponent(message);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodedMsg}&api_key=${apikey}`;
  console.log(`URL: ${url.replace(apikey, '***')}`);

  try {
    const response = await axios.get(url);
    console.log('WhatsApp test success:', response.data);
  } catch (error) {
    console.error('WhatsApp test failed:', error.message);
  }
}

sendTestWhatsApp();
