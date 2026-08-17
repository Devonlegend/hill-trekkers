import logging
import sys


def configure_logging(level: str = "INFO") -> None:
    """Configure root logging for the API process."""
    logging.basicConfig(
        level=level.upper(),
        format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
        stream=sys.stdout,
    )
    # Quiet down chatty libraries.
    logging.getLogger("apscheduler").setLevel("WARNING")
    logging.getLogger("httpx").setLevel("WARNING")
