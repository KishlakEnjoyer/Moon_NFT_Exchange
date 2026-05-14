import logging
import os
from dotenv import load_dotenv
from vkbottle.bot import Bot

from handlers.start import bot_labeler
from handlers.profile import profile_labeler
from handlers.topup import topup_labeler
from handlers.auth import auth_labeler

load_dotenv()

VK_BOT_TOKEN = os.getenv("VK_BOT_TOKEN")

if not VK_BOT_TOKEN:
    raise RuntimeError("VK_BOT_TOKEN is not set")

bot = Bot(token=VK_BOT_TOKEN)

bot.labeler.load(bot_labeler)
bot.labeler.load(profile_labeler)
bot.labeler.load(topup_labeler)
bot.labeler.load(auth_labeler)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("VK bot running!")
    bot.run_forever()
