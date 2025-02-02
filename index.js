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

bot.command('clear', async ctx => {
    modelContexts.find(el => el.userId == ctx.from.id).messages = [];
    await ctx.reply('Контекст диалога очищен!');
});

bot.on(message('text'), async ctx => {
    try{
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
        console.log(response.message.content);
        await bot.telegram.editMessageText(msg.chat.id, msg.message_id, undefined, response.message.content);
    }catch(e){
        console.error(e);
        await ctx.reply('Произошла ошибка. Попробуйте снова.');
    }
});

bot.on(message('photo'), async ctx => {
    try{
        const { file_id } = ctx.message.photo.pop();
        let photo;
    
        const link = await bot.telegram.getFileLink(file_id);
        await fetch(link.toString())
            .then(res => res.bytes())
            .then(res => photo = res);
    
        let msg = await ctx.reply('Генерирую ответ...');
        let modelContext;
    
        if((modelContext = modelContexts.find(el => el.userId == ctx.from.id)) == undefined){
            modelContext = {
                userId : ctx.from.id,
                messages : []
            };
            modelContexts.push(modelContext);
        }
    
        modelContext.messages.push({ role : 'user', content : ctx.message.caption, images : [photo] });
        const response = await ollama.chat({
            model,
            messages : modelContext.messages
        });
    
        modelContext.messages.push({ role : 'assistant', content : response.message.content });
        console.log(response.message.content);
        await bot.telegram.editMessageText(msg.chat.id, msg.message_id, undefined, response.message.content);
    }catch(e){
        console.error(e);
        await ctx.reply('Произошла ошибка. Попробуйте снова.');
    }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));