from vkbottle.bot import BotLabeler, Message

bot_labeler = BotLabeler()


@bot_labeler.message(text=["/start", "start", "Начать", "Привет", "привет"])
async def start_handler(message: Message):
    await message.answer(
        "🌙 Привет! Я VK-бот Moon NFT Exchange.\n\n"
        "Что умею сейчас:\n"
        "— показать профиль\n"
        "— подтверждать вход на сайт\n"
        "— пополнять баланс через ЮKassa\n\n"
        "Команды:\n"
        "profile — профиль\n"
        "пополнить 10 — создать платёж"
    )
