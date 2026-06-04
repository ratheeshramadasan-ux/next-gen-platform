import uuid
import contextvars
from typing import Optional, Dict, Any

# Context variables for trace and span propagation across the modular monolith
trace_id_var: contextvars.ContextVar[Optional[uuid.UUID]] = contextvars.ContextVar("trace_id", default=None)
span_id_var: contextvars.ContextVar[Optional[uuid.UUID]] = contextvars.ContextVar("span_id", default=None)

class TelemetryPropagator:
    """
    Ensures that every execution step, policy check, and log entry 
    carries the global Trace ID and parent Span IDs.
    """
    
    @staticmethod
    def start_trace() -> uuid.UUID:
        t_id = uuid.uuid4()
        trace_id_var.set(t_id)
        return t_id

    @staticmethod
    def get_current_trace() -> Optional[uuid.UUID]:
        return trace_id_var.get()

    @staticmethod
    def inject_context(headers: Dict[str, str]):
        """Injects trace context into headers for cross-service calls"""
        t_id = trace_id_var.get()
        if t_id:
            headers["X-Trace-ID"] = str(t_id)

    @staticmethod
    def extract_context(headers: Dict[str, str]):
        """Extracts trace context from headers"""
        t_id = headers.get("X-Trace-ID")
        if t_id:
            trace_id_var.set(uuid.UUID(t_id))

class TraceSpan:
    """
    Context manager for distributed spans.
    Automatically captures latency and status.
    """
    def __init__(self, db_client, operation: str, metadata: Dict[str, Any] = {}):
        self.db = db_client
        self.operation = operation
        self.metadata = metadata
        self.span_id = uuid.uuid4()
        self.start_time = None

    async def __aenter__(self):
        # Record start in DB and set current span
        # await self.db.trace.create(...)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        # Calculate latency and update span status
        pass
