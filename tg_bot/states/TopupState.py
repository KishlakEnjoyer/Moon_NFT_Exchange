from aiogram.fsm.state import State, StatesGroup


class TopupStates(StatesGroup):
    waiting_for_topup_amount = State()