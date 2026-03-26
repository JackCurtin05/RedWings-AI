"""
main.py
Serves the combined frontend + backend for deployment (e.g. Render).
For local development, run the API separately:
  fastapi dev api.py
"""

from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.exceptions import HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

import api

PUBLIC_DIRECTORY = Path("public")

app = FastAPI()
app.mount("/api/", api.app)
app.mount("/", StaticFiles(directory=PUBLIC_DIRECTORY, html=True), name="public")


@app.exception_handler(status.HTTP_404_NOT_FOUND)
async def not_found(req: Request, exc: HTTPException) -> FileResponse:
    return FileResponse(PUBLIC_DIRECTORY / "index.html")