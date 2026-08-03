from fastapi import APIRouter, Depends, HTTPException, Query, Request
import asyncpg
from jose import JWTError
from app.db import get_db
from app.deps import get_current_user
from app.schemas.post import PostCreate, CommentCreate, ReportCreate
from app.services.security import decode_token

router = APIRouter()


async def get_optional_user(
    request: Request, conn: asyncpg.Connection = Depends(get_db)
):
    token = request.cookies.get("session")
    if not token:
        return None
    try:
        payload = decode_token(token)
    except JWTError:
        return None
    return await conn.fetchrow("SELECT * FROM users WHERE id = $1", payload["sub"])


@router.get("/api/posts")
async def list_posts(
    cursor: str | None = None,
    limit: int = Query(default=10, le=50),
    category: str | None = None,
    trip_id: str | None = None,
    user=Depends(get_optional_user),
    conn: asyncpg.Connection = Depends(get_db),
):
    args: list = []
    where = ["p.status = 'visible'"]
    if user is None:
        where.append("p.visibility = 'public'")
    if category:
        args.append(category)
        where.append(f"c.slug = ${len(args)}")
    if trip_id:
        args.append(trip_id)
        where.append(f"p.trip_id = ${len(args)}")
    if cursor:
        args.append(cursor)
        where.append(f"p.created_at < ${len(args)}::timestamptz")

    args.append(str(user["id"]) if user else "00000000-0000-0000-0000-000000000000")
    args.append(limit + 1)

    sql = f"""
        SELECT p.*, u.full_name AS author_name, u.avatar_url AS author_avatar,
               t.title AS trip_title, c.name AS category_name,
               (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
               (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) AS comment_count,
               (SELECT COUNT(*) FROM likes l2 WHERE l2.post_id = p.id AND l2.user_id = ${len(args)-1}) AS liked_by_me,
               (SELECT COALESCE(json_agg(m.media_url ORDER BY m.sort_order), '[]') FROM post_media m WHERE m.post_id = p.id) AS media_urls
        FROM posts p
        JOIN users u ON u.id = p.author_id
        LEFT JOIN trips t ON t.id = p.trip_id
        LEFT JOIN trip_categories c ON c.id = t.category_id
        WHERE {" AND ".join(where)}
        ORDER BY p.created_at DESC
        LIMIT ${len(args)}
    """
    rows = await conn.fetch(sql, *args)
    has_more = len(rows) > limit
    rows = rows[:limit]
    return {
        "posts": [_serialize_post(r) for r in rows],
        "next_cursor": rows[-1]["created_at"].isoformat() if (has_more and rows) else None,
    }


def _serialize_post(r: asyncpg.Record) -> dict:
    return {
        "id": str(r["id"]),
        "author": {
            "id": str(r["author_id"]),
            "full_name": r["author_name"],
            "avatar_url": r["author_avatar"],
        },
        "trip_title": r["trip_title"],
        "trip_id": str(r["trip_id"]) if r["trip_id"] else None,
        "category_name": r["category_name"],
        "caption": r["caption"],
        "visibility": r["visibility"],
        "media_urls": r["media_urls"],
        "like_count": r["like_count"],
        "comment_count": r["comment_count"],
        "liked_by_me": r["liked_by_me"] > 0,
        "created_at": r["created_at"].isoformat(),
    }


@router.get("/api/posts/{post_id}")
async def get_post(
    post_id: str,
    user=Depends(get_optional_user),
    conn: asyncpg.Connection = Depends(get_db),
):
    row = await conn.fetchrow(
        """
        SELECT p.*, u.full_name AS author_name, u.avatar_url AS author_avatar,
               t.title AS trip_title, c.name AS category_name,
               (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
               (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) AS comment_count,
               (SELECT COUNT(*) FROM likes l2 WHERE l2.post_id = p.id AND l2.user_id = $2) AS liked_by_me,
               (SELECT COALESCE(json_agg(m.media_url ORDER BY m.sort_order), '[]') FROM post_media m WHERE m.post_id = p.id) AS media_urls,
               (SELECT json_agg(
                 json_build_object(
                   'id', cc.id,
                   'body', cc.body,
                   'author_name', cu.full_name,
                   'created_at', cc.created_at
                 ) ORDER BY cc.created_at ASC
               ) FROM comments cc JOIN users cu ON cu.id = cc.author_id WHERE cc.post_id = p.id) AS comments
        FROM posts p
        JOIN users u ON u.id = p.author_id
        LEFT JOIN trips t ON t.id = p.trip_id
        LEFT JOIN trip_categories c ON c.id = t.category_id
        WHERE p.id = $1 AND p.status = 'visible'
        """,
        post_id,
        str(user["id"]) if user else "00000000-0000-0000-0000-000000000000",
    )
    if not row:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "Post not found."})
    if row["visibility"] == "members_only" and user is None:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "Post not found."})

    data = _serialize_post(row)
    data["comments"] = [
        {
            "id": str(c["id"]),
            "body": c["body"],
            "author_name": c["author_name"],
            "created_at": c["created_at"].isoformat(),
        }
        for c in (row["comments"] or [])
    ]
    return data


@router.post("/api/posts", status_code=201)
async def create_post(
    body: PostCreate,
    user=Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db),
):
    post = await conn.fetchrow(
        """
        INSERT INTO posts (author_id, trip_id, caption, visibility)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        """,
        user["id"],
        body.trip_id,
        body.caption,
        body.visibility,
    )
    for i, url in enumerate(body.media_urls):
        await conn.execute(
            "INSERT INTO post_media (post_id, media_url, sort_order) VALUES ($1, $2, $3)",
            post["id"],
            url,
            i,
        )
    return {"id": str(post["id"])}


@router.post("/api/posts/{post_id}/like")
async def toggle_like(
    post_id: str,
    user=Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db),
):
    exists = await conn.fetchval("SELECT 1 FROM posts WHERE id = $1", post_id)
    if not exists:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "Post not found."})
    liked = await conn.fetchval(
        "SELECT 1 FROM likes WHERE post_id = $1 AND user_id = $2", post_id, user["id"]
    )
    if liked:
        await conn.execute(
            "DELETE FROM likes WHERE post_id = $1 AND user_id = $2", post_id, user["id"]
        )
        liked_now = False
    else:
        await conn.execute(
            "INSERT INTO likes (post_id, user_id) VALUES ($1, $2)", post_id, user["id"]
        )
        liked_now = True
    count = await conn.fetchval("SELECT COUNT(*) FROM likes WHERE post_id = $1", post_id)
    return {"liked": liked_now, "like_count": count}


@router.post("/api/posts/{post_id}/comments", status_code=201)
async def add_comment(
    post_id: str,
    body: CommentCreate,
    user=Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db),
):
    exists = await conn.fetchval("SELECT 1 FROM posts WHERE id = $1", post_id)
    if not exists:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "Post not found."})
    row = await conn.fetchrow(
        "INSERT INTO comments (post_id, author_id, body) VALUES ($1, $2, $3) RETURNING *",
        post_id,
        user["id"],
        body.body,
    )
    return {"id": str(row["id"])}


@router.post("/api/posts/{post_id}/report")
async def report_post(
    post_id: str,
    body: ReportCreate,
    user=Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db),
):
    exists = await conn.fetchval("SELECT 1 FROM posts WHERE id = $1", post_id)
    if not exists:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "Post not found."})
    await conn.execute(
        "INSERT INTO reports (post_id, reported_by, reason) VALUES ($1, $2, $3)",
        post_id,
        user["id"],
        body.reason,
    )
    return {"ok": True}


@router.post("/api/comments/{comment_id}/report")
async def report_comment(
    comment_id: str,
    body: ReportCreate,
    user=Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db),
):
    exists = await conn.fetchval("SELECT 1 FROM comments WHERE id = $1", comment_id)
    if not exists:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "Comment not found."})
    await conn.execute(
        "INSERT INTO reports (comment_id, reported_by, reason) VALUES ($1, $2, $3)",
        comment_id,
        user["id"],
        body.reason,
    )
    return {"ok": True}
