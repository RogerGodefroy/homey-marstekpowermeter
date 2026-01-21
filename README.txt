This Homey app allows you to connect your Marstek CT002 or CT003 power meter to Homey and monitor your energy consumption and production in real-time.

INSTALLATION
------------
1. Install this app from the Homey App Store
2. Go to Devices in the Homey app
3. Click "Add Device" and select "Marstek CT Smart Meter"
4. Enter the IP address of your Marstek CT meter (found in your Marstek app or router settings)
5. Click "Test connection" to verify the connection
6. Click "Add device" to complete the pairing

REQUIREMENTS
------------
- Marstek CT002 or CT003 power meter
- The meter must be connected to the same network as your Homey
- UDP port 12345 must be accessible

AVAILABLE MEASUREMENTS
---------------------
The app provides the following measurements:

- Power (Total): Total power consumption/production in Watts
- Power (Phase A): Power on phase A in Watts
- Power (Phase B): Power on phase B in Watts
- Power (Phase C): Power on phase C in Watts
- Power Delivery: Power being imported from the grid (positive values)
- Power Production: Power being exported to the grid (negative values shown as positive)
- Signal Strength: WiFi signal strength in dBm

UNDERSTANDING POWER VALUES
--------------------------
- Positive values: You are consuming/importing power from the grid
- Negative values: You are producing/exporting power to the grid (e.g., solar panels)
- The app automatically calculates delivery and production from the total power value

DEVICE SETTINGS
---------------
You can adjust the following settings in the device settings:

- Poll interval (seconds): How often to poll the device (default: 10 seconds, range: 2-60)
- Timeout (ms): How long to wait for a response (default: 1500ms, range: 500-5000)
- Retries: Number of retry attempts on failure (default: 2, range: 0-5)
- Debug logging: Enable detailed logging for troubleshooting

TROUBLESHOOTING
---------------
If you experience connection issues:

1. Verify the device is on the same network as Homey
   - Check the IP address in your router or Marstek app
   - Ensure both devices are on the same subnet

2. Check network connectivity
   - Ping the device IP from Homey's network
   - Verify UDP port 12345 is not blocked by firewall

3. Adjust timeout and retry settings
   - Increase Timeout (ms) if you have a slow network
   - Increase Retries if you experience occasional connection drops

4. Enable debug logging
   - Turn on "Enable debug logging" in device settings
   - Check Homey logs for detailed error messages

5. Verify device configuration
   - Ensure the Marstek meter is powered on and connected to WiFi
   - Check that the device is responding to UDP requests on port 12345

SUPPORT
-------
For issues, feature requests, or questions:
- Check the GitHub repository for documentation and known issues
- Review the troubleshooting section above
- Enable debug logging and check Homey logs for detailed error information
