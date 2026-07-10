require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(express.static('public'));
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// 1. Xác thực webhook (Facebook gọi GET khi bạn setup)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// 2. Nhận tin nhắn từ người dùng (Facebook gọi POST)
app.post('/webhook', (req, res) => {
  const body = req.body;
  console.log('Nhận dữ liệu từ Facebook:', JSON.stringify(body, null, 2));

  if (body.object === 'page') {
    body.entry.forEach(entry => {
      const webhookEvent = entry.messaging[0];
      const senderId = webhookEvent.sender.id;

      if (webhookEvent.message) {
        handleMessage(senderId, webhookEvent.message);
      }
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// 3. Xử lý logic trả lời
async function handleMessage(senderId, message) {
  let replyText = 'Xin chào! Bạn vừa nhắn: ' + message.text;

  // TODO: thay logic đơn giản này bằng AI, database, hoặc rule-based bot

  await sendMessage(senderId, replyText);
}

// 4. Gửi tin nhắn trả lời qua Facebook Graph API
async function sendMessage(senderId, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: senderId },
        message: { text: text }
      }
    );
  } catch (err) {
    console.error('Lỗi gửi tin nhắn:', err.response?.data || err.message);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server chạy tại port ${PORT}`));