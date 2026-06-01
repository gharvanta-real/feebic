import os
import sys
import subprocess
import re
import time

def free_port_3000():
    print("🔍 Checking for active processes listening on port 3000...")
    try:
        # Run netstat to find PIDs on port 3000
        output = subprocess.check_output("netstat -ano", shell=True).decode("utf-8")
        pids_to_kill = set()
        
        for line in output.splitlines():
            # Look for lines containing port 3000
            if ":3000 " in line or " 0.0.0.0:3000 " in line or " [::]:3000 " in line or " 127.0.0.1:3000 " in line:
                tokens = line.strip().split()
                if len(tokens) >= 5:
                    pid = tokens[-1]
                    # Ensure it is a valid process ID digit
                    if pid.isdigit() and int(pid) > 0:
                        pids_to_kill.add(pid)
        
        if not pids_to_kill:
            print("✅ Port 3000 is already free and ready to use.")
            return True
            
        print(f"⚠️ Found {len(pids_to_kill)} background process(es) holding port 3000: {', '.join(pids_to_kill)}")
        
        for pid in pids_to_kill:
            print(f"💥 Terminating process PID {pid}...")
            # Use Windows force taskkill
            subprocess.run(f"taskkill /PID {pid} /F", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
        # Give Windows a brief moment to release socket bindings
        time.sleep(1)
        print("🎉 Port 3000 successfully freed!")
        return True
        
    except Exception as e:
        print(f"❌ Error while checking or freeing port 3000: {e}")
        return False

def start_next_server():
    print("\n🚀 Launching fresh Next.js development server with Turbopack on port 3000...")
    try:
        # Launch dev server inside shell
        subprocess.run("npm run dev", shell=True)
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user.")
    except Exception as e:
        print(f"❌ Error while starting server: {e}")

if __name__ == "__main__":
    # Ensure port is clean first
    free_port_3000()
    # Spin up fresh dev server
    start_next_server()
