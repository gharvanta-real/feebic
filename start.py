import os
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SERVER_DIR = ROOT / "server"
API_HEALTH_URL = "http://127.0.0.1:8081/api/health"


def is_port_open(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return sock.connect_ex((host, port)) == 0


def api_is_healthy() -> bool:
    try:
        with urllib.request.urlopen(API_HEALTH_URL, timeout=2) as response:
            return response.status == 200
    except Exception:
        return False


def start_api_server() -> subprocess.Popen | None:
    if api_is_healthy():
        print("api already healthy on http://127.0.0.1:8081")
        return None

    if is_port_open("127.0.0.1", 8081):
        print("port 8081 is busy, but api health check failed")
        print("close the stale process on 8081 or set NEXT_PUBLIC_API_BASE_URL to the remote api")
        return None

    exe = SERVER_DIR / "api.exe"
    if exe.exists():
        cmd = [str(exe)]
    else:
        cmd = ["go", "run", "./cmd/api"]

    print("starting api on http://127.0.0.1:8081")
    creationflags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
    process = subprocess.Popen(
        cmd,
        cwd=SERVER_DIR,
        creationflags=creationflags,
    )

    for _ in range(20):
        if api_is_healthy():
            print("api is ready")
            return process
        if process.poll() is not None:
            print("api exited early; check server/.env and database connectivity")
            return process
        time.sleep(1)

    print("api did not become healthy yet; next app will still use remote fallback if configured")
    return process


def start_next_server() -> int:
    print("starting next on http://127.0.0.1:3000")
    shell = os.name == "nt"
    return subprocess.call(["npm", "run", "dev"], cwd=ROOT, shell=shell)


if __name__ == "__main__":
    api_process = start_api_server()
    try:
        sys.exit(start_next_server())
    finally:
        if api_process and api_process.poll() is None:
            api_process.terminate()
