# Marstek CT Smart Meter (Homey SDK v3)

## Setup notes
- **Host**: Use the device's IP/hostname on your LAN.
- **Battery MAC / CT MAC**: Use the 12-hex values shown in your Marstek app or device label. Separators are optional.
- **Device / CT types**: Match the labels from the Marstek documentation. Device type is a prefix (HMG/HMB/HMA/HMK) plus the number (default 50).
- **Negative power**: Negative values mean export to the grid (e.g. -350 W = exporting 350 W).

## Troubleshooting timeouts
- Verify the device is on the same network as Homey.
- Confirm the host IP is correct and reachable.
- Check that UDP port 12345 is not blocked.
- Increase **Timeout (ms)** or **Retries** in device settings if needed.
