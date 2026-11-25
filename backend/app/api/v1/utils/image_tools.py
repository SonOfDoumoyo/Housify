import boto3
from app.config import settings
from fastapi import UploadFile
from uuid import UUID
import json
import shutil
import subprocess
from pathlib import Path

s3 = boto3.client(
    "s3",
    endpoint_url=settings.R2_ENDPOINT_URL,
    aws_access_key_id=settings.R2_ACCESS_KEY,
    aws_secret_access_key=settings.R2_SECRET_KEY,
    region_name="auto",
)


def store_in_cloud(file: UploadFile, agent_id: UUID, image_id: UUID):
    """Uploads the file to cloudflare r2 and returns the url of the uploaded file"""
    filename = f"listings/{agent_id}/{image_id}.jpg"
    public_url = f"{settings.PUBLIC_BASE_URL}/{filename}"
    try:
        s3.upload_fileobj(file.file, settings.BUCKET_NAME, filename)
    except Exception as e:
        print(e)
        return None
    return public_url


VIDEO_EXTENSIONS = {"mp4", "webm", "mov"}

IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
IMAGE_CONTENT_TYPES = {
    "image/jpeg": ("jpg", "image/jpeg"),
    "image/png": ("png", "image/png"),
    "image/webp": ("webp", "image/webp"),
}


def verification_photo_extension(content_type: str | None) -> str | None:
    """File extension for a verification selfie, from its content type."""
    if content_type in IMAGE_CONTENT_TYPES:
        return IMAGE_CONTENT_TYPES[content_type][0]
    return None


def store_verification_photo_in_cloud(file: UploadFile, user_id: UUID, photo_id: UUID):
    """Uploads an agent's verification selfie to Cloudflare R2.

    Kept apart from listing photos so the selfie is stored under its
    own prefix and served with the right content type. Returns the
    public URL, or None when the upload fails.
    """
    extension = verification_photo_extension(file.content_type) or "jpg"
    filename = f"verification/{user_id}/{photo_id}.{extension}"
    public_url = f"{settings.PUBLIC_BASE_URL}/{filename}"
    content_type = IMAGE_CONTENT_TYPES.get(file.content_type, (extension, "image/jpeg"))[1]
    try:
        s3.upload_fileobj(
            file.file,
            settings.BUCKET_NAME,
            filename,
            ExtraArgs={"ContentType": content_type},
        )
    except Exception as e:
        print(e)
        return None
    return public_url


def video_extension(filename: str | None, content_type: str | None) -> str:
    """File extension for an uploaded video, defaulting to mp4."""
    if filename and "." in filename:
        ext = filename.rsplit(".", 1)[-1].strip().lower()
        if ext in VIDEO_EXTENSIONS:
            return ext
    if content_type == "video/webm":
        return "webm"
    if content_type in ("video/quicktime", "video/mov"):
        return "mov"
    return "mp4"


def store_video_in_cloud(file_path: str | Path, agent_id: UUID, video_id: UUID, extension: str = "mp4"):
    """Uploads a video file from disk to cloudflare r2 and returns its url."""
    filename = f"listings/{agent_id}/{video_id}.{extension}"
    public_url = f"{settings.PUBLIC_BASE_URL}/{filename}"
    try:
        with open(file_path, "rb") as body:
            s3.upload_fileobj(body, settings.BUCKET_NAME, filename)
    except Exception as e:
        print(e)
        return None
    return public_url


def probe_video_duration_seconds(file_path: str | Path) -> float | None:
    """Duration of a video file in seconds, via ffprobe.

    Returns None when ffprobe is not installed or the file cannot be
    probed; callers then fall back to the frontend's 30-second check.
    """
    if shutil.which("ffprobe") is None:
        return None
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "json", str(file_path),
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except (subprocess.SubprocessError, OSError):
        return None
    if result.returncode != 0:
        return None
    try:
        duration = json.loads(result.stdout)["format"]["duration"]
    except (KeyError, TypeError, ValueError):
        return None
    try:
        return float(duration)
    except (TypeError, ValueError):
        return None
