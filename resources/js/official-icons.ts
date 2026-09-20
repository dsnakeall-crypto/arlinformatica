export {};

function installStyles() {
  if (document.getElementById('arl-official-icons-style')) return;

  const style = document.createElement('style');
  style.id = 'arl-official-icons-style';
  style.textContent = `
    .dashboard-contact[data-arl-exact-icon="whatsapp"] {
      font-size: 0 !important;
      line-height: 0 !important;
    }

    .dashboard-contact[data-arl-exact-icon="whatsapp"] .arl-wa-mark,
    .dashboard-contact[data-arl-exact-icon="whatsapp"] .arl-dashboard-icon,
    .dashboard-address[data-arl-exact-icon="maps"] .arl-map-mark,
    .dashboard-address[data-arl-exact-icon="maps"] .arl-dashboard-icon {
      display: none !important;
    }

    .dashboard-row:not(.head) > button[data-arl-exact-icon="visualizar"],
    .order-list .order-row:not(.head) > button[data-arl-exact-icon="visualizar"] {
      width: 36px !important;
      min-width: 36px !important;
      height: 34px !important;
      min-height: 34px !important;
      padding: 0 !important;
      font-size: 0 !important;
      line-height: 0 !important;
      overflow: hidden !important;
      display: grid !important;
      place-items: center !important;
    }

    .dashboard-row:not(.head) > button[data-arl-exact-icon="visualizar"] > .arl-exact-action-icon,
    .order-list .order-row:not(.head) > button[data-arl-exact-icon="visualizar"] > .arl-exact-action-icon {
      margin: 0 !important;
    }
  `;
  document.head.append(style);
}

installStyles();
