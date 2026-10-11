
const status = document.getElementById('status');

document.getElementById('open').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab || !tab.id || !/^https?:/.test(tab.url || '')) {
      status.textContent = 'Открой обычный сайт в Chrome.';
      return;
    }

    chrome.tabs.sendMessage(
      tab.id,
      { action: 'openPanel' },
      () => {
        if (chrome.runtime.lastError) {
          status.textContent =
            'Обнови вкладку сайта и попробуй снова.';
          return;
        }
        status.textContent = 'Кошечка открыта!';
        window.close();
      }
    );
  } catch (error) {
    status.textContent = 'Не удалось открыть кошечку.';
  }
});

document.getElementById('help').addEventListener('click', () => {
  status.textContent =
    'Открой сайт, нажми на кошечку, выбери язык, затем включи микрофон.';
});
