"""FastAPI application with Clean Architecture.

This is the new main module using dependency injection and use cases.
The old main.py is preserved for reference during migration.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import Settings
from app.api.routes import entities, concepts, links, projects, ai

# Initialize settings
settings = Settings()

# Create FastAPI app
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="TimberGem Backend - Clean Architecture Edition"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(projects.router)
app.include_router(ai.router)
app.include_router(entities.router)
app.include_router(concepts.router)
app.include_router(links.router)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "title": settings.api_title,
        "version": settings.api_version,
        "architecture": "Clean Architecture"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

