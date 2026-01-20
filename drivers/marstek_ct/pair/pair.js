/* global Homey */

(function() {
  'use strict';
  
  function setResult(html, isError) {
    const result = document.getElementById('result');
    if (result) {
      result.className = isError ? 'error' : 'success';
      result.innerHTML = html;
    }
  }

  function setup() {
    const testBtn = document.getElementById('test');
    const addBtn = document.getElementById('add');
    const hostInput = document.getElementById('host');

    if (!testBtn || !addBtn || !hostInput) {
      setTimeout(setup, 100);
      return;
    }

    // Test button
    testBtn.onclick = async function() {
      setResult('Button clicked!', false);
      
      const host = hostInput.value.trim();
      if (!host) {
        setResult('Please enter an IP address', true);
        return;
      }

      setResult('Testing connection to ' + host + '...', false);
      
      try {
        if (!Homey || typeof Homey.emit !== 'function') {
          setResult('Error: Homey API not available', true);
          return;
        }
        
        const response = await Homey.emit('test_connection', { host: host });
        
        if (response && response.error) {
          setResult('Error: ' + response.error, true);
          return;
        }

        if (!response) {
          setResult('Error: No response from device', true);
          return;
        }

        const info = '<div><strong>Connection successful!</strong></div>' +
          '<div style="margin-top: 12px;">' +
          '<div class="mono">Device Type: ' + (response.meter_dev_type || 'N/A') + '</div>' +
          '<div class="mono">MAC Code: ' + (response.meter_mac_code || 'N/A') + '</div>' +
          '<div class="mono">Total Power: ' + (response.total_power !== undefined ? response.total_power + ' W' : 'N/A') + '</div>' +
          '<div class="mono">WiFi Signal: ' + (response.wifi_rssi !== undefined ? response.wifi_rssi + ' dBm' : 'N/A') + '</div>' +
          '</div>';
        setResult(info, false);
        
        addBtn.style.display = 'block';
      } catch (err) {
        setResult('Error: ' + (err.message || String(err)), true);
      }
    };

    // Add button
    addBtn.onclick = async function() {
      const host = hostInput.value.trim();
      if (!host) {
        setResult('Please enter an IP address', true);
        return;
      }

      setResult('Adding device...', false);
      try {
        const device = await Homey.emit('add_device', { host: host });
        await Homey.createDevice(device);
        Homey.done();
      } catch (err) {
        setResult('Error: ' + (err.message || String(err)), true);
      }
    };
  }

  // Start setup
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setup();
  } else {
    document.addEventListener('DOMContentLoaded', setup);
  }
})();
