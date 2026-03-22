from fastapi import APIRouter
from app.services import music_engine

router = APIRouter()

@router.get("/scale")
def get_scale(root: str = "C", type: str = "major"):
    return music_engine.get_scale_data(root, type)

@router.get("/chord")
def get_chord(root: str = "C", type: str = "major"):
    return music_engine.get_chord_data(root, type)