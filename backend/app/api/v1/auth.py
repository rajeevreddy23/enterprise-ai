import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, RoleEnum
from app.models import User, Organization
from app.schemas.auth import LoginRequest, RegisterRequest, Token, UserResponse, OrganizationResponse
from app.api.deps import get_current_user
from app.services.audit_service import AuditService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if email is already taken
    existing_user = await db.execute(select(User).where(User.email == req.email))
    if existing_user.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    # Create Organization
    slug = req.organization_name.lower().replace(" ", "-") + "-" + str(uuid.uuid4())[:6]
    org = Organization(
        id=str(uuid.uuid4()),
        name=req.organization_name,
        slug=slug
    )
    db.add(org)
    await db.flush()

    # Create User
    user = User(
        id=str(uuid.uuid4()),
        email=req.email,
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        role=req.role or RoleEnum.ADMIN,
        organization_id=org.id,
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Audit log
    await AuditService.log_event(
        db=db,
        organization_id=org.id,
        user_id=user.id,
        action="REGISTER",
        resource_type="AUTH",
        resource_id=user.id,
        details=f"Registered user {user.email} in organization {org.name}"
    )

    access_token = create_access_token(
        subject=user.id,
        role=user.role,
        org_id=user.organization_id
    )

    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        organization_id=user.organization_id,
        is_active=user.is_active,
        created_at=user.created_at,
        organization=OrganizationResponse(
            id=org.id,
            name=org.name,
            slug=org.slug,
            created_at=org.created_at
        )
    )

    return Token(access_token=access_token, token_type="bearer", user=user_resp)


@router.post("/login", response_model=Token)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    # Fetch organization
    org_res = await db.execute(select(Organization).where(Organization.id == user.organization_id))
    org = org_res.scalar_one_or_none()

    access_token = create_access_token(
        subject=user.id,
        role=user.role,
        org_id=user.organization_id
    )

    await AuditService.log_event(
        db=db,
        organization_id=user.organization_id,
        user_id=user.id,
        action="LOGIN",
        resource_type="AUTH",
        resource_id=user.id,
        details=f"Successful login for {user.email}"
    )

    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        organization_id=user.organization_id,
        is_active=user.is_active,
        created_at=user.created_at,
        organization=OrganizationResponse(
            id=org.id,
            name=org.name,
            slug=org.slug,
            created_at=org.created_at
        ) if org else None
    )

    return Token(access_token=access_token, token_type="bearer", user=user_resp)


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    org_res = await db.execute(select(Organization).where(Organization.id == current_user.organization_id))
    org = org_res.scalar_one_or_none()

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        organization_id=current_user.organization_id,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        organization=OrganizationResponse(
            id=org.id,
            name=org.name,
            slug=org.slug,
            created_at=org.created_at
        ) if org else None
    )
