import sys

try:
    import zmq
except ImportError:
    print("python3-zmq is required for live switching", file=sys.stderr)
    raise SystemExit(2)

if len(sys.argv) != 4:
    print("usage: zmq_send.py ENDPOINT TARGET COMMAND", file=sys.stderr)
    raise SystemExit(2)

context = zmq.Context.instance()
socket = context.socket(zmq.REQ)
socket.setsockopt(zmq.LINGER, 0)
socket.setsockopt(zmq.RCVTIMEO, 2000)
socket.setsockopt(zmq.SNDTIMEO, 2000)
socket.connect(sys.argv[1])
socket.send_string(f"{sys.argv[2]} {sys.argv[3]}")

try:
    print(socket.recv_string())
except zmq.Again:
    print("FFmpeg control socket timed out", file=sys.stderr)
    raise SystemExit(3)
