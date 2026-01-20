'use strict';

const Homey = require('homey');
const MarstekClient = require('../../lib/marstekClient');

module.exports = class MarstekCtDriver extends Homey.Driver {
  async onPair(session) {
    let discoveredConfig = null;

    session.setHandler('test_connection', async (data) => {
      this.log('[Driver] test_connection handler called with data:', data);
      try {
        const { host } = data;
        if (!host) {
          this.log('[Driver] No host provided');
          return { error: 'Host is required' };
        }
        this.log(`[Driver] Testing connection to ${host}`);

        // Try discovery with common CT002 defaults
        const discoveryConfigs = [
          {
            deviceType: 'HMG50', ctType: 'HME-4', batteryMac: '000000000000', ctMac: '000000000000',
          },
          {
            deviceType: 'HMG50', ctType: 'HME-3', batteryMac: '000000000000', ctMac: '000000000000',
          },
          {
            deviceType: 'HMB50', ctType: 'HME-4', batteryMac: '000000000000', ctMac: '000000000000',
          },
          {
            deviceType: 'HMA50', ctType: 'HME-4', batteryMac: '000000000000', ctMac: '000000000000',
          },
        ];

        let lastError = null;
        for (const config of discoveryConfigs) {
          try {
            this.log(`[Driver] Trying config: ${config.deviceType}/${config.ctType}`);
            const payload = MarstekClient.buildPayload(config);
            const response = await MarstekClient.request({
              host,
              port: 12345,
              payload,
              timeoutMs: 2000,
              debug: true,
              logger: this,
            });

            if (response.error) {
              this.log(`[Driver] Config failed: ${response.error}`);
              lastError = response.error;
              continue;
            }

            // Success! Store discovered config for add_device
            this.log(`[Driver] Success with config: ${config.deviceType}/${config.ctType}`);
            // eslint-disable-next-line prefer-object-spread
            discoveredConfig = Object.assign({}, config, {
              host,
              meter_dev_type: response.meter_dev_type,
              meter_mac_code: response.meter_mac_code,
            });

            return response;
          } catch (err) {
            this.log(`[Driver] Config error: ${err.message}`);
            lastError = err.message || String(err);
            continue;
          }
        }

        this.log(`[Driver] All configs failed. Last error: ${lastError}`);
        return { error: lastError || 'Could not connect to device. Please verify the IP address.' };
      } catch (err) {
        return { error: err && err.message ? err.message : String(err) };
      }
    });

    session.setHandler('add_device', async (data) => {
      this.log('[Driver] add_device handler called with data:', data);
      const { host } = data;
      if (!host) {
        this.log('[Driver] No host provided in add_device');
        throw new Error('Host is required');
      }

      // Use discovered config from test_connection
      this.log('[Driver] discoveredConfig:', discoveredConfig);
      if (!discoveredConfig || discoveredConfig.host !== host) {
        this.log('[Driver] No discovered config or host mismatch');
        throw new Error('Please test the connection first');
      }

      const { deviceType } = discoveredConfig;
      const { ctType } = discoveredConfig;
      const { batteryMac } = discoveredConfig;
      const { ctMac } = discoveredConfig;
      const deviceId = `${batteryMac}-${ctMac}-${deviceType}-${host.replace(/\./g, '-')}`;

      const deviceData = {
        name: `Marstek ${discoveredConfig.meter_dev_type || deviceType}`,
        data: {
          id: deviceId,
          port: 12345,
        },
        settings: {
          host,
          port: 12345,
          device_type: deviceType,
          battery_mac: batteryMac,
          ct_mac: ctMac,
          ct_type: ctType,
          poll_interval_seconds: 10,
          timeout_ms: 1500,
          retries: 2,
          debug: false,
        },
      };

      this.log('[Driver] Returning device data:', JSON.stringify(deviceData));
      return deviceData;
    });
  }
};
