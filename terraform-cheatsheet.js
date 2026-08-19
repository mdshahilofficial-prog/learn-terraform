/* Terraform Learning Platform — clean vanilla JavaScript */
"use strict";

const LESSONS = [
{cat:"Foundations",items:[
["Terraform workflow","Core","write → init → validate → plan → apply → verify → destroy","<b>Interview:</b> Terraform is declarative: you describe desired state and Terraform builds an execution plan to converge infrastructure toward it.","<div class='tip'>Remember: <b>plan</b> is a preview; <b>apply</b> performs changes. In CI/CD, require review/approval around apply for production.</div>"],
["Provider","Core","provider \"azurerm\" { features {} }","Providers translate Terraform configuration into API operations. A provider is not the same thing as a resource: one provider exposes many resources and data sources.","<div class='tip'>Production: pin provider versions and commit <b>.terraform.lock.hcl</b>.</div>"],
["Resource address","Advanced","azurerm_linux_virtual_machine.web[\"blue\"]","A resource address identifies a specific instance in Terraform state. Addresses matter when using count, for_each, modules, import, moved blocks and state commands.","<div class='warn'>Interview trap: changing an address can look like delete + create unless you tell Terraform that the object moved.</div>"],
["Dependency graph","Advanced","resource \"x\" \"a\" { subnet_id = azurerm_subnet.app.id }","Terraform builds a dependency graph from references. It can execute independent resources in parallel.","<div class='tip'>Use <b>depends_on</b> only for dependencies Terraform cannot infer from expressions.</div>"]
]},
{cat:"Variables & Expressions",items:[
["Variables","Core","variable \"location\" { type = string }","Input variables define the module interface. Type constraints, defaults, descriptions and validation make modules safer.","<div class='tip'>Interview: variable values can come from defaults, tfvars, environment variables, CLI flags and other mechanisms; precedence matters.</div>"],
["Variable validation","Advanced","validation { condition = contains([\"eastus\",\"westeurope\"], var.location) error_message = \"Unsupported region\" }","Reject invalid inputs before infrastructure changes. Great for production guardrails.","<div class='tip'>Use validation for input correctness, not for secrets.</div>"],
["locals","Core","locals { common_tags = merge(var.tags,{managed_by=\"terraform\"}) }","Locals are internal named expressions. They reduce duplication and centralize derived values.","<div class='tip'>Variables are supplied to a module; locals are calculated inside it.</div>"],
["for expressions","Advanced","{ for k,v in var.vms : k => v.size }","Transform collections into maps/lists/sets. Extremely useful for dynamic infrastructure and module inputs.","<div class='tip'>Learn the pattern: <b>for key, value in collection : result</b>.</div>"],
["dynamic blocks","Advanced","dynamic \"rule\" { for_each = var.rules content { ... } }","Generate repeated nested blocks when the provider schema requires blocks rather than a simple attribute.","<div class='warn'>Do not use dynamic blocks just to make code look clever. Prefer normal blocks when the shape is fixed.</div>"],
["try / can","Advanced","try(var.obj.settings.name, \"default\")","<b>try()</b> returns the first expression that succeeds. <b>can()</b> tests whether an expression can be evaluated.","<div class='tip'>Useful when dealing with optional object attributes and normalization; don't hide genuine configuration errors.</div>"],
["sensitive","Production","variable \"password\" { sensitive = true }","Sensitive values are redacted from normal CLI output.","<div class='warn'><b>Important:</b> sensitive does not mean the value is absent from state. Secure the backend and state access.</div>"]
]},
{cat:"Meta-Arguments",items:[
["count","Core","resource \"azurerm_linux_virtual_machine\" \"vm\" { count = 3 }","Creates multiple instances using numeric indexes.","<div class='warn'>If instances have different identities or you remove a middle item, index changes can cause unwanted replacement/reassignment.</div>"],
["for_each","Core","for_each = { web=\"Standard_B2s\", api=\"Standard_D2s_v5\" }","Creates instances keyed by stable strings. Best when each instance has a meaningful identity or different configuration.","<div class='tip'>Interview answer: count is index-based; for_each is key-based and usually safer for long-lived heterogeneous resources.</div>"],
["depends_on","Advanced","depends_on = [azurerm_role_assignment.example]","Creates an explicit dependency when Terraform cannot infer one from an expression.","<div class='warn'>Do not use it as a default ordering mechanism. It can reduce parallelism and make dependency intent less precise.</div>"],
["lifecycle","Advanced","lifecycle { create_before_destroy = true }","Controls selected resource lifecycle behavior.","<div class='tip'><b>create_before_destroy</b>, <b>prevent_destroy</b>, <b>ignore_changes</b> and <b>replace_triggered_by</b> are high-value interview topics.</div>"],
["replace_triggered_by","Advanced","lifecycle { replace_triggered_by = [azurerm_shared_image_version.app.id] }","Forces a resource replacement when a referenced resource or resource instance changes.","<div class='tip'>Classic example: rebuild a VM when its image version changes.</div>"],
["ignore_changes","Production","lifecycle { ignore_changes = [tags] }","Tells Terraform to ignore selected remote changes during updates.","<div class='warn'>Danger: overusing it can hide drift. Use it only when another system intentionally owns that attribute.</div>"]
]},
{cat:"State & Collaboration",items:[
["Terraform state","Core","terraform state list","State maps configuration addresses to real remote objects and stores attributes Terraform needs to manage them.","<div class='warn'>State can contain secrets. Treat it as sensitive infrastructure data.</div>"],
["Remote backend","Production","terraform { backend \"azurerm\" { ... } }","Stores state centrally for team/CI usage instead of relying on local state.","<div class='tip'>Production checklist: private access where appropriate, encryption, RBAC, versioning/recovery, locking/concurrency protection, backup strategy.</div>"],
["State locking","Production","terraform apply","Locking prevents concurrent state operations from corrupting or conflicting with state. Availability and behavior depend on backend support.","<div class='tip'>Interview: locking is about concurrency control, not encryption.</div>"],
["Drift","Production","terraform plan","Drift occurs when real infrastructure changes outside Terraform. Plan refreshes/read remote values and can reveal differences.","<div class='tip'>Decide intentionally: import/update code to preserve the manual change, or apply Terraform to converge back to code.</div>"],
["state rm","Advanced","terraform state rm 'module.vm.azurerm_linux_virtual_machine.this[\"web\"]'","Removes an object from Terraform state without destroying the remote object.","<div class='warn'>After state rm, Terraform may try to create the object again because it is no longer tracked.</div>"],
["state mv","Advanced","terraform state mv old.address new.address","Moves an object to a new state address without recreating the remote object.","<div class='tip'>For durable refactors, prefer a <b>moved</b> block when appropriate because the address migration is represented in configuration.</div>"],
["state replace-provider","Advanced","terraform state replace-provider OLD NEW","Rewrites provider references in state, useful during provider source-address migrations.","<div class='tip'>High-value lesser-known state command.</div>"],
["State corruption","Interview Trap","Symptoms: invalid state, inconsistent state, failed decoding/locking","State corruption is not normally random. It can follow interrupted writes, storage/backend problems, concurrent operations, manual state editing, or tooling/backend failures.","<div class='tip'>Production response: stop concurrent changes, preserve a backup/version, identify the last known-good state, and restore/recover carefully before further applies.</div>"]
]},
{cat:"Modules & Refactoring",items:[
["Module design","Production","module \"network\" { source = \"./modules/network\" ... }","A good module exposes a small, stable interface: inputs, outputs, sensible defaults and validation.","<div class='tip'>Avoid modules that expose every provider argument blindly; encapsulate implementation details.</div>"],
["Module source pinning","Production","source = \"git::https://...//module?ref=v1.2.0\"","Pin module sources to a tag/version/commit for repeatable builds.","<div class='warn'>Avoid consuming an unpinned moving branch in production.</div>"],
["moved blocks","Advanced","moved { from = azurerm_resource.old to = azurerm_resource.new }","Tell Terraform that an existing object has a new address after a refactor, preventing unnecessary destroy/create.","<div class='tip'>Use when renaming resources or moving resources into/out of modules without changing the actual remote object.</div>"],
["import blocks","Advanced","import { to = azurerm_resource.example id = \"/subscriptions/...\" }","Declare resource imports in configuration so import intent can be reviewed and automated.","<div class='tip'>Importing is only state adoption. The configuration must still describe the imported resource correctly.</div>"],
["removed blocks","Advanced","removed { from = module.old_resource lifecycle { destroy = false } }","Used for configuration refactoring/removal while controlling whether Terraform should destroy the remote object.","<div class='tip'>Useful when you want Terraform to stop managing an object without deleting it.</div>"]
]},
{cat:"Validation & Safety",items:[
["precondition","Advanced","lifecycle { precondition { condition = var.env != \"prod\" || var.enable_backup error_message = \"Backup required\" } }","Validates assumptions before resource operation.","<div class='tip'>Great for enforcing safety requirements directly beside the resource/module logic.</div>"],
["postcondition","Advanced","postcondition { condition = self.status == \"Succeeded\" error_message = \"Unexpected status\" }","Validates a property of the resulting resource after the operation.","<div class='tip'>Useful when successful API creation is not enough—you want a specific resulting property.</div>"],
["check blocks","Advanced","check \"endpoint\" { data \"http\" \"health\" { ... } assert { condition = data.http.health.status_code == 200 error_message = \"Health check failed\" } }","Creates assertions for infrastructure assumptions. Checks are useful for broader validation/observability.","<div class='tip'>Interview distinction: checks are not simply another name for resource preconditions/postconditions.</div>"],
["Policy as code","Production","Sentinel / OPA / Azure Policy / Checkov","Enforce organizational rules such as approved regions, mandatory tags, encryption, public exposure restrictions and security baselines.","<div class='tip'>Terraform code quality and cloud governance complement each other; neither replaces the other.</div>"]
]},
{cat:"Providers, Data & Functions",items:[
["Data sources","Core","data \"azurerm_subnet\" \"app\" { ... }","Read information about an existing object that Terraform does not necessarily manage.","<div class='warn'>A data source does not transfer ownership of the object to Terraform.</div>"],
["Provider aliases","Advanced","provider \"azurerm\" { alias = \"hub\" ... }","Use multiple configurations of the same provider, commonly for multiple subscriptions/regions/tenants.","<div class='tip'>Resources/modules can explicitly select the aliased provider configuration.</div>"],
["provider configuration","Production","provider \"azurerm\" { features {} subscription_id = var.subscription_id }","Separates cloud API configuration from resource definitions.","<div class='tip'>In CI/CD, prefer workload identity/OIDC or another secure identity mechanism over storing long-lived client secrets in YAML.</div>"],
["Functions","Core","coalesce(), merge(), lookup(), flatten(), distinct(), compact(), cidrsubnet()","Terraform functions transform values and collections.","<div class='tip'>Interview favorites: merge, lookup, try, coalesce, flatten, cidrsubnet, regex, format, jsonencode.</div>"],
["Dynamic dependency","Interview Trap","local.x = azurerm_resource.a.id","Referencing an attribute creates an implicit dependency even if you did not write depends_on.","<div class='tip'>The graph follows references, not just visual order in the file.</div>"]
]},
{cat:"CLI & Debugging",items:[
["init","Core","terraform init -upgrade","Initializes providers/modules/backend. Use -upgrade intentionally when updating dependencies.","<div class='tip'>Changing backend configuration can require <b>terraform init -reconfigure</b> or <b>-migrate-state</b> depending on the situation.</div>"],
["fmt / validate","Core","terraform fmt -recursive && terraform validate","fmt normalizes formatting; validate checks configuration syntax/types/internal consistency.","<div class='tip'>Run both in CI before plan.</div>"],
["plan -out","Production","terraform plan -out=tfplan","Saves the generated plan so a later apply can use the reviewed plan file.","<div class='warn'>Treat plan files as sensitive artifacts because they can contain detailed values.</div>"],
["target","Interview Trap","terraform plan -target=module.network","Targets a subset of resources.","<div class='warn'>Not a normal deployment strategy. It can produce incomplete/partial changes and should be used for exceptional recovery/debugging scenarios.</div>"],
["graph","Advanced","terraform graph","Produces a dependency graph useful for understanding relationships and troubleshooting ordering.","<div class='tip'>Great interview answer when asked how to inspect dependencies.</div>"],
["show","Advanced","terraform show -json tfplan","Inspect state or a saved plan, including machine-readable JSON.","<div class='tip'>Useful in automation and policy checks.</div>"],
["console","Advanced","terraform console","Interactive REPL for evaluating Terraform expressions against the current configuration/state context.","<div class='tip'>Excellent for debugging complicated for-expressions and functions.</div>"],
["TF_LOG","Advanced","TF_LOG=DEBUG terraform plan","Enables Terraform logging for troubleshooting.","<div class='warn'>Do not casually paste debug logs into public channels; they may expose sensitive information.</div>"]
]},
{cat:"Production Patterns",items:[
["Environment strategy","Production","dev / test / prod","Prefer reusable modules with separate environment/root configurations and separate state boundaries. Avoid a single state file for unrelated production systems.","<div class='tip'>State boundaries should follow blast radius, ownership and lifecycle—not simply folder names.</div>"],
["CI/CD pattern","Production","fmt → validate → security scan → plan → review → apply","Use CI to produce a plan artifact, review it, then apply the approved plan in a controlled environment.","<div class='tip'>Never put cloud secrets directly in repository YAML. Use OIDC/workload identity or a secure secret mechanism.</div>"],
["Secret management","Production","Key Vault / secret manager + identity","Keep secrets outside Git and minimize their presence in Terraform variables/state.","<div class='warn'>If a secret must enter Terraform state, protect the state backend accordingly; <b>sensitive=true</b> alone is not secret storage.</div>"],
["Tagging","Production","locals { tags = merge(var.tags,{environment=var.env}) }","Standard tags support ownership, cost allocation, automation and governance.","<div class='tip'>Typical tags: environment, application, owner/team, cost_center, managed_by.</div>"],
["Blast radius","Production","separate state / modules / approvals","A change should not accidentally affect an unrelated platform.","<div class='tip'>A common senior-level discussion: state architecture is also risk architecture.</div>"],
["Provider/module upgrades","Production","lock → test → plan → review → apply","Upgrade dependencies deliberately rather than whenever CI runs.","<div class='tip'>Read provider/module changelogs and test breaking changes before production rollout.</div>"]
]}
];
const QUIZ_QUESTIONS = [
["A VM must be recreated whenever an Azure image version changes. What Terraform feature is the best fit?","replace_triggered_by"],
["You have 20 VMs with unique names and configurations. Which meta-argument is usually preferable?","for_each"],
["You need to rename a Terraform resource without recreating the remote object. What should you consider first?","moved block"],
["A resource already exists in Azure and must become Terraform-managed. What is the first concept?","import"],
["What does sensitive=true NOT guarantee?","That the value is absent from state"],
["What is the main purpose of state locking?","Prevent concurrent state operations"],
["Should -target be your normal deployment strategy?","No"],
["What creates an implicit dependency?","A reference between resource expressions/attributes"]
];

const state = {
  category: "All",
  level: "all",
  search: "",
  completed: new Set(),
  quizScore: 0,
  answeredQuiz: new Set()
};

const STORAGE_KEY = "terraform-learning-platform-progress-v2";
const $ = (id) => document.getElementById(id);

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
  $("tabs").innerHTML=["All",...LESSONS.map(x=>x.cat)].map(category =>
    `<button class="tab ${state.category===category?"active":""}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`
  ).join("");
}

function filteredLessons() {
  const q=state.search.trim().toLowerCase();
  return LESSONS.map(group=>({
    ...group,
    items:group.items.filter(item=>{
      const [title,level,syntax,explanation,note]=item;
      const categoryMatch=state.category==="All" || state.category===group.cat;
      const levelMatch=state.level==="all" || state.level===level;
      const textMatch=!q || [title,level,syntax,explanation,note,group.cat].join(" ").toLowerCase().includes(q);
      return categoryMatch && levelMatch && textMatch;
    })
  })).filter(group=>group.items.length);
}

function renderStats() {
  const total=allLessons().length;
  const validIds=new Set(allLessons().map(x=>lessonId(x.group.cat,x.item[0])));
  const completed=[...state.completed].filter(id=>validIds.has(id)).length;
  const percent=total ? Math.round(completed/total*100) : 0;
  $("bar").style.width=percent+"%";
  $("progressText").textContent=`${completed} / ${total} concepts completed`;
  $("progressPercent").textContent=percent+"%";
  $("totalConcepts").textContent=total;
  $("completedConcepts").textContent=completed;
}

function renderCard(category,item) {
  const [title,level,syntax,explanation,note]=item;
  const id=lessonId(category,title);
  const complete=state.completed.has(id);
  return `
  <article class="card concept-card ${complete?"completed":""}">
    <div class="card-top">
      <span class="tag level-${slug(level)}">${escapeHtml(level)}</span>
      ${complete?'<span class="done-badge">✓ Completed</span>':""}
    </div>
    <h3>${escapeHtml(title)}</h3>
    <div class="syntax"><span>Syntax / mental model</span><code>${escapeHtml(syntax)}</code></div>
    <details>
      <summary>Explain it</summary>
      <div class="explanation">${explanation}</div>
      <div class="note">${note}</div>
    </details>
    <div class="card-actions">
      <button class="complete-btn" data-action="complete" data-id="${escapeHtml(id)}">${complete?"✓ Completed":"Mark complete"}</button>
      <button class="ghost-btn" data-action="copy" data-copy="${escapeHtml(syntax)}">Copy syntax</button>
    </div>
  </article>`;
}

function renderLessons() {
  const groups=filteredLessons();
  if(!groups.length) {
    $("content").innerHTML=`<div class="empty-state card"><div class="empty-icon">⌕</div><h2>No concepts found</h2><p>Try a different search term, level, or category.</p><button id="clearFilters">Clear filters</button></div>`;
    renderStats(); return;
  }
  $("content").innerHTML=groups.map(group=>`
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
  $("comparison").innerHTML=`
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
  $("interview").innerHTML=`
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
  state.quizScore=0; state.answeredQuiz.clear();
  $("quiz").innerHTML=`
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
  $("search").value="";$("level").value="all";renderTabs();renderLessons();
}
function resetProgress(){
  if(!confirm("Reset all Terraform learning progress?")) return;
  state.completed.clear();saveProgress();renderLessons();showToast("Progress reset");
}
function expandAll(){document.querySelectorAll("#content details").forEach(x=>x.open=true);}
function collapseAll(){document.querySelectorAll("#content details").forEach(x=>x.open=false);}

document.addEventListener("click",event=>{
  const tab=event.target.closest("[data-category]");
  if(tab){state.category=tab.dataset.category;renderTabs();renderLessons();return;}
  const action=event.target.closest("[data-action]");
  if(!action) {
    if(event.target.id==="clearFilters") clearFilters();
    return;
  }
  if(action.dataset.action==="complete") toggleComplete(action.dataset.id);
  if(action.dataset.action==="copy") copyText(action.dataset.copy);
  if(action.dataset.action==="answer") answerQuiz(action,Number(action.dataset.q),action.dataset.value);
  if(action.dataset.action==="reveal"){
    const target=$(`answer-${action.dataset.qid}`);
    const open=target.classList.toggle("show");
    target.textContent=open?`Answer: ${action.dataset.answer}`:"";
    action.textContent=open?"Hide answer":"Reveal answer";
  }
});

$("search").addEventListener("input",e=>{state.search=e.target.value;renderLessons();});
$("level").addEventListener("change",e=>{state.level=e.target.value;renderLessons();});
$("expandAll").addEventListener("click",expandAll);
$("collapseAll").addEventListener("click",collapseAll);
$("resetProgress").addEventListener("click",resetProgress);

document.addEventListener("keydown",event=>{
  const tag=document.activeElement?.tagName;
  if(event.key==="/" && !["INPUT","TEXTAREA","SELECT"].includes(tag)){event.preventDefault();$("search").focus();}
  if(event.key==="Escape" && tag==="INPUT"){ $("search").value="";state.search="";renderLessons();$("search").blur(); }
});

function init(){
  loadProgress();
  renderTabs();
  renderLessons();
  renderComparison();
  renderInterview();
  renderQuiz();
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);
else init();
