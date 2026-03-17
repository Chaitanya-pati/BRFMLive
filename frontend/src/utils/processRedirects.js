import { showAlert } from './customAlerts';

export function redirectAfterPlanningSetup(navigation, order) {
  navigation.navigate('TransferRecordingDetails', {
    order: {
      id: order.id,
      order_number: order.order_number,
      branch_name: order.branch_name,
    },
  });
}

export function redirectAfterAllTransfersComplete(navigation) {
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
