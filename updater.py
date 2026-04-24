"""
Check GitHub main branch for a newer version of Personal Planner.
Reads version.py raw from GitHub and compares APP_VERSION tuples.
"""
import sys


def _ver_tuple(v: str):
    """Convert '1.2.3' → (1, 2, 3) for comparison."""
    try:
        return tuple(int(x) for x in v.strip().lstrip('v').split('.'))
    except Exception:
        return (0,)


def check_for_update() -> dict:
    """
    Returns a dict:
      { available: bool, current: str, latest: str, download_url: str }
    or
      { available: False, error: str }
    """
    try:
        from version import APP_VERSION, GITHUB_REPO
        import requests
        raw_url = (
            f"https://raw.githubusercontent.com/{GITHUB_REPO}/main"
            f"/PersonalPlanner/version.py"
        )
        resp = requests.get(raw_url, timeout=6)
        resp.raise_for_status()

        ns: dict = {}
        exec(resp.text, ns)  # noqa: S102 — safe: only reading our own file
        latest = ns.get("APP_VERSION", "0.0.0")
        download_url = f"https://github.com/{GITHUB_REPO}/releases/latest"

        if _ver_tuple(latest) > _ver_tuple(APP_VERSION):
            return {
                "available":    True,
                "current":      APP_VERSION,
                "latest":       latest,
                "download_url": download_url,
            }
        return {"available": False, "current": APP_VERSION, "latest": latest}

    except Exception as exc:
        return {"available": False, "error": str(exc)}
