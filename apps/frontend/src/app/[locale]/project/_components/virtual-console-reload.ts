export const virtualConsoleReloadChannel = (projectPublicId: string) => `dmx-virtual-console:${projectPublicId}`;

export const notifyVirtualConsoleSaved = (projectPublicId: string) => {
  if (typeof BroadcastChannel === 'undefined') {
    return;
  }
  const channel = new BroadcastChannel(virtualConsoleReloadChannel(projectPublicId));
  channel.postMessage('saved');
  channel.close();
};

export const reloadVirtualConsolePlayWindow = () => {
  window.location.reload();
};
