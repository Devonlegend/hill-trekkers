from datetime import date

from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    slug: str = Field(min_length=2, max_length=100)
    description: str | None = None
    cover_image_url: str | None = None
    sort_order: int = Field(default=0)


class CategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    cover_image_url: str | None = None
    sort_order: int | None = None


class TripCreate(BaseModel):
    category_id: str
    title: str = Field(min_length=2, max_length=200)
    slug: str = Field(min_length=2, max_length=220)
    summary: str | None = Field(default=None, max_length=300)
    description: str | None = None
    itinerary: str | None = None
    # Bounds mirror the DB columns so an out-of-range value fails with a clear
    # 422 here instead of an asyncpg DataError (400) at the database layer.
    location: str | None = Field(default=None, max_length=200)
    meeting_point: str | None = Field(default=None, max_length=255)
    difficulty: str = Field(default="easy", pattern="^(easy|moderate|hard)$")
    distance_km: float | None = Field(default=None, ge=0, le=9999.99)
    start_date: date
    end_date: date | None = None
    capacity: int = Field(ge=1, le=999999)
    status: str = Field(default="draft", pattern="^(draft|published|closed|cancelled)$")
    cover_image_url: str | None = None
    media_urls: list[str] = Field(default_factory=list, max_length=20)


class TripUpdate(BaseModel):
    category_id: str | None = None
    title: str | None = None
    slug: str | None = None
    summary: str | None = None
    description: str | None = None
    itinerary: str | None = None
    # Bounds mirror the DB columns (see TripCreate).
    location: str | None = Field(default=None, max_length=200)
    meeting_point: str | None = Field(default=None, max_length=255)
    difficulty: str | None = None
    distance_km: float | None = Field(default=None, ge=0, le=9999.99)
    start_date: date | None = None
    end_date: date | None = None
    capacity: int | None = Field(default=None, ge=1, le=999999)
    status: str | None = Field(default=None, pattern="^(draft|published|closed|cancelled)$")
    difficulty: str | None = Field(default=None, pattern="^(easy|moderate|hard)$")
    cover_image_url: str | None = None
    media_urls: list[str] | None = None


class PricingTier(BaseModel):
    tier_name: str = Field(min_length=1, max_length=50)
    price_kobo: int = Field(gt=0)
    valid_from: str
    valid_until: str
    seat_cap: int | None = Field(default=None, ge=1)


class PricingTiersPut(BaseModel):
    tiers: list[PricingTier]


class RoleUpdate(BaseModel):
    role: str = Field(pattern="^(member|trip_leader|admin)$")


class PostStatusUpdate(BaseModel):
    status: str = Field(pattern="^(visible|hidden|removed)$")


class ReportStatusUpdate(BaseModel):
    status: str = Field(pattern="^(open|reviewed|dismissed)$")
