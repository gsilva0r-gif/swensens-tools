(function () {
  const config = window.SWENSENS_CONFIG;
  const demoData = window.SWENSENS;
  const scheduler = window.SwensensScheduler;
  const supabaseClient = window.supabase?.createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  const elements = {
    loginView: document.querySelector("#loginView"),
    appView: document.querySelector("#appView"),
    loginForm: document.querySelector("#loginForm"),
    loginId: document.querySelector("#loginId"),
    loginPin: document.querySelector("#loginPin"),
    loginMessage: document.querySelector("#loginMessage"),
    togglePin: document.querySelector("#togglePin"),
    logoutButton: document.querySelector("#logoutButton"),
    toast: document.querySelector("#toast"),
    settings: document.querySelector("#scheduleSettings"),
    warnings: document.querySelector("#scheduleWarnings"),
    results: document.querySelector("#scheduleResults"),
    scheduleRequests: document.querySelector("#scheduleRequestContent"),
    employeeRequests: document.querySelector("#employeeRequestContent"),
    team: document.querySelector("#teamGrid"),
    hiddenTeam: document.querySelector("#hiddenTeamGrid"),
    activeTeamPanel: document.querySelector("#activeTeamPanel"),
    hiddenTeamPanel: document.querySelector("#hiddenTeamPanel"),
    availabilityMatrix: document.querySelector("#availabilityMatrix"),
    scheduleBuilderModule: document.querySelector("#scheduleBuilderModule"),
    scheduleAvailabilityModule: document.querySelector("#scheduleAvailabilityModule"),
    scheduleRequestsModule: document.querySelector("#scheduleRequestsModule"),
    scheduleManagerHeading: document.querySelector("#scheduleManagerHeading"),
    scheduleModuleTabs: document.querySelector(".schedule-module-tabs"),
    employeeScheduleWorkspace: document.querySelector("#employeeScheduleWorkspace"),
    employeeAccountManager: document.querySelector("#employeeAccountManager"),
    showEmployeeAccountForm: document.querySelector("#showEmployeeAccountForm"),
    databaseHealthPanel: document.querySelector("#databaseHealthPanel"),
    databaseHealthMessage: document.querySelector("#databaseHealthMessage"),
    runDatabaseHealthCheck: document.querySelector("#runDatabaseHealthCheck"),
    inventory: document.querySelector("#inventoryContent"),
  };

  const state = {
    mode: "signed-out",
    profile: null,
    role: "manager",
    team: clone(demoData.team),
    hiddenTeam: [],
    settings: clone(demoData.defaultSettings),
    options: [],
    selectedOption: null,
    savedScheduleIds: {},
    publishedOption: null,
    publishedSchedule: null,
    employeeAssignments: [],
    editingEmployeeId: null,
    editingSkillsEmployeeId: null,
    showingEmployeeAccountForm: false,
    teamView: "active",
    scheduleModuleView: "availability",
    availabilityMobileEmployeeId: "",
    requestsExpanded: false,
    accountActionBusy: false,
    availabilitySheetBusy: false,
    requestSyncChannel: null,
    requestRefreshTimer: null,
    requestRefreshDebounce: null,
    profileSkills: [],
    canAccessInventory: false,
    inventoryFlavors: [],
    inventoryCatalog: [],
    inventoryHistory: [],
    productionSheets: [],
    productionSheetViewId: "",
    inventoryLoading: false,
    inventoryBusy: false,
    inventoryError: "",
    inventoryEntryMode: "production",
    inventoryMasterView: "can",
    inventoryCameraMode: "usage",
    inventoryScanImage: "",
    inventoryScanFileName: "",
    inventoryScanEntries: [],
    inventoryScanBusy: false,
    inventoryScanError: "",
    inventoryScanNotes: "",
    inventoryScanDate: "",
    inventoryScanUserNote: "",
    productionScanImage: "",
    productionScanFileName: "",
    productionScanRows: [],
    productionScanCanDates: ["", "", "", "", ""],
    productionScanHalfDates: ["", "", "", "", ""],
    productionScanBusy: false,
    productionScanError: "",
    productionScanNotes: "",
    productionScanUserNote: "",
    systemCheckBusy: false,
  };

  const seniorityCodes = [
    "PAUL01",
    "CHERIE01",
    "GABRIEL01",
    "ISRAEL01",
    "RORY01",
    "EVELYN01",
    "DANIA01",
    "JULIETTE01",
    "CHRISTOPHER01",
    "ANDREW01",
    "RYAN01",
    "GIANNA01",
  ];
  const activeSeniorityCodes = new Set(seniorityCodes);
  const seniorityRank = new Map(seniorityCodes.map((code, index) => [code, index]));

  function sortTeamBySeniority(team) {
    return [...team].sort((a, b) => {
      const aRank = seniorityRank.get(a.code) ?? Number.MAX_SAFE_INTEGER;
      const bRank = seniorityRank.get(b.code) ?? Number.MAX_SAFE_INTEGER;
      return aRank - bRank || a.name.localeCompare(b.name);
    });
  }

  const inventoryCategoryLabels = {
    vanillas: "Vanillas",
    nuts: "Nuts",
    chips: "Chips",
    chocolates: "Chocolates",
    fruits: "Fruits",
    sherbets: "Sherbets & Sorbet",
    seasonals: "Seasonals",
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizedEmployeeName(value) {
    return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function recurringAvailabilityFor(employeeRow) {
    return demoData.team.find((employee) => employee.code === employeeRow.employee_code)
      || demoData.team.find((employee) => normalizedEmployeeName(employee.name) === normalizedEmployeeName(employeeRow.display_name))
      || null;
  }

  const demoStorageKey = "swensens-demo-requests-v2";

  function loadDemoTeam() {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(demoStorageKey));
      if (saved?.weekStart === demoData.defaultSettings.weekStart && Array.isArray(saved.team)) return saved.team;
    } catch (_) {
      // A blocked or malformed browser store should never prevent the demo from opening.
    }
    return clone(demoData.team);
  }

  function saveDemoTeam() {
    try {
      window.sessionStorage.setItem(demoStorageKey, JSON.stringify({
        weekStart: state.settings.weekStart,
        team: state.team,
      }));
    } catch (_) {
      // Demo persistence is a convenience; real accounts save through Supabase.
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => elements.toast.classList.remove("show"), 2800);
  }

  function isGabrielAccount(profile = state.profile) {
    const email = String(profile?.email || "").trim().toLowerCase();
    return email === "gsilva0r.sf@gmail.com" || profile?.employee_code === "GABRIEL01";
  }

  function systemCheckTimestampLabel(value) {
    if (!value) return "No system check has been run on this device.";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "No system check has been run on this device.";
    return `Last successful check: ${new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date)}`;
  }

  async function runDatabaseHealthCheck() {
    if (state.mode !== "supabase" || !supabaseClient || !isGabrielAccount() || state.systemCheckBusy) return;
    state.systemCheckBusy = true;
    elements.runDatabaseHealthCheck.disabled = true;
    elements.runDatabaseHealthCheck.textContent = "Checking…";
    elements.databaseHealthMessage.textContent = "Contacting each part of the database…";

    const checks = await Promise.all([
      supabaseClient.from("employees").select("id").limit(1),
      supabaseClient.from("weekly_requests").select("id").limit(1),
      supabaseClient.from("week_settings").select("week_start").limit(1),
      supabaseClient.from("ice_cream_inventory").select("flavor_id").limit(1),
      supabaseClient.from("ice_cream_production_sheets").select("id").limit(1),
    ]);
    const failed = checks.find((result) => result.error);

    if (failed) {
      elements.databaseHealthMessage.textContent = `System check failed: ${failed.error.message}. If the project is paused, resume it in Supabase first.`;
      showToast("Database system check failed.");
    } else {
      const checkedAt = new Date().toISOString();
      try { window.localStorage.setItem("swensens-last-system-check", checkedAt); } catch (_) {}
      elements.databaseHealthMessage.textContent = `${systemCheckTimestampLabel(checkedAt)} · 5 database areas responded.`;
      showToast("Database is active and responding.");
    }

    state.systemCheckBusy = false;
    elements.runDatabaseHealthCheck.disabled = false;
    elements.runDatabaseHealthCheck.textContent = "Run system check";
  }

  function scheduleWeekRows(weekStart) {
    const tuesday = new Date(`${weekStart}T12:00:00`);
    const monday = new Date(tuesday);
    monday.setDate(monday.getDate() - 1);
    return [
      { name: "Monday", date: monday, closed: true },
      ...demoData.days.map((day, index) => {
        const date = new Date(tuesday);
        date.setDate(date.getDate() + index);
        return { name: day.name, date, closed: false };
      }),
    ];
  }

  function scheduleWeekLabel(weekStart) {
    const rows = scheduleWeekRows(weekStart);
    const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
    return `${formatter.format(rows[0].date)}–${formatter.format(rows.at(-1).date)}`;
  }

  function scheduleCellParts(option, dayName, employeeId) {
    const record = option.schedule[dayName];
    if (!record) return [];
    const parts = [];
    const morning = record.AM.find((item) => item.employeeId === employeeId);
    const night = record.PM.find((item) => item.employeeId === employeeId);
    if (morning) parts.push({ text: `11:30${morning.requiresApproval ? "*" : ""}`, type: "morning", hours: 6 });
    if (night) parts.push({ text: `5:30${night.requiresApproval ? "*" : ""}`, type: "night", hours: 5 });
    if (record.IC.some((item) => item.employeeId === employeeId)) parts.push({ text: "IC", type: "ic", hours: 11, fullDay: true });
    record.training.filter((item) => item.employeeId === employeeId).forEach((item) => {
      const role = item.role === "trainee" ? "Training" : "Trainer";
      const time = item.shift === "AM" ? "11:30" : item.shift === "PM" ? "5:30" : "IC";
      parts.push({
        text: `${time} ${role}`,
        type: item.role === "trainee" ? "trainee" : "trainer",
        hours: item.shift === "AM" ? 6 : item.shift === "PM" ? 5 : 11,
        fullDay: item.shift === "FULL",
      });
    });
    return parts;
  }

  function mobileScheduleEntry(part) {
    const approval = part.text.includes("*") ? "*" : "";
    if (part.type === "morning") return { time: `11:30${approval}`, note: "" };
    if (part.type === "night") return { time: `5:30${approval}`, note: "" };
    if (part.type === "ic") return { time: "IC", note: "" };

    const time = part.text.startsWith("11:30") ? "11:30" : part.text.startsWith("5:30") ? "5:30" : "IC";
    return { time, note: part.type === "trainee" ? "train" : "coach" };
  }

  function buildMobileScheduleSheet(option, dateFormatter) {
    const workingDays = scheduleWeekRows(state.settings.weekStart).filter((day) => !day.closed);
    const dayHeaders = workingDays.map((day) => `<th scope="col"><strong>${escapeHtml(day.name.slice(0, 3))}</strong><small>${dateFormatter.format(day.date)}</small></th>`).join("");
    const employeeRows = state.team.map((employee) => {
      const cells = workingDays.map((day) => {
        const parts = scheduleCellParts(option, day.name, employee.id);
        if (!parts.length) return `<td><span class="mobile-schedule-off" aria-label="Off">—</span></td>`;
        const entries = parts.map((part) => {
          const compact = mobileScheduleEntry(part);
          return `<span class="mobile-schedule-entry ${part.type}" title="${escapeHtml(part.text)}"><strong>${escapeHtml(compact.time)}</strong>${compact.note ? `<small>${escapeHtml(compact.note)}</small>` : ""}</span>`;
        }).join("");
        return `<td>${entries}</td>`;
      }).join("");
      return `<tr><th scope="row" title="${escapeHtml(employee.name)}">${escapeHtml(employee.name)}</th>${cells}</tr>`;
    }).join("");

    return `<div class="mobile-schedule-sheet-wrap">
      <div class="mobile-schedule-title"><strong>Full week</strong><span>${scheduleWeekLabel(state.settings.weekStart)}</span></div>
      <table class="mobile-schedule-sheet">
        <thead><tr><th scope="col">Team</th>${dayHeaders}</tr></thead>
        <tbody><tr class="mobile-schedule-closed"><th scope="row">Monday</th><td colspan="${workingDays.length}">CLOSED</td></tr>${employeeRows}</tbody>
      </table>
      <div class="mobile-schedule-legend"><span><b>11:30</b> morning</span><span><b>5:30</b> night</span><span><b>IC</b> production</span><span><b>train</b> trainee</span><span><b>coach</b> trainer</span><span><b>*</b> approval</span></div>
    </div>`;
  }

  function buildScheduleSheet(option) {
    const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric" });
    const roster = state.team;
    const rows = scheduleWeekRows(state.settings.weekStart).map((day) => {
      const dayHeading = `<strong>${day.name}</strong><small>${dateFormatter.format(day.date)}</small>`;
      if (day.closed) return `<tr class="closed-row"><th>${dayHeading}</th><td colspan="${roster.length}">CLOSED</td></tr>`;
      const cells = roster.map((employee) => {
        const parts = scheduleCellParts(option, day.name, employee.id);
        return `<td>${parts.length ? parts.map((part) => `<span class="sheet-entry ${part.type}">${escapeHtml(part.text)}</span>`).join("") : `<span class="off-mark">×</span>`}</td>`;
      }).join("");
      return `<tr><th>${dayHeading}</th>${cells}</tr>`;
    }).join("");
    return `<div class="desktop-schedule-sheet"><div class="schedule-sheet-wrap">
        <table class="schedule-sheet">
          <caption>Swensen's Weekly Schedule · ${scheduleWeekLabel(state.settings.weekStart)}</caption>
          <thead><tr><th class="day-column">Day</th>${roster.map((employee) => `<th title="${escapeHtml(employee.name)}">${escapeHtml(employee.name)}</th>`).join("")}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="schedule-legend"><span><b>11:30</b> Morning</span><span><b>5:30</b> Night</span><span><b>IC</b> Flexible full day</span><span><b>Training</b> Additional</span><span><b>*</b> Approval needed</span><span><b>×</b> Off</span></div>
    </div>${buildMobileScheduleSheet(option, dateFormatter)}`;
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function downloadSchedule(optionIndex) {
    const option = state.options[optionIndex];
    if (!option) return;
    const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric", year: "numeric" });
    const roster = state.team;
    const rows = [
      ["Swensen's Weekly Schedule", scheduleWeekLabel(state.settings.weekStart)],
      [],
      ["Day", "Date", ...roster.map((employee) => employee.name)],
      ...scheduleWeekRows(state.settings.weekStart).map((day) => [
        day.name,
        dateFormatter.format(day.date),
        ...roster.map((employee, employeeIndex) => day.closed
          ? (employeeIndex === 0 ? "CLOSED" : "")
          : (scheduleCellParts(option, day.name, employee.id).map((part) => part.text).join(" | ") || "OFF")),
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blobUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `swensens-schedule-${state.settings.weekStart}-option-${optionIndex + 1}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
    showToast("Schedule CSV downloaded");
  }

  function printSchedule(optionIndex) {
    const option = state.options[optionIndex];
    if (!option) return;
    const printRoot = document.querySelector("#printScheduleRoot");
    printRoot.innerHTML = `<section class="print-document"><header><p>Swensen's Ice Cream · San Francisco</p><h1>Weekly Staff Schedule</h1><span>${scheduleWeekLabel(state.settings.weekStart)} · Option ${optionIndex + 1}</span></header>${buildScheduleSheet(option)}</section>`;
    document.body.classList.add("printing-schedule");
    window.addEventListener("afterprint", () => document.body.classList.remove("printing-schedule"), { once: true });
    window.requestAnimationFrame(() => window.print());
  }

  function buildProductionPrintTable(sheet) {
    const slots = productionSheetSlots(sheet);
    const flavors = productionSheetFlavors(sheet);
    const productionCell = (slot, flavor, kind) => {
      const cell = productionSheetCell(slot, flavor.id);
      const value = kind === "can" ? cell?.can_quantity : cell?.half_gallon_quantity;
      return `<td>${Number(value) > 0 ? value : ""}</td>`;
    };
    return `<div class="inventory-paper-scroll archive-print-scroll"><table class="inventory-paper-table production-master-sheet archive-print-table">
      <caption>Archived full-can and half-gallon production master sheet</caption>
      <thead><tr><th scope="col">Flavors</th><th scope="col">Cans</th>${slots.map((slot) => `<th scope="col">${inventoryShortDate(slot.can_date)}</th>`).join("")}<th scope="col" class="half-gallon-divider">½ Gallons</th>${slots.map((slot) => `<th scope="col">${inventoryShortDate(slot.half_gallon_date)}</th>`).join("")}</tr></thead>
      <tbody>${inventoryPaperRows(flavors, 13, (flavor) => `<tr><th scope="row">${escapeHtml(flavor.name)}</th><td class="inventory-current-count">${Number.isInteger(flavor.canCount) ? flavor.canCount : "—"}</td>${slots.map((slot) => productionCell(slot, flavor, "can")).join("")}<td class="half-gallon-divider"></td>${slots.map((slot) => productionCell(slot, flavor, "half_gallon")).join("")}</tr>`)}</tbody>
    </table></div>`;
  }

  function printProductionSheet(sheetId) {
    const sheet = state.productionSheets.find((item) => item.id === sheetId);
    if (!sheet) return;
    const totals = productionSheetTotals(sheet);
    const printRoot = document.querySelector("#printScheduleRoot");
    printRoot.innerHTML = `<section class="print-document inventory-print-document"><header><p>Swensen's Ice Cream · San Francisco</p><h1>Production Master Sheet #${sheet.sheet_number}</h1><span>${productionSheetDateRange(sheet)} · ${sheet.status === "complete" ? "Archived record" : "Current sheet"} · ${totals.cans} cans / ${totals.halfGallons} half gallons made</span></header>${buildProductionPrintTable(sheet)}<footer>Generated from Swensen's Management Hub${sheet.completed_at ? ` · Archived ${inventoryTimestampLabel(sheet.completed_at)}` : ""}</footer></section>`;
    document.body.classList.add("printing-inventory");
    window.addEventListener("afterprint", () => {
      document.body.classList.remove("printing-inventory");
      printRoot.innerHTML = "";
    }, { once: true });
    window.requestAnimationFrame(() => window.print());
  }

  function downloadProductionSheet(sheetId) {
    const sheet = state.productionSheets.find((item) => item.id === sheetId);
    if (!sheet) return;
    const slots = productionSheetSlots(sheet);
    const rows = [[
      "sheet_number", "status", "started_on", "completed_at", "flavor", "category",
      "archived_can_count", "archived_half_gallon_count",
      ...slots.flatMap((slot) => [`can_date_${slot.slot_number}`, `cans_made_${slot.slot_number}`]),
      ...slots.flatMap((slot) => [`half_gallon_date_${slot.slot_number}`, `half_gallons_made_${slot.slot_number}`]),
    ]];
    productionSheetFlavors(sheet).forEach((flavor) => {
      rows.push([
        sheet.sheet_number, sheet.status, sheet.started_on || "", sheet.completed_at || "", flavor.name,
        inventoryCategoryLabels[flavor.category] || flavor.category,
        Number.isInteger(flavor.canCount) ? flavor.canCount : "",
        Number.isInteger(flavor.halfGallonCount) ? flavor.halfGallonCount : "",
        ...slots.flatMap((slot) => [slot.can_date || "", Number(productionSheetCell(slot, flavor.id)?.can_quantity) || ""]),
        ...slots.flatMap((slot) => [slot.half_gallon_date || "", Number(productionSheetCell(slot, flavor.id)?.half_gallon_quantity) || ""]),
      ]);
    });
    const blob = new Blob([rows.map((row) => row.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `swensens-master-sheet-${String(sheet.sheet_number).padStart(3, "0")}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
    showToast("Master-sheet data downloaded.");
  }

  function openApp(profile) {
    state.profile = profile;
    state.role = profile.account_role || "employee";
    state.profileSkills = Array.isArray(profile.skills) ? profile.skills : state.profileSkills;
    state.canAccessInventory = state.role === "manager" || state.profileSkills.includes("ic_maker");
    elements.loginView.hidden = true;
    elements.appView.hidden = false;
    elements.appView.classList.toggle("employee-mode", state.role !== "manager");
    elements.appView.classList.toggle("inventory-staff-mode", state.role !== "manager" && state.canAccessInventory);
    document.querySelectorAll(".nav-item[data-nav]").forEach((button) => {
      const page = button.dataset.nav;
      button.hidden = state.role === "manager"
        ? false
        : button.classList.contains("manager-only-nav") || (page === "inventory" && !state.canAccessInventory);
    });
    document.querySelector("#displayName").textContent = profile.display_name || "Manager";
    document.querySelector("#roleBadge").textContent = state.role === "manager" ? "Manager" : state.canAccessInventory ? "IC Maker" : "Employee";
    elements.logoutButton.textContent = (profile.display_name || "Manager").slice(0, 2).toUpperCase();
    elements.databaseHealthPanel.hidden = state.mode !== "supabase" || !isGabrielAccount(profile);
    if (!elements.databaseHealthPanel.hidden) {
      let lastCheck = "";
      try { lastCheck = window.localStorage.getItem("swensens-last-system-check") || ""; } catch (_) {}
      elements.databaseHealthMessage.textContent = systemCheckTimestampLabel(lastCheck);
    }
    renderAll();
    navigate(state.role === "manager" ? "home" : "schedule");
  }

  async function closeApp() {
    stopRequestSync();
    if (state.mode === "supabase" && supabaseClient) await supabaseClient.auth.signOut();
    state.mode = "signed-out";
    state.profile = null;
    state.options = [];
    state.savedScheduleIds = {};
    state.publishedOption = null;
    state.publishedSchedule = null;
    state.employeeAssignments = [];
    state.editingEmployeeId = null;
    state.editingSkillsEmployeeId = null;
    state.hiddenTeam = [];
    state.showingEmployeeAccountForm = false;
    state.teamView = "active";
    state.scheduleModuleView = "availability";
    state.availabilityMobileEmployeeId = "";
    state.requestsExpanded = false;
    state.accountActionBusy = false;
    state.availabilitySheetBusy = false;
    state.profileSkills = [];
    state.canAccessInventory = false;
    state.inventoryFlavors = [];
    state.inventoryCatalog = [];
    state.inventoryHistory = [];
    state.productionSheets = [];
    state.productionSheetViewId = "";
    state.inventoryLoading = false;
    state.inventoryBusy = false;
    state.inventoryError = "";
    state.inventoryEntryMode = "production";
    state.inventoryMasterView = "can";
    state.inventoryCameraMode = "usage";
    state.inventoryScanImage = "";
    state.inventoryScanFileName = "";
    state.inventoryScanEntries = [];
    state.inventoryScanBusy = false;
    state.inventoryScanError = "";
    state.inventoryScanNotes = "";
    state.inventoryScanDate = "";
    state.inventoryScanUserNote = "";
    state.productionScanImage = "";
    state.productionScanFileName = "";
    state.productionScanRows = [];
    state.productionScanCanDates = ["", "", "", "", ""];
    state.productionScanHalfDates = ["", "", "", "", ""];
    state.productionScanBusy = false;
    state.productionScanError = "";
    state.productionScanNotes = "";
    state.productionScanUserNote = "";
    state.systemCheckBusy = false;
    elements.databaseHealthPanel.hidden = true;
    elements.appView.classList.remove("employee-mode");
    elements.appView.classList.remove("inventory-staff-mode");
    elements.appView.hidden = true;
    elements.loginView.hidden = false;
    elements.loginForm.reset();
    document.querySelector("#rememberMe").checked = true;
    elements.loginMessage.textContent = "";
  }

  function navigate(pageName) {
    if (pageName === "team") pageName = "home";
    if (state.role === "manager" && pageName === "requests") {
      state.scheduleModuleView = "availability";
      state.requestsExpanded = true;
      pageName = "schedule";
      renderRequests();
      renderScheduleModule();
    }
    if (state.role !== "manager" && pageName !== "schedule" && !(state.canAccessInventory && pageName === "inventory")) pageName = "schedule";
    document.querySelectorAll(".page").forEach((page) => page.classList.remove("active-page"));
    document.querySelector(`#page-${pageName}`)?.classList.add("active-page");
    document.querySelectorAll("[data-nav]").forEach((button) => {
      button.classList.toggle("active", button.dataset.nav === pageName);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openTeamOnHome() {
    navigate("home");
    const drawer = document.querySelector("#homeTeamDrawer");
    if (drawer) drawer.open = true;
    window.setTimeout(() => document.querySelector("#homeTeamModule")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function renderAll() {
    if (state.role !== "manager") {
      renderRequests();
      renderScheduleModule();
      if (state.canAccessInventory) renderInventory();
      return;
    }
    renderDashboard();
    renderSettings();
    renderTeam();
    renderRequests();
    renderAvailabilityMatrix();
    renderScheduleModule();
    renderScheduleResults();
    renderInventory();
  }

  function renderDashboard() {
    const submitted = state.team.filter((employee) => employee.submitted).length;
    document.querySelector("#requestMetric").textContent = `${submitted} of ${state.team.length}`;
    document.querySelector("#icMetric").textContent = `${state.settings.icTarget} days`;
    const trainee = state.team.find((employee) => employee.id === state.settings.traineeId);
    document.querySelector("#trainingMetric").textContent = state.settings.trainingEnabled && trainee ? trainee.name : "None";
  }

  async function refreshWeeklyRequests() {
    if (state.mode !== "supabase" || state.role !== "manager") return;
    const { data: requestRows, error } = await supabaseClient.from("weekly_requests")
      .select("*, availability_slots(*)").eq("week_start", state.settings.weekStart);
    if (error) return;
    (requestRows || []).forEach((request) => {
      const employee = state.team.find((item) => item.id === request.employee_id);
      if (!employee) return;
      employee.minDays = request.min_shifts;
      employee.maxDays = request.max_shifts;
      employee.notes = request.notes;
      employee.submitted = true;
      employee.willingDouble = [];
      (request.availability_slots || []).forEach((slot) => {
        const day = demoData.days.find((item) => item.number === slot.work_day);
        if (!day) return;
        employee.availability[day.name][slot.shift] = slot.preference;
        if (slot.willing_double && !employee.willingDouble.includes(day.name)) employee.willingDouble.push(day.name);
      });
    });
    renderDashboard();
    renderAvailabilityMatrix();
    if (!state.editingEmployeeId) renderRequests();
    renderScheduleModule();
  }

  function queueRequestRefresh() {
    window.clearTimeout(state.requestRefreshDebounce);
    state.requestRefreshDebounce = window.setTimeout(refreshWeeklyRequests, 550);
  }

  function startRequestSync() {
    stopRequestSync();
    if (state.mode !== "supabase" || state.role !== "manager") return;
    state.requestSyncChannel = supabaseClient.channel("swensens-weekly-request-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "weekly_requests" }, queueRequestRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "availability_slots" }, queueRequestRefresh)
      .subscribe();
    state.requestRefreshTimer = window.setInterval(refreshWeeklyRequests, 30000);
  }

  function stopRequestSync() {
    window.clearInterval(state.requestRefreshTimer);
    window.clearTimeout(state.requestRefreshDebounce);
    state.requestRefreshTimer = null;
    state.requestRefreshDebounce = null;
    if (state.requestSyncChannel && supabaseClient) supabaseClient.removeChannel(state.requestSyncChannel);
    state.requestSyncChannel = null;
  }

  function inventoryDateValue() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
  }

  function inventoryDateLabel(value) {
    if (!value) return "Today";
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })
      .format(new Date(`${value}T12:00:00`));
  }

  function inventoryGroupedMarkup(flavors, rowRenderer) {
    return Object.entries(inventoryCategoryLabels).map(([category, label]) => {
      const rows = flavors.filter((flavor) => flavor.category === category);
      if (!rows.length) return "";
      return `<section class="inventory-group" data-inventory-group>
        <header><h4>${label}</h4><span>${rows.length} flavors</span></header>
        <div class="inventory-group-rows">${rows.map(rowRenderer).join("")}</div>
      </section>`;
    }).join("");
  }

  function inventoryKindLabel(kind, plural = true) {
    if (kind === "half_gallon") return plural ? "½ gallons" : "½ gallon";
    return plural ? "full cans" : "full can";
  }

  function inventoryTimestampLabel(value) {
    if (!value) return "No changes yet";
    return new Intl.DateTimeFormat("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
      timeZone: "America/Los_Angeles",
    }).format(new Date(value));
  }

  function inventoryShortDate(value) {
    if (!value) return "Date";
    return new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric" })
      .format(new Date(`${value}T12:00:00`));
  }

  function activeProductionSheet() {
    return state.productionSheets.find((sheet) => sheet.status === "active") || state.productionSheets[0] || null;
  }

  function viewedProductionSheet() {
    return state.productionSheets.find((sheet) => sheet.id === state.productionSheetViewId) || activeProductionSheet();
  }

  function productionSheetSlots(sheet = viewedProductionSheet()) {
    const byNumber = new Map((sheet?.slots || []).map((slot) => [Number(slot.slot_number), slot]));
    return Array.from({ length: 5 }, (_, index) => byNumber.get(index + 1) || {
      slot_number: index + 1,
      can_date: null,
      half_gallon_date: null,
      cells: [],
    });
  }

  function productionSheetCell(slot, flavorId) {
    return (slot?.cells || []).find((cell) => cell.flavor_id === flavorId) || null;
  }

  function productionSheetDaysUsed(sheet = activeProductionSheet()) {
    return productionSheetSlots(sheet).filter((slot) => slot.can_date || slot.half_gallon_date || (slot.cells || []).some((cell) => cell.can_quantity > 0 || cell.half_gallon_quantity > 0)).length;
  }

  function productionSheetFlavors(sheet = viewedProductionSheet()) {
    if (sheet?.status === "complete" && Array.isArray(sheet.inventory_snapshot) && sheet.inventory_snapshot.length) {
      return sheet.inventory_snapshot.map((flavor) => ({
        id: flavor.flavor_id,
        name: flavor.name,
        category: flavor.category,
        sort_order: Number(flavor.sort_order) || 0,
        tracksHalfGallons: Boolean(flavor.tracks_half_gallons),
        canCount: Number.isInteger(flavor.can_count) ? flavor.can_count : null,
        halfGallonCount: Number.isInteger(flavor.half_gallon_count) ? flavor.half_gallon_count : null,
      })).sort((a, b) => a.sort_order - b.sort_order);
    }
    return state.inventoryFlavors;
  }

  function productionSheetTotals(sheet) {
    return productionSheetSlots(sheet).reduce((totals, slot) => {
      (slot.cells || []).forEach((cell) => {
        totals.cans += Number(cell.can_quantity) || 0;
        totals.halfGallons += Number(cell.half_gallon_quantity) || 0;
      });
      return totals;
    }, { cans: 0, halfGallons: 0 });
  }

  function productionSheetDateRange(sheet) {
    const dates = productionSheetSlots(sheet)
      .flatMap((slot) => [slot.can_date, slot.half_gallon_date])
      .filter(Boolean)
      .sort();
    if (!dates.length) return "No production dates";
    if (dates[0] === dates.at(-1)) return inventoryDateLabel(dates[0]);
    return `${inventoryDateLabel(dates[0])} – ${inventoryDateLabel(dates.at(-1))}`;
  }

  function inventoryPaperRows(flavors, columnCount, rowRenderer) {
    return Object.entries(inventoryCategoryLabels).map(([category, label]) => {
      const rows = flavors.filter((flavor) => flavor.category === category);
      if (!rows.length) return "";
      return `<tr class="inventory-paper-category"><th colspan="${columnCount}" scope="colgroup">${label}</th></tr>${rows.map(rowRenderer).join("")}`;
    }).join("");
  }

  function renderInventoryMaster() {
    const kind = state.inventoryMasterView;
    const isHalfGallons = kind === "half_gallon";
    const halfFlavors = state.inventoryFlavors.filter((flavor) => flavor.tracksHalfGallons);
    const sheet = viewedProductionSheet();
    const activeSheet = activeProductionSheet();
    const slots = productionSheetSlots(sheet);
    const sheetFlavors = productionSheetFlavors(sheet);
    const productionCell = (slot, flavor, kind) => {
      const cell = productionSheetCell(slot, flavor.id);
      const value = kind === "can" ? cell?.can_quantity : cell?.half_gallon_quantity;
      return `<td>${Number(value) > 0 ? value : ""}</td>`;
    };
    const sheetChoices = state.productionSheets.map((item) => `<option value="${item.id}" ${item.id === sheet?.id ? "selected" : ""}>Sheet #${item.sheet_number}${item.status === "active" ? " · Current" : " · Complete"}</option>`).join("");
    const daysUsed = productionSheetDaysUsed(sheet);
    const productionSheet = `<div class="inventory-paper-scroll" aria-label="Production master sheet. Scroll sideways to see all date columns.">
      <table class="inventory-paper-table production-master-sheet">
        <caption>Full-can master count with five can-production dates and five half-gallon production dates</caption>
        <thead><tr>
          <th scope="col">Flavors</th><th scope="col">Cans</th>
          ${slots.map((slot) => `<th scope="col">${inventoryShortDate(slot.can_date)}</th>`).join("")}
          <th scope="col" class="half-gallon-divider">½ Gallons</th>
          ${slots.map((slot) => `<th scope="col">${inventoryShortDate(slot.half_gallon_date)}</th>`).join("")}
        </tr></thead>
        <tbody>${inventoryPaperRows(sheetFlavors, 13, (flavor) => `<tr>
          <th scope="row">${escapeHtml(flavor.name)}</th>
          <td class="inventory-current-count">${Number.isInteger(flavor.canCount) ? flavor.canCount : `<span>Count needed</span>`}</td>
          ${slots.map((slot) => productionCell(slot, flavor, "can")).join("")}
          <td class="half-gallon-divider"></td>
          ${slots.map((slot) => productionCell(slot, flavor, "half_gallon")).join("")}
        </tr>`)}</tbody>
      </table>
    </div>`;
    const halfGallonSheet = `<div class="inventory-paper-scroll half-gallon-paper-scroll">
      <table class="inventory-paper-table half-gallon-master-sheet">
        <caption>Current half-gallon inventory by flavor</caption>
        <thead><tr><th scope="col">Flavors</th><th scope="col">½ Gallons</th></tr></thead>
        <tbody>${inventoryPaperRows(halfFlavors, 2, (flavor) => `<tr><th scope="row">${escapeHtml(flavor.name)}</th><td class="inventory-current-count">${Number.isInteger(flavor.halfGallonCount) ? flavor.halfGallonCount : `<span>Count needed</span>`}</td></tr>`)}</tbody>
      </table>
    </div>`;
    const sheetStatusCopy = sheet?.status === "complete" ? "Archived master list" : "Live master list";
    return `<section class="inventory-master-panel panel">
      <div class="panel-heading inventory-master-heading"><div><p class="eyebrow">${isHalfGallons ? "Live master list" : sheetStatusCopy}</p><h3>${isHalfGallons ? "½-gallon count sheet" : `Production master sheet${sheet ? ` #${sheet.sheet_number}` : ""}`}</h3><p>${isHalfGallons ? "The separate two-column list for the current ½-gallon counts." : sheet?.status === "complete" ? "This completed sheet is locked in the archive with the inventory counts captured when it was finished." : "The same column order as the paper sheet: cans, five can dates, the blank ½-gallon divider, then five ½-gallon dates."}</p></div>
        <div class="inventory-master-tabs" role="tablist" aria-label="Master inventory list">
          <button type="button" data-inventory-master-view="can" class="${kind === "can" ? "active" : ""}">Production sheet</button>
          <button type="button" data-inventory-master-view="half_gallon" class="${isHalfGallons ? "active" : ""}">½-gallon counts</button>
        </div>
      </div>
      ${!isHalfGallons && sheetChoices ? `<div class="production-sheet-toolbar"><label>Digital sheet<select data-production-sheet-view>${sheetChoices}</select></label><span>${sheet?.status === "complete" ? `Archived · ${productionSheetDateRange(sheet)}` : `${daysUsed} / 5 production days`}</span><div class="production-sheet-actions"><button type="button" class="secondary-button compact" data-print-production-sheet="${sheet.id}">Print / Save PDF</button>${sheet?.status === "complete" ? `<button type="button" class="secondary-button compact" data-download-production-sheet="${sheet.id}">Download data</button>` : ""}${sheet?.id === activeSheet?.id && daysUsed === 5 ? `<button type="button" class="primary-button compact" data-archive-production-sheet>Complete & archive</button>` : ""}</div></div>` : ""}
      ${isHalfGallons ? halfGallonSheet : productionSheet}
      <p class="inventory-paper-note">${isHalfGallons ? "This count changes whenever ½ gallons are made, used, or physically corrected." : sheet?.status === "complete" ? "Archived sheets stay read-only. Print them again or download their structured data at any time." : "Production entries automatically fill these date columns. On a phone, swipe the sheet sideways to see every column."}</p>
    </section>`;
  }

  function renderProductionArchiveLibrary() {
    const completed = state.productionSheets.filter((sheet) => sheet.status === "complete");
    return `<section class="panel production-archive-panel">
      <div class="panel-heading"><div><p class="eyebrow">Permanent records</p><h3>Past master sheet library</h3><p>Every completed five-day sheet stays here with its frozen counts and production details.</p></div><span class="count-badge">${completed.length}</span></div>
      ${completed.length ? `<div class="production-archive-list">${completed.map((sheet) => {
        const totals = productionSheetTotals(sheet);
        return `<article class="production-archive-card"><div><span class="inventory-history-type archive">Archived</span><strong>Master sheet #${sheet.sheet_number}</strong><p>${productionSheetDateRange(sheet)}</p><small>${totals.cans} cans made · ${totals.halfGallons} half gallons made${sheet.completed_by_name ? ` · Completed by ${escapeHtml(sheet.completed_by_name)}` : ""}</small></div><div class="production-archive-actions"><button type="button" class="secondary-button compact" data-view-production-sheet="${sheet.id}">View sheet</button><button type="button" class="secondary-button compact" data-print-production-sheet="${sheet.id}">Print / Save PDF</button><button type="button" class="secondary-button compact" data-download-production-sheet="${sheet.id}">Download data</button></div></article>`;
      }).join("")}</div>` : `<div class="inventory-empty">The first finished five-day sheet will appear here.</div>`}
    </section>`;
  }

  function openingCountInput(flavor, kind) {
    const isHalf = kind === "half_gallon";
    if (isHalf && !flavor.tracksHalfGallons) return `<span class="inventory-not-tracked" aria-label="Not tracked">—</span>`;
    const count = isHalf ? flavor.halfGallonCount : flavor.canCount;
    const currentCount = Number.isInteger(count) ? count : "";
    return `<input type="number" min="0" max="999" inputmode="numeric" data-opening-count="${flavor.id}" data-opening-kind="${kind}" data-current-count="${currentCount}" value="${currentCount}" placeholder="—" aria-label="Exact ${inventoryKindLabel(kind)} count for ${escapeHtml(flavor.name)}">`;
  }

  function manualSheetDateInput(slot, kind, slotIndex) {
    const value = kind === "can" ? slot?.can_date : slot?.half_gallon_date;
    const year = value?.slice(0, 4) || activeProductionSheet()?.started_on?.slice(0, 4) || inventoryDateValue().slice(0, 4);
    return `<input type="date" data-manual-sheet-date="${kind}" data-manual-date-format="iso" data-date-year="${year}" data-slot-number="${slotIndex + 1}" value="${value || ""}" aria-label="${kind === "can" ? "Can" : "Half-gallon"} production date ${slotIndex + 1}">`;
  }

  function manualDateIso(value, yearHint) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const match = text.match(/^(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2}|\d{4}))?$/);
    if (!match) return null;
    const month = Number(match[1]);
    const day = Number(match[2]);
    let year = match[3] ? Number(match[3]) : Number(yearHint);
    if (year < 100) year += 2000;
    if (!year) year = Number(inventoryDateValue().slice(0, 4));
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function manualDateShort(value) {
    const iso = manualDateIso(value);
    if (!iso) return value || "";
    const [, month, day] = iso.split("-");
    return `${Number(month)}/${Number(day)}`;
  }

  function manualSheetDesktopDateInput(slot, kind, slotIndex) {
    const value = kind === "can" ? slot?.can_date : slot?.half_gallon_date;
    const year = value?.slice(0, 4) || activeProductionSheet()?.started_on?.slice(0, 4) || inventoryDateValue().slice(0, 4);
    return `<input class="manual-desktop-date" type="text" inputmode="numeric" pattern="[0-9]{1,2}/[0-9]{1,2}(/[0-9]{2,4})?" placeholder="M/D" data-manual-sheet-date="${kind}" data-manual-date-format="short" data-date-year="${year}" data-slot-number="${slotIndex + 1}" value="${value ? manualDateShort(value) : ""}" aria-label="${kind === "can" ? "Can" : "Half-gallon"} production date ${slotIndex + 1}. Enter month slash day.">`;
  }

  function manualSheetCellInput(slot, flavor, kind, slotIndex) {
    if (kind === "half_gallon" && !flavor.tracksHalfGallons) {
      return `<span class="inventory-not-tracked" aria-label="Not tracked">—</span>`;
    }
    const cell = productionSheetCell(slot, flavor.id);
    const quantity = kind === "can" ? cell?.can_quantity : cell?.half_gallon_quantity;
    const value = Number(quantity) > 0 ? Number(quantity) : "";
    return `<input type="number" min="0" max="999" inputmode="numeric" data-manual-sheet-cell="${flavor.id}" data-manual-sheet-kind="${kind}" data-slot-number="${slotIndex + 1}" value="${value}" placeholder="" aria-label="${kind === "can" ? "Cans" : "Half gallons"} of ${escapeHtml(flavor.name)} made in column ${slotIndex + 1}">`;
  }

  function manualMobileDayLabel(slot, slotIndex) {
    const date = slot.can_date || slot.half_gallon_date;
    return date ? inventoryShortDate(date) : `Day ${slotIndex + 1}`;
  }

  function renderManualMobileDay(slot, slotIndex) {
    const groups = Object.entries(inventoryCategoryLabels).map(([category, label]) => {
      const flavors = state.inventoryFlavors.filter((flavor) => flavor.category === category);
      if (!flavors.length) return "";
      return `<section class="manual-mobile-group">
        <header><strong>${label}</strong><span>${flavors.length}</span></header>
        <div>${flavors.map((flavor) => `<article class="manual-mobile-flavor-row">
          <div class="manual-mobile-flavor-name"><strong>${escapeHtml(flavor.name)}</strong><small>Current cans: ${Number.isInteger(flavor.canCount) ? flavor.canCount : "not set"}</small></div>
          <label><span>Cans made</span>${manualSheetCellInput(slot, flavor, "can", slotIndex)}</label>
          <label><span>½ gal made</span>${manualSheetCellInput(slot, flavor, "half_gallon", slotIndex)}</label>
        </article>`).join("")}</div>
      </section>`;
    }).join("");
    return `<section class="manual-mobile-day-panel" data-manual-mobile-day-panel="${slotIndex}" ${slotIndex ? "hidden" : ""}>
      <div class="manual-mobile-date-card">
        <div><span>Production day</span><strong>Day ${slotIndex + 1} of 5</strong></div>
        <label><span>Can date</span>${manualSheetDateInput(slot, "can", slotIndex)}</label>
        <label><span>½-gallon date</span>${manualSheetDateInput(slot, "half_gallon", slotIndex)}</label>
      </div>
      <div class="manual-mobile-groups">${groups}</div>
    </section>`;
  }

  function renderManualMobileCanCounts() {
    return `<details class="manual-half-counts manual-mobile-counts">
      <summary>Correct ending can totals</summary>
      <p>Only open this if the calculated can total does not match the physical master list.</p>
      <div class="manual-mobile-count-list">${inventoryGroupedMarkup(state.inventoryFlavors, (flavor) => `<label class="manual-mobile-count-row"><span>${escapeHtml(flavor.name)}</span>${openingCountInput(flavor, "can")}</label>`)}</div>
    </details>`;
  }

  function renderOpeningCountForm(missingUnitCount) {
    const sheet = activeProductionSheet();
    const slots = productionSheetSlots(sheet);
    const complete = missingUnitCount === 0;
    const summary = complete
      ? "Edit the same five-day grid as the paper sheet, including dates, production, and exact physical totals."
      : `${missingUnitCount} starting count${missingUnitCount === 1 ? " is" : "s are"} still needed. Dates and production columns can also be rebuilt here.`;
    return `<details class="panel inventory-collapsible inventory-opening-panel">
      <summary><span><strong>Full master-sheet editor</strong><small>${summary}</small></span><span class="collapsible-summary-status"><b>Sheet #${sheet?.sheet_number || 1}</b><i class="collapsible-arrow" aria-hidden="true">⌄</i></span></summary>
      <div class="inventory-collapsible-body">
        <div class="manual-entry-notice"><strong>Matches the paper master list</strong><p>IC makers edit the dates, production amounts, or ending counts and then confirm once. The digital master list updates immediately and the app creates the audit record automatically.</p></div>
        <form id="manualMasterSheetForm" class="inventory-count-form">
          <div class="manual-mobile-editor">
            <div class="manual-mobile-toolbar">
              <div class="manual-mobile-day-picker" aria-label="Choose production day">
                <button type="button" class="manual-day-arrow" data-manual-mobile-step="-1" disabled aria-label="Previous production day">‹</button>
                <div>${slots.map((slot, index) => `<button type="button" data-manual-mobile-day="${index}" class="${index === 0 ? "active" : ""}" ${index === 0 ? 'aria-current="step"' : ""}><span>${index + 1}</span><small>${manualMobileDayLabel(slot, index)}</small></button>`).join("")}</div>
                <button type="button" class="manual-day-arrow" data-manual-mobile-step="1" aria-label="Next production day">›</button>
              </div>
              <div class="manual-mobile-savebar">
                <button class="secondary-button compact" type="submit" name="sheetAction" value="save" ${state.inventoryBusy ? "disabled" : ""}>Confirm changes</button>
                <button class="primary-button compact" type="submit" name="sheetAction" value="archive" ${state.inventoryBusy ? "disabled" : ""}>Confirm & archive</button>
              </div>
            </div>
            ${slots.map(renderManualMobileDay).join("")}
            ${renderManualMobileCanCounts()}
          </div>
          <div class="manual-desktop-editor">
            <div class="inventory-paper-scroll manual-master-sheet-scroll">
              <table class="inventory-paper-table production-master-sheet manual-master-sheet-table reusable-count-table">
                <caption>Editable five-day production master sheet with exact ending can counts</caption>
                <colgroup>
                  <col class="master-flavor-column">
                  <col class="master-can-column">
                  ${slots.map(() => '<col class="master-production-column">').join("")}
                  <col class="master-half-divider-column">
                  ${slots.map(() => '<col class="master-production-column">').join("")}
                </colgroup>
                <thead>
                  <tr><th scope="col">Flavors</th><th scope="col">Cans</th><th colspan="5" scope="colgroup">Can production dates</th><th scope="col" class="half-gallon-divider">½ Gallons</th><th colspan="5" scope="colgroup">½-gallon production dates</th></tr>
                  <tr class="manual-date-row"><th></th><th></th>${slots.map((slot, index) => `<th>${manualSheetDesktopDateInput(slot, "can", index)}</th>`).join("")}<th class="half-gallon-divider"></th>${slots.map((slot, index) => `<th>${manualSheetDesktopDateInput(slot, "half_gallon", index)}</th>`).join("")}</tr>
                </thead>
                <tbody>${inventoryPaperRows(state.inventoryFlavors, 13, (flavor) => `<tr>
                  <th scope="row">${escapeHtml(flavor.name)}</th>
                  <td class="manual-ending-count">${openingCountInput(flavor, "can")}</td>
                  ${slots.map((slot, index) => `<td>${manualSheetCellInput(slot, flavor, "can", index)}</td>`).join("")}
                  <td class="half-gallon-divider"></td>
                  ${slots.map((slot, index) => `<td>${manualSheetCellInput(slot, flavor, "half_gallon", index)}</td>`).join("")}
                </tr>`)}</tbody>
              </table>
            </div>
          </div>
          <details class="manual-half-counts">
            <summary>Correct current ½-gallon totals</summary>
            <p>The paper production grid above records what was made. This smaller table matches the separate physical ½-gallon count list.</p>
            <div class="inventory-paper-scroll opening-count-scroll">
              <table class="inventory-paper-table opening-count-table reusable-count-table">
                <caption>Corrected physical half-gallon counts</caption>
                <thead><tr><th scope="col">Flavors</th><th scope="col">Current ½ Gallons</th></tr></thead>
                <tbody>${inventoryPaperRows(state.inventoryFlavors.filter((flavor) => flavor.tracksHalfGallons), 2, (flavor) => `<tr><th scope="row">${escapeHtml(flavor.name)}</th><td>${openingCountInput(flavor, "half_gallon")}</td></tr>`)}</tbody>
              </table>
            </div>
          </details>
          <div class="inventory-form-footer manual-sheet-footer"><p>Use 0 for an empty flavor. Confirming keeps the sheet active and records the update in the audit. Confirming and archiving freezes all five days, adds it to Past Master Sheets, and opens a new blank sheet.</p><div><button class="secondary-button compact" type="submit" name="sheetAction" value="save" ${state.inventoryBusy ? "disabled" : ""}>Confirm changes</button><button class="primary-button compact" type="submit" name="sheetAction" value="archive" ${state.inventoryBusy ? "disabled" : ""}>Confirm & archive 5-day sheet</button></div></div>
        </form>
      </div>
    </details>`;
  }

  function inventoryQuantityInput(flavor, kind, adjustment) {
    const isHalf = kind === "half_gallon";
    if (isHalf && !flavor.tracksHalfGallons) return `<span class="inventory-not-tracked" aria-label="Not tracked">—</span>`;
    const count = isHalf ? flavor.halfGallonCount : flavor.canCount;
    const value = adjustment ? count : "";
    const action = adjustment ? "Physical count" : state.inventoryEntryMode === "production" ? "Made" : "Used";
    return `<input type="number" min="0" max="999" inputmode="numeric" data-inventory-quantity="${flavor.id}" data-inventory-kind="${kind}" data-current-count="${count}" value="${value}" placeholder="0" aria-label="${action} ${inventoryKindLabel(kind)} for ${escapeHtml(flavor.name)}">`;
  }

  function inventoryEntryRow(flavor) {
    const mode = state.inventoryEntryMode;
    const adjustment = mode === "count_adjustment";
    const dual = mode === "production" || adjustment;
    const kind = mode === "usage_half_gallon" ? "half_gallon" : "can";
    const currentCopy = dual
      ? `Cans: ${flavor.canCount}${flavor.tracksHalfGallons ? ` · ½ gal: ${flavor.halfGallonCount}` : ""}`
      : `Current: ${kind === "can" ? flavor.canCount : flavor.halfGallonCount}`;
    return `<label class="inventory-quantity-row ${dual ? "dual" : "single"}" data-inventory-flavor-row data-flavor-name="${escapeHtml(flavor.name.toLowerCase())}">
      <span>${escapeHtml(flavor.name)}<small>${currentCopy}</small></span>
      ${dual ? `${inventoryQuantityInput(flavor, "can", adjustment)}${inventoryQuantityInput(flavor, "half_gallon", adjustment)}` : inventoryQuantityInput(flavor, kind, false)}
    </label>`;
  }

  function renderInventoryEntryForm() {
    const mode = state.inventoryEntryMode;
    const title = mode === "production" ? "Add today's production" : mode === "usage_can" ? "Record full cans used" : "Record ½ gallons used";
    const copy = mode === "production"
      ? "Enter the full cans and ½-gallon tubs made for each flavor. Both master lists update together."
      : mode === "usage_can"
        ? "Enter each flavor from the paper strip. Repeated names become a larger quantity; circled or crossed-out names are already accounted for and stay out."
        : "Manually enter the ½-gallon tubs used from the morning post-it note.";
    const submitLabel = mode === "production" ? "Add production" : mode === "usage_can" ? "Subtract used cans" : "Subtract used ½ gallons";
    const flavors = mode === "usage_half_gallon" ? state.inventoryFlavors.filter((flavor) => flavor.tracksHalfGallons) : state.inventoryFlavors;
    const dual = mode === "production";
    return `<section class="panel inventory-entry-panel">
      <div class="inventory-mode-tabs" role="tablist" aria-label="Inventory entry type">
        <button type="button" data-inventory-mode="production" class="${mode === "production" ? "active" : ""}">+ Production</button>
        <button type="button" data-inventory-mode="usage_can" class="${mode === "usage_can" ? "active" : ""}">− Used cans</button>
        <button type="button" data-inventory-mode="usage_half_gallon" class="${mode === "usage_half_gallon" ? "active" : ""}">− Used ½ gal</button>
      </div>
      <form id="inventoryEntryForm" data-entry-mode="${mode}" class="inventory-count-form">
        <div class="panel-heading"><div><p class="eyebrow">New ledger entry</p><h3>${title}</h3><p>${copy}</p></div></div>
        <div class="inventory-form-meta">
          <label class="field-label">Date<input name="occurredOn" type="date" value="${inventoryDateValue()}" required></label>
          <label class="field-label">Notes (optional)<input name="note" maxlength="500" placeholder="What was made or which note was entered"></label>
        </div>
        <label class="field-label inventory-search">Find a flavor<input id="inventoryFlavorSearch" type="search" placeholder="Start typing Vanilla, Rocky Road…" autocomplete="off"></label>
        ${dual ? `<div class="inventory-column-headings"><span>Flavor</span><strong>Full cans</strong><strong>½ gallons</strong></div>` : ""}
        <div class="inventory-entry-groups">${inventoryGroupedMarkup(flavors, inventoryEntryRow)}</div>
        <div class="inventory-form-footer"><p>${mode.startsWith("usage_") ? "The app blocks any entry that would make a count negative." : "Every change is saved with your name, date, unit, and before/after totals."}</p><button class="primary-button compact" type="submit" ${state.inventoryBusy ? "disabled" : ""}>${submitLabel}</button></div>
      </form>
    </section>`;
  }

  function inventoryScanSummary() {
    const flavorsById = new Map(state.inventoryFlavors.map((flavor) => [flavor.id, flavor]));
    const grouped = new Map();
    let unresolved = 0;
    let selectedLines = 0;
    state.inventoryScanEntries.forEach((entry) => {
      if (!entry.include) return;
      selectedLines += 1;
      const flavor = flavorsById.get(entry.flavorId);
      if (!flavor) {
        unresolved += 1;
        return;
      }
      const group = grouped.get(flavor.id) || { flavor, quantity: 0 };
      group.quantity += 1;
      grouped.set(flavor.id, group);
    });
    const groups = [...grouped.values()].map((group) => ({
      ...group,
      after: Number.isInteger(group.flavor.canCount) ? group.flavor.canCount - group.quantity : null,
    }));
    return {
      groups,
      unresolved,
      selectedLines,
      invalid: unresolved > 0 || !groups.length || groups.some((group) => group.after === null || group.after < 0),
    };
  }

  function inventoryScanFlavorOptions(selectedFlavorId) {
    return `<option value="">Choose the matching flavor</option>${state.inventoryFlavors.map((flavor) => `<option value="${flavor.id}" ${flavor.id === selectedFlavorId ? "selected" : ""}>${escapeHtml(flavor.name)}</option>`).join("")}`;
  }

  function inventoryScanEntryRow(entry) {
    const confidence = Math.round(Math.max(0, Math.min(1, Number(entry.confidence) || 0)) * 100);
    const confidenceClass = confidence >= 85 ? "good" : confidence >= 60 ? "review" : "low";
    const markStatus = entry.circled && entry.crossedOut
      ? "AI detected both a circle and a cross-out"
      : entry.circled
        ? "AI detected a circle around this entry"
        : entry.crossedOut
          ? "AI detected this entry was crossed out"
          : "No circle or cross-out detected";
    return `<article class="inventory-scan-line ${entry.include ? "" : "ignored"}">
      <label class="inventory-scan-include"><input type="checkbox" data-scan-include="${entry.id}" ${entry.include ? "checked" : ""}><span>${entry.include ? "Subtract" : "Ignore"}</span></label>
      <div class="inventory-scan-line-copy"><strong>${escapeHtml(entry.rawText || "Unreadable line")}</strong><small>${markStatus}</small></div>
      <label class="inventory-scan-match"><span>Matched flavor</span><select data-scan-flavor="${entry.id}">${inventoryScanFlavorOptions(entry.flavorId)}</select></label>
      <span class="inventory-scan-confidence ${confidenceClass}">${confidence}%</span>
    </article>`;
  }

  function inventoryScanPaperList() {
    const flavorById = new Map(state.inventoryFlavors.map((flavor) => [flavor.id, flavor]));
    const lines = state.inventoryScanEntries.map((entry, index) => {
      const flavor = flavorById.get(entry.flavorId);
      const displayedName = flavor?.name || entry.rawText || "Unreadable";
      const markClasses = [entry.circled ? "circled" : "", entry.crossedOut ? "crossed-out" : ""].filter(Boolean).join(" ");
      return `<li class="${entry.include ? "" : "ignored"}">
        <span class="inventory-paper-line-number">${index + 1}</span>
        <span class="inventory-paper-flavor ${markClasses}">${escapeHtml(displayedName)}</span>
        ${entry.include ? "" : `<small>Ignored</small>`}
      </li>`;
    }).join("");
    return `<section class="inventory-generated-strip" aria-label="Recreated handwritten flavor list in detected order">
      <div class="inventory-generated-strip-heading"><div><span>Generated preview</span><strong>Paper list · exact top-to-bottom order</strong></div><small>Circled and crossed-out lines stay visible but are ignored.</small></div>
      <ol>${lines}</ol>
    </section>`;
  }

  function renderInventoryScanReview() {
    const summary = inventoryScanSummary();
    const summaryRows = summary.groups.map((group) => `<article class="inventory-scan-summary-row ${group.after === null || group.after < 0 ? "warning" : ""}"><div><strong>${escapeHtml(group.flavor.name)}</strong><small>${group.quantity} full can${group.quantity === 1 ? "" : "s"} from the photo</small></div><span>${Number.isInteger(group.flavor.canCount) ? `${group.flavor.canCount} → ${group.after}` : "Starting count needed"}</span></article>`).join("");
    const ignoredCount = state.inventoryScanEntries.filter((entry) => !entry.include).length;
    const warning = summary.unresolved
      ? `<div class="inventory-scan-warning">Choose a flavor or mark each unresolved line as Ignore before confirming.</div>`
      : summary.groups.some((group) => group.after === null)
        ? `<div class="inventory-scan-warning">A selected flavor still needs a starting count.</div>`
        : summary.groups.some((group) => group.after < 0)
          ? `<div class="inventory-scan-warning">This would make a flavor negative. Correct the physical master count first.</div>`
          : "";
    return `<form id="inventoryScanReviewForm" class="inventory-scan-review">
      <div class="inventory-reader-heading"><div><span class="status-pill good">Photo read</span><h3>Review every line before subtracting</h3><p>The AI does not change inventory on its own. Correct any match, restore a circled or crossed-out line detected by mistake, or ignore anything that should not count.</p></div><button type="button" class="secondary-button compact" data-reset-inventory-scan>Retake photo</button></div>
      ${state.inventoryScanImage ? `<img class="inventory-scan-thumbnail" src="${state.inventoryScanImage}" alt="Photo of the handwritten used-can list">` : ""}
      ${state.inventoryScanNotes ? `<p class="inventory-scan-ai-note">Reader note: ${escapeHtml(state.inventoryScanNotes)}</p>` : ""}
      ${inventoryScanPaperList()}
      <div class="inventory-scan-lines">${state.inventoryScanEntries.map(inventoryScanEntryRow).join("")}</div>
      <div class="inventory-scan-confirm-grid">
        <div class="inventory-scan-totals"><div class="inventory-catalog-heading"><strong>Subtraction preview</strong><span>${summary.selectedLines} line${summary.selectedLines === 1 ? "" : "s"} · ${ignoredCount} ignored</span></div>${summaryRows || `<div class="inventory-empty">No lines are selected to subtract.</div>`}</div>
        <div class="inventory-scan-confirm-fields">
          <label class="field-label">Usage date<input name="occurredOn" data-scan-date type="date" value="${state.inventoryScanDate || inventoryDateValue()}" required></label>
          <label class="field-label">Note (optional)<input name="note" data-scan-note maxlength="300" value="${escapeHtml(state.inventoryScanUserNote)}" placeholder="Example: closing freezer list"></label>
          ${warning}
          <button class="primary-button" type="submit" ${summary.invalid || state.inventoryBusy ? "disabled" : ""}>Confirm and subtract ${summary.selectedLines} can${summary.selectedLines === 1 ? "" : "s"}</button>
          <small>Only the confirmed counts and your audit entry are saved. The photo is not added to inventory history.</small>
        </div>
      </div>
    </form>`;
  }

  function renderUsageInventoryCameraReader() {
    if (state.inventoryScanEntries.length) return renderInventoryScanReview();
    return `
      <div class="inventory-reader-heading"><div><span class="status-pill">Full cans only</span><h3>Camera reader for the used-can strip</h3><p>Take a clear photo of the handwritten list. Repeated flavors count more than once, while circled or crossed-out names start as ignored.</p></div><span class="reader-icon" aria-hidden="true">▣</span></div>
      <div class="inventory-scan-capture">
        <label class="inventory-scan-upload ${state.inventoryScanImage ? "has-image" : ""}">
          <input id="inventoryScanFile" type="file" accept="image/*" capture="environment">
          ${state.inventoryScanImage ? `<img src="${state.inventoryScanImage}" alt="Selected handwritten used-can list"><span><strong>Choose a different photo</strong><small>${escapeHtml(state.inventoryScanFileName)}</small></span>` : `<span class="inventory-scan-camera" aria-hidden="true">▣</span><span><strong>Take photo or choose image</strong><small>Keep the strip flat, bright, and fully inside the frame.</small></span>`}
        </label>
        <div class="inventory-scan-capture-actions">
          ${state.inventoryScanError ? `<p class="inventory-scan-error">${escapeHtml(state.inventoryScanError)}</p>` : `<p>The reader will show every detected line for approval before changing the master list.</p>`}
          <button type="button" class="primary-button" data-read-inventory-scan ${!state.inventoryScanImage || state.inventoryScanBusy ? "disabled" : ""}>${state.inventoryScanBusy ? "Reading handwriting…" : "Read flavor list"}</button>
          <small>The app does not attach the photo to the audit log. Only approved flavor counts are saved.</small>
        </div>
      </div>`;
  }

  function productionScanFlavorOptions(selectedFlavorId) {
    return `<option value="">Choose flavor</option>${state.inventoryFlavors.map((flavor) => `<option value="${flavor.id}" ${flavor.id === selectedFlavorId ? "selected" : ""}>${escapeHtml(flavor.name)}</option>`).join("")}`;
  }

  function productionScanValue(value) {
    return Number.isInteger(value) && value >= 0 ? value : "";
  }

  function productionScanRow(row) {
    const confidence = Math.round(Math.max(0, Math.min(1, Number(row.confidence) || 0)) * 100);
    return `<tr data-production-scan-row="${row.id}">
      <th scope="row"><span class="production-raw-flavor">${escapeHtml(row.rawText || "Added row")}</span><select data-production-row-flavor="${row.id}" aria-label="Matched flavor for ${escapeHtml(row.rawText || "added row")}">${productionScanFlavorOptions(row.flavorId)}</select><small>${confidence ? `${confidence}% match` : "Manual row"}</small></th>
      ${row.canQuantities.map((value, index) => `<td><input type="number" min="0" max="999" inputmode="numeric" data-production-cell="${row.id}" data-production-kind="can" data-production-slot="${index + 1}" value="${productionScanValue(value)}" placeholder="—" aria-label="Full cans, column ${index + 1}"></td>`).join("")}
      <td class="half-gallon-divider"></td>
      ${row.halfQuantities.map((value, index) => `<td><input type="number" min="0" max="999" inputmode="numeric" data-production-cell="${row.id}" data-production-kind="half_gallon" data-production-slot="${index + 1}" value="${productionScanValue(value)}" placeholder="—" aria-label="Half gallons, column ${index + 1}"></td>`).join("")}
      <td><button type="button" class="danger-text" data-remove-production-row="${row.id}">Remove</button></td>
    </tr>`;
  }

  function productionScanProblem() {
    const selected = state.productionScanRows.map((row) => row.flavorId).filter(Boolean);
    if (selected.length !== state.productionScanRows.length) return "Choose the correct flavor for every preview row.";
    if (new Set(selected).size !== selected.length) return "A flavor appears more than once. Combine its numbers into one row and remove the duplicate.";
    const flavorById = new Map(state.inventoryFlavors.map((flavor) => [flavor.id, flavor]));
    for (const row of state.productionScanRows) {
      if ([...row.canQuantities, ...row.halfQuantities].some((value) => value !== null && (!Number.isInteger(Number(value)) || Number(value) < 0))) return "Production numbers must be whole numbers of zero or greater.";
      if (!flavorById.get(row.flavorId)?.tracksHalfGallons && row.halfQuantities.some((value) => Number(value) > 0)) return `${flavorById.get(row.flavorId)?.name || "That flavor"} is not on the ½-gallon list.`;
    }
    for (let index = 0; index < 5; index += 1) {
      const hasCans = state.productionScanRows.some((row) => Number(row.canQuantities[index]) > 0);
      const hasHalves = state.productionScanRows.some((row) => Number(row.halfQuantities[index]) > 0);
      if (hasCans && !state.productionScanCanDates[index]) return `Add the full-can date for column ${index + 1}.`;
      if (hasHalves && !state.productionScanHalfDates[index]) return `Add the ½-gallon date for column ${index + 1}.`;
    }
    return "";
  }

  function productionScanSummary() {
    let canCells = 0;
    let halfCells = 0;
    let totalCans = 0;
    let totalHalves = 0;
    state.productionScanRows.forEach((row) => {
      row.canQuantities.forEach((value) => { if (Number(value) > 0) { canCells += 1; totalCans += Number(value); } });
      row.halfQuantities.forEach((value) => { if (Number(value) > 0) { halfCells += 1; totalHalves += Number(value); } });
    });
    return { canCells, halfCells, totalCans, totalHalves };
  }

  function renderProductionScanReview() {
    const summary = productionScanSummary();
    const problem = productionScanProblem();
    const activeSheet = activeProductionSheet();
    return `<form id="productionScanReviewForm" class="inventory-scan-review production-scan-review">
      <div class="inventory-reader-heading"><div><span class="status-pill good">Production sheet read</span><h3>Review the recreated master sheet</h3><p>The photo stays visible. Correct any flavor, date, cans, or ½-gallon number before syncing. Nothing changes until you confirm.</p></div><button type="button" class="secondary-button compact" data-reset-production-scan>Retake photo</button></div>
      ${state.productionScanImage ? `<img class="inventory-scan-thumbnail production-scan-photo" src="${state.productionScanImage}" alt="Photo of the handwritten production master sheet">` : ""}
      ${state.productionScanNotes ? `<p class="inventory-scan-ai-note">Reader note: ${escapeHtml(state.productionScanNotes)}</p>` : ""}
      <div class="production-preview-heading"><div><strong>Editable sheet preview</strong><small>Sheet #${activeSheet?.sheet_number || 1} · exact five-column layout</small></div><button type="button" class="secondary-button compact" data-add-production-row>Add missing flavor row</button></div>
      <div class="inventory-paper-scroll production-preview-scroll">
        <table class="inventory-paper-table production-scan-table">
          <caption>Editable AI preview of the photographed production sheet</caption>
          <thead><tr><th>Detected flavor</th><th colspan="5">Full cans made</th><th class="half-gallon-divider">½ Gallons</th><th colspan="5">½ gallons made</th><th>Row</th></tr>
          <tr class="production-date-row"><th>Dates</th>${state.productionScanCanDates.map((value, index) => `<th><input type="date" data-production-date="can" data-production-slot="${index + 1}" value="${value}" aria-label="Full-can date, column ${index + 1}"></th>`).join("")}<th class="half-gallon-divider"></th>${state.productionScanHalfDates.map((value, index) => `<th><input type="date" data-production-date="half_gallon" data-production-slot="${index + 1}" value="${value}" aria-label="Half-gallon date, column ${index + 1}"></th>`).join("")}<th></th></tr></thead>
          <tbody>${state.productionScanRows.map(productionScanRow).join("")}</tbody>
        </table>
      </div>
      <div class="production-confirm-bar"><div><strong>${summary.totalCans} cans · ${summary.totalHalves} half gallons</strong><small>${summary.canCells + summary.halfCells} filled production cells detected. Rescanning the same sheet corrects saved cells instead of adding them twice.</small></div><label class="field-label">Audit note (optional)<input data-production-note maxlength="300" value="${escapeHtml(state.productionScanUserNote)}" placeholder="Example: Friday production sheet photo"></label>${problem ? `<div class="inventory-scan-warning">${escapeHtml(problem)}</div>` : ""}<button class="primary-button" type="submit" ${problem || state.inventoryBusy ? "disabled" : ""}>Confirm and sync production sheet</button></div>
    </form>`;
  }

  function renderProductionCameraReader() {
    if (state.productionScanRows.length) return renderProductionScanReview();
    const sheet = activeProductionSheet();
    const daysUsed = productionSheetDaysUsed(sheet);
    return `<div class="inventory-reader-heading"><div><span class="status-pill">Cans + ½ gallons</span><h3>Camera reader for the production master sheet</h3><p>Photograph the full sheet. The AI recreates the flavor rows, all five date columns, and every handwritten production number for review.</p></div><span class="reader-icon" aria-hidden="true">▦</span></div>
      <div class="production-sheet-status"><strong>Current digital sheet #${sheet?.sheet_number || 1}</strong><span>${daysUsed} of 5 production days filled</span></div>
      <div class="inventory-scan-capture">
        <label class="inventory-scan-upload ${state.productionScanImage ? "has-image" : ""}">
          <input id="productionScanFile" type="file" accept="image/*" capture="environment">
          ${state.productionScanImage ? `<img src="${state.productionScanImage}" alt="Selected production master sheet"><span><strong>Choose a different photo</strong><small>${escapeHtml(state.productionScanFileName)}</small></span>` : `<span class="inventory-scan-camera" aria-hidden="true">▦</span><span><strong>Take photo of production sheet</strong><small>Keep the full flavor column and every filled date column inside the frame.</small></span>`}
        </label>
        <div class="inventory-scan-capture-actions">${state.productionScanError ? `<p class="inventory-scan-error">${escapeHtml(state.productionScanError)}</p>` : `<p>Previously saved cells remain in place if the photo misses them. You can change any detected value before syncing.</p>`}<button type="button" class="primary-button" data-read-production-scan ${!state.productionScanImage || state.productionScanBusy ? "disabled" : ""}>${state.productionScanBusy ? "Reading production sheet…" : "Read production sheet"}</button><small>Circled production numbers are read normally because they mean the amount was already made and recorded on paper.</small></div>
      </div>`;
  }

  function renderInventoryCameraReader() {
    const productionMode = state.inventoryCameraMode === "production";
    return `<section class="panel inventory-reader-card active"><div class="inventory-camera-tabs" role="tablist" aria-label="Camera reader type"><button type="button" data-camera-mode="usage" class="${productionMode ? "" : "active"}">Used-can strip</button><button type="button" data-camera-mode="production" class="${productionMode ? "active" : ""}">Production master sheet</button></div>${productionMode ? renderProductionCameraReader() : renderUsageInventoryCameraReader()}</section>`;
  }

  function renderFlavorManager() {
    if (state.role !== "manager") return "";
    const active = state.inventoryCatalog.filter((flavor) => flavor.active);
    const archived = state.inventoryCatalog.filter((flavor) => !flavor.active);
    const categoryOptions = Object.entries(inventoryCategoryLabels).map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
    return `<details class="panel inventory-collapsible inventory-flavor-manager">
      <summary><span><strong>Customize flavor lists</strong><small>Add flavors, control the ½-gallon list, or temporarily remove flavors from the master sheet.</small></span><span class="collapsible-arrow" aria-hidden="true">⌄</span></summary>
      <div class="inventory-collapsible-body">
        <form id="addInventoryFlavorForm" class="inventory-add-flavor-form">
          <label class="field-label">Flavor name<input name="flavorName" maxlength="100" required placeholder="Example: Ube"></label>
          <label class="field-label">Section<select name="category" required>${categoryOptions}</select></label>
          <label class="inventory-half-checkbox"><input name="tracksHalfGallons" type="checkbox"><span>Also add to the ½-gallon list</span></label>
          <button class="primary-button compact" type="submit" ${state.inventoryBusy ? "disabled" : ""}>Add flavor</button>
        </form>
        <div class="inventory-catalog-list">
          <div class="inventory-catalog-heading"><strong>Current master flavors</strong><span>${active.length}</span></div>
          ${active.map((flavor) => `<article class="inventory-catalog-row"><div><strong>${escapeHtml(flavor.name)}</strong><small>${inventoryCategoryLabels[flavor.category]} · ${flavor.tracksHalfGallons ? "On ½-gallon list" : "Not on ½-gallon list"}</small></div><div class="inventory-catalog-actions"><button type="button" data-flavor-half-toggle="${flavor.id}" data-next-half-value="${flavor.tracksHalfGallons ? "false" : "true"}">${flavor.tracksHalfGallons ? "Remove from ½ list" : "Add to ½ list"}</button><button type="button" class="danger-text" data-flavor-archive="${flavor.id}">Remove from master</button></div></article>`).join("")}
        </div>
        ${archived.length ? `<div class="inventory-catalog-list archived"><div class="inventory-catalog-heading"><strong>Removed flavors</strong><span>${archived.length}</span></div>${archived.map((flavor) => `<article class="inventory-catalog-row"><div><strong>${escapeHtml(flavor.name)}</strong><small>History preserved</small></div><button type="button" data-flavor-restore="${flavor.id}">Restore to master</button></article>`).join("")}</div>` : ""}
        <p class="inventory-manager-note">Removing a flavor hides it instead of deleting its history. Restoring it will ask for a fresh physical count.</p>
      </div>
    </details>`;
  }

  function renderInventoryHistory() {
    const entryLabels = { opening: "Starting count", production: "Production", production_sync: "Production sheet sync", usage: "Used inventory", count_adjustment: "Count correction", manual_recount: "Manual physical count" };
    const rows = state.inventoryHistory.map((batch) => {
      const changes = batch.events.map((event) => {
        const unit = event.inventory_kind === "half_gallon" ? "½ gal" : "cans";
        if (batch.entry_type === "opening") return `${escapeHtml(event.flavor_name)} ${unit} set to ${event.count_after}`;
        if (batch.entry_type === "count_adjustment" || batch.entry_type === "manual_recount") return `${escapeHtml(event.flavor_name)} ${unit} ${event.count_before} → ${event.count_after}`;
        return `${escapeHtml(event.flavor_name)} ${unit} ${event.delta > 0 ? "+" : ""}${event.delta}`;
      }).join(" · ");
      return `<article class="inventory-history-row"><div><span class="inventory-history-type ${batch.entry_type}">${entryLabels[batch.entry_type] || "Inventory"}</span><strong>${inventoryDateLabel(batch.occurred_on)} · ${escapeHtml(batch.created_by_name)}</strong><p>${changes}</p>${batch.entry_type === "manual_recount" ? `<small class="manual-log-note">Entered manually — not calculated from production or usage.</small>` : ""}${batch.note ? `<small>${escapeHtml(batch.note)}</small>` : ""}</div></article>`;
    }).join("");
    return `<section class="panel inventory-history-panel"><div class="panel-heading"><div><p class="eyebrow">Audit history</p><h3>Recent master-list changes</h3><p>Who changed what, when, which unit changed, and the before/after totals.</p></div></div>${rows || `<div class="inventory-empty">No inventory changes have been recorded yet.</div>`}</section>`;
  }

  function renderInventory() {
    if (!elements.inventory || !state.canAccessInventory) return;
    if (state.mode === "demo") {
      elements.inventory.innerHTML = `<section class="inventory-preview"><div class="inventory-scoops" aria-hidden="true"><i></i><i></i><i></i></div><h3>Sign in to use the live master inventory.</h3><p>The real manager and IC-maker accounts share full-can and ½-gallon counts, production, usage, and audit history.</p></section>`;
      return;
    }
    if (state.inventoryLoading) {
      elements.inventory.innerHTML = `<section class="panel inventory-loading"><strong>Loading both master inventory lists…</strong></section>`;
      return;
    }
    if (state.inventoryError) {
      elements.inventory.innerHTML = `<section class="panel inventory-error"><h3>Inventory setup is not connected yet.</h3><p>${escapeHtml(state.inventoryError)}</p></section>`;
      return;
    }
    const halfFlavors = state.inventoryFlavors.filter((flavor) => flavor.tracksHalfGallons);
    const missingCans = state.inventoryFlavors.filter((flavor) => !Number.isInteger(flavor.canCount));
    const missingHalfGallons = halfFlavors.filter((flavor) => !Number.isInteger(flavor.halfGallonCount));
    const missingUnitCount = missingCans.length + missingHalfGallons.length;
    const totalCans = state.inventoryFlavors.reduce((sum, flavor) => sum + (Number.isInteger(flavor.canCount) ? flavor.canCount : 0), 0);
    const totalHalfGallons = halfFlavors.reduce((sum, flavor) => sum + (Number.isInteger(flavor.halfGallonCount) ? flavor.halfGallonCount : 0), 0);
    const latest = state.inventoryHistory[0];
    elements.inventory.innerHTML = `
      <div class="inventory-summary-grid">
        <article><span>Total full cans</span><strong>${missingCans.length ? "—" : totalCans}</strong><small>${missingCans.length ? `${missingCans.length} opening counts needed` : `Across all ${state.inventoryFlavors.length} flavors`}</small></article>
        <article><span>Total ½ gallons</span><strong>${missingHalfGallons.length ? "—" : totalHalfGallons}</strong><small>${missingHalfGallons.length ? `${missingHalfGallons.length} opening counts needed` : `Across ${halfFlavors.length} tracked flavors`}</small></article>
        <article><span>Opening setup</span><strong>${missingUnitCount ? "In progress" : "Complete"}</strong><small>${missingUnitCount ? `${missingUnitCount} counts still needed` : "Both master lists are ready"}</small></article>
        <article><span>Last worked on</span><strong class="inventory-last-worked">${latest ? inventoryTimestampLabel(latest.created_at) : "—"}</strong><small>${latest ? `By ${escapeHtml(latest.created_by_name)}` : "No changes recorded yet"}</small></article>
      </div>
      ${renderInventoryCameraReader()}
      ${renderInventoryMaster()}
      ${renderProductionArchiveLibrary()}
      ${renderOpeningCountForm(missingUnitCount)}
      ${missingUnitCount ? "" : renderInventoryEntryForm()}
      ${renderFlavorManager()}
      ${renderInventoryHistory()}`;
  }

  async function loadInventoryData() {
    if (!state.canAccessInventory || !supabaseClient) return;
    state.inventoryLoading = true;
    state.inventoryError = "";
    let flavorRequest = supabaseClient.from("ice_cream_flavors")
      .select("id, name, category, sort_order, tracks_half_gallons, active")
      .order("sort_order");
    if (state.role !== "manager") flavorRequest = flavorRequest.eq("active", true);
    const [{ data: flavorRows, error: flavorError }, { data: countRows, error: countError }, { data: sheetRows, error: sheetError }] = await Promise.all([
      flavorRequest,
      supabaseClient.from("ice_cream_inventory").select("flavor_id, can_count, half_gallon_count, updated_at"),
      supabaseClient.from("ice_cream_production_sheets")
        .select("id, sheet_number, status, started_on, completed_at, completed_by_name, inventory_snapshot, created_at, ice_cream_production_slots(slot_number, can_date, half_gallon_date, ice_cream_production_cells(flavor_id, can_quantity, half_gallon_quantity))")
        .order("sheet_number", { ascending: false }).limit(100),
    ]);
    if (flavorError || countError || sheetError) {
      state.inventoryLoading = false;
      state.inventoryError = flavorError?.message || countError?.message || sheetError?.message || "The inventory tables could not be loaded.";
      return;
    }
    const counts = new Map((countRows || []).map((row) => [row.flavor_id, row]));
    state.inventoryCatalog = (flavorRows || []).map((flavor) => ({
      ...flavor,
      tracksHalfGallons: flavor.tracks_half_gallons,
      canCount: counts.get(flavor.id)?.can_count ?? null,
      halfGallonCount: counts.get(flavor.id)?.half_gallon_count ?? null,
      updatedAt: counts.get(flavor.id)?.updated_at || null,
    }));
    state.inventoryFlavors = state.inventoryCatalog.filter((flavor) => flavor.active);
    state.productionSheets = (sheetRows || []).map((sheet) => ({
      ...sheet,
      slots: (sheet.ice_cream_production_slots || []).map((slot) => ({
        ...slot,
        cells: slot.ice_cream_production_cells || [],
      })).sort((a, b) => a.slot_number - b.slot_number),
    }));
    if (!state.productionSheets.some((sheet) => sheet.id === state.productionSheetViewId)) {
      state.productionSheetViewId = activeProductionSheet()?.id || state.productionSheets[0]?.id || "";
    }

    const { data: batches, error: batchError } = await supabaseClient.from("ice_cream_inventory_batches")
      .select("id, entry_type, occurred_on, note, created_by_name, created_at")
      .order("created_at", { ascending: false }).limit(50);
    if (batchError) {
      state.inventoryLoading = false;
      state.inventoryError = batchError.message;
      return;
    }
    let events = [];
    const batchIds = (batches || []).map((batch) => batch.id);
    if (batchIds.length) {
      const { data: eventRows, error: eventError } = await supabaseClient.from("ice_cream_inventory_events")
        .select("batch_id, flavor_id, inventory_kind, delta, count_before, count_after, ice_cream_flavors(name)")
        .in("batch_id", batchIds);
      if (eventError) {
        state.inventoryLoading = false;
        state.inventoryError = eventError.message;
        return;
      }
      events = eventRows || [];
    }
    state.inventoryHistory = (batches || []).map((batch) => ({
      ...batch,
      events: events.filter((event) => event.batch_id === batch.id).map((event) => ({
        ...event,
        flavor_name: Array.isArray(event.ice_cream_flavors) ? event.ice_cream_flavors[0]?.name : event.ice_cream_flavors?.name,
      })),
    }));
    state.inventoryLoading = false;
  }

  async function applyInventoryBatch(entryType, occurredOn, note, items, successMessage) {
    if (state.inventoryBusy || !items.length) {
      showToast(items.length ? "Inventory is already saving." : "Enter at least one flavor quantity.");
      return false;
    }
    if (state.mode !== "supabase") {
      showToast("Sign in to update the live inventory.");
      return false;
    }
    state.inventoryBusy = true;
    renderInventory();
    const { error } = await supabaseClient.rpc("apply_ice_cream_inventory_batch", {
      p_entry_type: entryType,
      p_occurred_on: occurredOn,
      p_note: note || "",
      p_items: items,
    });
    state.inventoryBusy = false;
    if (error) {
      renderInventory();
      showToast(error.message);
      return false;
    }
    await loadInventoryData();
    renderInventory();
    showToast(successMessage || "Inventory updated.");
    return true;
  }

  function manualSheetDates(form, kind) {
    const values = [null, null, null, null, null];
    form.querySelectorAll(`[data-manual-sheet-date="${kind}"]`).forEach((input) => {
      const iso = manualDateIso(input.value, input.dataset.dateYear);
      input.setCustomValidity(input.value && !iso ? "Enter the date as month/day, such as 8/12." : "");
      if (iso || !input.value) values[Number(input.dataset.slotNumber) - 1] = iso || null;
    });
    return values;
  }

  function syncManualMasterInput(input) {
    const form = input.closest("#manualMasterSheetForm");
    if (!form) return;
    if (input.matches("[data-manual-sheet-date]")) {
      const iso = manualDateIso(input.value, input.dataset.dateYear);
      input.setCustomValidity(input.value && !iso ? "Enter the date as month/day, such as 8/12." : "");
      if (input.value && !iso) return;
      form.querySelectorAll("[data-manual-sheet-date]").forEach((other) => {
        if (other !== input && other.dataset.manualSheetDate === input.dataset.manualSheetDate && other.dataset.slotNumber === input.dataset.slotNumber) {
          other.value = !iso ? "" : other.dataset.manualDateFormat === "short" ? manualDateShort(iso) : iso;
          if (iso) other.dataset.dateYear = iso.slice(0, 4);
        }
      });
    } else if (input.matches("[data-manual-sheet-cell]")) {
      form.querySelectorAll("[data-manual-sheet-cell]").forEach((other) => {
        if (other !== input && other.dataset.manualSheetCell === input.dataset.manualSheetCell && other.dataset.manualSheetKind === input.dataset.manualSheetKind && other.dataset.slotNumber === input.dataset.slotNumber) other.value = input.value;
      });
    } else if (input.matches("[data-opening-count]")) {
      form.querySelectorAll("[data-opening-count]").forEach((other) => {
        if (other !== input && other.dataset.openingCount === input.dataset.openingCount && other.dataset.openingKind === input.dataset.openingKind) other.value = input.value;
      });
    }
  }

  function selectManualMobileDay(form, nextIndex) {
    const index = Math.max(0, Math.min(4, Number(nextIndex) || 0));
    form.querySelectorAll("[data-manual-mobile-day-panel]").forEach((panel) => {
      panel.hidden = Number(panel.dataset.manualMobileDayPanel) !== index;
    });
    form.querySelectorAll("[data-manual-mobile-day]").forEach((button) => {
      const active = Number(button.dataset.manualMobileDay) === index;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
    form.querySelector('[data-manual-mobile-step="-1"]')?.toggleAttribute("disabled", index === 0);
    form.querySelector('[data-manual-mobile-step="1"]')?.toggleAttribute("disabled", index === 4);
    form.querySelector(`[data-manual-mobile-day-panel="${index}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveManualMasterSheet(form, action) {
    const sheet = activeProductionSheet();
    if (!sheet || state.inventoryBusy) return;
    if (state.mode !== "supabase") {
      showToast("Sign in to update the live master sheet.");
      return;
    }

    const canDates = manualSheetDates(form, "can");
    const halfDates = manualSheetDates(form, "half_gallon");
    if (!form.reportValidity()) return;
    const cells = new Map();
    form.querySelectorAll("[data-manual-sheet-cell]").forEach((input) => {
      const key = `${input.dataset.manualSheetCell}:${input.dataset.slotNumber}`;
      const row = cells.get(key) || {
        flavor_id: input.dataset.manualSheetCell,
        slot_number: Number(input.dataset.slotNumber),
        can_quantity: 0,
        half_gallon_quantity: 0,
      };
      if (input.dataset.manualSheetKind === "can") row.can_quantity = Number(input.value || 0);
      else row.half_gallon_quantity = Number(input.value || 0);
      cells.set(key, row);
    });

    const countsByFlavor = new Map();
    form.querySelectorAll("[data-opening-count]").forEach((input) => {
      const row = countsByFlavor.get(input.dataset.openingCount) || {
        flavor_id: input.dataset.openingCount,
        can_count: null,
        half_gallon_count: null,
      };
      const value = input.value === "" ? null : Number(input.value);
      if (input.dataset.openingKind === "can") row.can_count = value;
      else row.half_gallon_count = value;
      countsByFlavor.set(input.dataset.openingCount, row);
    });

    const complete = action === "archive";
    if (complete && !window.confirm(`Save and archive master sheet #${sheet.sheet_number}? This freezes the five production days and opens a new blank sheet.`)) return;

    const archivedSheetId = sheet.id;
    state.inventoryBusy = true;
    renderInventory();
    const { error } = await supabaseClient.rpc("save_manual_ice_cream_master_sheet", {
      p_sheet_id: sheet.id,
      p_can_dates: canDates,
      p_half_gallon_dates: halfDates,
      p_cells: [...cells.values()],
      p_counts: [...countsByFlavor.values()],
      p_note: complete ? "IC maker confirmed and archived full master sheet" : "IC maker confirmed full master sheet changes",
      p_complete: complete,
    });
    state.inventoryBusy = false;
    if (error) {
      renderInventory();
      showToast(error.message);
      return;
    }
    await loadInventoryData();
    if (complete) state.productionSheetViewId = archivedSheetId;
    renderInventory();
    showToast(complete ? "Master sheet archived and logged. A new blank sheet is ready." : "Changes confirmed. Digital master list and audit updated.");
  }

  async function saveManualProduction(form, rawItems) {
    const sheet = activeProductionSheet();
    if (!sheet) {
      showToast("The current five-day production sheet could not be loaded.");
      return;
    }
    const occurredOn = form.elements.occurredOn.value;
    const slots = productionSheetSlots(sheet);
    let targetIndex = slots.findIndex((slot) => slot.can_date === occurredOn || slot.half_gallon_date === occurredOn);
    if (targetIndex < 0) targetIndex = slots.findIndex((slot) => !slot.can_date && !slot.half_gallon_date && !(slot.cells || []).length);
    if (targetIndex < 0) {
      showToast("This five-day sheet is full. Start the next sheet before adding another production day.");
      return;
    }
    const grouped = new Map();
    rawItems.forEach((item) => {
      const row = grouped.get(item.flavor_id) || { flavor_id: item.flavor_id, slot_number: targetIndex + 1, can_quantity: null, half_gallon_quantity: null };
      const saved = productionSheetCell(slots[targetIndex], item.flavor_id);
      if (item.inventory_kind === "can") row.can_quantity = Number(saved?.can_quantity || 0) + item.quantity;
      else row.half_gallon_quantity = Number(saved?.half_gallon_quantity || 0) + item.quantity;
      grouped.set(item.flavor_id, row);
    });
    const canDates = slots.map((slot) => slot.can_date || null);
    const halfDates = slots.map((slot) => slot.half_gallon_date || null);
    if (rawItems.some((item) => item.inventory_kind === "can")) canDates[targetIndex] = occurredOn;
    if (rawItems.some((item) => item.inventory_kind === "half_gallon")) halfDates[targetIndex] = occurredOn;
    state.inventoryBusy = true;
    renderInventory();
    const { error } = await supabaseClient.rpc("sync_ice_cream_production_sheet", {
      p_sheet_id: sheet.id,
      p_can_dates: canDates,
      p_half_gallon_dates: halfDates,
      p_cells: [...grouped.values()],
      p_note: form.elements.note.value || "Manual production entry",
      p_source: "manual",
    });
    state.inventoryBusy = false;
    if (error) {
      showToast(error.message);
      renderInventory();
      return;
    }
    await loadInventoryData();
    renderInventory();
    showToast("Production added to the current five-day sheet.");
  }

  function saveInventoryEntry(form) {
    const entryMode = form.dataset.entryMode;
    const entryType = entryMode.startsWith("usage_") ? "usage" : entryMode;
    const items = [...form.querySelectorAll("[data-inventory-quantity]")].filter((input) => {
      if (input.value === "") return false;
      return Number(input.value) > 0;
    }).map((input) => ({
      flavor_id: input.dataset.inventoryQuantity,
      inventory_kind: input.dataset.inventoryKind,
      quantity: Number(input.value),
    }));
    if (entryMode === "production") {
      if (!items.length) showToast("Enter at least one flavor quantity.");
      else saveManualProduction(form, items);
      return;
    }
    const message = entryMode === "production" ? "Production added to both master lists." : entryMode === "usage_can" ? "Used cans subtracted." : "Used ½ gallons subtracted.";
    applyInventoryBatch(entryType, form.elements.occurredOn.value, form.elements.note.value, items, message);
  }

  function resetInventoryScan() {
    state.inventoryScanImage = "";
    state.inventoryScanFileName = "";
    state.inventoryScanEntries = [];
    state.inventoryScanBusy = false;
    state.inventoryScanError = "";
    state.inventoryScanNotes = "";
    state.inventoryScanDate = "";
    state.inventoryScanUserNote = "";
  }

  function resetProductionScan() {
    state.productionScanImage = "";
    state.productionScanFileName = "";
    state.productionScanRows = [];
    state.productionScanCanDates = ["", "", "", "", ""];
    state.productionScanHalfDates = ["", "", "", "", ""];
    state.productionScanBusy = false;
    state.productionScanError = "";
    state.productionScanNotes = "";
    state.productionScanUserNote = "";
  }

  async function inventoryScanImageData(file) {
    if (!file || !String(file.type || "").startsWith("image/")) throw new Error("Choose a photo from your camera or photo library.");
    if (file.size > 25 * 1024 * 1024) throw new Error("That photo is too large. Choose a photo smaller than 25 MB.");
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.decoding = "async";
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("This photo could not be opened. Try a JPEG, PNG, or screenshot."));
        image.src = objectUrl;
      });
      const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
      const scale = Math.min(1, 2400 / longestSide);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("This device could not prepare the photo.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.92);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function chooseInventoryScanFile(file) {
    state.inventoryScanError = "";
    try {
      state.inventoryScanImage = await inventoryScanImageData(file);
      state.inventoryScanFileName = file.name || "Camera photo";
    } catch (error) {
      state.inventoryScanImage = "";
      state.inventoryScanFileName = "";
      state.inventoryScanError = error.message || "The photo could not be prepared.";
    }
    renderInventory();
  }

  async function chooseProductionScanFile(file) {
    state.productionScanError = "";
    try {
      state.productionScanImage = await inventoryScanImageData(file);
      state.productionScanFileName = file.name || "Production sheet photo";
    } catch (error) {
      state.productionScanImage = "";
      state.productionScanFileName = "";
      state.productionScanError = error.message || "The production sheet photo could not be prepared.";
    }
    renderInventory();
  }

  async function inventoryFunctionError(error, data) {
    if (data?.error) return data.error;
    try {
      const context = error?.context;
      if (context && typeof context.clone === "function") {
        const body = await context.clone().json();
        if (body?.error) return body.error;
      }
    } catch (_) {
      // Fall back to the Functions client message below.
    }
    return error?.message || "The handwriting reader could not process this photo.";
  }

  async function readInventoryScan() {
    if (state.inventoryScanBusy || !state.inventoryScanImage || state.mode !== "supabase") {
      if (state.mode !== "supabase") showToast("Sign in with a manager or IC-maker account to use the camera reader.");
      return;
    }
    state.inventoryScanBusy = true;
    state.inventoryScanError = "";
    renderInventory();
    const { data, error } = await supabaseClient.functions.invoke("read-inventory-strip-v2", {
      body: { imageDataUrl: state.inventoryScanImage },
    });
    state.inventoryScanBusy = false;
    if (error || !Array.isArray(data?.entries)) {
      state.inventoryScanError = await inventoryFunctionError(error, data);
      renderInventory();
      return;
    }
    const flavorByName = new Map(state.inventoryFlavors.map((flavor) => [flavor.name.toLowerCase(), flavor]));
    state.inventoryScanEntries = data.entries.slice(0, 100).map((entry, index) => {
      const matchedName = String(entry.matched_flavor || "").trim().toLowerCase();
      const flavor = flavorByName.get(matchedName);
      const circled = Boolean(entry.circled);
      const crossedOut = Boolean(entry.crossed_out);
      return {
        id: `scan-${index}`,
        rawText: String(entry.raw_text || entry.matched_flavor || "").slice(0, 100),
        flavorId: flavor?.id || "",
        circled,
        crossedOut,
        include: !(circled || crossedOut),
        confidence: Number(entry.confidence) || 0,
      };
    });
    state.inventoryScanNotes = String(data.notes || "").slice(0, 300);
    state.inventoryScanDate = inventoryDateValue();
    if (!state.inventoryScanEntries.length) {
      state.inventoryScanError = "No flavor names were found. Retake the photo closer, brighter, and with the full strip visible.";
    }
    renderInventory();
  }

  function productionAiQuantity(value, savedValue) {
    if (value === null || value === undefined || value === "") return Number(savedValue) > 0 ? Number(savedValue) : null;
    const quantity = Number(value);
    return Number.isInteger(quantity) && quantity >= 0 ? quantity : (Number(savedValue) > 0 ? Number(savedValue) : null);
  }

  async function readProductionScan() {
    if (state.productionScanBusy || !state.productionScanImage || state.mode !== "supabase") return;
    const sheet = activeProductionSheet();
    if (!sheet) {
      state.productionScanError = "The current five-day production sheet could not be loaded.";
      renderInventory();
      return;
    }
    state.productionScanBusy = true;
    state.productionScanError = "";
    renderInventory();
    const { data, error } = await supabaseClient.functions.invoke("read-inventory-strip-v2", {
      body: { mode: "production_sheet", imageDataUrl: state.productionScanImage },
    });
    state.productionScanBusy = false;
    if (error || !Array.isArray(data?.rows)) {
      state.productionScanError = await inventoryFunctionError(error, data);
      renderInventory();
      return;
    }
    const flavorByName = new Map(state.inventoryFlavors.map((flavor) => [flavor.name.toLowerCase(), flavor]));
    const slots = productionSheetSlots(sheet);
    state.productionScanRows = data.rows.slice(0, 100).map((row, index) => {
      const flavor = flavorByName.get(String(row.matched_flavor || "").trim().toLowerCase());
      const cans = Array.isArray(row.can_quantities) ? row.can_quantities.slice(0, 5) : [];
      const halves = Array.isArray(row.half_gallon_quantities) ? row.half_gallon_quantities.slice(0, 5) : [];
      return {
        id: `production-row-${index}`,
        rawText: String(row.raw_flavor || row.matched_flavor || "").slice(0, 100),
        flavorId: flavor?.id || "",
        canQuantities: Array.from({ length: 5 }, (_, slotIndex) => productionAiQuantity(cans[slotIndex], productionSheetCell(slots[slotIndex], flavor?.id)?.can_quantity)),
        halfQuantities: Array.from({ length: 5 }, (_, slotIndex) => productionAiQuantity(halves[slotIndex], productionSheetCell(slots[slotIndex], flavor?.id)?.half_gallon_quantity)),
        confidence: Number(row.confidence) || 0,
      };
    });
    const canDates = Array.isArray(data.can_dates) ? data.can_dates : [];
    const halfDates = Array.isArray(data.half_gallon_dates) ? data.half_gallon_dates : [];
    state.productionScanCanDates = Array.from({ length: 5 }, (_, index) => String(canDates[index] || slots[index]?.can_date || ""));
    state.productionScanHalfDates = Array.from({ length: 5 }, (_, index) => String(halfDates[index] || slots[index]?.half_gallon_date || ""));
    state.productionScanNotes = String(data.notes || "").slice(0, 300);
    if (!state.productionScanRows.length) state.productionScanError = "No flavor rows were found. Retake the photo with the entire printed flavor column visible.";
    renderInventory();
  }

  function updateProductionScanState(form = document.querySelector("#productionScanReviewForm")) {
    if (!form) return;
    form.querySelectorAll("[data-production-date]").forEach((input) => {
      const index = Number(input.dataset.productionSlot) - 1;
      if (input.dataset.productionDate === "can") state.productionScanCanDates[index] = input.value;
      else state.productionScanHalfDates[index] = input.value;
    });
    form.querySelectorAll("[data-production-cell]").forEach((input) => {
      const row = state.productionScanRows.find((item) => item.id === input.dataset.productionCell);
      if (!row) return;
      const index = Number(input.dataset.productionSlot) - 1;
      const value = input.value === "" ? null : Number(input.value);
      if (input.dataset.productionKind === "can") row.canQuantities[index] = value;
      else row.halfQuantities[index] = value;
    });
    state.productionScanUserNote = form.querySelector("[data-production-note]")?.value || "";
  }

  function addProductionScanRow() {
    updateProductionScanState();
    state.productionScanRows.push({
      id: `production-row-manual-${Date.now()}`,
      rawText: "Added manually",
      flavorId: "",
      canQuantities: [null, null, null, null, null],
      halfQuantities: [null, null, null, null, null],
      confidence: 0,
    });
    renderInventory();
  }

  async function confirmProductionScan(form) {
    updateProductionScanState(form);
    const problem = productionScanProblem();
    if (problem) {
      showToast(problem);
      renderInventory();
      return;
    }
    const sheet = activeProductionSheet();
    const cells = state.productionScanRows.flatMap((row) => Array.from({ length: 5 }, (_, index) => {
      const canQuantity = row.canQuantities[index];
      const halfQuantity = row.halfQuantities[index];
      if (canQuantity === null && halfQuantity === null) return null;
      return { flavor_id: row.flavorId, slot_number: index + 1, can_quantity: canQuantity, half_gallon_quantity: halfQuantity };
    }).filter(Boolean));
    if (!sheet || !cells.length) {
      showToast("Enter at least one production number before syncing.");
      return;
    }
    state.inventoryBusy = true;
    renderInventory();
    const { error } = await supabaseClient.rpc("sync_ice_cream_production_sheet", {
      p_sheet_id: sheet.id,
      p_can_dates: state.productionScanCanDates.map((value) => value || null),
      p_half_gallon_dates: state.productionScanHalfDates.map((value) => value || null),
      p_cells: cells,
      p_note: state.productionScanUserNote || "Camera production-sheet sync",
      p_source: "camera",
    });
    state.inventoryBusy = false;
    if (error) {
      showToast(error.message);
      renderInventory();
      return;
    }
    resetProductionScan();
    await loadInventoryData();
    renderInventory();
    showToast("Production sheet synced after your review.");
  }

  async function startNextProductionSheet() {
    const sheet = activeProductionSheet();
    if (!sheet || state.inventoryBusy) return;
    if (!window.confirm(`Complete and archive master sheet #${sheet.sheet_number}? Its counts and five production days will be locked, and a new blank sheet will open.`)) return;
    const archivedSheetId = sheet.id;
    state.inventoryBusy = true;
    const { error } = await supabaseClient.rpc("start_next_ice_cream_production_sheet", { p_sheet_id: sheet.id });
    state.inventoryBusy = false;
    if (error) {
      showToast(error.message);
      return;
    }
    resetProductionScan();
    await loadInventoryData();
    state.productionSheetViewId = archivedSheetId;
    renderInventory();
    showToast("Master sheet archived. A new blank five-day sheet is ready.");
  }

  async function confirmInventoryScan(form) {
    const summary = inventoryScanSummary();
    if (summary.invalid) {
      showToast("Resolve the highlighted scan items before subtracting.");
      return;
    }
    const ignoredCount = state.inventoryScanEntries.filter((entry) => !entry.include).length;
    const auditNote = [
      `Camera reader: ${summary.selectedLines} handwritten line${summary.selectedLines === 1 ? "" : "s"} confirmed; ${ignoredCount} ignored`,
      state.inventoryScanUserNote.trim(),
    ].filter(Boolean).join(" — ");
    const saved = await applyInventoryBatch(
      "usage",
      form.elements.occurredOn.value,
      auditNote,
      summary.groups.map((group) => ({ flavor_id: group.flavor.id, inventory_kind: "can", quantity: group.quantity })),
      "Camera scan confirmed and used cans subtracted.",
    );
    if (saved) {
      resetInventoryScan();
      renderInventory();
    }
  }

  async function manageInventoryFlavor(action, options = {}) {
    if (state.inventoryBusy || state.mode !== "supabase" || state.role !== "manager") return;
    state.inventoryBusy = true;
    renderInventory();
    const { error } = await supabaseClient.rpc("manage_ice_cream_flavor", {
      p_action: action,
      p_flavor_id: options.flavorId || null,
      p_name: options.name || null,
      p_category: options.category || null,
      p_tracks_half_gallons: Boolean(options.tracksHalfGallons),
    });
    state.inventoryBusy = false;
    if (error) {
      renderInventory();
      showToast(error.message);
      return;
    }
    await loadInventoryData();
    renderInventory();
    const messages = {
      add: "Flavor added. Enter its current physical count next.",
      set_half_gallons: options.tracksHalfGallons ? "Flavor added to the ½-gallon list." : "Flavor removed from the ½-gallon list.",
      archive: "Flavor removed from the master list. Its history was preserved.",
      restore: "Flavor restored. Enter a fresh physical count next.",
    };
    showToast(messages[action] || "Flavor list updated.");
  }

  function addInventoryFlavor(form) {
    manageInventoryFlavor("add", {
      name: form.elements.flavorName.value,
      category: form.elements.category.value,
      tracksHalfGallons: form.elements.tracksHalfGallons.checked,
    });
  }

  function renderSettings() {
    if (state.role !== "manager") {
      elements.settings.innerHTML = `<article class="setting-card"><h3>Published schedule</h3><p>The manager's approved schedule will appear here after it is published.</p></article>`;
      document.querySelector("#generateButtonTop").hidden = true;
      return;
    }
    document.querySelector("#generateButtonTop").hidden = state.scheduleModuleView !== "builder";
    const trainees = state.team.map((employee) => `<option value="${employee.id}" ${employee.id === state.settings.traineeId ? "selected" : ""}>${escapeHtml(employee.name)}</option>`).join("");
    const staffingRows = demoData.days.map((day) => {
      const staffing = state.settings.staffing?.[day.name] || { AM: day.amNeed, PM: day.pmNeed };
      const buttons = (shift, counts) => counts.map((count) => `<button type="button" data-staff-day="${day.name}" data-staff-shift="${shift}" data-staff-count="${count}" class="${staffing[shift] === count ? "active" : ""}" aria-label="${day.name} ${shift === "AM" ? "morning" : "night"}: ${count} people">${count}</button>`).join("");
      return `<div class="staffing-day-row">
        <strong>${day.short}</strong>
        <div class="staffing-shift-control"><span>Morning people</span><div class="mini-segmented">${buttons("AM", [2, 3])}</div></div>
        <div class="staffing-shift-control"><span>Night people</span><div class="mini-segmented">${buttons("PM", [3, 4])}</div></div>
      </div>`;
    }).join("");
    elements.settings.innerHTML = `
      <article class="setting-card">
        <h3>Schedule week</h3><p>Open Tuesday through Sunday. Closed Monday.</p>
        <div class="form-grid"><label class="field-label">Week begins<input id="weekStartInput" type="date" value="${state.settings.weekStart}"></label></div>
      </article>
      <article class="setting-card ic-settings">
        <h3>IC production target</h3><p>IC work is additional, flexible full-day work and counts as one working day.</p>
        <div class="segmented" id="icTargetButtons">${[2, 3, 4].map((number) => `<button data-ic-target="${number}" class="${state.settings.icTarget === number ? "active" : ""}">${number}</button>`).join("")}</div>
        <p class="ic-gap-note">Normal rule: leave at least one full day between IC production days.</p>
        <div class="switch-row ${state.settings.icTarget === 4 ? "" : "muted-fields"}"><span><strong class="switch-title">Emergency back-to-back IC</strong><small>Four IC days cannot fit Tuesday–Sunday with the normal gap. Manager approval is required.</small></span><label class="switch"><input id="allowConsecutiveICInput" type="checkbox" ${state.settings.allowConsecutiveIC ? "checked" : ""} ${state.settings.icTarget === 4 ? "" : "disabled"}><span></span></label></div>
      </article>
      <article class="setting-card">
        <h3>Double shifts</h3><p>Doubles appear only as suggestions and always require manager approval.</p>
        <div class="switch-row"><span class="field-label">Approval required</span><label class="switch"><input type="checkbox" checked disabled><span></span></label></div>
      </article>
      <article class="setting-card training-settings">
        <h3>Training week</h3><p>The scheduler automatically finds shifts where the trainee and a qualified trainer are both available.</p>
        <div class="switch-row"><span class="field-label">Include training</span><label class="switch"><input id="trainingEnabledInput" type="checkbox" ${state.settings.trainingEnabled ? "checked" : ""}><span></span></label></div>
        <div class="form-grid ${state.settings.trainingEnabled ? "" : "muted-fields"}">
          <label class="field-label">Trainee<select id="traineeInput" ${state.settings.trainingEnabled ? "" : "disabled"}>${trainees}</select></label>
          <label class="field-label">Skill<select id="trainingSkillInput" ${state.settings.trainingEnabled ? "" : "disabled"}><option value="ic_production" ${state.settings.trainingSkill === "ic_production" ? "selected" : ""}>IC production</option><option value="store_operations" ${state.settings.trainingSkill === "store_operations" ? "selected" : ""}>Store operations</option></select></label>
        </div>
        <div class="auto-rule-note"><strong>No forced training day</strong><span>The trainee is never placed alone. Their availability and requested minimum/maximum working days still apply.</span></div>
        ${state.settings.trainingSkill === "store_operations" ? `<div class="auto-rule-note trainer-priority-note"><strong>Store-operations trainer priority</strong><span>Israel first, then Gabriel, then Evelyn or Dania—always subject to availability.</span></div>` : ""}
      </article>
      <article class="setting-card staffing-settings">
        <h3>People needed each day</h3><p>Choose 2 or 3 people for the morning shift and 3 or 4 for the night shift. IC makers, trainers, and trainees are additional.</p>
        <div class="closed-note"><strong>Monday</strong><span>Closed</span></div>
        <div class="staffing-day-grid">${staffingRows}</div>
      </article>`;
  }

  function renderScheduleModule() {
    const managerMode = state.role === "manager";
    elements.scheduleManagerHeading.hidden = !managerMode;
    elements.scheduleModuleTabs.hidden = !managerMode;
    elements.employeeScheduleWorkspace.hidden = managerMode;
    if (!managerMode) {
      elements.scheduleBuilderModule.hidden = true;
      elements.scheduleAvailabilityModule.hidden = true;
      elements.scheduleRequestsModule.hidden = true;
      document.querySelector("#generateButtonTop").hidden = true;
      return;
    }
    const submitted = state.team.filter((employee) => employee.submitted).length;
    document.querySelector("#scheduleRequestCount").textContent = `${submitted}/${state.team.length}`;
    document.querySelectorAll("[data-schedule-view]").forEach((button) => {
      if (!button.classList.contains("schedule-module-tab")) return;
      const active = button.dataset.scheduleView === state.scheduleModuleView;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    elements.scheduleBuilderModule.hidden = state.scheduleModuleView !== "builder";
    elements.scheduleAvailabilityModule.hidden = state.scheduleModuleView !== "availability";
    elements.scheduleRequestsModule.hidden = false;
    elements.scheduleRequestsModule.open = state.requestsExpanded;
    document.querySelector("#generateButtonTop").hidden = state.scheduleModuleView !== "builder";
  }

  function availabilitySlotMarkup(employee, day, shift) {
    const preference = employee.availability?.[day.name]?.[shift] || "available";
    const mark = preference === "unavailable" ? "×" : preference === "preferred" ? "★" : "&nbsp;";
    const label = preference === "unavailable" ? "unavailable" : preference === "preferred" ? "preferred" : "available";
    return `<button class="availability-slot-toggle ${preference}" type="button" data-availability-employee="${employee.id}" data-availability-day="${day.name}" data-availability-shift="${shift}" aria-label="${escapeHtml(employee.name)} ${day.name} ${shift === "AM" ? "morning" : "night"}: ${label}"><small>${shift}</small><strong>${mark}</strong></button>`;
  }

  function availabilityShiftCellMarkup(employee, day, tagName = "td") {
    const am = employee.availability?.[day.name]?.AM || "available";
    const pm = employee.availability?.[day.name]?.PM || "available";
    const allDayOff = am === "unavailable" && pm === "unavailable";
    const splitDay = !allDayOff && am !== pm;
    return `<${tagName} class="availability-shift-cell boxed-day ${allDayOff ? "all-day-off" : ""} ${splitDay ? "split-day" : ""}">${availabilitySlotMarkup(employee, day, "AM")}${availabilitySlotMarkup(employee, day, "PM")}${allDayOff ? `<span class="all-day-x" aria-hidden="true">×</span>` : ""}</${tagName}>`;
  }

  function mobileAvailabilityOverviewCellMarkup(employee, day) {
    const am = employee.availability?.[day.name]?.AM || "available";
    const pm = employee.availability?.[day.name]?.PM || "available";
    const allDayOff = am === "unavailable" && pm === "unavailable";
    const allDayPreferred = am === "preferred" && pm === "preferred";
    const splitDay = !allDayOff && !allDayPreferred && am !== pm;
    const preferenceLabel = (value) => value === "unavailable" ? "unavailable" : value === "preferred" ? "preferred" : "available";
    const compactMark = (preference, shift) => {
      if (preference === "available") return `<span class="mobile-availability-overview-slot ${shift.toLowerCase()} available" aria-hidden="true"></span>`;
      return `<span class="mobile-availability-overview-slot ${shift.toLowerCase()} ${preference}" aria-hidden="true">${preference === "unavailable" ? "×" : "★"}</span>`;
    };
    const label = `${employee.name} ${day.name}: morning ${preferenceLabel(am)}, night ${preferenceLabel(pm)}`;
    return `<td class="mobile-availability-overview-cell ${allDayOff ? "all-day-off" : ""} ${allDayPreferred ? "all-day-preferred" : ""} ${splitDay ? "split-day" : ""}" aria-label="${escapeHtml(label)}">${allDayOff ? `<span class="mobile-availability-overview-x" aria-hidden="true">×</span>` : allDayPreferred ? `<span class="mobile-availability-overview-star" aria-hidden="true">★</span>` : `${compactMark(am, "AM")}${compactMark(pm, "PM")}`}</td>`;
  }

  function renderAvailabilityMatrix() {
    if (state.role !== "manager") return;
    const targetRow = `<tr class="availability-target-row"><th scope="row"><strong>Monday</strong><small>Store closed · requested days</small></th>${state.team.map((employee) => `<td class="availability-target-cell"><div><input type="number" min="0" max="6" value="${employee.minDays}" data-availability-min="${employee.id}" aria-label="${escapeHtml(employee.name)} minimum days"><span>-</span><input type="number" min="0" max="6" value="${employee.maxDays}" data-availability-max="${employee.id}" aria-label="${escapeHtml(employee.name)} maximum days"></div></td>`).join("")}</tr>`;
    const dayRows = demoData.days.map((day) => `<tr class="availability-day-row"><th scope="row"><strong>${day.name}</strong><small>${day.short}</small></th>${state.team.map((employee) => availabilityShiftCellMarkup(employee, day)).join("")}</tr>`).join("");
    const noteRow = `<tr class="availability-notes-row"><th scope="row"><strong>Notes</strong><small>Rules & preferences</small></th>${state.team.map((employee) => `<td class="availability-note-cell"><textarea rows="2" data-availability-note="${employee.id}" aria-label="${escapeHtml(employee.name)} scheduling note" placeholder="—">${escapeHtml(employee.notes || "")}</textarea></td>`).join("")}</tr>`;
    const headers = state.team.map((employee) => `<th><strong>${escapeHtml(employee.name)}</strong><small>${escapeHtml(employee.code || "")}</small></th>`).join("");
    const selectedMobileEmployee = state.team.find((employee) => String(employee.id) === String(state.availabilityMobileEmployeeId)) || state.team[0];
    if (selectedMobileEmployee) state.availabilityMobileEmployeeId = selectedMobileEmployee.id;
    const selectedMobileIndex = selectedMobileEmployee ? state.team.findIndex((employee) => String(employee.id) === String(selectedMobileEmployee.id)) : -1;
    const mobileEmployeeOptions = state.team.map((employee) => `<option value="${escapeHtml(String(employee.id))}" ${String(employee.id) === String(selectedMobileEmployee?.id) ? "selected" : ""}>${escapeHtml(employee.name)}</option>`).join("");
    const mobileWorkingDays = scheduleWeekRows(state.settings.weekStart).filter((day) => !day.closed);
    const mobileDateFormatter = new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric" });
    const mobileDayHeaders = mobileWorkingDays.map((day) => `<th scope="col"><strong>${escapeHtml(day.name.slice(0, 3))}</strong><small>${mobileDateFormatter.format(day.date)}</small></th>`).join("");
    const mobileOverviewRows = state.team.map((employee) => `<tr><th scope="row"><strong>${escapeHtml(employee.name)}</strong><small>${employee.minDays}-${employee.maxDays}</small></th>${demoData.days.map((day) => mobileAvailabilityOverviewCellMarkup(employee, day)).join("")}</tr>`).join("");
    const mobileEditor = selectedMobileEmployee ? `<details class="mobile-availability-editor">
        <summary><span><strong>Edit availability</strong><small>One employee at a time</small></span><span aria-hidden="true">⌄</span></summary>
        <div class="mobile-availability-editor-body">
          <div class="mobile-availability-picker">
            <button type="button" data-mobile-availability-step="-1" aria-label="Previous employee">‹</button>
            <label><span>Employee ${selectedMobileIndex + 1} of ${state.team.length}</span><select data-mobile-availability-employee aria-label="Choose employee">${mobileEmployeeOptions}</select></label>
            <button type="button" data-mobile-availability-step="1" aria-label="Next employee">›</button>
          </div>
          <div class="mobile-availability-target">
            <span><strong>Requested days</strong><small>Minimum–maximum</small></span>
            <div><input type="number" min="0" max="6" value="${selectedMobileEmployee.minDays}" data-availability-min="${selectedMobileEmployee.id}" aria-label="${escapeHtml(selectedMobileEmployee.name)} minimum days"><span>–</span><input type="number" min="0" max="6" value="${selectedMobileEmployee.maxDays}" data-availability-max="${selectedMobileEmployee.id}" aria-label="${escapeHtml(selectedMobileEmployee.name)} maximum days"></div>
          </div>
          <div class="mobile-availability-days">${demoData.days.map((day) => `<article class="mobile-availability-day"><header><strong>${day.name}</strong><small>${day.short}</small></header>${availabilityShiftCellMarkup(selectedMobileEmployee, day, "div")}</article>`).join("")}</div>
          <label class="mobile-availability-note"><span>Notes</span><textarea rows="3" data-availability-note="${selectedMobileEmployee.id}" aria-label="${escapeHtml(selectedMobileEmployee.name)} scheduling note" placeholder="No notes">${escapeHtml(selectedMobileEmployee.notes || "")}</textarea></label>
        </div>
      </details>` : "";
    const mobileAvailability = state.team.length ? `<section class="availability-mobile-view" aria-label="Mobile team availability sheet">
        <div class="mobile-availability-overview-title"><strong>Team availability</strong><span>${scheduleWeekLabel(state.settings.weekStart)}</span></div>
        <table class="mobile-availability-overview">
          <thead><tr><th scope="col">Team<small>days</small></th>${mobileDayHeaders}</tr></thead>
          <tbody><tr class="mobile-availability-closed"><th scope="row">Monday</th><td colspan="${mobileWorkingDays.length}">CLOSED</td></tr>${mobileOverviewRows}</tbody>
        </table>
        <p class="mobile-availability-overview-help">Red X = unavailable. A top or bottom X means only that shift is unavailable.</p>
        ${mobileEditor}
      </section>` : `<section class="availability-mobile-view"><p class="inventory-empty">No active employees.</p></section>`;
    elements.availabilityMatrix.innerHTML = `<div class="availability-matrix-summary"><span><strong>${state.team.length}</strong> active employees</span><span><strong>${scheduleWeekLabel(state.settings.weekStart)}</strong> schedule week</span></div>
      <div class="availability-desktop-view"><div class="availability-matrix-wrap"><table class="availability-matrix"><caption>Team availability for ${scheduleWeekLabel(state.settings.weekStart)}</caption><thead><tr><th>Day</th>${headers}</tr></thead><tbody>${targetRow}${dayRows}${noteRow}</tbody></table></div></div>
      ${mobileAvailability}
      <div class="availability-matrix-legend"><span><b class="legend-available">blank</b> Available</span><span><b class="legend-preferred">★</b> Preferred</span><span><b class="legend-unavailable">×</b> Cannot work</span><small>A divider appears only when morning and night differ: morning is above the line and night is below it. A large X means the employee cannot work that entire day.</small></div>`;
  }

  async function saveAvailabilityMatrix() {
    if (state.role !== "manager" || state.availabilitySheetBusy) return;
    const invalid = state.team.find((employee) => Number(employee.minDays) > Number(employee.maxDays));
    if (invalid) {
      showToast(`${invalid.name}'s minimum cannot be higher than their maximum.`);
      return;
    }
    state.availabilitySheetBusy = true;
    const button = document.querySelector("#saveAvailabilitySheet");
    button.disabled = true;
    button.textContent = "Saving…";
    try {
      if (state.mode === "demo") saveDemoTeam();
      if (state.mode === "supabase") {
        const now = new Date().toISOString();
        const payloads = state.team.map((employee) => ({
          employee_id: employee.id,
          week_start: state.settings.weekStart,
          min_shifts: Number(employee.minDays),
          max_shifts: Number(employee.maxDays),
          notes: employee.notes || "",
          status: "submitted",
          submitted_at: now,
        }));
        const { data: requests, error } = await supabaseClient.from("weekly_requests")
          .upsert(payloads, { onConflict: "employee_id,week_start" }).select("id, employee_id");
        if (error) throw new Error(error.message);
        const savedRequests = requests || [];
        const requestIds = savedRequests.map((request) => request.id);
        if (requestIds.length) {
          const { error: deleteError } = await supabaseClient.from("availability_slots").delete().in("request_id", requestIds);
          if (deleteError) throw new Error(deleteError.message);
        }
        const employeeById = new Map(state.team.map((employee) => [employee.id, employee]));
        const slots = savedRequests.flatMap((request) => {
          const employee = employeeById.get(request.employee_id);
          return demoData.days.flatMap((day) => ["AM", "PM"].map((shift) => ({
            request_id: request.id,
            work_day: day.number,
            shift,
            preference: employee.availability[day.name][shift],
            willing_double: (employee.willingDouble || []).includes(day.name),
          })));
        });
        const { error: slotError } = await supabaseClient.from("availability_slots").insert(slots);
        if (slotError) throw new Error(slotError.message);
      }
      state.team.forEach((employee) => { employee.submitted = true; });
      renderDashboard();
      renderRequests();
      renderAvailabilityMatrix();
      renderScheduleModule();
      showToast("Availability sheet saved for this schedule week.");
    } catch (error) {
      showToast(`Could not save availability: ${error.message}`);
    } finally {
      state.availabilitySheetBusy = false;
      const nextButton = document.querySelector("#saveAvailabilitySheet");
      nextButton.disabled = false;
      nextButton.textContent = "Save changes";
    }
  }

  function roleLabel(skill) {
    return { key_holder: "Key holder", ic_maker: "IC maker", trainer: "Trainer", manager: "Manager" }[skill] || skill;
  }

  function findManagedEmployee(employeeId) {
    return [...state.team, ...state.hiddenTeam].find((employee) => employee.id === employeeId);
  }

  function skillPickerHtml(selectedSkills = []) {
    const selected = new Set(selectedSkills);
    return `<fieldset class="skill-picker"><legend>Scheduling qualifications</legend>
      <label><input type="checkbox" name="skills" value="key_holder" ${selected.has("key_holder") ? "checked" : ""}><span><strong>Key holder</strong><small>Can open or close the store.</small></span></label>
      <label><input type="checkbox" name="skills" value="ic_maker" ${selected.has("ic_maker") ? "checked" : ""}><span><strong>IC maker</strong><small>Can be assigned flexible production days.</small></span></label>
      <label><input type="checkbox" name="skills" value="trainer" ${selected.has("trainer") ? "checked" : ""}><span><strong>Trainer</strong><small>Can train employees in qualified work.</small></span></label>
    </fieldset>`;
  }

  function renderEmployeeAccountManager() {
    if (state.role !== "manager") {
      elements.employeeAccountManager.innerHTML = "";
      elements.showEmployeeAccountForm.hidden = true;
      return;
    }
    elements.showEmployeeAccountForm.hidden = false;
    elements.showEmployeeAccountForm.textContent = state.showingEmployeeAccountForm ? "Close form" : "Add employee";
    const editingEmployee = findManagedEmployee(state.editingSkillsEmployeeId);
    if (editingEmployee) {
      const editingIsActive = editingEmployee.active !== false;
      elements.employeeAccountManager.innerHTML = `<section class="panel account-manager-panel">
        <div class="panel-heading"><div><p class="eyebrow">Edit qualifications</p><h3>${escapeHtml(editingEmployee.name)}</h3></div><span class="request-status ${editingIsActive ? "submitted" : "missing"}">${editingIsActive ? "Active" : "Hidden"}</span></div>
        <form id="employeeSkillsForm" class="employee-account-form" data-employee-id="${escapeHtml(editingEmployee.id)}">
          ${skillPickerHtml(editingEmployee.skills)}
          <div class="account-form-actions"><button id="cancelEmployeeSkillsForm" class="secondary-button" type="button">Cancel</button><button class="primary-button compact" type="submit">Save qualifications</button></div>
          <p id="employeeSkillsMessage" class="form-message account-message" role="status"></p>
        </form>
      </section>`;
      return;
    }
    if (!state.showingEmployeeAccountForm) {
      elements.employeeAccountManager.innerHTML = `<section class="panel account-summary-panel"><div><strong>${state.team.length} active · ${state.hiddenTeam.length} hidden</strong><p>Use the tabs below to switch between the current team and paused employee cards.</p></div></section>`;
      return;
    }
    elements.employeeAccountManager.innerHTML = `<section class="panel account-manager-panel">
      <div class="panel-heading"><div><p class="eyebrow">New employee account</p><h3>Create their portal login</h3></div><span class="request-status submitted">Employee access</span></div>
      <form id="employeeAccountForm" class="employee-account-form">
        <div class="account-form-grid">
          <label class="field-label">Employee name<input name="displayName" maxlength="50" autocomplete="off" placeholder="Example: Nora" required></label>
          <label class="field-label">Employee ID<input name="employeeCode" minlength="4" maxlength="20" autocapitalize="characters" autocomplete="off" placeholder="Example: NORA01" required><small>Letters, numbers, and hyphens only.</small></label>
          <label class="field-label">Seven-digit PIN<input name="password" type="password" inputmode="numeric" pattern="\\d{7}" minlength="7" maxlength="7" autocomplete="new-password" placeholder="Exactly 7 digits" required><small>Tell the employee privately. The app never displays it again.</small></label>
          <div class="account-days-grid">
            <label class="field-label">Minimum days<input name="minDays" type="number" min="0" max="6" value="2" required></label>
            <label class="field-label">Maximum days<input name="maxDays" type="number" min="0" max="6" value="4" required></label>
          </div>
        </div>
        ${skillPickerHtml()}
        <div class="account-form-actions"><button id="cancelEmployeeAccountForm" class="secondary-button" type="button">Cancel</button><button class="primary-button compact" type="submit">Create employee account</button></div>
        <p id="employeeAccountMessage" class="form-message account-message" role="status"></p>
      </form>
    </section>`;
  }

  async function invokeEmployeeAccountAction(body) {
    const { data, error } = await supabaseClient.functions.invoke("manage-employee", { body });
    if (!error) return data;
    let message = error.message || "The account request failed.";
    try {
      const details = await error.context?.json();
      if (details?.error) message = details.error;
    } catch (_) {
      // Keep the original Supabase error when the response is not JSON.
    }
    throw new Error(message);
  }

  async function createEmployeeAccount(form) {
    if (state.role !== "manager" || state.mode !== "supabase" || state.accountActionBusy) {
      showToast(state.mode === "demo" ? "Sign in with the manager account to create real logins." : "Manager access is required.");
      return;
    }
    const formData = new FormData(form);
    const minDays = Number(formData.get("minDays"));
    const maxDays = Number(formData.get("maxDays"));
    const message = form.querySelector("#employeeAccountMessage");
    if (minDays > maxDays) {
      message.textContent = "Minimum days cannot be higher than maximum days.";
      return;
    }
    state.accountActionBusy = true;
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Creating…";
    message.textContent = "Creating the secure login…";
    try {
      const result = await invokeEmployeeAccountAction({
        action: "create",
        displayName: String(formData.get("displayName") || "").trim(),
        employeeCode: String(formData.get("employeeCode") || "").trim().toUpperCase(),
        password: String(formData.get("password") || ""),
        minDays,
        maxDays,
        skills: formData.getAll("skills"),
      });
      const employee = result.employee;
      state.team = state.team.filter((item) => item.id !== employee.id && item.code !== employee.employee_code);
      state.hiddenTeam = state.hiddenTeam.filter((item) => item.id !== employee.id && item.code !== employee.employee_code);
      state.team.push({
        id: employee.id,
        code: employee.employee_code,
        name: employee.display_name,
        minDays: employee.min_shifts,
        maxDays: employee.max_shifts,
        skills: employee.skills || [],
        submitted: false,
        willingDouble: [],
        availability: demoData.availability(),
        notes: "",
        active: true,
        hasLogin: true,
      });
      state.team = sortTeamBySeniority(state.team);
      state.showingEmployeeAccountForm = false;
      state.teamView = "active";
      renderAll();
      openTeamOnHome();
      showToast(`${employee.display_name}'s account was created.`);
    } catch (error) {
      message.textContent = error.message;
    } finally {
      state.accountActionBusy = false;
      submitButton.disabled = false;
      submitButton.textContent = "Create employee account";
    }
  }

  async function updateEmployeeSkills(form) {
    if (state.role !== "manager" || state.mode !== "supabase" || state.accountActionBusy) return;
    const employeeId = form.dataset.employeeId;
    const employee = findManagedEmployee(employeeId);
    if (!employee) return;
    const message = form.querySelector("#employeeSkillsMessage");
    const submitButton = form.querySelector('button[type="submit"]');
    state.accountActionBusy = true;
    submitButton.disabled = true;
    submitButton.textContent = "Saving…";
    message.textContent = "Saving qualifications…";
    try {
      const formData = new FormData(form);
      const result = await invokeEmployeeAccountAction({ action: "updateSkills", employeeId, skills: formData.getAll("skills") });
      employee.skills = result.skills || [];
      state.editingSkillsEmployeeId = null;
      renderAll();
      openTeamOnHome();
      showToast(`${employee.name}'s qualifications were updated.`);
    } catch (error) {
      message.textContent = error.message;
      submitButton.disabled = false;
      submitButton.textContent = "Save qualifications";
    } finally {
      state.accountActionBusy = false;
    }
  }

  async function hideEmployeeAccess(employeeId) {
    if (state.role !== "manager" || state.mode !== "supabase" || state.accountActionBusy) return;
    const employee = state.team.find((item) => item.id === employeeId);
    if (!employee) return;
    const approved = window.confirm(`Hide ${employee.name}?\n\nThey will not appear in scheduling and cannot sign in until restored. Their PIN, requests, and history will be kept.`);
    if (!approved) return;
    state.accountActionBusy = true;
    try {
      await invokeEmployeeAccountAction({ action: "hide", employeeId });
      state.team = state.team.filter((item) => item.id !== employeeId);
      state.hiddenTeam.push({ ...employee, active: false });
      state.hiddenTeam.sort((a, b) => a.name.localeCompare(b.name));
      state.teamView = "hidden";
      renderAll();
      openTeamOnHome();
      showToast(`${employee.name} is hidden and can be restored later.`);
    } catch (error) {
      showToast(error.message);
    } finally {
      state.accountActionBusy = false;
    }
  }

  async function restoreEmployeeAccess(employeeId) {
    if (state.role !== "manager" || state.mode !== "supabase" || state.accountActionBusy) return;
    const employee = state.hiddenTeam.find((item) => item.id === employeeId);
    if (!employee) return;
    state.accountActionBusy = true;
    try {
      await invokeEmployeeAccountAction({ action: "restore", employeeId });
      state.hiddenTeam = state.hiddenTeam.filter((item) => item.id !== employeeId);
      state.team.push({ ...employee, active: true });
      state.team = sortTeamBySeniority(state.team);
      state.teamView = "active";
      renderAll();
      openTeamOnHome();
      showToast(`${employee.name} is active again with the same login and PIN.`);
    } catch (error) {
      showToast(error.message);
    } finally {
      state.accountActionBusy = false;
    }
  }

  async function removeEmployeeAccess(employeeId) {
    if (state.role !== "manager" || state.mode !== "supabase" || state.accountActionBusy) {
      showToast(state.mode === "demo" ? "Sign in with the manager account to remove real access." : "Manager access is required.");
      return;
    }
    const employee = findManagedEmployee(employeeId);
    if (!employee) return;
    const approved = window.confirm(`Permanently remove ${employee.name}?\n\nTheir login and availability requests will be deleted. Published schedule history will be preserved. This cannot be undone.`);
    if (!approved) return;
    state.accountActionBusy = true;
    const button = document.querySelector(`[data-remove-employee="${CSS.escape(employeeId)}"]`);
    if (button) {
      button.disabled = true;
      button.textContent = "Removing…";
    }
    try {
      await invokeEmployeeAccountAction({ action: "remove", employeeId });
      state.team = state.team.filter((item) => item.id !== employeeId);
      state.hiddenTeam = state.hiddenTeam.filter((item) => item.id !== employeeId);
      renderAll();
      openTeamOnHome();
      showToast(`${employee.name}'s login access was permanently removed.`);
    } catch (error) {
      showToast(error.message);
      if (button) {
        button.disabled = false;
        button.textContent = "Remove access";
      }
    } finally {
      state.accountActionBusy = false;
    }
  }

  function savedAssignmentParts(dayNumber) {
    return state.employeeAssignments.filter((assignment) => assignment.work_day === dayNumber).map((assignment) => {
      if (assignment.assignment_type === "AM") return { text: `11:30${assignment.requires_approval ? "*" : ""}`, type: "morning", hours: 6 };
      if (assignment.assignment_type === "PM") return { text: `5:30${assignment.requires_approval ? "*" : ""}`, type: "night", hours: 5 };
      if (assignment.assignment_type === "IC") return { text: "IC production", type: "ic", hours: 11, fullDay: true };
      const [role = "training", shift = "FULL"] = String(assignment.notes || "training:FULL").split(":");
      const time = shift === "AM" ? "11:30" : shift === "PM" ? "5:30" : "IC";
      return {
        text: `${time} ${role === "trainee" ? "Training" : "Trainer"}`,
        type: role === "trainee" ? "trainee" : "trainer",
        hours: shift === "AM" ? 6 : shift === "PM" ? 5 : 11,
        fullDay: shift === "FULL",
      };
    });
  }

  function estimatedDayHours(parts) {
    if (parts.some((part) => part.fullDay)) return 11;
    return parts.reduce((total, part) => total + (part.hours || 0), 0);
  }

  function employeeScheduleParts(employee, day) {
    if (state.mode === "demo") {
      const option = state.options[state.publishedOption ?? 0];
      return option ? scheduleCellParts(option, day.name, employee.id) : [];
    }
    return savedAssignmentParts(day.number);
  }

  function renderEmployeeWeek(employee) {
    const hasPublishedSchedule = state.mode === "demo" ? state.options.length > 0 : Boolean(state.publishedSchedule);
    const weekStart = state.mode === "demo"
      ? state.settings.weekStart
      : (state.publishedSchedule?.week_start || state.settings.weekStart);
    const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
    const dayNumberByName = Object.fromEntries(demoData.days.map((day) => [day.name, day.number]));
    let estimatedHours = 0;
    const dayCards = scheduleWeekRows(weekStart).map((day) => {
      if (day.closed) return `<article class="employee-day-card closed"><span>${day.name}</span><strong>Closed</strong><small>${dateFormatter.format(day.date)}</small></article>`;
      const parts = hasPublishedSchedule ? employeeScheduleParts(employee, { ...day, number: dayNumberByName[day.name] }) : [];
      const dayHours = estimatedDayHours(parts);
      estimatedHours += dayHours;
      return `<article class="employee-day-card ${parts.length ? "working" : "off"}"><span>${day.name}</span><strong>${parts.length ? parts.map((part) => `<b class="portal-shift ${part.type}">${escapeHtml(part.text)}</b>`).join("") : "Off"}</strong>${dayHours ? `<em>Est. ${dayHours}h</em>` : ""}<small>${dateFormatter.format(day.date)}</small></article>`;
    }).join("");
    return `<section class="panel employee-week-panel">
      <div class="panel-heading"><div><p class="eyebrow">My published schedule</p><h3>${scheduleWeekLabel(weekStart)}</h3></div><span class="request-status ${hasPublishedSchedule ? "submitted" : "missing"}">${hasPublishedSchedule ? `Est. ${estimatedHours}h` : "Not posted"}</span></div>
      ${hasPublishedSchedule ? `<div class="employee-week-grid">${dayCards}</div><p class="portal-note">Morning is estimated at 6 hours and night at 5 hours. IC and full-day training use an 11-hour estimate but actual flexible production time may vary. Contact a manager before treating a double marked * as approved.</p>` : `<div class="warning-box">No schedule has been published for you yet. Your request form is still available below.</div>`}
    </section>`;
  }

  function renderTeamCard(employee, hidden = false) {
    const skills = employee.skills.length ? employee.skills : ["team_member"];
    const accessLabel = hidden ? "Hidden" : employee.hasLogin ? "Portal ready" : "Setup needed";
    const accessClass = hidden || !employee.hasLogin ? "missing" : "submitted";
    const actions = hidden
      ? `<button class="secondary-button employee-action-button" type="button" data-edit-skills="${employee.id}">Edit qualifications</button><button class="primary-button employee-action-button" type="button" data-restore-employee="${employee.id}">Restore employee</button><button class="remove-access-button" type="button" data-remove-employee="${employee.id}">Remove permanently</button>`
      : `<button class="secondary-button employee-action-button" type="button" data-edit-skills="${employee.id}">Edit qualifications</button><button class="secondary-button employee-action-button" type="button" data-hide-employee="${employee.id}">Hide employee</button><button class="remove-access-button" type="button" data-remove-employee="${employee.id}">Remove permanently</button>`;
    return `<article class="team-card ${hidden ? "hidden-team-card" : ""}" data-initial="${escapeHtml(employee.name[0])}">
      <div class="team-card-heading"><div><h3>${escapeHtml(employee.name)}</h3><p>${escapeHtml(employee.code || "No employee ID")}</p></div><span class="request-status ${accessClass}">${accessLabel}</span></div>
      <p>${employee.minDays}–${employee.maxDays} requested working days</p>
      <div class="skill-tags">${skills.map((skill) => `<span class="${skill === "key_holder" ? "key" : skill === "ic_maker" ? "ic" : skill === "trainer" ? "train" : ""}">${skill === "team_member" ? "Team member" : roleLabel(skill)}</span>`).join("")}</div>
      ${state.role === "manager" ? `<div class="employee-card-actions">${actions}</div>` : ""}
    </article>`;
  }

  function renderTeam() {
    renderEmployeeAccountManager();
    document.querySelector("#activeTeamCount").textContent = state.team.length;
    document.querySelector("#hiddenTeamCount").textContent = state.hiddenTeam.length;
    document.querySelectorAll("[data-team-view]").forEach((button) => {
      const active = button.dataset.teamView === state.teamView;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    elements.activeTeamPanel.hidden = state.teamView !== "active";
    elements.hiddenTeamPanel.hidden = state.teamView !== "hidden";
    elements.team.innerHTML = state.team.map((employee) => renderTeamCard(employee)).join("");
    elements.hiddenTeam.innerHTML = state.hiddenTeam.length
      ? state.hiddenTeam.map((employee) => renderTeamCard(employee, true)).join("")
      : `<div class="warning-box good hidden-team-empty">No employees are hidden.</div>`;
  }

  function requestHost() {
    return state.role === "manager" ? elements.scheduleRequests : elements.employeeRequests;
  }

  function renderRequests() {
    if (state.role !== "manager") {
      document.querySelector("#requestPageEyebrow").textContent = "Employee portal";
      document.querySelector("#requestPageTitle").textContent = "My schedule & request";
      document.querySelector("#requestPageCopy").textContent = "See your assigned shifts and update only your own weekly availability.";
      renderRequestForm(state.profile.id);
      return;
    }
    document.querySelector("#requestPageEyebrow").textContent = "Availability";
    document.querySelector("#requestPageTitle").textContent = "Weekly requests";
    document.querySelector("#requestPageCopy").textContent = "Employees submit available days, preferred shifts, and possible doubles.";
    if (state.editingEmployeeId) {
      renderRequestForm(state.editingEmployeeId);
      return;
    }
    requestHost().innerHTML = `<div class="request-toolbar"><div><strong>${scheduleWeekLabel(state.settings.weekStart)}</strong><p>${state.team.filter((employee) => employee.submitted).length} of ${state.team.length} submitted</p></div></div>
      <div class="request-list">${state.team.map((employee) => `
        <button class="request-card request-open" data-edit-request="${employee.id}"><span><h3>${escapeHtml(employee.name)}</h3><p>${employee.submitted ? `${employee.minDays}–${employee.maxDays} days · ${employee.willingDouble.length ? "Can double " + employee.willingDouble.join(", ") : "No doubles offered"}` : "Waiting for this week's request"}</p></span><span class="request-status ${employee.submitted ? "submitted" : "missing"}">${employee.submitted ? "Submitted" : "Missing"}</span></button>`).join("")}</div>`;
  }

  function availabilityPreviewData(form) {
    const days = demoData.days.map((day) => {
      const am = form.elements[`${day.name}-AM`]?.value || "available";
      const pm = form.elements[`${day.name}-PM`]?.value || "available";
      const willingDouble = Boolean(form.elements[`double-${day.name}`]?.checked) && am !== "unavailable" && pm !== "unavailable";
      let label = "Can't work";
      let entries = `<span class="off-mark">×</span>`;
      let minHours = 0;
      let maxHours = 0;
      if (am !== "unavailable" && pm !== "unavailable") {
        if (willingDouble) {
          label = "Possible double · up to 11h";
          entries = `<span class="sheet-entry ${am === "preferred" ? "preferred" : "morning"}">11:30</span><span class="sheet-entry ${pm === "preferred" ? "preferred" : "night"}">5:30</span>`;
          minHours = 5;
          maxHours = 11;
        } else {
          label = "Either shift · 5–6h";
          entries = `<span class="sheet-entry ${am === "preferred" ? "preferred" : "morning"}">11:30</span><span class="or-mark">or</span><span class="sheet-entry ${pm === "preferred" ? "preferred" : "night"}">5:30</span>`;
          minHours = 5;
          maxHours = 6;
        }
      } else if (am !== "unavailable") {
        label = `Morning${am === "preferred" ? " preferred" : ""} · 6h`;
        entries = `<span class="sheet-entry ${am === "preferred" ? "preferred" : "morning"}">11:30</span>`;
        minHours = 6;
        maxHours = 6;
      } else if (pm !== "unavailable") {
        label = `Night${pm === "preferred" ? " preferred" : ""} · 5h`;
        entries = `<span class="sheet-entry ${pm === "preferred" ? "preferred" : "night"}">5:30</span>`;
        minHours = 5;
        maxHours = 5;
      }
      return { ...day, label, entries, minHours, maxHours };
    });
    return {
      days,
      minDays: Math.max(0, Math.min(6, Number(form.elements.minDays?.value) || 0)),
      maxDays: Math.max(0, Math.min(6, Number(form.elements.maxDays?.value) || 0)),
    };
  }

  function renderAvailabilityPreview(form) {
    const preview = form?.querySelector("#availabilityPreview");
    if (!preview) return;
    const employee = state.team.find((item) => item.id === form.dataset.employeeId);
    const draft = availabilityPreviewData(form);
    const availableDays = draft.days.filter((day) => day.maxHours > 0);
    const lowerCount = Math.min(draft.minDays, availableDays.length);
    const upperCount = Math.min(Math.max(draft.minDays, draft.maxDays), availableDays.length);
    const lowHours = availableDays.map((day) => day.minHours).sort((a, b) => a - b).slice(0, lowerCount).reduce((sum, hours) => sum + hours, 0);
    const highHours = availableDays.map((day) => day.maxHours).sort((a, b) => b - a).slice(0, upperCount).reduce((sum, hours) => sum + hours, 0);
    const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric" });
    const byName = Object.fromEntries(draft.days.map((day) => [day.name, day]));
    const rows = scheduleWeekRows(state.settings.weekStart).map((day) => {
      const heading = `<strong>${day.name}</strong><small>${dateFormatter.format(day.date)}</small>`;
      if (day.closed) return `<tr class="closed-row"><th>${heading}</th><td>CLOSED</td></tr>`;
      const availability = byName[day.name];
      return `<tr class="${availability.maxHours ? "" : "unavailable-row"}"><th>${heading}</th><td>${availability.entries}<small class="availability-cell-note">${escapeHtml(availability.label)}</small></td></tr>`;
    }).join("");
    const targetWarning = availableDays.length < draft.minDays
      ? `<p class="availability-warning">Only ${availableDays.length} available day${availableDays.length === 1 ? "" : "s"} selected for a ${draft.minDays}-day minimum.</p>`
      : "";
    preview.innerHTML = `<div class="availability-summary"><span><strong>${availableDays.length}</strong> days available</span><span><strong>${lowHours === highHours ? lowHours : `${lowHours}–${highHours}`}</strong> estimated hours</span></div>
      ${targetWarning}
      <div class="schedule-sheet-wrap availability-sheet-wrap"><table class="schedule-sheet availability-sheet"><caption>Possible week · ${scheduleWeekLabel(state.settings.weekStart)}</caption><thead><tr><th class="day-column">Day</th><th>${escapeHtml(employee?.name || "Me")}</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="schedule-legend"><span><b>11:30</b> Morning · 6h</span><span><b>5:30</b> Night · 5h</span><span><b>×</b> Can't work</span></div>
      <p class="portal-note">This is an availability preview, not a confirmed schedule. Estimated hours use your requested day range and may change when the manager publishes the schedule.</p>`;
  }

  function syncAvailabilityDayControls(form, dayName) {
    const row = form?.querySelector(`[data-availability-day="${dayName}"]`);
    if (!row) return;
    const am = form.elements[`${dayName}-AM`];
    const pm = form.elements[`${dayName}-PM`];
    const doubleInput = form.elements[`double-${dayName}`];
    const dayOffButton = row.querySelector("[data-day-off]");
    const allDayOff = am.value === "unavailable" && pm.value === "unavailable";
    const bothAvailable = am.value !== "unavailable" && pm.value !== "unavailable";
    if (!bothAvailable) doubleInput.checked = false;
    doubleInput.disabled = !bothAvailable;
    row.classList.toggle("all-day-off", allDayOff);
    dayOffButton.classList.toggle("active", allDayOff);
    dayOffButton.setAttribute("aria-pressed", String(allDayOff));
  }

  function renderRequestForm(employeeId) {
    const employee = state.team.find((item) => item.id === employeeId) || state.team.find((item) => item.code === state.profile.employee_code);
    if (!employee) {
      requestHost().innerHTML = `<div class="warning-box">This account is not linked to an active employee record yet.</div>`;
      return;
    }
    const dayRows = demoData.days.map((day) => {
      const am = employee.availability?.[day.name]?.AM || "available";
      const pm = employee.availability?.[day.name]?.PM || "available";
      const double = employee.willingDouble?.includes(day.name) && am !== "unavailable" && pm !== "unavailable";
      const allDayOff = am === "unavailable" && pm === "unavailable";
      const option = (value, current) => `<option value="${value}" ${value === current ? "selected" : ""}>${value[0].toUpperCase() + value.slice(1)}</option>`;
      return `<div class="availability-day ${allDayOff ? "all-day-off" : ""}" data-availability-day="${day.name}">
        <strong>${day.short}</strong>
        <label><span>Morning</span><select name="${day.name}-AM">${option("available", am)}${option("preferred", am)}${option("unavailable", am)}</select></label>
        <label><span>Night</span><select name="${day.name}-PM">${option("available", pm)}${option("preferred", pm)}${option("unavailable", pm)}</select></label>
        <button class="day-off-button ${allDayOff ? "active" : ""}" type="button" data-day-off="${day.name}" aria-pressed="${allDayOff}">Can't work all day</button>
        <label class="double-check"><input type="checkbox" name="double-${day.name}" ${double ? "checked" : ""} ${allDayOff ? "disabled" : ""}><span>Can double if asked</span></label>
      </div>`;
    }).join("");

    requestHost().innerHTML = `${state.role === "manager" ? `<button id="backToRequests" class="text-button back-button">← All employee requests</button>` : renderEmployeeWeek(employee)}
      <form id="requestForm" data-employee-id="${employee.id}" class="request-form">
        <section class="panel request-intro"><p class="eyebrow">Week of ${scheduleWeekLabel(state.settings.weekStart)}</p><h3>${state.role === "manager" ? `${escapeHtml(employee.name)}’s request` : "My availability request"}</h3><p>Unavailable is treated as a hard rule. Preferred shifts receive priority when possible. This request week moves forward automatically as each new scheduling week approaches.</p></section>
        <section class="panel">
          <div class="shift-targets">
            <label class="field-label">Minimum working days<input name="minDays" type="number" min="0" max="6" value="${employee.minDays}" required></label>
            <label class="field-label">Maximum working days<input name="maxDays" type="number" min="0" max="6" value="${employee.maxDays}" required></label>
          </div>
          <p class="target-help">A double shift still counts as one working day. For example, 3 days could be two doubles and one single shift.</p>
        </section>
        <section class="panel availability-preview-panel"><div class="panel-heading"><div><p class="eyebrow">Live preview</p><h3>What my week could look like</h3></div></div><div id="availabilityPreview" aria-live="polite"></div></section>
        <section class="panel"><div class="panel-heading"><div><p class="eyebrow">Availability</p><h3>Morning, night, or both</h3></div></div><div class="availability-grid">${dayRows}</div></section>
        <section class="panel"><label class="field-label">Notes for managers<textarea name="notes" rows="3" placeholder="Anything the scheduler should know…">${escapeHtml(employee.notes || "")}</textarea></label></section>
        <button class="primary-button request-submit" type="submit">Submit weekly request</button>
      </form>`;
    renderAvailabilityPreview(document.querySelector("#requestForm"));
  }

  async function generateSchedules() {
    if (state.role !== "manager") return;
    if (state.mode === "supabase") {
      const selectedTrainee = state.settings.trainingEnabled
        ? state.team.find((employee) => String(employee.id) === String(state.settings.traineeId))
        : null;
      if (state.settings.trainingEnabled && !selectedTrainee) {
        showToast("Choose an active trainee before generating schedules.");
        return;
      }
      const { error } = await supabaseClient.from("week_settings").upsert({
        week_start: state.settings.weekStart,
        ic_days_target: state.settings.icTarget,
        allow_consecutive_ic: state.settings.allowConsecutiveIC,
        training_enabled: state.settings.trainingEnabled,
        trainee_id: state.settings.trainingEnabled ? selectedTrainee.id : null,
        training_skill: state.settings.trainingSkill,
        training_day: null,
        training_shift: null,
        updated_by: state.profile.id,
      }, { onConflict: "week_start" });
      if (error) {
        showToast(`Could not save week settings: ${error.message}`);
        return;
      }
      const staffingRows = demoData.days.map((day) => ({
        week_start: state.settings.weekStart,
        work_day: day.number,
        am_need: state.settings.staffing[day.name].AM,
        pm_need: state.settings.staffing[day.name].PM,
      }));
      const { error: staffingError } = await supabaseClient.from("daily_staffing")
        .upsert(staffingRows, { onConflict: "week_start,work_day" });
      if (staffingError) {
        showToast(`Could not save daily staffing: ${staffingError.message}`);
        return;
      }
    }
    state.options = scheduler.generateOptions(state.team, state.settings, 5);
    state.selectedOption = null;
    state.savedScheduleIds = {};
    state.publishedOption = null;
    renderScheduleResults();
    const best = state.options[0];
    showToast(best.summary.criticalCount ? "Options generated with coverage warnings" : "Five schedule options generated");
  }

  function renderScheduleResults() {
    if (state.role !== "manager") {
      elements.warnings.innerHTML = `<div class="warning-box good">Your manager will publish the approved schedule here.</div>`;
      elements.results.innerHTML = "";
      return;
    }
    if (!state.options.length) {
      elements.warnings.innerHTML = `<div class="warning-box good">Set this week’s requirements, then generate options. The scheduler will explain every conflict instead of hiding it inside one score.</div>`;
      elements.results.innerHTML = "";
      return;
    }
    const best = state.options[0];
    const topWarnings = best.warnings.slice(0, 7);
    elements.warnings.innerHTML = `<div class="warning-box ${best.summary.criticalCount ? "" : "good"}"><strong>${best.summary.criticalCount ? `${best.summary.criticalCount} coverage issue(s) need review` : "Best option meets all hard coverage rules"}</strong><br>${best.summary.approvalCount ? `${best.summary.approvalCount} manager approval(s) are still needed.` : "No double-shift approvals are pending."}</div>${topWarnings.map((warning) => `<div class="warning-box warning-${warning.severity}">${escapeHtml(warning.text)}</div>`).join("")}`;
    elements.results.innerHTML = state.options.map((option, index) => {
      const selected = state.selectedOption === index;
      const saved = Boolean(state.savedScheduleIds[index]);
      const published = state.publishedOption === index;
      const chooseLabel = published ? "Published" : saved ? "Draft saved" : selected ? "Selected" : state.mode === "demo" ? "Choose schedule" : "Save draft";
      const publishButton = state.mode === "supabase" && saved && !published
        ? `<button class="primary-button compact publish-button" data-publish-option="${index}">Publish to employees</button>`
        : "";
      return `<article class="schedule-option ${index === 0 ? "best" : ""} ${selected ? "selected" : ""} ${published ? "published" : ""}">
        <div class="option-header"><div><span class="option-label">${index === 0 ? "Best match" : `Option ${index + 1}`}</span><h3>${option.summary.criticalCount ? `${option.summary.criticalCount} coverage issue(s)` : "All hard rules met"}</h3><p>Review the complete week and every team member in one schedule.</p></div><span class="score-chip">${published ? "Published" : selected ? "Selected" : `Score ${option.score}`}</span></div>
        ${buildScheduleSheet(option)}
        <div class="option-footer"><span>${option.summary.icDaysScheduled} IC days · ${option.summary.approvalCount} approvals</span><div class="schedule-actions"><button class="secondary-button compact" data-print-option="${index}">Print / Save PDF</button><button class="secondary-button compact" data-download-option="${index}">Download CSV</button><button class="secondary-button compact" data-use-option="${index}" ${selected || saved || published ? "disabled" : ""}>${chooseLabel}</button>${publishButton}</div></div>
      </article>`;
    }).join("");
  }

  async function saveRequest(form) {
    const employee = state.team.find((item) => item.id === form.dataset.employeeId);
    if (!employee) return;
    const formData = new FormData(form);
    const minDays = Number(formData.get("minDays"));
    const maxDays = Number(formData.get("maxDays"));
    if (minDays > maxDays) {
      showToast("Minimum days cannot be higher than maximum days.");
      return;
    }
    const availability = {};
    const willingDouble = [];
    demoData.days.forEach((day) => {
      availability[day.name] = { AM: formData.get(`${day.name}-AM`), PM: formData.get(`${day.name}-PM`) };
      if (formData.get(`double-${day.name}`)) willingDouble.push(day.name);
    });
    Object.assign(employee, { minDays, maxDays, availability, willingDouble, notes: formData.get("notes") || "", submitted: true });

    if (state.mode === "demo") saveDemoTeam();

    if (state.mode === "supabase") {
      const requestPayload = {
        employee_id: employee.id,
        week_start: state.settings.weekStart,
        min_shifts: minDays,
        max_shifts: maxDays,
        notes: employee.notes,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      };
      const { data: request, error } = await supabaseClient.from("weekly_requests")
        .upsert(requestPayload, { onConflict: "employee_id,week_start" }).select().single();
      if (error) {
        showToast(`Could not save request: ${error.message}`);
        return;
      }
      await supabaseClient.from("availability_slots").delete().eq("request_id", request.id);
      const slots = demoData.days.flatMap((day) => ["AM", "PM"].map((shift) => ({
        request_id: request.id,
        work_day: day.number,
        shift,
        preference: availability[day.name][shift],
        willing_double: willingDouble.includes(day.name),
      })));
      const { error: slotError } = await supabaseClient.from("availability_slots").insert(slots);
      if (slotError) {
        showToast(`Request saved, but availability failed: ${slotError.message}`);
        return;
      }
    }

    state.editingEmployeeId = null;
    renderAll();
    if (state.role === "manager") {
      state.scheduleModuleView = "availability";
      state.requestsExpanded = true;
      navigate("schedule");
      renderScheduleModule();
    }
    showToast(`${employee.name}'s weekly request was saved.`);
  }

  async function saveScheduleOption(optionIndex) {
    const option = state.options[optionIndex];
    if (!option) return;
    if (state.mode === "demo") {
      state.selectedOption = optionIndex;
      renderScheduleResults();
      showToast(`Option ${optionIndex + 1} selected for manager review.`);
      return;
    }

    const { data: scheduleRecord, error } = await supabaseClient.from("schedules").insert({
      week_start: state.settings.weekStart,
      option_number: optionIndex + 1,
      score: option.score,
      status: "draft",
      warnings: option.warnings,
      created_by: state.profile.id,
    }).select().single();
    if (error) {
      showToast(`Could not save schedule: ${error.message}`);
      return;
    }

    const dayNumber = Object.fromEntries(demoData.days.map((day) => [day.name, day.number]));
    const rows = [];
    Object.entries(option.schedule).forEach(([day, record]) => {
      ["AM", "PM"].forEach((shift) => record[shift].forEach((assignment) => rows.push({
        schedule_id: scheduleRecord.id, employee_id: assignment.employeeId, work_day: dayNumber[day],
        assignment_type: shift, shift_credits: 1, is_double: assignment.isDouble,
        requires_approval: assignment.requiresApproval, approved: !assignment.requiresApproval,
      })));
      record.IC.forEach((assignment) => rows.push({
        schedule_id: scheduleRecord.id, employee_id: assignment.employeeId, work_day: dayNumber[day],
        assignment_type: "IC", shift_credits: 2, approved: true,
      }));
      record.training.filter((assignment) => assignment.shiftCredits > 0).forEach((assignment) => rows.push({
        schedule_id: scheduleRecord.id, employee_id: assignment.employeeId, work_day: dayNumber[day],
        assignment_type: "TRAINING", shift_credits: assignment.shiftCredits, approved: true,
        notes: `${assignment.role || "training"}:${assignment.shift || "FULL"}`,
      }));
    });
    const { error: assignmentError } = await supabaseClient.from("schedule_assignments").insert(rows);
    if (assignmentError) {
      showToast(`Draft created, but assignments failed: ${assignmentError.message}`);
      return;
    }
    state.savedScheduleIds[optionIndex] = scheduleRecord.id;
    state.selectedOption = optionIndex;
    renderScheduleResults();
    showToast("Schedule draft saved for manager review.");
  }

  async function publishScheduleOption(optionIndex) {
    if (state.role !== "manager" || state.mode !== "supabase") return;
    const scheduleId = state.savedScheduleIds[optionIndex];
    if (!scheduleId) {
      showToast("Save this option as a draft first.");
      return;
    }
    const { error: archiveError } = await supabaseClient.from("schedules")
      .update({ status: "archived" }).eq("week_start", state.settings.weekStart).eq("status", "published");
    if (archiveError) {
      showToast(`Could not replace the previous schedule: ${archiveError.message}`);
      return;
    }
    const { error } = await supabaseClient.from("schedules").update({
      status: "published",
      published_at: new Date().toISOString(),
    }).eq("id", scheduleId);
    if (error) {
      showToast(`Could not publish schedule: ${error.message}`);
      return;
    }
    state.publishedOption = optionIndex;
    renderScheduleResults();
    showToast("Schedule published to employee portals.");
  }

  async function loadSupabaseApp(session) {
    const { data: profile, error: profileError } = await supabaseClient.from("employees")
      .select("*").eq("auth_user_id", session.user.id).maybeSingle();
    if (profileError || !profile) {
      await supabaseClient.auth.signOut();
      elements.loginMessage.textContent = "This login works, but it is not linked to an employee yet. Finish the Supabase setup first.";
      return;
    }
    if (!profile.active) {
      await supabaseClient.auth.signOut();
      elements.loginMessage.textContent = "Your employee account is currently paused. Contact a manager to reactivate it.";
      return;
    }

    const { data: teamRows, error: teamError } = await supabaseClient.from("employees")
      .select("*, employee_skills(skill)").order("display_name");
    if (teamError) {
      elements.loginMessage.textContent = `Database setup is incomplete: ${teamError.message}`;
      return;
    }

    const mappedTeam = teamRows.filter((employee) => employee.account_role !== "manager").map((employee) => {
      const recurring = recurringAvailabilityFor(employee);
      return {
        id: employee.id,
        code: employee.employee_code,
        name: employee.display_name,
        minDays: recurring?.minDays ?? employee.min_shifts,
        maxDays: recurring?.maxDays ?? employee.max_shifts,
        skills: employee.employee_skills.map((row) => row.skill),
        submitted: Boolean(recurring),
        willingDouble: clone(recurring?.willingDouble || []),
        availability: clone(recurring?.availability || demoData.availability()),
        notes: recurring?.notes || "",
        avoidDays: clone(recurring?.avoidDays || []),
        maxWeekendDays: recurring?.maxWeekendDays,
        active: Boolean(employee.active && employee.schedulable && activeSeniorityCodes.has(employee.employee_code)),
        hasLogin: Boolean(employee.auth_user_id),
      };
    });
    state.team = sortTeamBySeniority(mappedTeam.filter((employee) => employee.active));
    state.hiddenTeam = profile.account_role === "manager"
      ? mappedTeam.filter((employee) => !employee.active)
      : [];
    const currentProfileRow = teamRows.find((employee) => employee.id === profile.id);
    state.profileSkills = (currentProfileRow?.employee_skills || []).map((row) => row.skill);
    state.canAccessInventory = profile.account_role === "manager" || state.profileSkills.includes("ic_maker");

    const { data: requestRows } = await supabaseClient.from("weekly_requests")
      .select("*, availability_slots(*)").eq("week_start", state.settings.weekStart);
    (requestRows || []).forEach((request) => {
      const employee = state.team.find((item) => item.id === request.employee_id);
      if (!employee) return;
      employee.minDays = request.min_shifts;
      employee.maxDays = request.max_shifts;
      employee.notes = request.notes;
      employee.submitted = true;
      employee.willingDouble = [];
      request.availability_slots.forEach((slot) => {
        const day = demoData.days.find((item) => item.number === slot.work_day);
        if (!day) return;
        employee.availability[day.name][slot.shift] = slot.preference;
        if (slot.willing_double && !employee.willingDouble.includes(day.name)) employee.willingDouble.push(day.name);
      });
    });

    const { data: savedSettings } = await supabaseClient.from("week_settings").select("*").eq("week_start", state.settings.weekStart).maybeSingle();
    const loadedSettings = clone(demoData.defaultSettings);
    const demoDefaultTrainee = demoData.team.find((employee) => String(employee.id) === String(loadedSettings.traineeId));
    const liveDefaultTrainee = state.team.find((employee) => employee.code === demoDefaultTrainee?.code);
    loadedSettings.traineeId = liveDefaultTrainee?.id || null;
    loadedSettings.trainingEnabled = Boolean(loadedSettings.trainingEnabled && loadedSettings.traineeId);
    if (savedSettings) {
      Object.assign(loadedSettings, {
        weekStart: savedSettings.week_start,
        icTarget: savedSettings.ic_days_target,
        allowConsecutiveIC: savedSettings.allow_consecutive_ic,
        trainingEnabled: savedSettings.training_enabled,
        traineeId: savedSettings.trainee_id,
        trainingSkill: savedSettings.training_skill,
      });
    }
    if (loadedSettings.trainingEnabled && !state.team.some((employee) => String(employee.id) === String(loadedSettings.traineeId))) {
      loadedSettings.traineeId = liveDefaultTrainee?.id || null;
      loadedSettings.trainingEnabled = Boolean(loadedSettings.traineeId);
    }
    const { data: savedStaffing } = await supabaseClient.from("daily_staffing")
      .select("*").eq("week_start", loadedSettings.weekStart);
    (savedStaffing || []).forEach((row) => {
      const day = demoData.days.find((item) => item.number === row.work_day);
      if (day) loadedSettings.staffing[day.name] = { AM: row.am_need, PM: row.pm_need };
    });
    state.settings = loadedSettings;

    state.publishedSchedule = null;
    state.employeeAssignments = [];
    if (profile.account_role !== "manager") {
      const { data: publishedSchedule } = await supabaseClient.from("schedules")
        .select("id, week_start, published_at").eq("status", "published")
        .order("published_at", { ascending: false }).limit(1).maybeSingle();
      state.publishedSchedule = publishedSchedule || null;
      if (publishedSchedule) {
        const { data: assignments } = await supabaseClient.from("schedule_assignments")
          .select("work_day, assignment_type, requires_approval, approved, notes")
          .eq("schedule_id", publishedSchedule.id).eq("employee_id", profile.id);
        state.employeeAssignments = assignments || [];
      }
    }

    if (state.canAccessInventory) {
      await loadInventoryData();
    } else {
      state.inventoryFlavors = [];
      state.inventoryCatalog = [];
      state.inventoryHistory = [];
      state.inventoryError = "";
    }

    state.mode = "supabase";
    openApp({ ...profile, email: session.user.email || "", display_name: profile.display_name, account_role: profile.account_role, skills: state.profileSkills });
    startRequestSync();
  }

  async function handleLogin(event) {
    event.preventDefault();
    if (!supabaseClient) {
      elements.loginMessage.textContent = "The login service did not load. Please refresh the page and try again.";
      return;
    }
    const code = elements.loginId.value.trim();
    const password = elements.loginPin.value;
    elements.loginMessage.textContent = "Logging in…";
    let data;
    let error;

    if (code.includes("@")) {
      ({ data, error } = await supabaseClient.auth.signInWithPassword({ email: code, password }));
    } else {
      const { data: loginResult, error: resolverError } = await supabaseClient.functions.invoke("staff-login", {
        body: { employeeCode: code.toUpperCase(), password },
      });
      if (resolverError || !loginResult?.access_token || !loginResult?.refresh_token) {
        elements.loginMessage.textContent = "That employee ID or PIN is incorrect.";
        return;
      }
      ({ data, error } = await supabaseClient.auth.setSession({
        access_token: loginResult.access_token,
        refresh_token: loginResult.refresh_token,
      }));
    }

    if (error || !data?.session) {
      elements.loginMessage.textContent = error?.message === "Invalid login credentials"
        ? "That employee ID or PIN is incorrect."
        : error?.message || "That employee ID or PIN is incorrect.";
      return;
    }
    elements.loginMessage.textContent = "";
    await loadSupabaseApp(data.session);
  }

  async function initialize() {
    const today = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
    document.querySelector("#todayLabel").textContent = today;
    const previewMode = window.location.hostname === "terminal.local" && new URLSearchParams(window.location.search).get("preview") === "schedule";
    if (previewMode) {
      state.mode = "demo";
      const previewByCode = new Map(demoData.team.map((employee) => [employee.code, clone(employee)]));
      loadDemoTeam().forEach((employee) => previewByCode.set(employee.code, employee));
      const previewTeam = [...previewByCode.values()];
      state.team = sortTeamBySeniority(previewTeam.filter((employee) => activeSeniorityCodes.has(employee.code)));
      state.hiddenTeam = previewTeam
        .filter((employee) => !activeSeniorityCodes.has(employee.code))
        .map((employee) => ({ ...employee, active: false, hasLogin: true }))
        .sort((a, b) => a.name.localeCompare(b.name));
      state.scheduleModuleView = "availability";
      openApp({ id: "preview-manager", employee_code: "SWENSENSMANAGER", display_name: "Manager Preview", account_role: "manager", skills: ["manager"] });
      navigate("schedule");
      return;
    }
    if (!supabaseClient) return;
    const { data } = await supabaseClient.auth.getSession();
    if (data.session) await loadSupabaseApp(data.session);
  }

  elements.togglePin.addEventListener("click", () => {
    const showing = elements.loginPin.type === "text";
    elements.loginPin.type = showing ? "password" : "text";
    elements.togglePin.textContent = showing ? "Show" : "Hide";
  });
  elements.scheduleRequestsModule.addEventListener("toggle", () => {
    state.requestsExpanded = elements.scheduleRequestsModule.open;
  });
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.logoutButton.addEventListener("click", closeApp);
  elements.runDatabaseHealthCheck.addEventListener("click", runDatabaseHealthCheck);
  elements.showEmployeeAccountForm.addEventListener("click", () => {
    state.showingEmployeeAccountForm = !state.showingEmployeeAccountForm;
    renderEmployeeAccountManager();
    if (state.showingEmployeeAccountForm) document.querySelector('#employeeAccountForm input[name="displayName"]')?.focus();
  });
  document.querySelector("#generateButtonTop").addEventListener("click", generateSchedules);

  document.addEventListener("click", (event) => {
    const mobileAvailabilityStep = event.target.closest("[data-mobile-availability-step]");
    if (mobileAvailabilityStep && state.team.length) {
      const currentIndex = Math.max(0, state.team.findIndex((employee) => String(employee.id) === String(state.availabilityMobileEmployeeId)));
      const nextIndex = (currentIndex + Number(mobileAvailabilityStep.dataset.mobileAvailabilityStep) + state.team.length) % state.team.length;
      state.availabilityMobileEmployeeId = state.team[nextIndex].id;
      renderAvailabilityMatrix();
      return;
    }

    const manualDayButton = event.target.closest("[data-manual-mobile-day]");
    if (manualDayButton) {
      selectManualMobileDay(manualDayButton.closest("#manualMasterSheetForm"), manualDayButton.dataset.manualMobileDay);
      return;
    }

    const manualDayStep = event.target.closest("[data-manual-mobile-step]");
    if (manualDayStep) {
      const form = manualDayStep.closest("#manualMasterSheetForm");
      const current = Number(form.querySelector("[data-manual-mobile-day].active")?.dataset.manualMobileDay || 0);
      selectManualMobileDay(form, current + Number(manualDayStep.dataset.manualMobileStep));
      return;
    }

    const dayOffButton = event.target.closest("[data-day-off]");
    if (dayOffButton) {
      const form = dayOffButton.closest("#requestForm");
      const dayName = dayOffButton.dataset.dayOff;
      const am = form.elements[`${dayName}-AM`];
      const pm = form.elements[`${dayName}-PM`];
      const makingAvailable = am.value === "unavailable" && pm.value === "unavailable";
      am.value = makingAvailable ? "available" : "unavailable";
      pm.value = makingAvailable ? "available" : "unavailable";
      syncAvailabilityDayControls(form, dayName);
      renderAvailabilityPreview(form);
      return;
    }

    const navButton = event.target.closest("[data-nav]");
    const scheduleViewButton = event.target.closest("[data-schedule-view]");
    if (scheduleViewButton && state.role === "manager") {
      const requestedView = scheduleViewButton.dataset.scheduleView;
      state.scheduleModuleView = requestedView === "requests" ? "availability" : requestedView;
      if (requestedView === "requests") state.requestsExpanded = true;
      if (state.scheduleModuleView === "availability") renderAvailabilityMatrix();
      if (requestedView === "requests") renderRequests();
      navigate("schedule");
      renderScheduleModule();
      return;
    }
    if (navButton) {
      if (state.role === "manager" && navButton.dataset.nav === "schedule") {
        state.scheduleModuleView = "availability";
        renderAvailabilityMatrix();
        renderScheduleModule();
      }
      navigate(navButton.dataset.nav);
    }

    const teamViewButton = event.target.closest("[data-team-view]");
    if (teamViewButton) {
      state.teamView = teamViewButton.dataset.teamView;
      renderTeam();
      return;
    }

    const availabilitySlot = event.target.closest("[data-availability-employee][data-availability-day][data-availability-shift]");
    if (availabilitySlot) {
      const employee = state.team.find((item) => item.id === availabilitySlot.dataset.availabilityEmployee);
      if (!employee) return;
      const dayName = availabilitySlot.dataset.availabilityDay;
      const shift = availabilitySlot.dataset.availabilityShift;
      const statuses = ["available", "preferred", "unavailable"];
      const current = employee.availability[dayName][shift] || "available";
      employee.availability[dayName][shift] = statuses[(statuses.indexOf(current) + 1) % statuses.length];
      if (employee.availability[dayName].AM === "unavailable" || employee.availability[dayName].PM === "unavailable") {
        employee.willingDouble = employee.willingDouble.filter((day) => day !== dayName);
      }
      renderAvailabilityMatrix();
      return;
    }

    if (event.target.closest("#saveAvailabilitySheet")) {
      saveAvailabilityMatrix();
      return;
    }

    const inventoryModeButton = event.target.closest("[data-inventory-mode]");
    if (inventoryModeButton) {
      state.inventoryEntryMode = inventoryModeButton.dataset.inventoryMode;
      renderInventory();
      return;
    }

    const inventoryMasterButton = event.target.closest("[data-inventory-master-view]");
    if (inventoryMasterButton) {
      state.inventoryMasterView = inventoryMasterButton.dataset.inventoryMasterView;
      renderInventory();
      return;
    }

    const cameraModeButton = event.target.closest("[data-camera-mode]");
    if (cameraModeButton) {
      state.inventoryCameraMode = cameraModeButton.dataset.cameraMode;
      renderInventory();
      return;
    }

    if (event.target.closest("[data-read-inventory-scan]")) {
      readInventoryScan();
      return;
    }

    if (event.target.closest("[data-reset-inventory-scan]")) {
      resetInventoryScan();
      renderInventory();
      return;
    }

    if (event.target.closest("[data-read-production-scan]")) {
      readProductionScan();
      return;
    }

    if (event.target.closest("[data-reset-production-scan]")) {
      resetProductionScan();
      renderInventory();
      return;
    }

    if (event.target.closest("[data-add-production-row]")) {
      addProductionScanRow();
      return;
    }

    const removeProductionRow = event.target.closest("[data-remove-production-row]");
    if (removeProductionRow) {
      updateProductionScanState();
      state.productionScanRows = state.productionScanRows.filter((row) => row.id !== removeProductionRow.dataset.removeProductionRow);
      renderInventory();
      return;
    }

    if (event.target.closest("[data-archive-production-sheet]")) {
      startNextProductionSheet();
      return;
    }

    const viewProductionSheet = event.target.closest("[data-view-production-sheet]");
    if (viewProductionSheet) {
      state.productionSheetViewId = viewProductionSheet.dataset.viewProductionSheet;
      state.inventoryMasterView = "can";
      renderInventory();
      document.querySelector(".inventory-master-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const printProductionSheetButton = event.target.closest("[data-print-production-sheet]");
    if (printProductionSheetButton) {
      printProductionSheet(printProductionSheetButton.dataset.printProductionSheet);
      return;
    }

    const downloadProductionSheetButton = event.target.closest("[data-download-production-sheet]");
    if (downloadProductionSheetButton) {
      downloadProductionSheet(downloadProductionSheetButton.dataset.downloadProductionSheet);
      return;
    }

    const halfListButton = event.target.closest("[data-flavor-half-toggle]");
    if (halfListButton) {
      manageInventoryFlavor("set_half_gallons", {
        flavorId: halfListButton.dataset.flavorHalfToggle,
        tracksHalfGallons: halfListButton.dataset.nextHalfValue === "true",
      });
      return;
    }

    const archiveFlavorButton = event.target.closest("[data-flavor-archive]");
    if (archiveFlavorButton) {
      manageInventoryFlavor("archive", { flavorId: archiveFlavorButton.dataset.flavorArchive });
      return;
    }

    const restoreFlavorButton = event.target.closest("[data-flavor-restore]");
    if (restoreFlavorButton) {
      manageInventoryFlavor("restore", { flavorId: restoreFlavorButton.dataset.flavorRestore });
      return;
    }

    const icButton = event.target.closest("[data-ic-target]");
    if (icButton) {
      state.settings.icTarget = Number(icButton.dataset.icTarget);
      if (state.settings.icTarget !== 4) state.settings.allowConsecutiveIC = false;
      renderSettings();
      renderDashboard();
    }

    const staffingButton = event.target.closest("[data-staff-count]");
    if (staffingButton) {
      const day = staffingButton.dataset.staffDay;
      const shift = staffingButton.dataset.staffShift;
      state.settings.staffing[day][shift] = Number(staffingButton.dataset.staffCount);
      renderSettings();
    }

    const requestButton = event.target.closest("[data-edit-request]");
    if (requestButton) {
      state.editingEmployeeId = requestButton.dataset.editRequest;
      renderRequests();
    }

    if (event.target.closest("#backToRequests")) {
      state.editingEmployeeId = null;
      renderRequests();
    }

    if (event.target.closest("#cancelEmployeeAccountForm")) {
      state.showingEmployeeAccountForm = false;
      renderEmployeeAccountManager();
    }

    if (event.target.closest("#cancelEmployeeSkillsForm")) {
      state.editingSkillsEmployeeId = null;
      renderEmployeeAccountManager();
    }

    const editSkillsButton = event.target.closest("[data-edit-skills]");
    if (editSkillsButton) {
      state.editingSkillsEmployeeId = editSkillsButton.dataset.editSkills;
      state.showingEmployeeAccountForm = false;
      renderEmployeeAccountManager();
      document.querySelector("#employeeSkillsForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    const hideEmployeeButton = event.target.closest("[data-hide-employee]");
    if (hideEmployeeButton) hideEmployeeAccess(hideEmployeeButton.dataset.hideEmployee);

    const restoreEmployeeButton = event.target.closest("[data-restore-employee]");
    if (restoreEmployeeButton) restoreEmployeeAccess(restoreEmployeeButton.dataset.restoreEmployee);

    const removeEmployeeButton = event.target.closest("[data-remove-employee]");
    if (removeEmployeeButton) removeEmployeeAccess(removeEmployeeButton.dataset.removeEmployee);

    const optionButton = event.target.closest("[data-use-option]");
    if (optionButton) saveScheduleOption(Number(optionButton.dataset.useOption));

    const publishButton = event.target.closest("[data-publish-option]");
    if (publishButton) publishScheduleOption(Number(publishButton.dataset.publishOption));

    const printButton = event.target.closest("[data-print-option]");
    if (printButton) printSchedule(Number(printButton.dataset.printOption));

    const downloadButton = event.target.closest("[data-download-option]");
    if (downloadButton) downloadSchedule(Number(downloadButton.dataset.downloadOption));
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-mobile-availability-employee]")) {
      state.availabilityMobileEmployeeId = event.target.value;
      renderAvailabilityMatrix();
      return;
    }
    if (event.target.matches("[data-manual-sheet-date], [data-manual-sheet-cell], [data-opening-count]")) syncManualMasterInput(event.target);
    const requestForm = event.target.closest("#requestForm");
    if (requestForm) {
      const dayRow = event.target.closest("[data-availability-day]");
      if (dayRow) syncAvailabilityDayControls(requestForm, dayRow.dataset.availabilityDay);
      renderAvailabilityPreview(requestForm);
    }
    if (event.target.id === "weekStartInput") {
      state.settings.weekStart = event.target.value;
      renderAvailabilityMatrix();
      renderRequests();
      renderScheduleModule();
    }
    if (event.target.id === "inventoryScanFile" && event.target.files?.[0]) chooseInventoryScanFile(event.target.files[0]);
    if (event.target.id === "productionScanFile" && event.target.files?.[0]) chooseProductionScanFile(event.target.files[0]);
    if (event.target.matches("[data-production-sheet-view]")) {
      state.productionSheetViewId = event.target.value;
      renderInventory();
    }
    if (event.target.matches("[data-scan-flavor]")) {
      const entry = state.inventoryScanEntries.find((item) => item.id === event.target.dataset.scanFlavor);
      if (entry) entry.flavorId = event.target.value;
      renderInventory();
    }
    if (event.target.matches("[data-scan-include]")) {
      const entry = state.inventoryScanEntries.find((item) => item.id === event.target.dataset.scanInclude);
      if (entry) entry.include = event.target.checked;
      renderInventory();
    }
    if (event.target.matches("[data-scan-date]")) state.inventoryScanDate = event.target.value;
    if (event.target.matches("[data-production-row-flavor]")) {
      updateProductionScanState();
      const row = state.productionScanRows.find((item) => item.id === event.target.dataset.productionRowFlavor);
      if (row) row.flavorId = event.target.value;
      renderInventory();
    }
    if (event.target.matches("[data-production-date], [data-production-cell]")) {
      updateProductionScanState();
      renderInventory();
    }
    if (event.target.id === "allowConsecutiveICInput") state.settings.allowConsecutiveIC = event.target.checked;
    if (event.target.id === "trainingEnabledInput") {
      state.settings.trainingEnabled = event.target.checked;
      renderSettings();
      renderDashboard();
    }
    if (event.target.id === "traineeInput") state.settings.traineeId = event.target.value;
    if (event.target.id === "trainingSkillInput") {
      state.settings.trainingSkill = event.target.value;
      renderSettings();
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.matches("[data-manual-sheet-date], [data-manual-sheet-cell], [data-opening-count]")) syncManualMasterInput(event.target);
    if (event.target.matches("[data-availability-min], [data-availability-max], [data-availability-note]")) {
      const employeeId = event.target.dataset.availabilityMin || event.target.dataset.availabilityMax || event.target.dataset.availabilityNote;
      const employee = state.team.find((item) => item.id === employeeId);
      if (employee) {
        if (event.target.matches("[data-availability-min]")) employee.minDays = Math.max(0, Math.min(6, Number(event.target.value) || 0));
        if (event.target.matches("[data-availability-max]")) employee.maxDays = Math.max(0, Math.min(6, Number(event.target.value) || 0));
        if (event.target.matches("[data-availability-note]")) employee.notes = event.target.value;
      }
    }
    const requestForm = event.target.closest("#requestForm");
    if (requestForm && (event.target.name === "minDays" || event.target.name === "maxDays")) {
      renderAvailabilityPreview(requestForm);
    }
    if (event.target.matches("[data-scan-note]")) state.inventoryScanUserNote = event.target.value;
    if (event.target.matches("[data-production-note]")) state.productionScanUserNote = event.target.value;
    if (event.target.id === "inventoryFlavorSearch") {
      const query = event.target.value.trim().toLowerCase();
      document.querySelectorAll("[data-inventory-flavor-row]").forEach((row) => {
        row.hidden = Boolean(query) && !row.dataset.flavorName.includes(query);
      });
      document.querySelectorAll("[data-inventory-group]").forEach((group) => {
        group.hidden = Boolean(query) && ![...group.querySelectorAll("[data-inventory-flavor-row]")].some((row) => !row.hidden);
      });
    }
  });

  document.addEventListener("submit", (event) => {
    if (event.target.id === "requestForm") {
      event.preventDefault();
      saveRequest(event.target);
    }
    if (event.target.id === "employeeAccountForm") {
      event.preventDefault();
      createEmployeeAccount(event.target);
    }
    if (event.target.id === "employeeSkillsForm") {
      event.preventDefault();
      updateEmployeeSkills(event.target);
    }
    if (event.target.id === "manualMasterSheetForm") {
      event.preventDefault();
      saveManualMasterSheet(event.target, event.submitter?.value || "save");
    }
    if (event.target.id === "inventoryEntryForm") {
      event.preventDefault();
      saveInventoryEntry(event.target);
    }
    if (event.target.id === "inventoryScanReviewForm") {
      event.preventDefault();
      confirmInventoryScan(event.target);
    }
    if (event.target.id === "productionScanReviewForm") {
      event.preventDefault();
      confirmProductionScan(event.target);
    }
    if (event.target.id === "addInventoryFlavorForm") {
      event.preventDefault();
      addInventoryFlavor(event.target);
    }
  });

  initialize();
})();
