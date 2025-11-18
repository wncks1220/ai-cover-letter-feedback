const token = localStorage.getItem('token');

const bertList = document.getElementById('bertList');
const gptOut   = document.getElementById('gptOut');
const btnBert  = document.getElementById('btnBert');
const btnGpt   = document.getElementById('btnGpt');
const btnClear = document.getElementById('btnClear');

const API = "https://ai-cover-letter-feedback-production.up.railway.app";
const BERT_API = "https://ai-bert-feedback-server-production.up.railway.app";

let lastBertResult = null;

function goBack() {
  location.href = '../Select/select.html';
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[s]));
}

function scoreToPercent(score) {
  return Math.max(10, Math.min(100, Math.round((score || 0) * 100)));
}

function badgeClassFromLabel(label) {
  const n = parseInt(String(label).split(' ')[0] || '3', 10);
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

    // 자연스러움 점수(label)
    const fluLabel = it.fluency_label ?? "3 stars";
    const fluScore = it.fluency_score ?? 0;
    const fluComment = it.fluency_comment ?? "";

    // 감정 분석
    const sentiLabel = it.senti_label ?? "분석 불가";
    const sentiScore = it.senti_score ?? 0;

    const wrap = document.createElement('div');
    wrap.className = 'sentence-item';

    wrap.innerHTML = `
      <div class="sentence-text">
        <strong>${idx + 1}.</strong> ${escapeHtml(it.sentence)}
      </div>

      <div class="badge-row">
        <span class="${badgeClassFromLabel(fluLabel)}">${escapeHtml(fluLabel)}</span>
        <span class="badge">자연스러움 확신도: ${fluScore.toFixed(2)}</span>
      </div>

      <div class="meter"><span style="width:${scoreToPercent(fluScore)}%"></span></div>

      <div class="comment">${escapeHtml(fluComment)}</div>

      <hr>

      <div class="badge-row">
        <span class="badge">${escapeHtml(sentiLabel)}</span>
        <span class="badge">감정 점수: ${sentiScore.toFixed(2)}</span>
      </div>
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

  bertList.innerHTML = '<span class="loader"></span> 한국어 문장을 분석 중입니다…';
  gptOut.textContent = 'BERT 분석이 끝나면 GPT가 문장을 개선합니다.';
  btnGpt.disabled = true;

  try {
    const res = await fetch(`${BERT_API}/feedback/bert`, {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: essay })
    });

    if (!res.ok) throw new Error('BERT API 오류');
    const data = await res.json();

    lastBertResult = { feedback: data.result };
    renderBert(data.result || []);
    btnGpt.disabled = false;

  } catch (e) {
    console.error(e);
    bertList.innerHTML = '<span class="muted">BERT 분석 실패. 서버 상태를 확인하세요.</span>';
  }
});

/* ---------------- GPT 재작성 ---------------- */
btnGpt.addEventListener('click', async () => {
  if (!lastBertResult || !Array.isArray(lastBertResult.feedback)) {
    return alert('먼저 BERT 분석을 실행해주세요.');
  }
  const essay = document.getElementById('essayInput').value.trim();
  gptOut.innerHTML = '<span class="loader"></span> GPT가 문장을 개선 중입니다…';

  try {
    const res = await fetch(`${API}/feedback/gpt`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        ...(token ? { Authorization: `Bearer ${token}` } : {}) 
      },
      body: JSON.stringify({ 
        essay, 
        analysis: lastBertResult.feedback 
      })
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
    gptOut.textContent = 'GPT 재작성 중 오류 발생. API 키 또는 서버 상태 확인.';
  }
});

/* ---------------- Clear ---------------- */
btnClear.addEventListener('click', () => {
  document.getElementById('essayInput').value = '';
  bertList.innerHTML = '<div class="muted">분석 결과가 여기에 표시됩니다.</div>';
  gptOut.textContent = 'BERT 분석이 끝나면 GPT가 자연스러운 개선 문장을 생성합니다.';
  lastBertResult = null;
  btnGpt.disabled = true;
});









