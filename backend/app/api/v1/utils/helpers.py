from enum import Enum
import profile
from ..utils.paths import email_verification_path, password_reset_path
import httpx
from app.config import settings
from typing import List
import json
from .paths import v1_path
from pathlib import Path

FUO_COORDS = [4.797638519345833, 6.328745784920405]
PROFILES = ["foot-walking", "driving-car"]
coordinates_path = Path(v1_path, "utils", "coordinates.json")


class EmailTypes(str, Enum):
    email: str = "email"
    password: str = "password"


# class Profiles(str,Enum):
#     walking = "foot-walking",
#     driving = "driving"


def get_html_email(email_types: EmailTypes, username: str, verification_link: str):
    """Shorter way to get both email and password verification emails cause i'm lazy asf 🙄"""
    path = (
        email_verification_path
        if email_types == EmailTypes.email
        else password_reset_path
    )
    with open(path, "r", encoding="utf-8") as file:
        html_text = file.read()
        html_text = (
            html_text.replace("{{first_name}}", username).replace(
                "{{verification_link}}", verification_link
            )
            if email_types == EmailTypes.email
            else html_text.replace("{{first_name}}", username).replace(
                "{{reset_link}}", verification_link
            )
        )
    return html_text


def get_coordinates(name: str):
    with open(coordinates_path, "r") as file:
        data = json.loads(file.read())
        location = data.get(name)
        if not location:
            return None
        longitude = location["longitude"]
        latitude = location["latitude"]
        return [latitude, longitude]


async def get_time_for_travel(coordinates: List[float]):
    result = {}
    data = {
        "api_key": settings.OpenRouteServiceKey,
        "start": ",".join([str(x) for x in reversed(coordinates)]),
        "end": ",".join([str(x) for x in reversed(FUO_COORDS)]),
    }
    async with httpx.AsyncClient() as client:
        for profile in PROFILES:
            response = await client.get(
                f"https://api.openrouteservice.org/v2/directions/{profile}",
                params=data,
            )
            if response.status_code == 200:
                duration = response.json()["features"][0]["properties"]["summary"][
                    "duration"
                ]
                result[profile] = round(duration / 60, 1)
            else:
                print(response.status_code, response.text)
                return None

    return {
        "walking_time": result["foot-walking"],
        "driving_time": result["driving-car"],
    }
    # The api key needed "https://api.openrouteservice.org/v2/directions/driving-car?api_key=your-api-key&start=8.681495,49.41461&end=8.687872,49.420318"
