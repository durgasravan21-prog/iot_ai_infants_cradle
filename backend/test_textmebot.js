const axios = require('axios');
require('dotenv').config();

async function sendTestTextMeBot() {
  const recipient = "+" + process.env.WHATSAPP_PHONE;
  const apikey = process.env.WHATSAPP_API_KEY;

  if (!recipient || recipient.includes("XX") || !apikey) {
    console.error("WhatsApp not configured properly in .env");
    return;
  }

  const message = "✅ Smart Cradle Test: WhatsApp alerts via TextMeBot are now ACTIVE!";
  const data = `recipient=${encodeURIComponent(recipient)}&apikey=${apikey}&text=${encodeURIComponent(message)}`;
  const url = `https://api.textmebot.com/send.php`;

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    console.log('TextMeBot test success:', response.data);
  } catch (error) {
    console.error('TextMeBot test failed:', error.message);
  }
}

sendTestTextMeBot();
