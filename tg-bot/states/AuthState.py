from aiogram.fsm.state import State, StatesGroup


class AuthState(StatesGroup):
    waiting_confirm = State()