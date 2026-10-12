const createOverlay = (): HTMLDivElement => {
  const overlay = document.createElement('div');
  overlay.className =
    'fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4';
  return overlay;
};

const createDialog = (title: string, message: string): HTMLDivElement => {
  const dialog = document.createElement('div');
  dialog.className =
    'w-full max-w-md rounded-lg bg-white shadow-xl border border-gray-200';

  const header = document.createElement('div');
  header.className = 'border-b border-gray-200 px-5 py-4';

  const titleEl = document.createElement('h3');
  titleEl.className = 'text-lg font-semibold text-gray-900';
  titleEl.textContent = title;
  header.appendChild(titleEl);

  const body = document.createElement('div');
  body.className = 'px-5 py-4';

  const messageEl = document.createElement('p');
  messageEl.className = 'text-sm text-gray-700 whitespace-pre-wrap';
  messageEl.textContent = message;
  body.appendChild(messageEl);

  dialog.appendChild(header);
  dialog.appendChild(body);
  return dialog;
};

export const themedAlert = (message: string, title = 'Notice'): Promise<void> =>
  new Promise((resolve) => {
    const overlay = createOverlay();
    const dialog = createDialog(title, message);
    const footer = document.createElement('div');
    footer.className = 'flex justify-end border-t border-gray-200 px-5 py-3';

    const okButton = document.createElement('button');
    okButton.className =
      'rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700';
    okButton.textContent = 'OK';
    okButton.onclick = () => {
      document.body.removeChild(overlay);
      resolve();
    };

    footer.appendChild(okButton);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  });

export const themedConfirm = (
  message: string,
  title = 'Please Confirm'
): Promise<boolean> =>
  new Promise((resolve) => {
    const overlay = createOverlay();
    const dialog = createDialog(title, message);
    const footer = document.createElement('div');
    footer.className = 'flex justify-end gap-2 border-t border-gray-200 px-5 py-3';

    const cancelButton = document.createElement('button');
    cancelButton.className =
      'rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50';
    cancelButton.textContent = 'Cancel';
    cancelButton.onclick = () => {
      document.body.removeChild(overlay);
      resolve(false);
    };

    const confirmButton = document.createElement('button');
    confirmButton.className =
      'rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700';
    confirmButton.textContent = 'Confirm';
    confirmButton.onclick = () => {
      document.body.removeChild(overlay);
      resolve(true);
    };

    footer.appendChild(cancelButton);
    footer.appendChild(confirmButton);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  });
