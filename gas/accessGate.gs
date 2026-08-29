var OptiflowAccessGate = (function () {
  var ACTIVE_UNTIL_KEY = 'APP_ACTIVE_UNTIL';

  function isApplicationActive() {
    var activeUntil = String(PropertiesService.getScriptProperties().getProperty(ACTIVE_UNTIL_KEY) || '').trim();

    if (!activeUntil) {
      return {
        active: true,
        reason: 'NO_EXPIRY_CONFIGURED',
        active_until: '',
      };
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(activeUntil)) {
      return {
        active: false,
        reason: 'INVALID_EXPIRY_CONFIGURATION',
        active_until: '',
      };
    }

    var today = Utilities.formatDate(new Date(), OPTIFLOW_APP.timezone, 'yyyy-MM-dd');

    return {
      active: today <= activeUntil,
      reason: today <= activeUntil ? 'ACTIVE' : 'APPLICATION_EXPIRED',
      active_until: activeUntil,
    };
  }

  function buildAccessDeniedHtml(status) {
    var activeUntilText = status && status.active_until
      ? '<p>Masa aktif aplikasi berakhir pada <strong>' + escapeHtml(status.active_until) + '</strong>.</p>'
      : '<p>Konfigurasi masa aktif aplikasi tidak valid. Hubungi SuperAdmin untuk pemeriksaan Script Properties.</p>';

    return '<!doctype html>'
      + '<html lang="id">'
      + '<head>'
      + '<meta charset="utf-8">'
      + '<meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<title>Akses Ditolak - ' + escapeHtml(OPTIFLOW_APP.name) + '</title>'
      + '<style>'
      + ':root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111827;background:#f4f7f9}'
      + '*{box-sizing:border-box}body{min-height:100vh;margin:0;display:grid;place-items:center;padding:20px;background:#f4f7f9}'
      + 'main{width:min(520px,100%);border:1px solid #dbe3ea;border-radius:8px;background:#fff;padding:24px;box-shadow:0 16px 46px rgba(15,23,42,.14)}'
      + '.eyebrow{margin:0 0 8px;color:#dc2626;font-size:12px;font-weight:800;letter-spacing:0;text-transform:uppercase}'
      + 'h1{margin:0 0 10px;font-size:24px;line-height:1.15;letter-spacing:0}p{margin:0 0 10px;color:#4b5563;font-size:14px;line-height:1.5}'
      + '.code{display:inline-flex;min-height:30px;align-items:center;border:1px solid #fca5a5;border-radius:8px;background:#fff7f7;color:#991b1b;padding:5px 9px;font-size:12px;font-weight:800}'
      + '</style>'
      + '</head>'
      + '<body>'
      + '<main role="alert" aria-labelledby="access-denied-title">'
      + '<p class="eyebrow">OPTIFLOW</p>'
      + '<h1 id="access-denied-title">Akses ditolak</h1>'
      + activeUntilText
      + '<p>Silakan hubungi Mandor atau SuperAdmin jika masa aktif perlu diperpanjang.</p>'
      + '<span class="code">' + escapeHtml(status.reason || 'ACCESS_DENIED') + '</span>'
      + '</main>'
      + '</body>'
      + '</html>';
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return Object.freeze({
    buildAccessDeniedHtml: buildAccessDeniedHtml,
    isApplicationActive: isApplicationActive,
  });
})();
