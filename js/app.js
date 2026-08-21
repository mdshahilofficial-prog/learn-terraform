"use strict";

const state = {
  category: "All",
  level: "all",
  search: "",
  completed: new Set(),
  quizScore: 0,
  answeredQuiz: new Set()
};

let isRevisionMode = false;


const STORAGE_KEY = "terraform-learning-platform-progress-v2";
const $ = (id) => document.getElementById(id);
const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; return el; };
const setWidth = (id, value) => { const el = $(id); if (el) el.style.width = value; return el; };

function escapeHtml(value) {
  return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}
function lessonId(category,title) { return `${slug(category)}::${slug(title)}`; }

function allLessons() {
  return LESSONS.flatMap(group => group.items.map(item => ({group,item})));
}
function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify([...state.completed])); } catch (_) {}
}
function loadProgress() {
  try {
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
    if(Array.isArray(saved)) state.completed=new Set(saved);
  } catch (_) {}
}
function showToast(message) {
  document.querySelector(".toast")?.remove();
  const el=document.createElement("div");
  el.className="toast"; el.textContent=message; document.body.appendChild(el);
  setTimeout(()=>el.remove(),1800);
}

function renderTabs() {
  const tabs = $("tabs");
  if (!tabs) return;
  tabs.innerHTML=["All",...LESSONS.map(x=>x.cat)].map(category =>
    `<button class="tab ${state.category===category?"active":""}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`
  ).join("");
}

function revisionSearchText(title) {
  const revision = getRevisionForLesson(title);
  if (!revision) return "";
  return [
    revision.oneLineDefinition,
    revision.mentalModel,
    revision.importantSyntax,
    revision.remember,
    revision.interviewKeyword,
    ...(revision.keyPoints || []),
    ...(revision.commonMistakes || []),
    ...(revision.importantCommands || []).map(x => `${x.command} ${x.explanation}`)
  ].join(" ").toLowerCase();
}

function filteredLessons() {
  const q=state.search.trim().toLowerCase();
  return LESSONS.map(group=>({
    ...group,
    items:group.items.filter(item=>{
      const [title,level,syntax,explanation,note]=item;
      const categoryMatch=state.category==="All" || state.category===group.cat;
      const levelMatch=state.level==="all" || state.level===level;
      const baseText=[title,level,syntax,explanation,note,group.cat].join(" ").toLowerCase();
      const textMatch=!q || baseText.includes(q) || revisionSearchText(title).includes(q);
      return categoryMatch && levelMatch && textMatch;
    })
  })).filter(group=>group.items.length);
}

function renderStats() {
  const lessons = allLessons();
  const total = lessons.length;
  const validIds = new Set(lessons.map(x => lessonId(x.group.cat, x.item[0])));
  const completed = [...state.completed].filter(id => validIds.has(id)).length;
  const percent = total ? Math.round(completed / total * 100) : 0;
  setWidth("bar", percent + "%");
  setText("progressText", `${completed} / ${total} concepts completed`);
  setText("progressPercent", percent + "%");
  setText("totalConcepts", total);
  setText("completedConcepts", completed);
}

function createRevisionHTML(title) {
  const r = getRevisionForLesson(title);
  if (!r) {
    return isRevisionMode
      ? `<div class="revision-notice"><strong>🔄 Quick Revision</strong><span>Revision summary is not available for this concept yet.</span></div>`
      : "";
  }
  const commands = (r.importantCommands || []).map(c =>
    `<li><code>${escapeHtml(c.command)}</code> — ${escapeHtml(c.explanation)}</li>`
  ).join("");
  const points = (r.keyPoints || []).map(x => `<li>${escapeHtml(x)}</li>`).join("");
  const mistakes = (r.commonMistakes || []).map(x => `<li>${escapeHtml(x)}</li>`).join("");
  return `
    <details class="revision-details" ${isRevisionMode ? "open" : ""}>
      <summary>🔄 Quick Revision</summary>
      <div class="revision-box">
        <p><strong>One-Line Definition:</strong> ${escapeHtml(r.oneLineDefinition)}</p>
        <p><strong>Mental Model:</strong> <em>${escapeHtml(r.mentalModel)}</em></p>
        <p><strong>Key Points:</strong></p><ul>${points}</ul>
        ${commands ? `<p><strong>Important Commands:</strong></p><ul>${commands}</ul>` : ""}
        ${r.importantSyntax ? `<p><strong>Important Syntax:</strong></p><pre><code>${escapeHtml(r.importantSyntax)}</code></pre>` : ""}
        <p><strong>Common Mistakes:</strong></p><ul>${mistakes}</ul>
        <p><strong>Remember This:</strong> ${escapeHtml(r.remember)}</p>
        <p><strong>Interview Keywords:</strong> <code>${escapeHtml(r.interviewKeyword)}</code></p>
      </div>
    </details>`;
}

function renderCard(category,item) {
  const [title,level,syntax,explanation,note]=item;
  const id=lessonId(category,title);
  const complete=state.completed.has(id);
  const revision=getRevisionForLesson(title);
  return `
  <article class="card concept-card ${complete?"completed":""}">
    <div class="card-top">
      <span class="tag level-${slug(level)}">${escapeHtml(level)}</span>
      ${revision?'<span class="revision-badge">🔄 Revision</span>':""}
      ${complete?'<span class="done-badge">✓ Completed</span>':""}
    </div>
    <h3>${escapeHtml(title)}</h3>
    <div class="syntax ${isRevisionMode?"compact-hidden":""}"><span>Syntax / mental model</span><code>${escapeHtml(syntax)}</code></div>
    <details class="normal-content ${isRevisionMode?"compact-hidden":""}">
      <summary>Explain it</summary>
      <div class="explanation">${explanation}</div>
      <div class="note">${note}</div>
    </details>
    ${createRevisionHTML(title)}
    <div class="card-actions">
      <button class="complete-btn" data-action="complete" data-id="${escapeHtml(id)}">${complete?"✓ Completed":"Mark complete"}</button>
      <button class="ghost-btn" data-action="copy" data-copy="${escapeHtml(syntax)}">Copy syntax</button>
    </div>
  </article>`;
}

function renderLessons() {
  const content = $("content");
  if (!content) return;
  const groups=filteredLessons();
  if(!groups.length) {
    content.innerHTML=`<div class="empty-state card"><div class="empty-icon">⌕</div><h2>No concepts found</h2><p>Try a different search term, level, or category.</p><button id="clearFilters" type="button">Clear filters</button></div>`;
    renderStats(); return;
  }
  content.innerHTML=groups.map(group=>`
    <section class="lesson-section">
      <div class="section-heading">
        <div><p class="eyebrow">LEARNING PATH</p><h2>${escapeHtml(group.cat)}</h2></div>
        <span class="section-count">${group.items.length} concept${group.items.length===1?"":"s"}</span>
      </div>
      <div class="grid">${group.items.map(item=>renderCard(group.cat,item)).join("")}</div>
    </section>`).join("");
  renderStats();
}

function renderComparison() {
  const comparison = $("comparison");
  if (!comparison) return;
  comparison.innerHTML=`
    <div class="section-heading"><div><p class="eyebrow">REFERENCE</p><h2>High-value comparisons</h2></div></div>
    <div class="table-wrap"><table>
    <thead><tr><th>Concepts</th><th>Use this when...</th><th>Important distinction</th></tr></thead>
    <tbody>
      <tr><td><b>count</b> vs <b>for_each</b></td><td>count = indexed instances; for_each = keyed instances</td><td>for_each generally gives more stable addresses when instances have distinct identities.</td></tr>
      <tr><td><b>resource</b> vs <b>data</b></td><td>resource manages; data reads existing information</td><td>A data source does not mean Terraform owns the remote object.</td></tr>
      <tr><td><b>depends_on</b> vs implicit dependency</td><td>Use depends_on when the dependency is not visible in an expression</td><td>Overusing it can reduce parallelism and make the graph less precise.</td></tr>
      <tr><td><b>locals</b> vs <b>variables</b></td><td>variables are module inputs; locals are internal derived values</td><td>Do not use locals as a substitute for environment inputs.</td></tr>
      <tr><td><b>moved</b> vs <b>terraform state mv</b></td><td>moved = configuration-based refactoring; state mv = imperative CLI operation</td><td>moved blocks document address changes and travel with the configuration.</td></tr>
      <tr><td><b>import</b> vs <b>import block</b></td><td>CLI import is imperative; import block declares an import in configuration</td><td>Importing brings an object into state; matching configuration is still required.</td></tr>
      <tr><td><b>replace_triggered_by</b> vs <b>depends_on</b></td><td>replace_triggered_by controls replacement; depends_on controls ordering</td><td>depends_on does not inherently force replacement.</td></tr>
      <tr><td><b>precondition</b> vs <b>postcondition</b></td><td>precondition checks assumptions before an operation; postcondition checks resulting values</td><td>Both are useful for enforcing infrastructure contracts.</td></tr>
      <tr><td><b>sensitive</b> vs secret storage</td><td>sensitive controls display behavior</td><td>sensitive values can still exist in state; use secure state and proper secret management.</td></tr>
      <tr><td><b>-target</b> vs normal plan</td><td>-target is for exceptional recovery/debugging</td><td>Normal deployments should allow Terraform to evaluate the full dependency graph.</td></tr>
    </tbody></table></div>`;
}

function renderInterview() {
  const interview = $("interview");
  if (!interview) return;
  interview.innerHTML=`
    <div class="section-heading"><div><p class="eyebrow">INTERVIEW MODE</p><h2>Rapid-fire Terraform questions</h2></div><span class="section-count">${QUIZ_QUESTIONS.length} questions</span></div>
    <div class="interview-grid">${QUIZ_QUESTIONS.map((q,i)=>`
      <article class="interview-card">
        <span class="question-number">${String(i+1).padStart(2,"0")}</span>
        <h3>${escapeHtml(q[0])}</h3>
        <button class="reveal-btn" data-action="reveal" data-answer="${escapeHtml(q[1])}" data-qid="${i}">Reveal answer</button>
        <div class="reveal-answer" id="answer-${i}"></div>
      </article>`).join("")}</div>`;
}

function renderQuiz() {
  const quiz = $("quiz");
  if (!quiz) return;
  state.quizScore=0; state.answeredQuiz.clear();
  quiz.innerHTML=`
    <div class="quiz-head"><div><p class="eyebrow">SELF TEST</p><h2>Test yourself</h2></div><span class="score-pill" id="quizScore">0 / ${QUIZ_QUESTIONS.length}</span></div>
    <div class="quiz-list">${QUIZ_QUESTIONS.map((q,i)=>{
      const options=[...new Set([q[1],"It depends only on terraform fmt","terraform state rm","depends_on"])].sort(()=>Math.random()-.5);
      return `<div class="quiz-question"><div class="quiz-q"><span>${i+1}</span><b>${escapeHtml(q[0])}</b></div>
      <div class="quiz-options">${options.map(option=>`<button data-action="answer" data-q="${i}" data-value="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join("")}</div>
      <div class="quiz-answer" id="quiz-answer-${i}"></div></div>`;
    }).join("")}</div>`;
}

function toggleComplete(id) {
  if(state.completed.has(id)){state.completed.delete(id);showToast("Concept reopened");}
  else{state.completed.add(id);showToast("Concept marked complete ✓");}
  saveProgress(); renderLessons();
}

function answerQuiz(button,index,value) {
  if(state.answeredQuiz.has(index)) return;
  state.answeredQuiz.add(index);
  const correct=value===QUIZ_QUESTIONS[index][1];
  if(correct) state.quizScore++;
  const container=button.closest(".quiz-question");
  if (!container) return;
  container.querySelectorAll("button").forEach(btn=>{
    btn.disabled=true;
    if(btn.textContent===QUIZ_QUESTIONS[index][1]) btn.classList.add("correct");
  });
  button.classList.add(correct?"correct":"incorrect");
  const answer=$(`quiz-answer-${index}`);
  answer.textContent=correct?"✓ Correct":`✗ Correct answer: ${QUIZ_QUESTIONS[index][1]}`;
  answer.className=`quiz-answer ${correct?"correct-text":"incorrect-text"}`;
  $("quizScore").textContent=`${state.quizScore} / ${QUIZ_QUESTIONS.length}`;
}

async function copyText(text) {
  try{await navigator.clipboard.writeText(text);}
  catch(_){
    const area=document.createElement("textarea");area.value=text;document.body.appendChild(area);
    area.select();document.execCommand("copy");area.remove();
  }
  showToast("Copied to clipboard ✓");
}

function clearFilters(){
  state.search="";state.category="All";state.level="all";
  const search=$("search"); const level=$("level");
  if (search) search.value="";
  if (level) level.value="all";
  renderTabs();renderLessons();
}
function resetProgress(){
  if(!confirm("Reset all Terraform learning progress?")) return;
  state.completed.clear();saveProgress();renderLessons();showToast("Progress reset");
}
function expandAll(){document.querySelectorAll("#content details").forEach(x=>x.open=true);}
function collapseAll(){document.querySelectorAll("#content details").forEach(x=>x.open=false);}

function bindEvents(){
  document.addEventListener("click", event => {
    const tab = event.target.closest("[data-category]");
    if(tab){
      state.category = tab.dataset.category;
      renderTabs();
      renderLessons();
      return;
    }
    const action = event.target.closest("[data-action]");
    if(!action) {
      if(event.target.id === "clearFilters") clearFilters();
      return;
    }
    if(action.dataset.action === "complete") toggleComplete(action.dataset.id);
    if(action.dataset.action === "copy") copyText(action.dataset.copy);
    if(action.dataset.action === "answer") answerQuiz(action, Number(action.dataset.q), action.dataset.value);
    if(action.dataset.action === "reveal"){
      const target = $("answer-" + action.dataset.qid);
      if (!target) return;
      const open = target.classList.toggle("show");
      target.textContent = open ? `Answer: ${action.dataset.answer}` : "";
      action.textContent = open ? "Hide answer" : "Reveal answer";
    }
  });

  const search = $("search");
  if (search) search.addEventListener("input", e => { state.search = e.target.value; renderLessons(); });
  const level = $("level");
  if (level) level.addEventListener("change", e => { state.level = e.target.value; renderLessons(); });
  const expand = $("expandAll");
  if (expand) expand.addEventListener("click", expandAll);
  const collapse = $("collapseAll");
  if (collapse) collapse.addEventListener("click", collapseAll);
  const reset = $("resetProgress");
  if (reset) reset.addEventListener("click", resetProgress);

  document.addEventListener("keydown", event => {
    const tag = document.activeElement?.tagName;
    if(event.key === "/" && !["INPUT","TEXTAREA","SELECT"].includes(tag)){
      event.preventDefault();
      $("search")?.focus();
    }
    if(event.key === "Escape" && tag === "INPUT"){
      const searchInput = $("search");
      if (searchInput) searchInput.value = "";
      state.search = "";
      renderLessons();
      searchInput?.blur();
    }
  });
}

function render(){ renderLessons(); }

function setupRevisionModeToggle(){
  if(document.getElementById("revisionToggle")) return;
  const toolbar=document.querySelector(".toolbar");
  if(!toolbar) return;
  const button=document.createElement("button");
  button.id="revisionToggle";
  button.type="button";
  button.className="revision-toggle-btn";
  button.setAttribute("aria-pressed","false");
  button.textContent="🔄 Revision Mode: OFF";
  button.addEventListener("click",()=>{
    isRevisionMode=!isRevisionMode;
    button.textContent=isRevisionMode?"🔄 Revision Mode: ON":"🔄 Revision Mode: OFF";
    button.classList.toggle("active",isRevisionMode);
    button.setAttribute("aria-pressed",String(isRevisionMode));
    document.body.classList.toggle("revision-mode-active",isRevisionMode);
    renderLessons();
  });
  toolbar.appendChild(button);
}

let initialized = false;
function init(){
  if (initialized) return;
  initialized = true;
  loadProgress();
  bindEvents();
  setupRevisionModeToggle();
  renderTabs();
  renderLessons();
  renderComparison();
  renderInterview();
  renderQuiz();
  window.__PHASE5_READY__ = true;
  window.phase5 = Object.freeze({
    totalConcepts: allLessons().length,
    revisionConcepts: allLessons().filter(x => Boolean(getRevisionForLesson(x.item[0]))).length,
    revisionMode: () => isRevisionMode
  });
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
