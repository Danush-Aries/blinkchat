#!/bin/bash

# Configuration
AVD_NAME="Pixel_8"
EMULATOR_PATH="$HOME/Library/Android/sdk/emulator/emulator"

echo "🚀 Starting Android Emulator: $AVD_NAME (API 34)..."

# Ensure any previous instances are killed to prevent "offline" ghost issues
pkill -f qemu || true
pkill -f emulator || true

# Launch with:
# -wipe-data: Ensures a clean start
# -no-snapshot-load: Forces cold boot
# -gpu host: Use hardware acceleration
# -port 5554: Force default port
# & / dev/null: Run in background and disconnect from terminal
"$EMULATOR_PATH" -avd "$AVD_NAME" -wipe-data -no-snapshot-load -gpu host -port 5554 > /dev/null 2>&1 &

echo "✨ Emulator launched in background."
echo "🖥️  Check your dock/desktop for the floating phone window."
echo "⏳ Waiting for ADB to see the device..."

# Wait loop
MAX_ATTEMPTS=60
ATTEMPT=0
while [[ $ATTEMPT -lt $MAX_ATTEMPTS ]]; do
    STATUS=$(adb get-state 2>/dev/null)
    if [[ "$STATUS" == "device" ]]; then
        echo "✅ Emulator is online and ready!"
        exit 0
    fi
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
    printf "."
done

echo "⚠️  Timeout waiting for device. Please check the emulator window manually."
exit 1
