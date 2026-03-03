from fastapi import APIRouter, Response

router = APIRouter()


@router.get("/health")
async def health_check():
    return {"status": "OK", "message": "FastAPI server is running"}


@router.head("/health")
async def health_check_head():
    # Return empty 200 for HEAD requests (used by Docker healthcheck)
    return Response(status_code=200)


