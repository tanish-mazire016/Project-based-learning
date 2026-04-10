# Celery tasks package — import all modules so autodiscover_tasks() registers them
from . import cleaning  # noqa: F401
from . import features  # noqa: F401
from . import scoring   # noqa: F401
from . import decisions  # noqa: F401
from . import adaptive  # noqa: F401
from . import audit     # noqa: F401
