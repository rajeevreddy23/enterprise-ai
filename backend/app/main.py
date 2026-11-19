import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.api.v1 import (
    auth, documents, chat, search, analytics, users, rag_eval
)
from app.api.deps import get_vector_store, get_embedding_service

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("enterprise_ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Enterprise AI Knowledge Assistant backend...")
    # Initialize database tables and seed default organization & users
    await init_db()
    logger.info("Database initialized successfully.")
    yield
    logger.info("Shutting down Enterprise AI backend...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-Grade Enterprise AI Knowledge Assistant with Advanced RAG, Multi-Tenancy & RBAC",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development and production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check & System Status Endpoint
@app.get("/api/health")
async def health_check():
    vector_store = get_vector_store()
    embed_service = get_embedding_service()
    qdrant_info = vector_store.get_collection_stats()
    gemini_live = embed_service.is_live_gemini()

    return {
        "status": "healthy",
        "version": settings.VERSION,
        "vector_store": qdrant_info,
        "gemini_api_active": gemini_live,
        "gemini_model": settings.GEMINI_MODEL,
        "gemini_embedding_model": settings.GEMINI_EMBEDDING_MODEL
    }


# Include V1 API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(search.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(rag_eval.router, prefix=settings.API_V1_STR)
