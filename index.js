require('dotenv').config();
const ollama = require('ollama').default;
const { Telegraf } = require('telegraf');
const { message } = require('telegraf/filters');

const token = process.env.TOKEN;
const model = process.env.MODEL;

const bot = new Telegraf(token);

bot.start(async ctx => {
    await ctx.reply('Привет, напиши мне что угодно, а я отвечу!');
});

bot.on(message('text'), async ctx => {
    let msg = await ctx.reply('Генерирую ответ...');

    const response = await ollama.chat({
        model,
        messages : [
            {
                role : 'user',
                content : ctx.message.text
            }
        ]
    });

    console.log(response.message.content);
    await bot.telegram.editMessageText(msg.chat.id, msg.message_id, undefined, response.message.content);
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));