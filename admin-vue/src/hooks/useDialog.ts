import { ref } from 'vue';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export interface AlertOptions {
  title?: string;
  message: string;
  confirmText?: string;
  type?: 'info' | 'success' | 'error' | 'warning';
}

export function useDialog() {
  // Confirm dialog state
  const isConfirmOpen = ref(false);
  const confirmOptions = ref<ConfirmOptions>({ message: '' });
  let confirmResolve: (value: boolean) => void;

  // Alert dialog state
  const isAlertOpen = ref(false);
  const alertOptions = ref<AlertOptions>({ message: '' });
  let alertResolve: () => void;

  // Show confirm dialog
  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    confirmOptions.value = options;
    isConfirmOpen.value = true;

    return new Promise<boolean>((resolve) => {
      confirmResolve = resolve;
    });
  };

  // Show alert dialog
  const alert = (options: AlertOptions): Promise<void> => {
    alertOptions.value = options;
    isAlertOpen.value = true;

    return new Promise<void>((resolve) => {
      alertResolve = resolve;
    });
  };

  // Handle confirm close
  const handleConfirmClose = (confirmed: boolean) => {
    if (confirmResolve) {
      confirmResolve(confirmed);
    }
    isConfirmOpen.value = false;
  };

  // Handle alert close
  const handleAlertClose = () => {
    if (alertResolve) {
      alertResolve();
    }
    isAlertOpen.value = false;
  };

  return {
    // Confirm dialog
    isConfirmOpen,
    confirmOptions,
    confirm,
    handleConfirmClose,

    // Alert dialog
    isAlertOpen,
    alertOptions,
    alert,
    handleAlertClose
  };
}

export type UseDialogType = ReturnType<typeof useDialog>;
