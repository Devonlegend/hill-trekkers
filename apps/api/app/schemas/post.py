from pydantic import BaseModel, Field


class PostCreate(BaseModel):
    caption: str | None = None
    trip_id: str | None = None
    visibility: str = Field(default="public", pattern="^(public|members_only)$")
    media_urls: list[str] = Field(default_factory=list, max_length=10)


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class ReportCreate(BaseModel):
    reason: str = Field(min_length=1, max_length=500)
