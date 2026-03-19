from aiogram import Router, types
from aiogram.filters import Command, CommandStart
from aiogram.filters.command import CommandObject

router = Router()

@router.message(Command('start'))
async def handle_auth(message: types.Message, command: CommandObject):
    """
    Function for /start + /start <State>
    """ 
    if not command.args:
        await message.answer(f"Hi, this bot for Moon NFT Exchange!")
        return
    await message.answer(f'Hi! Ur auth state: {command.args}')

    