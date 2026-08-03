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
    location: str | None = None
    meeting_point: str | None = None
    difficulty: str = Field(default="easy", pattern="^(easy|moderate|hard)$")
    distance_km: float | None = Field(default=None, ge=0)
    start_date: str
    end_date: str | None = None
    capacity: int = Field(ge=1)
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
    location: str | None = None
    meeting_point: str | None = None
    difficulty: str | None = None
    distance_km: float | None = None
    start_date: str | None = None
    end_date: str | None = None
    capacity: int | None = None
    status: str | None = None
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
