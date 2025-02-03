require('dotenv').config();
const ollama = require('ollama').default;
const { Telegraf } = require('telegraf');
const { message } = require('telegraf/filters');
const translate = require('translate-google');

const token = process.env.TOKEN;
const model = process.env.MODEL;

const bot = new Telegraf(token);
const modelContexts = [];

bot.start(async ctx => {
    await ctx.reply('Привет, напиши мне что угодно, а я отвечу!');
});

bot.command('clear', async ctx => {
    ctx.modelContexts.find(el => el.userId == ctx.from.id).messages = [];
    await ctx.reply('Контекст диалога очищен!');
});

bot.use(async (ctx, next) => {
    try{
        let msg = await ctx.reply('Генерирую ответ...');
        let modelContext, text = ctx.message.text, translatedText = '', images = [];

        if(ctx.has(message('photo'))){
            console.log('Has photo!');

            const { file_id } = ctx.message.photo.pop();    
            const link = await bot.telegram.getFileLink(file_id);

            await fetch(link.toString())
                .then(res => res.bytes())
                .then(res => images.push(res));

            text = ctx.message.caption;
        }

        translatedText = await translate(text, { from : 'ru', to : 'en' });

        if((modelContext = modelContexts.find(el => el.userId == ctx.from.id)) == undefined){
            modelContext = {
                userId : ctx.from.id,
                messages : []
            };
            modelContexts.push(modelContext);
        }

        console.log(`Text: ${text}\nTranslated text: ${translatedText}`);

        ctx.modelContext = modelContext;

        ctx.modelContext.messages.push({ role : 'user', content : translatedText, images : images || undefined });
        const response = await ollama.chat({
            model,
            messages : ctx.modelContext.messages
        });
        console.log(ctx.modelContext);
        let modelAnswer = (await translate(response.message.content, { from : 'en', to : 'ru' })).replace(/([\.\!\?])/ig, (substring) => substring + " ");

        ctx.modelContext.messages.push({ role : 'assistant', content : modelAnswer });
        console.log(`Model Answer: ${modelAnswer}`);
        await bot.telegram.editMessageText(msg.chat.id, msg.message_id, undefined, modelAnswer);

        await next();
    }catch(e){
        console.error(e);
        await ctx.reply('Произошла ошибка. Попробуйте снова.');
    }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));