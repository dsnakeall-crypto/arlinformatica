export function isReopenedOrder(order: any): boolean {
  if (order?.reopened === true || Number(order?.reopened) === 1) return true;
  return Array.isArray(order?.histories)
    && order.histories.some((history: any) => history?.from_status === 'completed' && history?.to_status === 'analysis');
}
