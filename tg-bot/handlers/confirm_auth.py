import os
import aiohttp

from aiogram import Router
from aiogram.types import CallbackQuery
from aiogram.fsm.context import FSMContext

from states.AuthState import AuthState

router = Router()

REACT_APP_API_URL = os.getenv("API_DOCKER_URL")


@router.callback_query(AuthState.waiting_confirm, lambda c: c.data == "confirm")
async def confirm_auth(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    auth_state = data.get("auth_state")

    if not auth_state:
        await callback.answer("Auth state missing", show_alert=True)
        return

    payload = {
        "state": auth_state,
        "tg_id": callback.from_user.id,
        "tg_username": callback.from_user.username,
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{REACT_APP_API_URL}/auth/confirm", json=payload) as resp:
                text = await resp.text()

                if resp.status != 200:
                    await callback.answer("Authorization failed", show_alert=True)
                    await callback.message.answer(f"Backend error: {resp.status}\n{text}")
                    return

        await callback.answer("Confirmed")
        await callback.message.edit_text("✅ Login confirmed. You can return to the site.")
        await state.clear()

    except Exception as e:
        await callback.answer("Request failed", show_alert=True)
        await callback.message.answer(f"Error: {e}")


@router.callback_query(AuthState.waiting_confirm, lambda c: c.data == "decline")
async def decline_auth(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    auth_state = data.get("auth_state")

    if not auth_state:
        await callback.answer("Auth state missing", show_alert=True)
        return

    payload = {
        "state": auth_state,
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{REACT_APP_API_URL}/auth/decline", json=payload) as resp:
                text = await resp.text()

                if resp.status != 200:
                    await callback.answer("Decline failed", show_alert=True)
                    await callback.message.answer(f"Backend error: {resp.status}\n{text}")
                    return

        await callback.answer("Declined")
        await callback.message.edit_text("❌ Login declined.")
        await state.clear()

    except Exception as e:
        await callback.answer("Request failed", show_alert=True)
        await callback.message.answer(f"Error: {e}")