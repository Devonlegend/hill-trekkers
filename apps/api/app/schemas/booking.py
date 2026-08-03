from pydantic import BaseModel, Field


class BookingCreate(BaseModel):
    trip_id: str
    seats: int = Field(default=1, ge=1, le=10)