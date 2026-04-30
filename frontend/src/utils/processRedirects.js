import { showAlert } from './customAlerts';

export function redirectAfterPlanningSetup(navigation, order, _returnToPipeline) {
  // Always redirect to the Production Pipeline view with the just-saved
  // order auto-selected, regardless of where the user came from.
  navigation.navigate('ProductionPipeline', { orderId: order.id });
}

export function redirectAfterAllTransfersComplete(navigation, returnToPipeline, orderId) {
  if (returnToPipeline && orderId) {
    navigation.navigate('ProductionPipeline', { orderId });
    return;
  }
  showAlert(
    'All 24h Transfers Completed',
    'All planned 24-hour transfers for this production order have been completed. Would you like to proceed to the 12-Hour Transfer process?',
    'success',
    [
      {
        text: 'Stay Here',
        style: 'cancel',
        onPress: () => {},
      },
      {
        text: 'Go to 12h Transfer',
        style: 'primary',
        onPress: () => navigation.navigate('Transfer12Hour'),
      },
    ]
  );
}
