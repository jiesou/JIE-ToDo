((settings, notifys, notifySupport) => {
navigator.serviceWorker.ready.then(reg => {
  setInterval(() => {
      for (const index in notifys) {
        const notify = JSON.parse(notifys[index]);
        if (new Date().getTime() >= notify.schedule) {
          if (notifySupport) reg.showNotification(...notify.notification);
          alert(notify.notification[1].body);
          notifys.splice(index, 1);
          saveSettings();
        }
      }
  }, 60000);
});
})(settings, settings.foregroundNotify, Notification.permission === 'granted');