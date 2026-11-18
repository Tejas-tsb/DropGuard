"""Typed request and response contracts for model inference."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field


Rating = Annotated[int, Field(strict=True, ge=1, le=5)]
EducationLevel = Annotated[int, Field(strict=True, ge=0, le=4)]


class PredictionRequest(BaseModel):
    """The 32 metadata-defined inputs; all values retain source CSV types."""

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "school": "GP",
                "sex": "F",
                "age": 18,
                "address": "U",
                "famsize": "GT3",
                "Pstatus": "A",
                "Medu": 4,
                "Fedu": 4,
                "Mjob": "at_home",
                "Fjob": "teacher",
                "reason": "course",
                "guardian": "mother",
                "traveltime": 2,
                "studytime": 2,
                "failures": 0,
                "schoolsup": "yes",
                "famsup": "no",
                "paid": "no",
                "activities": "no",
                "nursery": "yes",
                "higher": "yes",
                "internet": "no",
                "romantic": "no",
                "famrel": 4,
                "freetime": 3,
                "goout": 4,
                "Dalc": 1,
                "Walc": 1,
                "health": 3,
                "absences": 4,
                "G1": 0,
                "G2": 11,
            }
        },
    )

    school: Literal["GP", "MS"]
    sex: Literal["F", "M"]
    age: Annotated[int, Field(strict=True, ge=15, le=22)]
    address: Literal["R", "U"]
    famsize: Literal["GT3", "LE3"]
    Pstatus: Literal["A", "T"]
    Medu: EducationLevel
    Fedu: EducationLevel
    Mjob: Literal["at_home", "health", "other", "services", "teacher"]
    Fjob: Literal["at_home", "health", "other", "services", "teacher"]
    reason: Literal["course", "home", "other", "reputation"]
    guardian: Literal["father", "mother", "other"]
    traveltime: Annotated[int, Field(strict=True, ge=1, le=4)]
    studytime: Annotated[int, Field(strict=True, ge=1, le=4)]
    failures: Annotated[int, Field(strict=True, ge=0, le=3)]
    schoolsup: Literal["no", "yes"]
    famsup: Literal["no", "yes"]
    paid: Literal["no", "yes"]
    activities: Literal["no", "yes"]
    nursery: Literal["no", "yes"]
    higher: Literal["no", "yes"]
    internet: Literal["no", "yes"]
    romantic: Literal["no", "yes"]
    famrel: Rating
    freetime: Rating
    goout: Rating
    Dalc: Rating
    Walc: Rating
    health: Rating
    absences: Annotated[int, Field(strict=True, ge=0)]
    G1: Annotated[int, Field(strict=True, ge=0, le=20)]
    G2: Annotated[int, Field(strict=True, ge=0, le=20)]


class PredictionResponse(BaseModel):
    predicted_class: Literal[0, 1]
    academic_risk_probability: Annotated[float, Field(ge=0, le=1)]
    risk_category: Literal["No elevated academic risk indicated", "Elevated academic risk"]
    classification_threshold: float
    classification_rule: str
    target_definition: str

