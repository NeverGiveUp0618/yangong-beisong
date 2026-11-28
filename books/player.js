(function () {
  'use strict';
  const audioBy = window.YANGONG_BOOK_AUDIO || {};
  const KEY = 'yangpu_book_audio_rate_v1';
  let aud = typeof Audio !== 'undefined' ? new Audio() : null;
  let nextAud = typeof Audio !== 'undefined' ? new Audio() : null;
  let curKey = null, playKey = null, playIdx = -1, paused = false;
  let rate = 1;
  try { rate = Number(localStorage.getItem(KEY)) || 1; } catch {}

  function clearHL() {
    document.querySelectorAll('#pread-body .sutra-playing').forEach(el => el.classList.remove('sutra-playing'));
  }

  function highlight(tr) {
    clearHL();
    if (!tr) return;
    const kids = document.getElementById('pread-body').children;
    let first = null;
    for (let i = tr.startIdx; i <= tr.endIdx && i < kids.length; i++) {
      kids[i].classList.add('sutra-playing');
      if (!first) first = kids[i];
    }
    if (first && typeof first.scrollIntoView === 'function') {
      try { first.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      catch { first.scrollIntoView({ block: 'nearest' }); }
    }
  }

  function updateBar() {
    const pBtn = document.getElementById('book-play');
    const sBtn = document.getElementById('book-stop');
    const st = document.getElementById('book-audio-status');
    if (!pBtn) return;
    const tracks = audioBy[curKey] || [];
    if (!tracks.length) {
      pBtn.disabled = true;
      if (sBtn) sBtn.hidden = true;
      if (st) st.textContent = '暂无音频';
      return;
    }
    pBtn.disabled = false;
    if (playKey === curKey && playIdx >= 0) {
      const tr = tracks[playIdx];
      pBtn.textContent = paused ? '▶ 继续朗读' : '⏸ 暂停';
      if (sBtn) sBtn.hidden = false;
      if (st) st.textContent = (paused ? '已暂停 · ' : '朗读中 · ') + tr.label;
    } else {
      pBtn.textContent = '▶ 朗读全文';
      if (sBtn) sBtn.hidden = true;
      if (st) st.textContent = '自然人声 · 点任意段落起读';
    }
  }

  function stopBookAudio() {
    if (aud) { try { aud.pause(); aud.currentTime = 0; } catch {} }
    playKey = null; playIdx = -1; paused = false;
    clearHL(); updateBar();
  }

  function playTrack(key, idx) {
    const tracks = audioBy[key] || [];
    if (!aud || idx < 0 || idx >= tracks.length) { stopBookAudio(); return; }
    playKey = key; playIdx = idx; paused = false;
    const tr = tracks[idx];
    aud.src = 'books/audio/' + tr.file;
    aud.playbackRate = rate;
    aud.onended = () => { if (playKey === key && !paused) playTrack(key, idx + 1); };
    aud.play().catch(() => {});
    if (tracks[idx + 1] && nextAud) nextAud.src = 'books/audio/' + tracks[idx + 1].file;
    highlight(tr); updateBar();
  }

  function togglePlay() {
    const tracks = audioBy[curKey] || [];
    if (!tracks.length || !aud) return;
    if (playKey === curKey && playIdx >= 0) {
      if (paused) {
        paused = false; aud.playbackRate = rate; aud.play().catch(() => {}); updateBar();
      } else {
        paused = true; try { aud.pause(); } catch {} updateBar();
      }
    } else {
      playTrack(curKey, 0);
    }
  }

  function ensureBar() {
    const pread = document.getElementById('pread');
    const body = document.getElementById('pread-body');
    if (!pread || !body) return;
    let bar = document.getElementById('book-audio-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'book-audio-bar';
      bar.className = 'sutra-audio-bar';
      bar.style.margin = '10px 14px 4px';
      bar.innerHTML =
        '<button type="button" class="sutra-small-btn sutra-play-btn" id="book-play">▶ 朗读全文</button>' +
        '<button type="button" class="sutra-small-btn" id="book-stop" hidden>⏹ 停止</button>' +
        '<label class="sutra-rate-label">语速<select id="book-rate" aria-label="朗读语速">' +
        '<option value="0.85">0.85x 慢</option><option value="1">1.0x 正常</option>' +
        '<option value="1.15">1.15x 较快</option><option value="1.25">1.25x 快</option>' +
        '</select></label>' +
        '<span class="sutra-audio-status" id="book-audio-status"></span>';
      body.parentNode.insertBefore(bar, body);
      document.getElementById('book-play').onclick = togglePlay;
      document.getElementById('book-stop').onclick = stopBookAudio;
      const sel = document.getElementById('book-rate');
      sel.value = String(rate);
      sel.onchange = e => {
        rate = Number(e.target.value) || 1;
        try { localStorage.setItem(KEY, String(rate)); } catch {}
        if (aud) aud.playbackRate = rate;
      };
      body.addEventListener('click', e => {
        if (window.getSelection && String(window.getSelection()).trim()) return;
        const row = e.target.closest('#pread-body > div');
        if (!row || !curKey) return;
        const idx = Array.prototype.indexOf.call(body.children, row);
        const tracks = audioBy[curKey] || [];
        const ti = tracks.findIndex(t => idx >= t.startIdx && idx <= t.endIdx);
        if (ti >= 0) playTrack(curKey, ti);
      });
      body.style.cursor = 'pointer';
    }
    updateBar();
  }

  const origOpenBook = window.openBook;
  if (typeof origOpenBook === 'function') {
    window.openBook = function (key) {
      if (playKey && playKey !== key) stopBookAudio();
      curKey = key;
      origOpenBook.apply(this, arguments);
      ensureBar();
    };
  }
  const origShow = window.show;
  if (typeof origShow === 'function') {
    window.show = function (id) {
      if (id !== 'pread' && playKey) stopBookAudio();
      return origShow.apply(this, arguments);
    };
  }
  window.stopBookAudio = stopBookAudio;
})();
