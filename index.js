require('dotenv').config();
const ollama = require('ollama').default;
const { Telegraf } = require('telegraf');
const { message } = require('telegraf/filters');

const token = process.env.TOKEN;
const model = process.env.MODEL;

const bot = new Telegraf(token);
const modelContexts = [];

bot.start(async ctx => {
    await ctx.reply('Привет, напиши мне что угодно, а я отвечу!');
});

bot.on(message('text'), async ctx => {
    console.log(ctx.from.id, ctx.message.text);
    let msg = await ctx.reply('Генерирую ответ...');
    let modelContext;

    if((modelContext = modelContexts.find(el => el.userId == ctx.from.id)) == undefined){
        modelContext = {
            userId : ctx.from.id,
            messages : []
        };
        modelContexts.push(modelContext);
    }

    modelContext.messages.push({ role : 'user', content : ctx.message.text });
    const response = await ollama.chat({
        model,
        messages : modelContext.messages
    });

    modelContext.messages.push({ role : 'assistant', content : response.message.content });
    console.log(modelContext);
    await bot.telegram.editMessageText(msg.chat.id, msg.message_id, undefined, response.message.content);
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));