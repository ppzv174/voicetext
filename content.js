
(() => {
  if (document.getElementById('voicetext-cat-host')) return;

  const host = document.createElement('div');
  host.id = 'voicetext-cat-host';
  host.style.cssText =
    'position:fixed;right:18px;bottom:18px;z-index:2147483647;';
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>
      * { box-sizing:border-box; font-family:Arial,sans-serif; }
      .cat {
        width:60px;height:60px;border:0;border-radius:22px;
        background:#39e879;font-size:32px;cursor:pointer;
        box-shadow:0 4px 18px #0005;
      }
      .panel {
        display:none;width:260px;margin-bottom:10px;padding:15px;
        color:#f3fff5;background:#17231b;border:1px solid #39e879;
        border-radius:18px;box-shadow:0 4px 24px #0006;
      }
      .panel.open { display:block; }
      h3 { margin:0 0 10px;font-size:18px; }
      p { font-size:13px;color:#c4d7c8; }
      select,button.action {
        width:100%;padding:11px;margin-top:8px;border-radius:10px;
        border:0;font-size:14px;cursor:pointer;
      }
      select { background:#fff;color:#111; }
      button.action { background:#39e879;color:#102016;font-weight:bold; }
      button.stop { background:#ff7777; }
      #status { font-size:12px;color:#39e879; }
    </style>
    <section class="panel" id="panel">
      <h3>🐱 VoiceText</h3>
      <p>Выбери язык и говори. Текст появится в выбранном поле.</p>
      <select id="language" aria-label="Язык диктовки">
        <option value="ru-RU">Русский</option>
        <option value="en-US">English (US)</option>
        <option value="en-GB">English (UK)</option>
        <option value="de-DE">Deutsch</option>
        <option value="fr-FR">Français</option>
        <option value="es-ES">Español</option>
        <option value="it-IT">Italiano</option>
        <option value="nl-NL">Nederlands</option>
        <option value="uk-UA">Українська</option>
        <option value="pl-PL">Polski</option>
        <option value="tr-TR">Türkçe</option>
        <option value="pt-BR">Português</option>
        <option value="zh-CN">中文</option>
        <option value="ja-JP">日本語</option>
      </select>
      <button class="action" id="start">🎙️ Включить микрофон</button>
      <div id="status">Микрофон выключен</div>
    </section>
    <button class="cat" id="cat" title="VoiceText">🐱</button>
  `;

  const $ = id => shadow.getElementById(id);
  const panel = $('panel');
  const language = $('language');
  const start = $('start');
  const status = $('status');

  let target = null;
  let recognition = null;
  let running = false;

  // Запоминаем последнее поле, в котором пользователь печатал.
  document.addEventListener('focusin', event => {
    if (event.target !== host && !host.contains(event.target)) {
      target = event.target;
    }
  }, true);

  document.addEventListener('pointerdown', event => {
    if (event.target !== host && !host.contains(event.target)) {
      const el = event.target;
      if (el.matches?.('input,textarea,[contenteditable="true"],[role="textbox"]')) {
        target = el;
      }
    }
  }, true);

  $('cat').addEventListener('click', () => {
    panel.classList.toggle('open');
  });

  function insertText(text) {
    const el = target;
    if (!el || !el.isConnected) {
      status.textContent = 'Сначала нажми на поле ввода на странице.';
      return;
    }

    const tag = el.tagName?.toLowerCase();
    const editable = el.isContentEditable ||
      el.getAttribute?.('contenteditable') === 'true' ||
      el.getAttribute?.('role') === 'textbox';

    if (tag === 'input' || tag === 'textarea') {
      if (el.disabled || el.readOnly) {
        status.textContent = 'Это поле нельзя редактировать.';
        return;
      }
      const a = el.selectionStart ?? el.value.length;
      const b = el.selectionEnd ?? a;
      if (typeof el.setRangeText === 'function') {
        el.setRangeText(text, a, b, 'end');
      } else {
        el.value += text;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    if (editable) {
      el.focus();
      const selection = window.getSelection();
      if (selection && selection.rangeCount) {
        const range = selection.getRangeAt(0);
        if (el.contains(range.commonAncestorContainer)) {
          range.deleteContents();
          const node = document.createTextNode(text);
          range.insertNode(node);
          range.setStartAfter(node);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          el.append(document.createTextNode(text));
        }
      } else {
        el.append(document.createTextNode(text));
      }
      el.dispatchEvent(new InputEvent('input', {
        bubbles: true, inputType: 'insertText', data: text
      }));
      return;
    }

    status.textContent = 'Это поле не поддерживается. Выбери обычное поле сообщения.';
  }

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    start.disabled = true;
    start.textContent = 'Распознавание недоступно';
    status.textContent = 'Попробуй Chrome на компьютере.';
    return;
  }

  function stop() {
    running = false;
    try { recognition?.stop(); } catch (_) {}
    start.textContent = '🎙️ Включить микрофон';
    start.classList.remove('stop');
    status.textContent = 'Микрофон выключен';
  }

  start.addEventListener('click', () => {
    if (running) {
      stop();
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = language.value;
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = event => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          insertText(event.results[i][0].transcript + ' ');
        }
      }
    };

    recognition.onerror = event => {
      if (event.error === 'not-allowed') {
        status.textContent = 'Разреши доступ к микрофону в Chrome.';
        stop();
      } else if (event.error === 'language-not-supported') {
        status.textContent = 'Этот язык не поддерживается распознаванием.';
        stop();
      } else {
        status.textContent = 'Ошибка: ' + event.error;
      }
    };

    recognition.onend = () => {
      if (running) {
        try { recognition.start(); } catch (_) {}
      }
    };

    try {
      recognition.start();
      running = true;
      start.textContent = '⏹ Выключить микрофон';
      start.classList.add('stop');
      status.textContent = 'Слушаю: ' + language.options[language.selectedIndex].text;
    } catch (_) {
      status.textContent = 'Не удалось включить микрофон. Попробуй снова.';
      stop();
    }
  });

  language.addEventListener('change', () => {
    if (running) {
      stop();
      status.textContent = 'Язык изменён. Включи микрофон снова.';
    }
  });
})();
