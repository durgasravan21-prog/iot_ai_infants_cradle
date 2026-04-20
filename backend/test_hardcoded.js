const axios = require('axios');

async function sendTestWhatsApp() {
  const phone = '919398011913';
  const apikey = 'k8bdaSWZyxSf';

  const message = "Smart Cradle Test 2";
  const encodedMsg = encodeURIComponent(message);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedMsg}&apikey=${apikey}`;
  console.log("Testing URL:", url);

  try {
    const response = await axios.get(url);
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

sendTestWhatsApp();
