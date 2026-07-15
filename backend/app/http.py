from flask import jsonify, request
from pydantic import BaseModel, ValidationError

from .errors import ApiError


def parse_body(schema_cls: type[BaseModel]) -> BaseModel:
    payload = request.get_json(silent=True)
    if payload is None:
        raise ApiError("Request body must be JSON", 400)
    try:
        return schema_cls(**payload)
    except ValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ApiError(f"{field}: {first['msg']}" if field else first["msg"], 422)


def dump(schema_cls: type[BaseModel], obj) -> dict:
    return schema_cls.model_validate(obj).model_dump()


def dump_list(schema_cls: type[BaseModel], objs) -> list[dict]:
    return [dump(schema_cls, obj) for obj in objs]


def json_response(data, status: int = 200):
    if isinstance(data, BaseModel):
        data = data.model_dump()
    return jsonify(data), status
