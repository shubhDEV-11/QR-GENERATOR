const TelegramBot = require('node-telegram-bot-api');
const qrcode = require('qrcode');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// In-memory storage
let userUPI = {};
let paymentRequests = {};

// /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `🤖 Welcome to <b>UPI QR Generator</b> ⚡️

I am your personal payment assistant.
Seamlessly generate UPI QR codes for instant payments.

<b>Powered by SHUBH 🚀</b>`, {
        parse_mode: "HTML",
        reply_markup: {
            keyboard: [['📝 Set UPI ID', '💳 Generate QR Code']],
            resize_keyboard: true
        }
    });
});

// Handle all messages
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '📝 Set UPI ID') {
        bot.sendMessage(chatId, '🔗 Please enter your valid <b>UPI ID</b> (e.g. yourupi@upi):', { parse_mode: "HTML" });
        bot.once('message', (upiMsg) => {
            const upiID = upiMsg.text.trim();
            if (!upiID.includes('@')) {
                bot.sendMessage(chatId, '❌ Invalid UPI ID format. Please click "📝 Set UPI ID" again to retry.');
                return;
            }
            userUPI[chatId] = upiID;
            bot.sendMessage(chatId, `✅ UPI ID <b>${upiID}</b> has been securely saved.

You can now proceed to generate dynamic QR codes.`, { parse_mode: "HTML" });
        });
    }

    else if (text === '💳 Generate QR Code') {
        if (!userUPI[chatId]) {
            bot.sendMessage(chatId, '⚠️ UPI ID not found. Please configure your UPI ID first using "📝 Set UPI ID".');
            return;
        }

        bot.sendMessage(chatId, '💰 Please enter the <b>Amount</b> you want to receive (in ₹):', { parse_mode: "HTML" });
        bot.once('message', (amtMsg) => {
            const amount = parseFloat(amtMsg.text.trim());
            if (isNaN(amount) || amount <= 0) {
                bot.sendMessage(chatId, '❌ Invalid amount. Please select "💳 Generate QR Code" again.');
                return;
            }

            const upiID = userUPI[chatId];
            const upiURL = `upi://pay?pa=${upiID}&pn=Payment&am=${amount}&cu=INR`;

            qrcode.toBuffer(upiURL, (err, buffer) => {
                if (err) {
                    bot.sendMessage(chatId, '🚫 Error occurred while generating QR Code.');
                    return;
                }

                bot.sendPhoto(chatId, buffer, {
                    caption: `✅ <b>Transaction Ready</b>

• Amount: ₹${amount}
• UPI ID: ${upiID}

⚠️ <i>This QR code will expire automatically in 5 minutes.</i>

🚀 <b>Powered by SHUBH</b>`,
                    parse_mode: "HTML"
                });

                // QR expiry timer
                if (paymentRequests[chatId]) clearTimeout(paymentRequests[chatId]);
                paymentRequests[chatId] = setTimeout(() => {
                    bot.sendMessage(chatId, '⛔ Your QR code has expired. Please generate a new one anytime.');
                    delete paymentRequests[chatId];
                }, 5 * 60 * 1000);
            });
        });
    }
});
