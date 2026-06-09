// توکن رباتت که از BotFather گرفتی رو دقیقاً بذار بین این دو تا کوتیشن
const BOT_TOKEN = '8956738972:AAGN_hx_2k-vnho6_72dnahqNz_Dm77zldQ'; 

export default {
  async fetch(request, env, ctx) {
    // اگر درخواست از طرف تلگرام بود (متد POST)
    if (request.method === 'POST') {
      try {
        const payload = await request.json();
        
        // بررسی اینکه آیا پیامی آمده است یا نه
        if (payload.message && payload.message.text) {
          const chatId = payload.message.chat.id;
          const userText = payload.message.text;
          
          // متنی که ربات قراره جواب بده (اینجا هر چی بفرستی رو تکرار میکنه)
          const replyText = `سلام! پیام شما دریافت شد: \n\n» "${userText}"`;
          
          // ارسال پاسخ به سرور تلگرام
          const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
          await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: replyText
            })
          });
        }
        
        return new Response('OK', { status: 200 });
      } catch (err) {
        return new Response('Error: ' + err.toString(), { status: 500 });
      }
    }

    // اگر ترافیک معمولی مرورگر بود، همان صفحه چت گیت‌هاب را نشان بدهد
    return env.ASSETS.fetch(request);
  }
};
