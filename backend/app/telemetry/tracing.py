from __future__ import annotations

import logging
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Iterator, Optional

from app.config import Settings

try:
    from opentelemetry import trace
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
except Exception:  # pragma: no cover - dependency optional in tests
    trace = None  # type: ignore
    TracerProvider = None  # type: ignore
    Resource = None  # type: ignore
    BatchSpanProcessor = None  # type: ignore
    ConsoleSpanExporter = None  # type: ignore
    OTLPSpanExporter = None  # type: ignore

try:
    from langsmith import Client as LangSmithClient
except Exception:  # pragma: no cover
    LangSmithClient = None  # type: ignore


TRACE_ID_VAR: ContextVar[Optional[str]] = ContextVar(
    "timbergem_trace_id", default=None
)
LOGGER = logging.getLogger("timbergem.telemetry")


def _parse_headers(raw: str) -> Dict[str, str]:
    headers: Dict[str, str] = {}
    if not raw:
        return headers
    for chunk in raw.split(","):
        if "=" not in chunk:
            continue
        key, value = chunk.split("=", 1)
        headers[key.strip()] = value.strip()
    return headers


def _format_trace_id(span) -> Optional[str]:
    if span is None:
        return None
    ctx = span.get_span_context()
    if ctx is None:
        return None
    trace_id = getattr(ctx, "trace_id", None)
    if trace_id is None:
        return None
    return f"{trace_id:032x}"


@dataclass
class Telemetry:
    """Wrapper around OpenTelemetry + optional LangSmith logging."""

    settings: Settings
    _tracer_initialized: bool = False
    _langsmith_client: Optional[Any] = None
    _langsmith_project: Optional[str] = None

    def __post_init__(self) -> None:
        self._enabled = bool(
            self.settings.tracing_enabled and trace is not None and TracerProvider is not None
        )
        self._trace_id_var = TRACE_ID_VAR
        self._ensure_provider()
        self._tracer = trace.get_tracer("timbergem") if trace else None
        self._init_langsmith()

    def _ensure_provider(self) -> None:
        if not self._enabled or self._tracer_initialized:
            return
        resource_attributes = {
            "service.name": "timbergem-backend",
            "service.version": self.settings.api_version,
            "deployment.environment": self.settings.environment,
        }
        resource = Resource.create(resource_attributes) if Resource else None
        provider = TracerProvider(resource=resource) if TracerProvider else None
        if provider and BatchSpanProcessor and ConsoleSpanExporter:
            exporter = ConsoleSpanExporter()
            if (
                self.settings.otlp_endpoint
                and OTLPSpanExporter is not None
            ):
                headers = _parse_headers(self.settings.otlp_headers or "")
                exporter = OTLPSpanExporter(
                    endpoint=self.settings.otlp_endpoint,
                    headers=headers,
                )
            provider.add_span_processor(BatchSpanProcessor(exporter))
            trace.set_tracer_provider(provider)
            self._tracer_initialized = True
        else:
            LOGGER.warning(
                "OpenTelemetry SDK not available; tracing disabled. "
                "Install opentelemetry-sdk to enable spans."
            )
            self._enabled = False

    def _init_langsmith(self) -> None:
        api_key = self.settings.langsmith_api_key
        if not api_key or LangSmithClient is None:
            return
        try:
            self._langsmith_project = (
                self.settings.langsmith_project or "TimberGem"
            )
            self._langsmith_client = LangSmithClient(
                api_key=api_key,
                project=self._langsmith_project,
            )
        except Exception as exc:  # pragma: no cover
            LOGGER.warning("Failed to initialize LangSmith client: %s", exc)
            self._langsmith_client = None

    @contextmanager
    def span(
        self, name: str, attributes: Optional[Dict[str, Any]] = None
    ) -> Iterator[Optional[Any]]:
        if not self._enabled or self._tracer is None:
            yield None
            return

        attributes = attributes or {}
        start_time = datetime.now(timezone.utc)
        token = None
        span = self._tracer.start_span(name)
        for key, value in attributes.items():
            if value is not None:
                span.set_attribute(f"timbergem.{key}", value)
        trace_id = _format_trace_id(span)
        if trace_id:
            token = self._trace_id_var.set(trace_id)

        try:
            with trace.use_span(span, end_on_exit=True):
                yield span
        except Exception as exc:
            span.record_exception(exc)
            span.set_attribute("timbergem.error", True)
            raise
        finally:
            end_time = datetime.now(timezone.utc)
            if token:
                self._trace_id_var.reset(token)
            self._record_langsmith_run(name, attributes, trace_id, start_time, end_time)

    def current_trace_id(self) -> Optional[str]:
        return self._trace_id_var.get()

    def _record_langsmith_run(
        self,
        name: str,
        attributes: Dict[str, Any],
        trace_id: Optional[str],
        start_time: datetime,
        end_time: datetime,
    ) -> None:
        if not self._langsmith_client:
            return
        payload = {
            "status": "success",
            "trace_id": trace_id,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
        }
        try:
            self._langsmith_client.create_run(
                name=name,
                inputs=attributes,
                outputs=payload,
                run_type="chain",
                trace_id=trace_id,
                start_time=start_time,
                end_time=end_time,
                tags=["backend", "use_case"],
                project_name=self._langsmith_project,
            )
        except Exception as exc:  # pragma: no cover
            LOGGER.debug("LangSmith logging failed: %s", exc)


def get_telemetry(settings: Optional[Settings] = None) -> Telemetry:
    settings = settings or Settings()
    return Telemetry(settings=settings)

