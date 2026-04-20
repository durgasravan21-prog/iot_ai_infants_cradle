import https from 'https';

const url = "https://api.textmebot.com/send.php?recipient=%2B917995424390&apikey=k8bdaSWZyxSf&text=Hello%20from%20Node";
console.log("Fetching: " + url);

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log("Status: " + res.statusCode);
    console.log("Response: " + data);
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
