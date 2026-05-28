import uuid
from contextlib import AbstractContextManager
from typing import Callable

from sqlalchemy.orm import Session

from app.models.supplier import Supplier, SupplierStatus


class SupplierRepository:
    def __init__(self, session_factory: Callable[[], AbstractContextManager[Session]]) -> None:
        self.session_factory = session_factory

    def create(self, supplier: Supplier) -> Supplier:
        with self.session_factory() as session:
            session.add(supplier)
            session.flush()         # sends INSERT → DB generates supplier_code via sequence
            session.refresh(supplier)  # reloads generated columns (supplier_code etc.)
            return supplier

    def get(self, supplier_id: uuid.UUID) -> Supplier | None:
        with self.session_factory() as session:
            return session.get(Supplier, supplier_id)

    def get_by_code(self, code: str) -> Supplier | None:
        with self.session_factory() as session:
            return (
                session.query(Supplier)
                .filter(Supplier.supplier_code == code)
                .first()
            )

    def get_by_email(self, email: str) -> Supplier | None:
        with self.session_factory() as session:
            return session.query(Supplier).filter(Supplier.email == email).first()

    def list(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        status: SupplierStatus | None = None,
        q: str | None = None,
    ) -> list[Supplier]:
        with self.session_factory() as session:
            query = session.query(Supplier)
            if status is not None:
                query = query.filter(Supplier.status == status)
            if q:
                search = f"%{q}%"
                query = query.filter(
                    Supplier.legal_name.ilike(search)
                    | Supplier.trade_name.ilike(search)
                    | Supplier.email.ilike(search)
                    | Supplier.supplier_code.ilike(search)
                )
            return query.order_by(Supplier.created_at.desc()).offset(skip).limit(limit).all()

    def count(self, *, status: SupplierStatus | None = None, q: str | None = None) -> int:
        with self.session_factory() as session:
            query = session.query(Supplier)
            if status is not None:
                query = query.filter(Supplier.status == status)
            if q:
                search = f"%{q}%"
                query = query.filter(
                    Supplier.legal_name.ilike(search)
                    | Supplier.trade_name.ilike(search)
                    | Supplier.email.ilike(search)
                    | Supplier.supplier_code.ilike(search)
                )
            return query.count()

    def update(self, supplier_id: uuid.UUID, data: dict) -> Supplier:
        with self.session_factory() as session:
            db_supplier = session.get(Supplier, supplier_id)
            if db_supplier is None:
                raise ValueError(f"Supplier {supplier_id} not found")
            for key, value in data.items():
                setattr(db_supplier, key, value)
            session.flush()
            session.refresh(db_supplier)
            return db_supplier

    def update_status(self, supplier_id: uuid.UUID, new_status: SupplierStatus) -> Supplier:
        with self.session_factory() as session:
            db_supplier = session.get(Supplier, supplier_id)
            if db_supplier is None:
                raise ValueError(f"Supplier {supplier_id} not found")
            db_supplier.status = new_status
            session.flush()
            session.refresh(db_supplier)
            return db_supplier
