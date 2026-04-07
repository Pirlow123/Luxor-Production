#!/usr/bin/env python3
"""
Broadweigh T24 Load Cell Bridge for Luxor Production
Communicates with T24AdvDrv64.dll via ctypes and outputs JSON to stdout.
Electron spawns this as a child process and reads the JSON lines.

Protocol (stdout, one JSON object per line):
  {"type":"data","tag":"5cb7","value":1250.5,"status":0,"error":false,"lowBatt":false,"rssi":-45,"cv":95,"ts":1234567890.123}
  {"type":"status","connected":true,"baseStation":1,"dllVersion":1.5,"channel":1}
  {"type":"error","message":"Cannot open USB"}
  {"type":"wake","id":"fed45e","rssi":-50,"cv":90}

Commands (stdin, one JSON object per line):
  {"cmd":"wakeAll"}
  {"cmd":"sleepAll"}
  {"cmd":"tare","tag":"5cb7"}
  {"cmd":"quit"}
"""

import sys
import os
import json
import time
import ctypes
from ctypes import *

# --- Output helpers (JSON lines to stdout) ---
def emit(obj):
    """Write a JSON line to stdout and flush immediately."""
    try:
        sys.stdout.write(json.dumps(obj) + '\n')
        sys.stdout.flush()
    except:
        pass

def emit_error(msg):
    emit({"type": "error", "message": str(msg)})

def emit_data(tag, value, status, error, low_batt, rssi, cv):
    emit({
        "type": "data",
        "tag": format(tag, 'x'),
        "value": round(value, 3),
        "status": status,
        "error": error,
        "lowBatt": low_batt,
        "rssi": rssi * -1,
        "cv": cv,
        "ts": time.time()
    })

def emit_status(connected, **kwargs):
    obj = {"type": "status", "connected": connected}
    obj.update(kwargs)
    emit(obj)

# --- DLL Callback functions ---
def callback_dp(BaseStation, DataTag, Value, Status, Err, LowBatt, RSSI, CV):
    """Called by DLL when a Data Provider message arrives from a load cell."""
    emit_data(DataTag, Value, Status, Err == 1, LowBatt == 1, RSSI, CV)

def callback_wr(BaseStation, ID, RSSI, CV):
    """Called by DLL when a Wake Request arrives."""
    emit({"type": "wake", "id": format(ID, 'x'), "rssi": RSSI * -1, "cv": CV})

# --- Find and load DLL ---
def find_dll():
    """Search for T24AdvDrv64.dll in known locations."""
    search_paths = [
        os.path.join(os.path.dirname(__file__), 'T24_extracted', 'app', 'T24AdvDrv64.dll'),
        os.path.join(os.path.dirname(__file__), 'T24AdvDrv64.dll'),
        os.path.join(os.environ.get('SYSTEMROOT', r'C:\Windows'), 'System32', 'T24AdvDrv64.dll'),
        os.path.join(os.path.expanduser('~'), 'Documents', 'T24AdvDrvxx DLLs', 'T24AdvDrv64.dll'),
        r'C:\Program Files\Mantracourt\T24\T24AdvDrv64.dll',
    ]
    # Also check 32-bit if running 32-bit Python
    is_64 = ctypes.sizeof(ctypes.c_void_p) == 8
    dll_name = 'T24AdvDrv64.dll' if is_64 else 'T24AdvDrv32.dll'

    for p in search_paths:
        if not is_64:
            p = p.replace('T24AdvDrv64.dll', dll_name)
        if os.path.isfile(p):
            return p
    return None

def main():
    dll_path = find_dll()
    if not dll_path:
        emit_error("T24AdvDrv64.dll not found. Install the Mantracourt T24 drivers or place the DLL in tools/broadweigh/")
        emit_status(False)
        # Keep running in simulation mode so the app still works
        run_simulation()
        return

    try:
        dll = ctypes.windll.LoadLibrary(dll_path)
    except Exception as e:
        emit_error(f"Failed to load DLL: {e}")
        emit_status(False)
        run_simulation()
        return

    # --- Wrap DLL functions ---
    OPENPORT = dll.OPENPORT
    OPENPORT.argtypes = [c_uint8, c_uint32]
    OPENPORT.restype = c_uint8

    CLOSEPORT = dll.CLOSEPORT
    CLOSEPORT.argtypes = None
    CLOSEPORT.restype = None

    SETCROSSTHREADCALLBACK = dll.SETCROSSTHREADCALLBACK
    SETCROSSTHREADCALLBACK.argtypes = None
    SETCROSSTHREADCALLBACK.restype = None

    DLLVERSION = dll.DLLVERSION
    DLLVERSION.argtypes = None
    DLLVERSION.restype = c_float

    WAKEALL = dll.WAKEALL
    WAKEALL.argtypes = [c_uint8]
    WAKEALL.restype = None

    SLEEPALL = dll.SLEEPALL
    SLEEPALL.argtypes = None
    SLEEPALL.restype = None

    BASESTATIONEXISTS = dll.BASESTATIONEXISTS
    BASESTATIONEXISTS.argtypes = [c_uint8]
    BASESTATIONEXISTS.restype = c_uint8

    BASESTATIONID = dll.BASESTATIONID
    BASESTATIONID.argtypes = [c_uint8]
    BASESTATIONID.restype = c_uint32

    BASESTATIONCHANNEL = dll.BASESTATIONCHANNEL
    BASESTATIONCHANNEL.argtypes = [c_uint8]
    BASESTATIONCHANNEL.restype = c_uint8

    # Define callback types (__stdcall via WINFUNCTYPE)
    CB_DP = ctypes.WINFUNCTYPE(None, c_uint8, c_uint32, c_float, c_uint8, c_uint8, c_uint8, c_uint8, c_uint8)
    CB_WR = ctypes.WINFUNCTYPE(None, c_uint8, c_uint32, c_uint8, c_uint8)

    # Create persistent callback instances (prevent GC)
    cb_dp = CB_DP(callback_dp)
    cb_wr = CB_WR(callback_wr)

    # --- Initialize ---
    SETCROSSTHREADCALLBACK()

    dll_ver = DLLVERSION()

    result = OPENPORT(0, 0)  # 0,0 = USB
    if result != 0:
        emit_error(f"Cannot open USB base station (OPENPORT returned {result}). Is it connected?")
        emit_status(False, dllVersion=round(float(dll_ver), 2))
        run_simulation()
        return

    # Check base station
    bs_exists = BASESTATIONEXISTS(1)
    if not bs_exists:
        emit_error("USB port opened but base station not detected")
        emit_status(False, dllVersion=round(float(dll_ver), 2))
        CLOSEPORT()
        run_simulation()
        return

    bs_id = format(BASESTATIONID(1), 'x')
    bs_channel = BASESTATIONCHANNEL(1)

    emit_status(True,
        dllVersion=round(float(dll_ver), 2),
        baseStation=1,
        baseStationId=bs_id,
        channel=int(bs_channel)
    )

    # Register callbacks — data starts flowing
    dll.REGISTERCALLBACKDP(cb_dp)
    dll.REGISTERCALLBACKWR(cb_wr)

    # Wake all transmitters
    WAKEALL(1)

    # --- Main loop: read commands from stdin ---
    try:
        while True:
            line = sys.stdin.readline()
            if not line:
                break  # stdin closed = parent process exited
            line = line.strip()
            if not line:
                continue
            try:
                cmd = json.loads(line)
                action = cmd.get('cmd', '')
                if action == 'quit':
                    break
                elif action == 'wakeAll':
                    WAKEALL(1)
                    emit({"type": "ack", "cmd": "wakeAll"})
                elif action == 'sleepAll':
                    SLEEPALL()
                    emit({"type": "ack", "cmd": "sleepAll"})
                elif action == 'ping':
                    emit({"type": "pong"})
                else:
                    emit({"type": "ack", "cmd": action, "unknown": True})
            except json.JSONDecodeError:
                pass
    except KeyboardInterrupt:
        pass
    finally:
        # Cleanup
        dll.REGISTERCALLBACKDP(0)
        dll.REGISTERCALLBACKWR(0)
        CLOSEPORT()
        emit_status(False, reason="shutdown")


def run_simulation():
    """Fallback simulation mode when DLL/hardware is not available."""
    import random
    emit({"type": "info", "message": "Running in simulation mode (no DLL/hardware)"})
    emit_status(True, simulated=True)

    # Simulate 8 load cells
    tags = ['5cb7', 'a58f', '5a15', 'a616', 'c168', '5afb', '5ba3', '51b6']
    values = {t: random.uniform(800, 1500) for t in tags}

    try:
        import select
        has_select = True
    except ImportError:
        has_select = False

    try:
        while True:
            # Emit data for each simulated cell
            for tag in tags:
                drift = random.gauss(0, 2)
                values[tag] = max(0, values[tag] + drift)
                # Occasional spike
                if random.random() < 0.01:
                    values[tag] += random.uniform(50, 200)
                emit_data(
                    int(tag, 16), values[tag], 0,
                    False, False,
                    random.randint(30, 60),
                    random.randint(80, 105)
                )

            # Check for commands (non-blocking on Windows)
            try:
                import msvcrt
                while msvcrt.kbhit():
                    pass
                # Try reading stdin with timeout
                line = ''
                if sys.stdin.readable():
                    import threading
                    result = [None]
                    def read_line():
                        try:
                            result[0] = sys.stdin.readline()
                        except:
                            pass
                    t = threading.Thread(target=read_line, daemon=True)
                    t.start()
                    t.join(timeout=0.05)
                    if result[0]:
                        line = result[0].strip()
            except:
                pass

            if line:
                try:
                    cmd = json.loads(line)
                    if cmd.get('cmd') == 'quit':
                        break
                except:
                    pass

            time.sleep(1.0)
    except KeyboardInterrupt:
        pass
    finally:
        emit_status(False, reason="shutdown")


if __name__ == '__main__':
    main()
