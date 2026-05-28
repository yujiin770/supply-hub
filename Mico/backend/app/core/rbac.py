from enum import Enum
from typing import Iterable, Set


class Role(str, Enum):
    SUPERADMIN = "SUPERADMIN"
    ADMIN = "ADMIN"
    SUPPLIER_OWNER = "SUPPLIER_OWNER"
    SUPPLIER_STAFF = "SUPPLIER_STAFF"


ROLE_PERMISSIONS: dict[Role, Set[str]] = {
    Role.SUPERADMIN: {"*"},
    Role.ADMIN: {"*"},
    Role.SUPPLIER_OWNER: {"read", "write"},
    Role.SUPPLIER_STAFF: {"read"},
}


def has_permission(role: Role, permission: str) -> bool:
    permissions = ROLE_PERMISSIONS.get(role, set())
    return "*" in permissions or permission in permissions


def has_any_permission(role: Role, permissions: Iterable[str]) -> bool:
    return any(has_permission(role, perm) for perm in permissions)
