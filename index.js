require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const gtranslate = require('@vitalets/google-translate-api');
const fs = require('fs');
const tts = require('google-translate-tts');

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/echo (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1]; // the captured "whatever"

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, resp + "!");
});

bot.on('polling_error', (error) => {
  console.log({ polling_error: error.code });
});

const langs = ['en', 'fa'];

async function translate(text) {
  const replies = await Promise.all(
    langs.map(ln => gtranslate(text, { to: ln }))
  );

  return replies.map(l => l.text).join('\n');
}

// notice that `tts.synthesize` returns a Promise<Buffer>
const saveFile = async (text) => {
  const buffer = await tts.synthesize({
    text,
    voice: 'de',
    slow: false
  });

  // TODO: change to async
  fs.writeFileSync('/tmp/tts.mp3', buffer);
};

async function handle_message(msg) {
  const chatId = msg.chat.id;

  console.log({ message: msg });
  let text = '';
  try {
    text = await translate(msg.text);
  } catch (e) {
    text = e;
  }

  const words = msg.text.split(/\s+/).map(t => ({ text: t }));
  const options = {
    reply_markup: {
      keyboard: [
        words
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
      // selective?: boolean;
    }
  };

  bot.sendMessage(
    chatId,
    text,
    (words.length > 1 ? options : undefined)
  );

  try {
    await saveFile(msg.text);
    bot.sendVoice(chatId, '/tmp/tts.mp3');
  } catch (e) {
    bot.sendMessage(chatId, e, {
    });
  }
}

bot.on('message', (msg) => handle_message(msg).catch(e => console.log(e)));
