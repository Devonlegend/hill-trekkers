from fastapi import APIRouter, Depends
import asyncpg
from app.db import get_db
from app.deps import get_current_user
from app.schemas.profile import ProfileUpdate

router = APIRouter()


@router.patch("/api/users/me")
async def update_profile(
    body: ProfileUpdate,
    user=Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db),
):
    fields = {
        k: v
        for k, v in body.model_dump(exclude_unset=True).items()
        if v is not None
    }
    if fields:
        sets = ", ".join(f"{k} = ${i+1}" for i, k in enumerate(fields))
        args = list(fields.values()) + [user["id"]]
        await conn.execute(
            f"UPDATE users SET {sets} WHERE id = ${len(args)}",
            *args,
        )
    return {"ok": True}
