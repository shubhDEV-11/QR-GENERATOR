const TelegramBot = require('node-telegram-bot-api');
const QRCode = require('qrcode');
const express = require('express');

// Get Bot Token from environment variable
const token = process.env.BOT_TOKEN;

if (!token) {
    console.error("❌ BOT_TOKEN is not set. Please set it as an environment variable.");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Express Server for Render Keep-Alive
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send("🤖 UPI QR Generator Bot — Powered by SHUBH is Alive!");
});

app.listen(PORT, () => {
  console.log(`✅ Web server running on port ${PORT}`);
});

// Store user UPI & Timers
let userUPI = {};
let activeTimers = {};

// /start Command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `🤖 <b>Welcome to UPI QR Generator Bot</b> 💳

Generate secure UPI QR codes instantly & safely. Your data stays private 🔐.

<b>Powered by SHUBH 🚀</b>`, {
        parse_mode: "HTML",
        reply_markup: {
            keyboard: [['📝 Set UPI ID', '💳 Generate QR Code']],
            resize_keyboard: true
        }
    });
});

// Handle Messages
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '📝 Set UPI ID') {
        bot.sendMessage(chatId, '📥 Please enter your UPI ID (e.g. yourupi@upi):', { parse_mode: "HTML" });
        bot.once('message', (upiMsg) => {
            const upiID = upiMsg.text.trim();
            if (!upiID.includes('@')) {
                bot.sendMessage(chatId, '❌ <b>Invalid UPI ID format.</b>\n\nPlease try again (e.g. example@upi)', { parse_mode: "HTML" });
                return;
            }
            userUPI[chatId] = upiID;
            bot.sendMessage(chatId, `✅ Your UPI ID has been saved:\n\n<b>${upiID}</b>`, { parse_mode: "HTML" });
        });
    }

    else if (text === '💳 Generate QR Code') {
        if (!userUPI[chatId]) {
            bot.sendMessage(chatId, `⚠️ You need to set your UPI ID first using 📝 Set UPI ID.`, { parse_mode: "HTML" });
            return;
        }

        bot.sendMessage(chatId, `💰 <b>Enter the amount (in ₹):</b>`, { parse_mode: "HTML" });
        bot.once('message', async (amtMsg) => {
            const amount = parseFloat(amtMsg.text.trim());
            if (isNaN(amount) || amount <= 0) {
                bot.sendMessage(chatId, `❌ <b>Invalid amount entered.</b>\nPlease enter a valid numeric amount.`, { parse_mode: "HTML" });
                return;
            }

            const upiID = userUPI[chatId];
            const upiURL = `upi://pay?pa=${upiID}&pn=Payment&am=${amount}&cu=INR`;

            try {
                const qrBuffer = await QRCode.toBuffer(upiURL, { width: 500 });

                await bot.sendPhoto(chatId, qrBuffer, {
                    caption: `✅ <b>QR Code Generated!</b>\n\n💸 <b>Amount:</b> ₹${amount}\n🔗 <b>UPI ID:</b> ${upiID}\n\n⚠ <b>This QR code will expire in 5 minutes.</b>\n\n🚀 <i>Powered by SHUBH</i>`,
                    parse_mode: "HTML"
                });

                if (activeTimers[chatId]) clearTimeout(activeTimers[chatId]);
                activeTimers[chatId] = setTimeout(() => {
                    bot.sendMessage(chatId, `⏳ <b>Your QR code has expired after 5 minutes.</b>\nGenerate a fresh QR code if required. ✅`, { parse_mode: "HTML" });
                    delete activeTimers[chatId];
                }, 5 * 60 * 1000);

            } catch (err) {
                console.error("QR Generation error:", err);
                bot.sendMessage(chatId, `🚫 <b>Something went wrong while generating the QR Code.</b>`, { parse_mode: "HTML" });
            }
        });
    }
});
