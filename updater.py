"""
Check GitHub Releases for a newer version of Personal Planner.
Downloads the latest installer in the background and runs it to update the app.
"""
import os
import sys
import subprocess
import threading
import logging
import requests
from version import APP_VERSION, GITHUB_REPO

# Global state for tracking download progress
_download_state = {
    "progress": 0,
    "total_size": 0,
    "downloaded": 0,
    "status": "idle", # idle, downloading, completed, error
    "error_message": "",
    "local_path": ""
}

def _ver_tuple(v: str):
    """Convert '1.2.3' → (1, 2, 3) for comparison."""
    try:
        return tuple(int(x) for x in v.strip().lstrip('v').split('.'))
    except Exception:
        return (0,)

def check_for_update() -> dict:
    """
    Query GitHub API for the latest release.
    Returns:
      { available: bool, current: str, latest: str, download_url: str, notes: str }
    """
    try:
        headers = {"User-Agent": "PersonalPlanner-Updater"}
        api_url = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
        resp = requests.get(api_url, headers=headers, timeout=6)
        resp.raise_for_status()
        
        release_data = resp.json()
        latest_version = release_data.get("tag_name", "0.0.0").strip().lstrip('v')
        notes = release_data.get("body", "No release notes provided.")
        
        # Find installer asset (.exe)
        download_url = None
        for asset in release_data.get("assets", []):
            name = asset.get("name", "")
            if name.endswith(".exe"):
                download_url = asset.get("browser_download_url")
                break
                
        if not download_url:
            # Fallback to the release html page if no exe asset found
            download_url = release_data.get("html_url", f"https://github.com/{GITHUB_REPO}/releases/latest")

        is_newer = _ver_tuple(latest_version) > _ver_tuple(APP_VERSION)
        
        return {
            "available": is_newer,
            "current": APP_VERSION,
            "latest": latest_version,
            "download_url": download_url,
            "notes": notes
        }
    except Exception as exc:
        logging.warning("Update check failed: %s", exc)
        return {"available": False, "error": str(exc), "current": APP_VERSION, "latest": "unknown"}

def get_download_status() -> dict:
    """Returns the current background download state."""
    return _download_state

def start_download_thread(download_url: str):
    """Starts the download in a background thread if not already downloading."""
    if _download_state["status"] == "downloading":
        return
        
    _download_state["status"] = "downloading"
    _download_state["progress"] = 0
    _download_state["downloaded"] = 0
    _download_state["error_message"] = ""
    
    thread = threading.Thread(target=_download_file, args=(download_url,), daemon=True)
    thread.start()

def _download_file(url: str):
    try:
        # Determine local temp path
        temp_dir = os.path.join(
            os.environ.get('APPDATA', os.path.expanduser('~')),
            'PersonalPlanner',
            'updates'
        )
        os.makedirs(temp_dir, exist_ok=True)
        filename = url.split('/')[-1]
        if not filename.endswith('.exe'):
            filename = "PersonalPlannerSetup.exe"
            
        local_path = os.path.join(temp_dir, filename)
        _download_state["local_path"] = local_path
        
        headers = {"User-Agent": "PersonalPlanner-Updater"}
        resp = requests.get(url, headers=headers, stream=True, timeout=15)
        resp.raise_for_status()
        
        total_size = int(resp.headers.get('content-length', 0))
        _download_state["total_size"] = total_size
        
        downloaded = 0
        with open(local_path, 'wb') as f:
            for chunk in resp.iter_content(chunk_size=8192):
                if not chunk:
                    continue
                f.write(chunk)
                downloaded += len(chunk)
                _download_state["downloaded"] = downloaded
                if total_size > 0:
                    _download_state["progress"] = int((downloaded / total_size) * 100)
                    
        _download_state["status"] = "completed"
        _download_state["progress"] = 100
        
    except Exception as e:
        _download_state["status"] = "error"
        _download_state["error_message"] = str(e)
        logging.error("Failed to download update: %s", e)

def launch_installer() -> bool:
    """Launches the downloaded installer and terminates the application."""
    local_path = _download_state["local_path"]
    if not local_path or not os.path.exists(local_path):
        return False
        
    try:
        logging.warning("Launching updater: %s", local_path)
        # Spawn the setup process. On Windows, we use Popen and detached flags if needed, 
        # but normal Popen is sufficient.
        subprocess.Popen([local_path], shell=False)
        
        # Give it a tiny moment to launch, then kill this process
        def kill_self():
            import time
            time.sleep(1)
            logging.warning("Shutting down app for update installation.")
            os._exit(0)
            
        threading.Thread(target=kill_self, daemon=True).start()
        return True
    except Exception as e:
        logging.error("Failed to launch updater process: %s", e)
        return False
