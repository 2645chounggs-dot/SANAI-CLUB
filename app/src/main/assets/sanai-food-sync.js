/* SANAI Food Sync v1.0 — additive adapter for V6.4.4, no storage migrations. */
(function sanaiFoodSyncUi(){
  'use strict';
  if (window.__sanaiFoodSyncUI || !window.SanaiNative ||
      typeof nSave !== 'function' || typeof renderNutrition !== 'function') return;
  window.__sanaiFoodSyncUI = true;

  const meals = ['아침', '점심', '저녁', '간식'];
  const bridge = window.SanaiNative;
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
  const allowed = ['kcal','p','c','f'];

  function validDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(s)) return false;
    const d = new Date(s + 'T12:00:00');
    return !isNaN(d.getTime()) && d.getFullYear() === Number(s.slice(0,4)) &&
        d.getMonth()+1 === Number(s.slice(5,7)) &&
        d.getDate() === Number(s.slice(8,10));
  }

  function normalize(input) {
    if (!input || input.v !== 1 || !uuid.test(input.id) ||
        typeof input.name !== 'string' || !input.name.trim() ||
        input.name.length > 120 || !validDate(input.date) ||
        !meals.includes(input.meal) || typeof input.unit !== 'string' ||
        !input.unit.trim() || input.unit.length > 24) return null;
    const row = {
      id: input.id,
      name: input.name.trim(),
      date: input.date,
      meal: input.meal,
      unit: input.unit.trim(),
      base: Number(input.base),
      amount: Number(input.amount),
      estimate: input.estimate === true
    };
    if (!Number.isFinite(row.base) || row.base <= 0 || row.base > 100000 ||
        !Number.isFinite(row.amount) || row.amount <= 0 || row.amount > 100000) return null;
    for (const k of allowed) {
      const n = input[k];
      if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 ||
          n > (k === 'kcal' ? 20000 : 5000)) return null;
      row[k] = n;
    }
    return row;
  }

  window.sanaiFoodSyncIngest = function(raw) {
    try {
      if (typeof raw !== 'string' || raw.length > 30000) return false;
      const row = normalize(JSON.parse(raw));
      if (!row) return false;
      if (!nutrition.logs.some(function(entry){return entry.id === row.id;})) {
        const next = {...nutrition, logs: [...nutrition.logs, row]};
        if (!nSave(next)) return false;
        if (tab === 'nutrition') renderNutrition();
        if (typeof window.sanaiWidgetSync === 'function') window.sanaiWidgetSync();
        if (typeof notify === 'function') notify('ChatGPT 식단 자동 등록 · ' + row.name);
      }
      bridge.foodSyncAck(row.id);
      return true;
    } catch (e) {
      // Leave the encrypted event unacknowledged: it will be retried next time.
      return false;
    }
  };

  function status() {
    try { return JSON.parse(bridge.foodSyncInfo() || '{}'); }
    catch (e) { return {error:'연결 정보를 가져올 수 없음'}; }
  }

  function el(tag, text, cls) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  }

  function panel() {
    if (tab !== 'nutrition') return;
    const previous = main.querySelector('#sanai-food-sync');
    if (previous) previous.remove();
    const where = main.querySelector('.titlebar');
    if (!where) return;

    const state = status();
    const section = el('section', undefined, 'panel stack');
    section.id = 'sanai-food-sync';
    const header = el('div', undefined, 'row between');
    header.append(el('h3', 'ChatGPT 식단 자동 연동'));
    const flag = el('span',
        state.error ? '암호화 키 확인 필요' : state.paired ? '연동됨' : '최초 연결 필요',
        'chip');
    header.append(flag);
    section.append(header);
    const note = state.paired ?
        '이 채팅에서 식단을 등록하면 암호화된 기록이 전달된다. 앱을 열 때, 복귀할 때, 실행 중 30분마다 자동 확인한다.' :
        '최초 한 번 아래 연결키를 복사해 ChatGPT에 붙여넣고 사나이크럽 연결해 달라고 요청해라.';
    section.append(el('p', note, 'notice'));
    const controls = el('div', undefined, 'row');
    const copy = el('button', '🔐 연결키 복사', 'ghost');
    copy.type = 'button';
    copy.addEventListener('click', function(){
      try { bridge.foodSyncCopyPairing(); notify('공개 연결키 복사 완료. ChatGPT에 붙여넣어라.'); }
      catch(e) { notify('연결키 복사 실패'); }
    });
    const refresh = el('button', '↻ 지금 동기화', 'primary');
    refresh.type = 'button';
    refresh.addEventListener('click', function(){
      try { bridge.foodSyncRefresh(); notify('암호화 식단 수신 확인 요청'); }
      catch(e) { notify('동기화 요청 실패'); }
    });
    controls.append(copy, refresh);
    section.append(controls);
    if (state.last_sync) section.append(el('small', '최근 점검: ' + state.last_sync, 'subtle'));
    if (state.last_error) section.append(el('small', state.last_error, 'subtle'));
    section.append(el('p',
        '비밀키는 휴대폰 Android Keystore에만 저장된다. GitHub 저장소에는 암호문만 공개된다. 앱을 삭제하면 해당 기기의 암호키도 사라질 수 있다.',
        'notice'));
    where.insertAdjacentElement('afterend', section);
  }

  const original = renderNutrition;
  renderNutrition = function() { original(); panel(); };
  window.sanaiFoodSyncStatusChanged = panel;
  if (tab === 'nutrition') panel();
})();
