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



/* ========================================================================
   PHASE 5: QUICK REVISION DATASET
   Azure + Terraform + GitHub Actions focused. This is intentionally kept
   separate from lesson rendering so the existing lesson dataset is preserved.
   ======================================================================== */
const PHASE5_REVISION_DATASET = {
  "terraform-architecture": {
    oneLineDefinition: "Terraform uses a client-side architecture in which Terraform Core evaluates configuration and provider plugins communicate with cloud APIs.",
    keyPoints: [
      "Terraform Core reads configuration, builds the dependency graph (DAG), evaluates changes, and manages state.",
      "Provider plugins implement cloud-specific API operations and communicate with Terraform Core.",
      "Terraform CLI operations do not require a central Terraform server for normal execution."
    ],
    mentalModel: "Terraform Core is the engine; provider plugins are specialized drivers that translate Terraform operations into cloud API calls.",
    importantCommands: [{command:"terraform version", explanation:"Shows the Terraform CLI version and installed provider information."}],
    importantSyntax: 'terraform {\n  required_version = ">= 1.5.0"\n}',
    commonMistakes: ["Assuming Terraform Core directly implements Azure, AWS, or other cloud APIs."],
    remember: "Core evaluates and orchestrates; providers perform cloud-specific API operations.",
    interviewKeyword: "Terraform Core, Provider Plugins, gRPC, DAG, Client-side Architecture"
  },
  "providers": {
    oneLineDefinition: "Providers are plugins that translate Terraform configuration into operations against a target platform API.",
    keyPoints: [
      "Providers are installed during terraform init.",
      "required_providers constraints make provider upgrades predictable.",
      "Provider aliases support multiple Azure subscriptions or other provider configurations."
    ],
    mentalModel: "A provider is a translation layer between Terraform's resource model and a cloud platform API.",
    importantCommands: [{command:"terraform init -upgrade", explanation:"Updates provider selections within the configured version constraints."}],
    importantSyntax: 'provider "azurerm" {\n  features {}\n  alias = "secondary"\n}',
    commonMistakes: ["Forgetting the azurerm features {} block.","Forgetting to select an aliased provider when a resource belongs to another provider configuration."],
    remember: "Providers implement cloud-specific operations; pin versions and commit .terraform.lock.hcl.",
    interviewKeyword: "Provider Plugin, features {}, Provider Alias, Version Pinning"
  },
  "resources": {
    oneLineDefinition: "A resource block declares an infrastructure object Terraform should manage and track in state.",
    keyPoints: ["Resources represent managed infrastructure such as VMs, VNets, storage accounts, and Key Vaults.","Each resource has a stable Terraform address.","Terraform plans create, update, or destroy actions to converge toward the declared configuration."],
    mentalModel: "A resource is a managed infrastructure object declared in the Terraform blueprint.",
    importantCommands: [{command:"terraform state list", explanation:"Lists managed resource addresses in state."}],
    importantSyntax: 'resource "azurerm_resource_group" "rg" {\n  name = "rg-prod-eastus"\n  location = "East US"\n}',
    commonMistakes: ["Treating a resource block as an imperative script rather than a desired-state declaration."],
    remember: "Resources are the managed objects Terraform tracks through state.",
    interviewKeyword: "Resource Address, Desired State, CRUD Lifecycle"
  },
  "data-sources": {
    oneLineDefinition: "Data sources read information about existing infrastructure without creating or managing that object.",
    keyPoints: ["Data sources are read-only lookups.","They are useful for existing VNets, subnets, Key Vaults, and other infrastructure outside the current module.","They do not transfer ownership of the remote object to Terraform."],
    mentalModel: "A data source is a query into existing infrastructure.",
    importantCommands: [{command:"terraform plan -refresh-only", explanation:"Inspects refreshed state without proposing normal configuration changes."}],
    importantSyntax: 'data "azurerm_subnet" "app" {\n  name = "backend-subnet"\n  virtual_network_name = "vnet-prod"\n  resource_group_name = "rg-prod"\n}',
    commonMistakes: ["Using legacy terraform refresh as a primary workflow instead of inspecting refresh through plan -refresh-only."],
    remember: "Data sources read; resources manage.",
    interviewKeyword: "Read-only Lookup, Existing Infrastructure, Data Source"
  },
  "variables": {
    oneLineDefinition: "Variables are typed module inputs used to parameterize reusable Terraform configurations.",
    keyPoints: ["Use type constraints and validation where appropriate.","Sensitive variables are redacted from normal CLI output.","Keep secrets out of source control and protect state because sensitive values can still exist in state."],
    mentalModel: "Variables are function arguments supplied to a Terraform module.",
    importantCommands: [{command:"terraform plan -var-file=prod.tfvars", explanation:"Supplies values from a selected variable file."}],
    importantSyntax: 'variable "location" {\n  type = string\n  description = "Azure region"\n}',
    commonMistakes: ["Committing .tfvars files containing credentials or other secrets."],
    remember: "Variables parameterize modules; validation makes interfaces safer.",
    interviewKeyword: "Type Constraints, Validation, Precedence, Sensitive"
  },
  "locals": {
    oneLineDefinition: "Locals are internal named expressions used to calculate and reuse values within a module.",
    keyPoints: ["Locals are not caller inputs.","They reduce duplication and standardize names, tags, and derived values.","They are especially useful for common Azure naming and tag conventions."],
    mentalModel: "Locals are private helper values calculated inside a module.",
    importantCommands: [{command:"terraform console", explanation:"Evaluates expressions interactively, including local values."}],
    importantSyntax: 'locals {\n  common_tags = {\n    managed_by = "terraform"\n  }\n}',
    commonMistakes: ["Trying to override a local through -var."],
    remember: "Variables come from the caller; locals are calculated internally.",
    interviewKeyword: "Internal Helper, DRY, Derived Values"
  },
  "outputs": {
    oneLineDefinition: "Outputs expose useful Terraform values to callers, operators, or automation.",
    keyPoints: ["Outputs commonly expose IDs, IP addresses, names, or URIs.","Module outputs form the return interface of child modules.","Sensitive outputs should be marked sensitive when appropriate."],
    mentalModel: "Outputs are return values from a Terraform module.",
    importantCommands: [{command:"terraform output -json", explanation:"Returns outputs in JSON for automation."}],
    importantSyntax: 'output "subnet_id" {\n  value = azurerm_subnet.app.id\n}',
    commonMistakes: ["Exposing sensitive values through outputs without appropriate protection."],
    remember: "Outputs expose module results; they do not replace secure secret management.",
    interviewKeyword: "Module Interface, Return Value, Sensitive Output"
  },
  "count": {
    oneLineDefinition: "count creates multiple resource instances addressed by numeric indexes.",
    keyPoints: ["Indexes begin at zero.","Changing list order can shift indexes.","count is useful for conditional creation or truly identical instances."],
    mentalModel: "count behaves like an indexed array of resource instances.",
    importantCommands: [{command:"terraform plan", explanation:"Shows whether index changes could cause replacements."}],
    importantSyntax: 'count = var.create_vm ? 1 : 0',
    commonMistakes: ["Using count for long-lived resources with distinct identities where index changes can cause churn."],
    remember: "Use count when numeric identity is acceptable; use for_each for stable named identities.",
    interviewKeyword: "Index, count.index, Conditional Creation"
  },
  "for_each": {
    oneLineDefinition: "for_each creates resource instances using stable keys from a map or set.",
    keyPoints: ["Instances are addressed by keys.","Adding or removing a key does not shift unrelated instance addresses.","each.key and each.value are available inside the resource."],
    mentalModel: "for_each behaves like a dictionary of named resource instances.",
    importantCommands: [{command:"terraform state list", explanation:"Shows keyed resource addresses created by for_each."}],
    importantSyntax: 'for_each = { frontend = "Standard_B2s", backend = "Standard_D2s_v5" }',
    commonMistakes: ["Using an unstable key or passing an unsupported collection shape."],
    remember: "for_each provides stable named addresses for distinct infrastructure instances.",
    interviewKeyword: "Stable Keys, each.key, each.value, Resource Addressing"
  },
  "depends_on": {
    oneLineDefinition: "depends_on explicitly declares a dependency Terraform cannot infer from resource expressions.",
    keyPoints: ["Terraform normally creates implicit dependencies from references.","depends_on can enforce ordering for hidden dependencies such as some RBAC propagation cases.","Overuse can reduce parallelism."],
    mentalModel: "An explicit roadblock added to the dependency graph.",
    importantCommands: [{command:"terraform graph", explanation:"Visualizes the dependency graph."}],
    importantSyntax: 'depends_on = [azurerm_role_assignment.example]',
    commonMistakes: ["Using depends_on merely to force visual file order when an attribute reference already creates the dependency."],
    remember: "Use depends_on for hidden dependencies, not ordinary ordering.",
    interviewKeyword: "Explicit Dependency, DAG, Ordering"
  },
  "lifecycle": {
    oneLineDefinition: "The lifecycle block changes selected create, update, replacement, and destruction behavior.",
    keyPoints: ["create_before_destroy can reduce replacement downtime.","prevent_destroy protects critical resources from Terraform destroy plans.","ignore_changes can intentionally delegate ownership of selected attributes."],
    mentalModel: "Lifecycle is a set of guardrails and replacement rules around a resource.",
    importantCommands: [{command:"terraform plan", explanation:"Shows how lifecycle settings affect the proposed actions."}],
    importantSyntax: 'lifecycle {\n  create_before_destroy = true\n  prevent_destroy = true\n}',
    commonMistakes: ["Assuming prevent_destroy blocks manual deletion from the Azure Portal."],
    remember: "Lifecycle controls Terraform behavior; it is not a cloud-side firewall against manual actions.",
    interviewKeyword: "create_before_destroy, prevent_destroy, ignore_changes, replace_triggered_by"
  },
  "terraform-state": {
    oneLineDefinition: "Terraform state maps configuration addresses to real infrastructure and stores attributes Terraform needs to manage it.",
    keyPoints: ["State provides the mapping between Terraform addresses and provider resource IDs.","State is critical for efficient planning and dependency tracking.","State can contain sensitive values and must be protected."],
    mentalModel: "State is the ledger connecting Terraform code to real cloud resources.",
    importantCommands: [
      {command:"terraform state list", explanation:"Lists managed addresses."},
      {command:"terraform state show <address>", explanation:"Shows stored state for one address."},
      {command:"terraform state rm <address>", explanation:"Stops tracking an object without destroying the remote object."}
    ],
    importantSyntax: 'terraform state mv azurerm_subnet.old azurerm_subnet.new',
    commonMistakes: ["Editing state JSON manually.","Committing state files to a public repository.","Treating state rm as a destroy operation."],
    remember: "State maps code to infrastructure; secure it like sensitive production data.",
    interviewKeyword: "Resource Mapping, Drift, State Security, state rm, state mv"
  },
  "backend": {
    oneLineDefinition: "A backend determines where Terraform state is stored and how state operations are coordinated.",
    keyPoints: ["Azure teams commonly use the azurerm backend with Azure Storage.","Remote state enables collaboration and centralized access control.","Backend configuration belongs in Terraform configuration, not inside provider resource blocks."],
    mentalModel: "The backend is the remote storage and coordination layer for Terraform state.",
    importantCommands: [{command:"terraform init -reconfigure", explanation:"Reinitializes Terraform using the current backend configuration."}],
    importantSyntax: 'terraform {\n  backend "azurerm" {\n    resource_group_name = "rg-tfstate"\n    storage_account_name = "sttfstateprod"\n    container_name = "tfstate"\n    key = "prod.tfstate"\n  }\n}',
    commonMistakes: ["Hardcoding long-lived storage credentials in backend configuration."],
    remember: "Remote backend = centralized, protected state storage for team operations.",
    interviewKeyword: "Remote State, Azure Blob, Backend, Collaboration"
  },
  "state-locking": {
    oneLineDefinition: "State locking prevents conflicting concurrent Terraform operations against the same state.",
    keyPoints: ["Locking protects state from concurrent writes.","Azure Blob leases are used by the azurerm backend for locking.","Force-unlock should only be used after confirming the lock is stale."],
    mentalModel: "A single-writer lock around a shared infrastructure ledger.",
    importantCommands: [{command:"terraform force-unlock <LOCK_ID>", explanation:"Removes a stale lock after verifying no active operation is running."}],
    importantSyntax: 'terraform apply -lock-timeout=60s',
    commonMistakes: ["Force-unlocking while another pipeline is actively applying changes."],
    remember: "Locking is concurrency control, not encryption.",
    interviewKeyword: "Blob Lease, Concurrency, Lock ID, Force Unlock"
  },
  "import": {
    oneLineDefinition: "Import adopts existing cloud infrastructure into Terraform state management.",
    keyPoints: ["Import does not automatically make configuration correct.","The resource declaration must match the existing object.","Import blocks make import intent reviewable in configuration."],
    mentalModel: "Import is the adoption process for infrastructure that already exists.",
    importantCommands: [{command:"terraform import <address> <cloud-id>", explanation:"Associates an existing remote object with a Terraform address."}],
    importantSyntax: 'import {\n  to = azurerm_resource_group.rg\n  id = "/subscriptions/<SUB_ID>/resourceGroups/rg-existing"\n}',
    commonMistakes: ["Assuming terraform import writes complete .tf configuration automatically."],
    remember: "Import brings the object into state; HCL still defines how Terraform should manage it.",
    interviewKeyword: "Existing Infrastructure, Adoption, Import Block"
  },
  "modules": {
    oneLineDefinition: "Modules package reusable Terraform configuration behind a stable input/output interface.",
    keyPoints: ["Root modules are the working configurations executed by Terraform.","Child modules encapsulate reusable resources.","Variables are inputs and outputs are the module's return interface."],
    mentalModel: "A Terraform module is like a reusable function for infrastructure.",
    importantCommands: [{command:"terraform init", explanation:"Downloads module dependencies and providers."}],
    importantSyntax: 'module "network" {\n  source = "./modules/network"\n}',
    commonMistakes: ["Creating deeply nested modules with unclear ownership and interfaces."],
    remember: "Good modules expose a small, stable interface and hide implementation details.",
    interviewKeyword: "Root Module, Child Module, Reuse, Encapsulation"
  },
  "workspaces": {
    oneLineDefinition: "Terraform CLI workspaces provide separate state instances while reusing the same configuration directory.",
    keyPoints: ["Workspaces separate state, not configuration code.","They can be useful for lightweight isolation or testing.","Use stronger boundaries such as separate subscriptions/state configurations for production security isolation."],
    mentalModel: "Multiple state contexts sharing one configuration codebase.",
    importantCommands: [{command:"terraform workspace new <name>", explanation:"Creates and selects a workspace."},{command:"terraform workspace select <name>", explanation:"Switches the active workspace."}],
    importantSyntax: 'name = "rg-${terraform.workspace}"',
    commonMistakes: ["Using CLI workspaces as the only isolation mechanism for production security boundaries."],
    remember: "Workspaces isolate state; they do not create hard security boundaries.",
    interviewKeyword: "State Isolation, terraform.workspace, Environment Strategy"
  },
  "oidc": {
    oneLineDefinition: "OIDC lets GitHub Actions authenticate to Azure using short-lived federated identity instead of a long-lived client secret.",
    keyPoints: ["GitHub issues an OIDC token to the workflow.","Azure Entra ID trusts a Federated Identity Credential tied to the repository/workflow identity.","azure/login exchanges the workload identity for short-lived Azure access."],
    mentalModel: "GitHub proves who the workflow is, and Azure grants temporary access without storing a client secret.",
    importantCommands: [{command:"az ad app federated-credential create", explanation:"Creates the Azure Entra federated trust used by GitHub Actions."}],
    importantSyntax: '- uses: azure/login@v2\n  with:\n    client-id: ${{ secrets.AZURE_CLIENT_ID }}\n    tenant-id: ${{ secrets.AZURE_TENANT_ID }}\n    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}',
    commonMistakes: ["Using AWS IAM ARN examples for an Azure/GitHub Actions OIDC setup.","Assuming client-id alone is a client secret."],
    remember: "Azure OIDC uses Entra ID Federated Identity Credentials and short-lived tokens.",
    interviewKeyword: "GitHub Actions, OIDC, Entra ID, Federated Identity Credential, azure/login"
  },
  "terraform-cicd": {
    oneLineDefinition: "Terraform CI/CD automates formatting, validation, security checks, plan review, and controlled apply operations.",
    keyPoints: ["Run fmt and validate before plan.","Use security scanning and policy checks in pull requests.","Store and review plan artifacts before controlled production applies."],
    mentalModel: "A deployment assembly line: validate → scan → plan → review → apply.",
    importantCommands: [{command:"terraform fmt -check", explanation:"Fails CI when Terraform formatting is not compliant."},{command:"terraform plan -out=tfplan", explanation:"Saves a plan artifact for later review/apply."}],
    importantSyntax: 'terraform apply tfplan',
    commonMistakes: ["Running an uncontrolled apply without review or protected identity."],
    remember: "CI/CD should make Terraform changes repeatable, reviewable, and identity-secure.",
    interviewKeyword: "CI/CD, Plan Artifact, PR Review, OIDC, Gated Apply"
  }
};

/* Maps the dataset's canonical keys to the actual lesson titles in this project. */
const PHASE5_LESSON_KEY_MAP = {
  "Terraform workflow": "terraform-architecture",
  "Provider": "providers",
  "Resource address": "resources",
  "Data sources": "data-sources",
  "Variables": "variables",
  "locals": "locals",
  "count": "count",
  "for_each": "for_each",
  "depends_on": "depends_on",
  "lifecycle": "lifecycle",
  "Terraform state": "terraform-state",
  "Remote backend": "backend",
  "State locking": "state-locking",
  "state rm": "terraform-state",
  "import blocks": "import",
  "Module design": "modules",
  "Environment strategy": "workspaces",
  "CI/CD pattern": "terraform-cicd",
  "provider configuration": "oidc"
};

function getRevisionForLesson(title) {
  const key = PHASE5_LESSON_KEY_MAP[title];
  return key ? PHASE5_REVISION_DATASET[key] : null;
}

