/** Rotinas legadas devem consultar a raiz atual, inclusive após operações assíncronas. */
export const reactPageActive = (page: 'orders' | 'new-order' | 'settings' | 'dashboard' | 'post-sale') =>
  Boolean(document.querySelector('[data-arl-' + page + '-react="1"]'));

export const reactOwnedSelector = '[data-arl-orders-react="1"], [data-arl-new-order-react="1"], [data-arl-settings-react="1"], [data-arl-dashboard-react="1"], [data-arl-post-sale-react="1"], [data-arl-order-detail-react="1"], [data-arl-clients-react="1"]';
