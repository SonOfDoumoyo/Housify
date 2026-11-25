from sqlmodel import SQLModel, Field, Column
import sqlalchemy.dialects.postgresql as pg


# Areas an agent can pick from when posting a house. Agents can add a new
# area through "Other" in the listing form; it is stored here so every
# later listing form sees it. Seeded with the areas the old form
# hardcoded (the same names as coordinates.json).
SEEDED_AREA_NAMES = [
    "federal_university_of_otuoke",
    "azikiel",
    "otuaba",
    "skills auditorium",
    "tee-jay estate",
    "olumba",
    "eva glass hotels",
    "after bridge",
    "kata kata",
    "highness",
]


class Address(SQLModel, table=True):
    __tablename__ = "addresses"
    id: int = Field(
        default=None,
        sa_column=Column(
            pg.INTEGER, primary_key=True, nullable=False, autoincrement=True
        ),
    )
    name: str = Field(
        sa_column=Column(pg.VARCHAR, unique=True, nullable=False, index=True)
    )
