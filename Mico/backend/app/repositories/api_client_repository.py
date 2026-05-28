import uuid
from contextlib import AbstractContextManager
from typing import Callable

from sqlalchemy.orm import Session

from app.models.api_client import ApiClient


class ApiClientRepository:
    def __init__(
        self, session_factory: Callable[[], AbstractContextManager[Session]]
    ) -> None:
        self.session_factory = session_factory

    def create(self, client: ApiClient) -> ApiClient:
        with self.session_factory() as session:
            session.add(client)
        return client

    def list_all(self) -> list[ApiClient]:
        with self.session_factory() as session:
            return session.query(ApiClient).order_by(ApiClient.created_at.desc()).all()

    def get(self, client_pk: uuid.UUID) -> ApiClient | None:
        with self.session_factory() as session:
            return session.get(ApiClient, client_pk)

    def get_by_client_id(self, client_id: str) -> ApiClient | None:
        with self.session_factory() as session:
            return (
                session.query(ApiClient)
                .filter(ApiClient.client_id == client_id)
                .first()
            )

    def update(self, client: ApiClient, data: dict) -> ApiClient:
        with self.session_factory() as session:
            obj = session.merge(client)
            for key, value in data.items():
                setattr(obj, key, value)
        return obj

    def delete(self, client: ApiClient) -> None:
        with self.session_factory() as session:
            obj = session.merge(client)
            session.delete(obj)
