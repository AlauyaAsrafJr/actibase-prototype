import os
import uuid

from .config import MAX_PHOTO_BYTES, UPLOAD_FOLDER
from .errors import ApiError

ALLOWED_TYPES = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}


def save_profile_photo(file) -> str:
    if file is None or file.filename == "":
        raise ApiError("No file provided", 400)
    ext = ALLOWED_TYPES.get(file.mimetype)
    if ext is None:
        raise ApiError("Photo must be a PNG, JPEG, or WEBP image", 400)

    data = file.read()
    if len(data) > MAX_PHOTO_BYTES:
        raise ApiError("Photo must be smaller than 5 MB", 400)

    filename = f"{uuid.uuid4().hex}.{ext}"
    with open(os.path.join(UPLOAD_FOLDER, filename), "wb") as f:
        f.write(data)
    return f"/uploads/profile_photos/{filename}"


def delete_profile_photo(photo_url: str | None) -> None:
    if not photo_url:
        return
    path = os.path.join(UPLOAD_FOLDER, os.path.basename(photo_url))
    if os.path.exists(path):
        os.remove(path)
