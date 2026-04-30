"""
Check GitHub main branch for a newer version of Personal Planner.
Reads version.py raw from GitHub and compares APP_VERSION tuples.
"""
import os
import sys
import tempfile
import threading


def _ver_tuple(v: str):
    """Convert '1.2.3' → (1, 2, 3) for comparison."""
    try:
        return tuple(int(x) for x in v.strip().lstrip('v').split('.'))
    except Exception:
        return (0,)


def check_for_update() -> dict:
    """
    Returns a dict:
      { available: bool, current: str, latest: str, installer_url: str, download_url: str }
    or
      { available: False, error: str }
    """
    try:
        from version import APP_VERSION, GITHUB_REPO
        import requests

        # Two candidate URLs — the second is a legacy path that old installers may have baked in.
        candidate_urls = [
            f"https://raw.githubusercontent.com/{GITHUB_REPO}/main/version.py",
            f"https://raw.githubusercontent.com/{GITHUB_REPO}/main/PersonalPlanner/version.py",
        ]
        resp = None
        for raw_url in candidate_urls:
            try:
                r = requests.get(raw_url, timeout=6)
                if r.status_code == 200 and "APP_VERSION" in r.text:
                    resp = r
                    break
            except Exception:
                continue
        if resp is None:
            return {"available": False, "error": "Could not reach GitHub to check for updates."}

        ns: dict = {}
        exec(resp.text, ns)  # noqa: S102 — safe: only reading our own file
        latest = ns.get("APP_VERSION", "0.0.0")

        # Direct link to the .exe asset on GitHub Releases
        installer_url = (
            f"https://github.com/{GITHUB_REPO}/releases/download"
            f"/v{latest}/PersonalPlannerSetup_v{latest}.exe"
        )
        download_url = f"https://github.com/{GITHUB_REPO}/releases/latest"

        if _ver_tuple(latest) > _ver_tuple(APP_VERSION):
            return {
                "available":     True,
                "current":       APP_VERSION,
                "latest":        latest,
                "installer_url": installer_url,
                "download_url":  download_url,
            }
        return {"available": False, "current": APP_VERSION, "latest": latest}

    except Exception as exc:
        return {"available": False, "error": str(exc)}


# ── Download state shared between download thread and API endpoints ────────────
_dl_state: dict = {"status": "idle", "progress": 0, "path": None, "error": None}
_dl_lock = threading.Lock()


def get_download_state() -> dict:
    with _dl_lock:
        return dict(_dl_state)


def download_installer(installer_url: str, version: str) -> None:
    """Download the installer in a background thread, updating _dl_state."""
    import requests

    with _dl_lock:
        _dl_state.update({"status": "downloading", "progress": 0, "path": None, "error": None})

    try:
        dest = os.path.join(tempfile.gettempdir(), f"PersonalPlannerSetup_v{version}.exe")
        resp = requests.get(installer_url, stream=True, timeout=60)
        resp.raise_for_status()

        total = int(resp.headers.get("content-length", 0))
        downloaded = 0
        with open(dest, "wb") as f:
            for chunk in resp.iter_content(chunk_size=65536):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total:
                        pct = int(downloaded / total * 100)
                        with _dl_lock:
                            _dl_state["progress"] = pct

        with _dl_lock:
            _dl_state.update({"status": "ready", "progress": 100, "path": dest})

    except Exception as exc:
        with _dl_lock:
            _dl_state.update({"status": "error", "error": str(exc)})


def run_installer_and_exit(installer_path: str) -> None:
    """Run the installer silently then exit this process.
    Inno Setup /VERYSILENT installs over the existing version without prompts.
    A 2-second delay gives FastAPI time to return the HTTP response first.
    """
    import subprocess
    import time
    time.sleep(2)
    subprocess.Popen(
        [installer_path, "/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART",
         "/LOG=" + os.path.join(tempfile.gettempdir(), "pp_update.log")],
        creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP,
    )
    os._exit(0)
