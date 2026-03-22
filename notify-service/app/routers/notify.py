# app/routers/notify.py
#
# Direct notification endpoint.
# POST /notify/send allows admin/testing to send emails directly
# without going through the Service Bus event flow.
#
# SECURITY: Protected by X-Internal-Key header.
# Only services and admin tools that know the internal key can call this.
# This prevents external users from sending arbitrary emails.

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from app.core.config import get_settings
from app.email.sendgrid_client import send_generic_email

router = APIRouter(prefix="/notify", tags=["Notify"])
settings = get_settings()


class NotifyRequest(BaseModel):
    """Request body for POST /notify/send."""
    to: str
    subject: str
    body: str


class NotifyResponse(BaseModel):
    """Response for POST /notify/send."""
    accepted: bool
    message: str


@router.post(
    "/send",
    response_model=NotifyResponse,
    status_code=202,
    summary="Send a direct notification email",
    description="Sends an email directly via SendGrid. Requires X-Internal-Key header.",
)
async def send_notification(
    payload: NotifyRequest,
    x_internal_key: str = Header(
        None,
        description="Internal API key — required to authenticate internal service calls",
    ),
):
    """
    POST /notify/send
    Sends a direct email. Used for testing and admin workflows.
    In production, most emails are triggered by Service Bus events.
    """
    # Validate internal key — reject unauthorised callers
    if x_internal_key != settings.internal_api_key:
        raise HTTPException(
            status_code=403,
            detail="Invalid or missing X-Internal-Key header",
        )

    # TODO (Sprint 3): call real SendGrid — currently using stub
    success = await send_generic_email(
        to=payload.to,
        subject=payload.subject,
        body=payload.body,
    )

    return NotifyResponse(
        accepted=success,
        message="Email queued for delivery" if success else "Email delivery failed",
    )
