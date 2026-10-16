from pydantic import BaseModel, Field
from typing import Optional

class ItemBase(BaseModel):
    name: str
    description: Optional[str] = ""

class ItemCreate(ItemBase):
    pass

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ItemResponse(ItemBase):
    id: str