#!/bin/bash
# docker-entrypoint-automation.sh — Initialize display and automation tools

set -e

# 1. Start Xvfb (Virtual Framebuffer)
echo "🚀 Starting Xvfb on $DISPLAY ($SCREEN_WIDTH x $SCREEN_HEIGHT x $SCREEN_DEPTH)..."
Xvfb $DISPLAY -screen 0 ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH} &
XPID=$!

# Wait for Xvfb to be ready
timeout=10
while ! xset -q >/dev/null 2>&1; do
    timeout=$((timeout - 1))
    if [ $timeout -le 0 ]; then
        echo "❌ Xvfb failed to start"
        exit 1
    fi
    sleep 1
done

# 2. Start Window Manager (fluxbox)
echo "🚀 Starting fluxbox..."
fluxbox &

# 3. Start VNC Server (x11vnc)
echo "🚀 Starting x11vnc on port 5900..."
x11vnc -display $DISPLAY -forever -shared -bg -nopw -listen 0.0.0.0 -xkb

# 4. Start noVNC (Web VNC client)
echo "🚀 Starting noVNC on port 6080..."
# /usr/share/novnc/utils/launch.sh --vnc localhost:5900 --listen 6080 &
websockify --web /usr/share/novnc/ 6080 localhost:5900 &

echo "✅ Automation environment ready. View headed browser at http://localhost:6080"

# 5. Exec the command
exec "$@"
