from dependency_injector import containers, providers

from app.db.session import AsyncSessionLocal


class Container(containers.DeclarativeContainer):
    """
    Application IoC container.

    Wired into endpoint modules so FastAPI can resolve services via
    `Depends(Provide[Container.xxx])` when needed.
    """

    wiring_config = containers.WiringConfiguration(
        modules=[
            "app.api.deps",
            "app.api.v1.routes.auth",
        ]
    )

    session_factory = providers.Object(AsyncSessionLocal)
