const token = localStorage.getItem('token');

const bertList = document.getElementById('bertList');
const gptOut   = document.getElementById('gptOut');
const btnBert  = document.getElementById('btnBert');
const btnGpt   = document.getElementById('btnGpt');
const btnClear = document.getElementById('btnClear');

let lastBertResult = null; // { feedback: [{ sentence, label, score, comment }, ...] }

function goBack() {
  location.href = '../Select/select.html';
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[s]));
}

function scoreToPercent(score) {
  // score ∈ [0,1]; 시각 대비를 위해 25–100% 범위로 확장
  return Math.max(25, Math.min(100, Math.round((score || 0) * 100)));
}

function badgeClassFromLabel(label) {
  const n = parseInt(String(label).split(' ')[0] || '3', 10); // '4 stars' -> 4
  if (n >= 4) return 'badge good';
  if (n === 3) return 'badge mid';
  return 'badge bad';
}

function renderBert(items) {
  if (!items || !items.length) {
    bertList.innerHTML = '<div class="muted">분석 결과가 비어 있습니다.</div>';
    return;
  }

  const frag = document.createDocumentFragment();
  items.forEach((it, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'sentence-item';
    wrap.innerHTML = `
      <div class="sentence-text"><strong>${idx + 1}.</strong> ${escapeHtml(it.sentence)}</div>
      <div class="badge-row">
        <span class="${badgeClassFromLabel(it.label)}">${escapeHtml(it.label)}</span>
        <span class="badge">확신도: ${(it.score ?? 0).toFixed(2)}</span>
      </div>
      <div class="meter"><span style="width:${scoreToPercent(it.score)}%"></span></div>
      <div class="comment">${escapeHtml(it.comment || '')}</div>
    `;
    frag.appendChild(wrap);
  });
  bertList.innerHTML = '';
  bertList.appendChild(frag);
}

/* ---------------- BERT 분석 ---------------- */
btnBert.addEventListener('click', async () => {
  const essay = document.getElementById('essayInput').value.trim();
  if (!essay) return alert('내용을 입력해주세요.');

  bertList.innerHTML = '<span class="loader"></span> BERT가 문장별로 분석 중입니다…';
  gptOut.textContent = 'BERT 분석이 끝나면, 해당 결과를 바탕으로 GPT가 자연스러운 개선 문장을 생성합니다.';
  btnGpt.disabled = true;

  try {
    // 백엔드: POST /feedback/bert → { feedback: [...] }
    const res = await fetch('http://localhost:3000/feedback/bert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ essay })
    });
    if (!res.ok) throw new Error('BERT API 오류');
    const data = await res.json();

    lastBertResult = data; // { feedback: [...] }
    renderBert(data.feedback || []);
    btnGpt.disabled = false;
  } catch (e) {
    console.error(e);
    bertList.innerHTML = '<span class="muted">BERT 분석을 가져오지 못했습니다. 서버 상태를 확인하세요.</span>';
  }
});

/* ---------------- GPT 재작성 ---------------- */
btnGpt.addEventListener('click', async () => {
  if (!lastBertResult || !Array.isArray(lastBertResult.feedback)) {
    return alert('먼저 BERT 분석을 실행해주세요.');
  }
  const essay = document.getElementById('essayInput').value.trim();
  gptOut.innerHTML = '<span class="loader"></span> GPT가 개선 문장을 생성 중입니다…';

  try {
    // 백엔드: POST /feedback/gpt → { rewritten, sentences? }
    const res = await fetch('http://localhost:3000/feedback/gpt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ essay, analysis: lastBertResult.feedback })
    });
    if (!res.ok) throw new Error('GPT API 오류');
    const data = await res.json();

    const parts = [];
    if (Array.isArray(data.sentences) && data.sentences.length) {
      data.sentences.forEach((s, i) => parts.push(`${i + 1}. ${s}`));
      parts.push('\n— — —\n[전체 재작성]\n' + (data.rewritten || ''));
      gptOut.textContent = parts.join('\n');
    } else {
      gptOut.textContent = data.rewritten || '결과가 비어 있습니다.';
    }
  } catch (e) {
    console.error(e);
    gptOut.textContent = 'GPT 재작성 요청 중 오류가 발생했습니다. 서버 상태 또는 API 키를 확인하세요.';
  }
});

/* ---------------- Clear ---------------- */
btnClear.addEventListener('click', () => {
  document.getElementById('essayInput').value = '';
  bertList.innerHTML = '<div class="muted">분석 결과가 여기에 표시됩니다.</div>';
  gptOut.textContent = 'BERT 분석이 끝나면, 해당 결과를 바탕으로 GPT가 자연스러운 개선 문장을 생성합니다.';
  lastBertResult = null;
  btnGpt.disabled = true;
});
