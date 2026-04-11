from pydantic import BaseModel


class FollowActionResponse(BaseModel):
    message: str


class FollowStatsResponse(BaseModel):
    user_id: int
    followers_count: int
    following_count: int