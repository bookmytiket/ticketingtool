from fastapi import APIRouter, Query

router = APIRouter()


@router.get("/dashboard")
async def reports_dashboard(period: str = Query(default="month"), organization: str | None = None):
    """
    Simplified reports dashboard endpoint.
    Returns the same fields as the original Node implementation but with
    zeroed / empty values so the React UI can render without errors.
    """
    from datetime import datetime

    now = datetime.utcnow()
    start_date = now  # For now, just echo "now" as both start and end

    return {
        "period": period,
        "startDate": start_date,
        "endDate": now,
        "totalTickets": 0,
        "statusBreakdown": {},
        "priorityBreakdown": {},
        "departmentBreakdown": [],
        "slaMetrics": {
            "compliant": 0,
            "breached": 0,
            "warnings": 0,
            "complianceRate": 0,
        },
        "technicianPerformance": [],
    }


@router.get("/status-wise")
async def reports_status_wise(period: str = Query(default="month"), organization: str | None = None):
    return {
        "period": period,
        "data": [],
    }


@router.get("/department-wise")
async def reports_department_wise(period: str = Query(default="month"), organization: str | None = None):
    return {
        "period": period,
        "data": [],
    }


@router.get("/technician-performance")
async def reports_technician_performance(period: str = Query(default="month"), organization: str | None = None):
    return {
        "period": period,
        "data": [],
    }


@router.get("/sla-compliance")
async def reports_sla_compliance(period: str = Query(default="month"), organization: str | None = None):
    return {
        "period": period,
        "responseSLA": {
            "total": 0,
            "compliant": 0,
            "breached": 0,
            "complianceRate": 0,
        },
        "resolutionSLA": {
            "total": 0,
            "compliant": 0,
            "breached": 0,
            "complianceRate": 0,
        },
    }


@router.get("/trends")
async def reports_trends(
    period: str = Query(default="month"),
    organization: str | None = None,
    groupBy: str = Query(default="day"),
):
    return {
        "period": period,
        "groupBy": groupBy,
        "data": [],
    }


