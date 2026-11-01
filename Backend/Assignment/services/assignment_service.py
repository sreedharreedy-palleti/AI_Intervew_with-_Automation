"""
Assignment Service Facade.
Aggregates and re-exports services from dedicated domain files:
- access_service
- assessment_service
- execution_service
- submission_service
- proctor_service
"""

from .access_service import service_verify_exam_access
from .assessment_service import (
    sanitize_assignment_for_client,
    service_get_or_create_assignment,
)
from .execution_service import service_run_tests
from .submission_service import (
    service_submit_assignment,
    service_get_assignment_results,
)
from .proctor_service import (
    service_analyze_frame,
    service_terminate_exam_for_violation,
    service_get_proctor_logs,
)

__all__ = [
    "sanitize_assignment_for_client",
    "service_verify_exam_access",
    "service_get_or_create_assignment",
    "service_run_tests",
    "service_submit_assignment",
    "service_get_assignment_results",
    "service_analyze_frame",
    "service_terminate_exam_for_violation",
    "service_get_proctor_logs",
]
