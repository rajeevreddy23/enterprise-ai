import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.security import get_password_hash, RoleEnum
from app.models import User, AuditLog
from app.schemas.auth import UserResponse
from app.schemas.user import UserCreate, UserRoleUpdate, AuditLogResponse
from app.api.deps import get_current_user, require_roles
from app.services.audit_service import AuditService

router = APIRouter(prefix="/users", tags=["User Management"])


@router.get("/", response_model=List[UserResponse])
async def list_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User)
        .where(User.organization_id == current_user.organization_id)
        .order_by(desc(User.created_at))
    )
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


@router.post("/", response_model=UserResponse)
async def create_user(
    body: UserCreate,
    current_user: User = Depends(require_roles([RoleEnum.ADMIN, RoleEnum.MANAGER])),
    db: AsyncSession = Depends(get_db)
):
    # Only Admin can create Admin or Manager roles
    if current_user.role == RoleEnum.MANAGER and body.role in [RoleEnum.ADMIN, RoleEnum.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Managers can only create Employee accounts"
        )

    # Check duplicate
    exists = await db.execute(select(User).where(User.email == body.email))
    if exists.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    new_user = User(
        id=str(uuid.uuid4()),
        email=body.email,
        hashed_password=get_password_hash(body.password),
        full_name=body.full_name,
        role=body.role,
        organization_id=current_user.organization_id,
        is_active=True
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    await AuditService.log_event(
        db=db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="USER_CREATE",
        resource_type="USER",
        resource_id=new_user.id,
        details=f"Created user {new_user.email} with role {new_user.role}"
    )

    return UserResponse.model_validate(new_user)


@router.patch("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,
    body: UserRoleUpdate,
    current_user: User = Depends(require_roles([RoleEnum.ADMIN])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.organization_id == current_user.organization_id
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = user.role
    user.role = body.role
    await db.commit()
    await db.refresh(user)

    await AuditService.log_event(
        db=db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="ROLE_CHANGE",
        resource_type="USER",
        resource_id=user.id,
        details=f"Changed role of {user.email} from {old_role} to {body.role}"
    )

    return UserResponse.model_validate(user)


@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    current_user: User = Depends(require_roles([RoleEnum.ADMIN, RoleEnum.MANAGER])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.organization_id == current_user.organization_id)
        .order_by(desc(AuditLog.timestamp))
        .limit(100)
    )
    logs = result.scalars().all()
    return [AuditLogResponse.model_validate(l) for l in logs]
