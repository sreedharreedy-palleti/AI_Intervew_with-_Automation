const dns = require('dns');

/**
 * Configures reliable DNS servers (Google & Cloudflare DNS)
 * to resolve MongoDB Atlas SRV records and avoid querySrv ECONNREFUSED on Windows/ISP networks.
 */
const configureDNS = () => {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  } catch (error) {
    console.warn('DNS configuration warning:', error.message);
  }
};

module.exports = configureDNS;
