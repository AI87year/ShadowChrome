#!/usr/bin/env python3
import sys
import json
import subprocess

proc = None

def read_message():
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        return None
    length = int.from_bytes(raw_length, byteorder='little')
    data = sys.stdin.buffer.read(length)
    return json.loads(data.decode('utf-8'))

def send_message(msg):
    encoded = json.dumps(msg).encode('utf-8')
    sys.stdout.buffer.write(len(encoded).to_bytes(4, 'little'))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()

while True:
    msg = read_message()
    if msg is None:
        break
    action = msg.get('action')
    if action == 'connect':
        if proc:
            proc.terminate()
        s = msg['server']
        cmd = [
            'ss-local', '-s', s['server'], '-p', str(s['port']),
            '-k', s['password'], '-m', s['method'],
            '-b', '127.0.0.1', '-l', '1080'
        ]
        proc = subprocess.Popen(cmd)
        send_message({'status': 'Connected'})
    elif action in ('disconnect', 'logout'):
        if proc:
            proc.terminate()
            proc.wait()
            proc = None
        send_message({'status': 'Disconnected'})
