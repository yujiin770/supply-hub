from typing import Any, Optional

from fastapi import status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse


def success_response(
    data: Optional[Any] = None,
    message: str = "Success",
    status_code: int = status.HTTP_200_OK,
) -> JSONResponse:
    payload = jsonable_encoder({"success": True, "message": message, "data": data})
    return JSONResponse(status_code=status_code, content=payload)


def error_response(
    message: str,
    status_code: int = status.HTTP_400_BAD_REQUEST,
    errors: Optional[Any] = None,
) -> JSONResponse:
    payload = jsonable_encoder({"success": False, "message": message, "errors": errors})
    return JSONResponse(status_code=status_code, content=payload)
