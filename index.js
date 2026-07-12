require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(express.static('public'));
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
// Regex nhận diện link Shopee (kể cả link rút gọn s.shopee.vn và link đầy đủ shopee.vn)
const SHOPEE_LINK_REGEX = /https?:\/\/(s\.)?shopee\.(vn|com)[^\s]*/i;

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

  if (body.object === 'page') {
    body.entry.forEach(entry => {
      const webhookEvent = entry.messaging[0];
      const senderId = webhookEvent.sender.id;
      console.log('Nhận tin nhắn từ user:', senderId, webhookEvent);

      // Trường hợp 1: user bấm nút Get Started lần đầu
      if (webhookEvent.postback && webhookEvent.postback.payload === 'GET_STARTED') {
        handleGetStarted(senderId);
      }
      // Trường hợp 2: user gửi tin nhắn thường
      else if (webhookEvent.message && webhookEvent.message.text) {
        handleMessage(senderId, webhookEvent.message);
      }
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// Tin nhắn chào khi user click Get Started lần đầu
async function handleGetStarted(senderId) {
  const welcomeText =
    'Chào bạn! 👋\n\n' +
    'Để được áp dụng mã giảm giá, hãy gửi cho page link sản phẩm Shopee bạn muốn mua.\n' +
    'Cách copy link sản phẩm được mô tả trong ảnh dưới đây.\n\n' +
    'Sau khi gửi link, page sẽ hướng dẫn bạn cách áp dụng mã giảm giá tương ứng.';

  await sendMessage(senderId, welcomeText);
  await sendImage(senderId, 'https://www.image2url.com/r2/default/images/1783867974328-eeb3c30a-d62d-4c94-82d2-9d3b4d282340.png');
}

// Hàm gửi ảnh qua URL
async function sendImage(senderId, imageUrl) {
  try {
    await axios.post(
      `https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: senderId },
        message: {
          attachment: {
            type: 'image',
            payload: {
              url: imageUrl,
              is_reusable: true // cache lại, lần sau gửi nhanh hơn, không tốn băng thông
            }
          }
        }
      }
    );
  } catch (err) {
    console.error('Lỗi gửi ảnh:', err.response?.data || err.message);
  }
}


// 3. Xử lý logic trả lời
async function handleMessage(senderId, message) {
  const text = message.text.trim();

  if (SHOPEE_LINK_REGEX.test(text)) {
    // Link hợp lệ - xử lý logic tiếp theo ở đây
    const link = text.match(SHOPEE_LINK_REGEX)[0];
    await sendMessage(senderId, `Đã nhận link sản phẩm: ${link}\n\nĐang tìm kiếm mã giảm giá cho bạn...`);

    // TODO: thêm logic xử lý link (gọi API lấy thông tin sản phẩm, tạo mã giảm giá, v.v.)
  } else {
    await sendMessage(
      senderId,
      '⚠️ Tin nhắn không hợp lệ.\n\nVui lòng gửi đúng định dạng link sản phẩm Shopee, ví dụ:\nhttps://s.shopee.vn/xxxxxxx'
    );
  }
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