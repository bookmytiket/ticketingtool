from fastapi import FastAPI

from .config import get_settings
from .routes import (
    health,
    tickets,
    auth,
    organizations,
    users,
    categories,
    departments,
    sla,
    reports,
)


def create_app() -> FastAPI:
    app = FastAPI(title="Ticketing Tool API (FastAPI)")

    # Routers
    app.include_router(health.router, prefix="/api")
    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(tickets.router, prefix="/api/tickets", tags=["tickets"])
    app.include_router(organizations.router, prefix="/api/organizations", tags=["organizations"])
    app.include_router(users.router, prefix="/api/users", tags=["users"])
    app.include_router(categories.router, prefix="/api/categories", tags=["categories"])
    app.include_router(departments.router, prefix="/api/departments", tags=["departments"])
    app.include_router(sla.router, prefix="/api/admin/sla", tags=["sla"])
    app.include_router(reports.router, prefix="/api/reports", tags=["reports"])

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.port, reload=False)


