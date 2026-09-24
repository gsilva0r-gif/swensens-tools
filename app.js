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
    schedulePriorityModule: document.querySelector("#schedulePriorityModule"),
    schedulingPriorityContent: document.querySelector("#schedulingPriorityContent"),
    scheduleRequestsModule: document.querySelector("#scheduleRequestsModule"),
    scheduleManagerHeading: document.querySelector("#scheduleManagerHeading"),
    scheduleModuleTabs: document.querySelector(".schedule-module-tabs"),
    employeeScheduleWorkspace: document.querySelector("#employeeScheduleWorkspace"),
    employeeAccountManager: document.querySelector("#employeeAccountManager"),
    showEmployeeAccountForm: document.querySelector("#showEmployeeAccountForm"),
    databaseHealthPanel: document.querySelector("#databaseHealthPanel"),
    databaseHealthMessage: document.querySelector("#databaseHealthMessage"),
    databaseHealthAreas: document.querySelector("#databaseHealthAreas"),
    runDatabaseHealthCheck: document.querySelector("#runDatabaseHealthCheck"),
    inventory: document.querySelector("#inventoryContent"),
    records: document.querySelector("#recordsContent"),
    reports: document.querySelector("#reportsContent"),
    messages: document.querySelector("#messagesContent"),
    emergencyContactDialog: document.querySelector("#emergencyContactDialog"),
    emergencyContactForm: document.querySelector("#emergencyContactForm"),
    emergencyContactTitle: document.querySelector("#emergencyContactTitle"),
    emergencyContactEmployee: document.querySelector("#emergencyContactEmployee"),
    emergencyContactCallPanel: document.querySelector("#emergencyContactCallPanel"),
    removeEmergencyContact: document.querySelector("#removeEmergencyContact"),
  };

  const state = {
    mode: "signed-out",
    profile: null,
    role: "manager",
    team: clone(demoData.team),
    staffDirectory: clone(demoData.team).map(({ id, code, name, phone }) => ({ id, code, name, phone })),
    hiddenTeam: [],
    settings: clone(demoData.defaultSettings),
    options: [],
    selectedOption: null,
    savedScheduleIds: {},
    publishedOption: null,
    publishedSchedule: null,
    publishedSchedules: [],
    employeeAssignments: [],
    employeeScheduleWeekStart: "",
    scheduleHistory: [],
    selectedScheduleRecordId: "",
    employeePortalView: "schedule",
    dateRequests: [],
    dateRequestSetupMissing: false,
    requestCalendarWeekStart: "",
    requestDraftWeekStart: "",
    requestDraftDates: {},
    activeRequestDate: "",
    dateRequestKind: "time_off",
    dateRequestNotes: "",
    dateRequestBusy: false,
    shiftChangeRequests: [],
    shiftChangeOffers: [],
    shiftChangeSetupMissing: false,
    shiftChangeAssignmentId: "",
    shiftChangeType: "cover",
    shiftChangeBusy: false,
    chatThreads: [],
    chatMessages: [],
    activeChatThreadId: "",
    newChatOpen: false,
    messagesSetupMissing: false,
    messageBusy: false,
    chatRefreshBusy: false,
    directChatOpeningId: "",
    mobileMessagesThreadOpen: false,
    chatRefreshDebounce: null,
    chatRefreshTimer: null,
    editingEmployeeId: null,
    editingSkillsEmployeeId: null,
    showingEmployeeAccountForm: false,
    teamView: "active",
    scheduleModuleView: "availability",
    priorityEditing: false,
    priorityPolicySnapshot: null,
    priorityDragCode: "",
    schedulingPolicyBusy: false,
    availabilityMobileEmployeeId: "",
    requestsExpanded: false,
    accountActionBusy: false,
    availabilitySheetBusy: false,
    requestSyncChannel: null,
    requestRefreshTimer: null,
    requestRefreshDebounce: null,
    shiftChangeRefreshDebounce: null,
    inventoryRefreshDebounce: null,
    inventoryRefreshTimer: null,
    profileSkills: [],
    canAccessInventory: false,
    inventoryFlavors: [],
    inventoryCatalog: [],
    inventoryHistory: [],
    productionSheets: [],
    productionSheetViewId: "",
    inventoryLoading: false,
    inventoryBusy: false,
    inventoryRefreshBusy: false,
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
    reportStart: "",
    reportEnd: "",
    reportData: null,
    reportLoading: false,
    reportError: "",
    systemCheckBusy: false,
    latestSystemCheck: null,
    isItPreview: false,
    emergencyContacts: {},
    emergencyContactEmployeeId: "",
    planningWeather: [],
    planningWeatherStatus: "idle",
    planningWeatherError: "",
  };

  let priorityPointerDrag = null;
  let priorityPointerPress = null;

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

  function syncSchedulingPolicy() {
    const current = Array.isArray(state.settings.priorityOrder) ? state.settings.priorityOrder : [];
    const activeCodes = new Set(state.team.map((employee) => employee.code));
    const orderedCodes = current.filter((code) => activeCodes.has(code));
    state.team.forEach((employee) => {
      if (!orderedCodes.includes(employee.code)) orderedCodes.push(employee.code);
    });
    state.settings.priorityOrder = orderedCodes;
    const rankByCode = new Map(orderedCodes.map((code, index) => [code, index + 1]));
    state.team.forEach((employee) => {
      employee.schedulePriority = rankByCode.get(employee.code) || Number(employee.schedulePriority) || state.team.length;
      employee.minShifts = Math.max(0, Math.min(6, Number(employee.minShifts) || 0));
      employee.maxShifts = Math.max(employee.minShifts, Math.min(6, Number(employee.maxShifts) || 6));
      employee.weekdayRequirement = Math.max(0, Math.min(3, Number(employee.weekdayRequirement) || 0));
      const legacyWeekendRequirement = typeof employee.weekendRequired === "boolean"
        ? (employee.weekendRequired ? 1 : 0)
        : employee.schedulePriority >= (Number(state.settings.weekendPriorityStart) || 9) ? 1 : 0;
      employee.weekendDaysRequired = Math.max(0, Math.min(2, Number.isFinite(Number(employee.weekendDaysRequired))
        ? Number(employee.weekendDaysRequired)
        : legacyWeekendRequirement));
      employee.weekendRequired = employee.weekendDaysRequired > 0;
    });
  }

  function priorityOrderedTeam() {
    syncSchedulingPolicy();
    return [...state.team].sort((a, b) => a.schedulePriority - b.schedulePriority || a.name.localeCompare(b.name));
  }

  function employeeWeekendDaysOffered(employee) {
    return ["Friday", "Saturday", "Sunday"].filter((day) =>
      (employee.availability?.[day]?.AM || "available") !== "unavailable" ||
      (employee.availability?.[day]?.PM || "available") !== "unavailable"
    ).length;
  }

  function requestDeadlineForWeek(weekStart) {
    const deadline = new Date(`${weekStart}T23:59:59`);
    deadline.setDate(deadline.getDate() - 12);
    return deadline;
  }

  function requestDeadlineLabel(weekStart) {
    return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
      .format(requestDeadlineForWeek(weekStart));
  }

  function localIsoDate(value) {
    const date = value instanceof Date ? new Date(value) : new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function addDaysToIso(value, amount) {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() + amount);
    return localIsoDate(date);
  }

  function currentScheduleTuesday(value = new Date()) {
    const date = value instanceof Date ? new Date(value) : new Date(`${value}T12:00:00`);
    date.setHours(12, 0, 0, 0);
    if (date.getDay() === 1) {
      date.setDate(date.getDate() + 1);
    } else {
      date.setDate(date.getDate() - ((date.getDay() - 2 + 7) % 7));
    }
    return localIsoDate(date);
  }

  function publishedScheduleChoices() {
    const current = currentScheduleTuesday();
    const requiredWeeks = [current, addDaysToIso(current, 7)];
    const byWeek = new Map(state.publishedSchedules.map((schedule) => [schedule.week_start, schedule]));
    const weeks = [...new Set([
      ...requiredWeeks,
      ...state.publishedSchedules.map((schedule) => schedule.week_start).filter((weekStart) => weekStart >= current),
    ])].sort();
    return weeks.map((weekStart) => ({ weekStart, schedule: byWeek.get(weekStart) || null }));
  }

  function selectedEmployeeScheduleWeek() {
    const choices = publishedScheduleChoices();
    if (!state.employeeScheduleWeekStart || !choices.some((choice) => choice.weekStart === state.employeeScheduleWeekStart)) {
      state.employeeScheduleWeekStart = choices.find((choice) => choice.weekStart === currentScheduleTuesday())?.weekStart
        || choices.find((choice) => choice.schedule)?.weekStart
        || choices[0]?.weekStart
        || currentScheduleTuesday();
    }
    return choices.find((choice) => choice.weekStart === state.employeeScheduleWeekStart)
      || { weekStart: state.employeeScheduleWeekStart, schedule: null };
  }

  function selectedEmployeeSchedule() {
    return selectedEmployeeScheduleWeek().schedule;
  }

  function managerPublishedScheduleWeeks() {
    const current = currentScheduleTuesday();
    return [...new Set([
      current,
      addDaysToIso(current, 7),
      state.settings.weekStart,
      ...state.scheduleHistory
        .filter((schedule) => schedule.status === "published" && schedule.week_start >= current)
        .map((schedule) => schedule.week_start),
    ].filter(Boolean))].sort();
  }

  function upcomingRequestWeeks(count = 6) {
    const configured = new Date(`${state.settings.weekStart}T12:00:00`);
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayTuesday = new Date(today);
    todayTuesday.setDate(todayTuesday.getDate() - ((todayTuesday.getDay() - 2 + 7) % 7));
    const first = configured.getTime() >= todayTuesday.getTime() ? configured : todayTuesday;
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(first);
      date.setDate(date.getDate() + index * 7);
      return localIsoDate(date);
    });
  }

  function requestScopeLabel(scope) {
    return scope === "AM" ? "Morning shift only" : scope === "PM" ? "Night shift only" : "All day";
  }

  function dateRequestEmployee(request) {
    return state.team.find((employee) => String(employee.id) === String(request.employee_id));
  }

  function dateRequestIsLate(request) {
    if (request?.is_late === true) return true;
    if (!request?.submitted_at || !request?.schedule_week_start) return false;
    return new Date(request.submitted_at).getTime() > requestDeadlineForWeek(request.schedule_week_start).getTime();
  }

  function publishedScheduleForWeek(weekStart) {
    const visible = state.publishedSchedules.find((schedule) => schedule.week_start === weekStart && schedule.status === "published");
    if (visible) return visible;
    if (state.mode === "demo") return null;
    if (state.publishedSchedule?.week_start === weekStart) return state.publishedSchedule;
    return state.scheduleHistory.find((schedule) => schedule.week_start === weekStart && schedule.status === "published") || null;
  }

  function isRequestLate(employee) {
    if (!employee?.submitted) return false;
    if (employee.lateRequest === true) return true;
    if (!employee.submittedAt) return false;
    return new Date(employee.submittedAt).getTime() > requestDeadlineForWeek(state.settings.weekStart).getTime();
  }

  const requestTypeLabels = {
    weekly_availability: "Weekly availability",
    time_off: "Time off",
    call_off: "Call-off notice",
  };

  const inventoryCategoryLabels = {
    vanillas: "Vanillas",
    nuts: "Nuts",
    chips: "Chips",
    chocolates: "Chocolates",
    fruits: "Fruits",
    sherbets: "Sherbets & Sorbet",
    seasonals: "Seasonals",
  };

  const seasonalLaunches = [
    {
      id: "summer",
      season: "Summer",
      month: 5,
      day: 1,
      flavors: ["Peach", "Coconut", "Lemon B.P."],
      history: "2023: Peach 73 cans · 72 half-gallons · 27 batches; Coconut 30 · 24 · 10.5.",
    },
    {
      id: "fall",
      season: "Fall",
      month: 10,
      day: 1,
      flavors: ["Pumpkin", "Black Licorice"],
      history: "2023: Pumpkin 30 cans · 32 half-gallons · 11 batches; Licorice 6 · 10 · 2.",
    },
    {
      id: "winter",
      season: "Winter",
      month: 11,
      day: 1,
      flavors: ["Eggnog Ice Cream", "Rum Raisin", "Spumoni"],
      history: "2023: Eggnog 33 cans; Rum Raisin 18; Spumoni 21. Thirteen, eight, and twelve batches.",
    },
    {
      id: "drink",
      season: "Winter drink",
      month: 11,
      day: 15,
      flavors: ["Eggnog Drink"],
      history: "2023 sheet reference: 8.5 batches; five gallons makes five batches.",
    },
  ];

  const planningStaffing = [
    { day: "Tue", am: 2, pm: 3, score: 59 },
    { day: "Wed", am: 2, pm: 3, score: 63 },
    { day: "Thu", am: 3, pm: 3, score: 70 },
    { day: "Fri", am: 3, pm: 4, score: 81 },
    { day: "Sat", am: 4, pm: 4, score: 91 },
    { day: "Sun", am: 3, pm: 4, score: 78 },
  ];

  function loadInventoryPreviewData() {
    const previewFlavors = [
      ["vanilla", "Vanilla", "vanillas", 24, 6, true],
      ["caramel-marble", "Caramel Marble", "vanillas", 19, 3, true],
      ["marble-fudge", "Marble Fudge", "vanillas", 12, null, false],
      ["black-raspberry-marble", "Black Raspberry Marble", "vanillas", 14, null, false],
      ["cookies-n-cream", "Cookies N Cream", "vanillas", 30, 5, true],
      ["caramel-turtle-fudge", "Caramel Turtle Fudge", "nuts", 9, 2, true],
      ["toasted-almond", "Toasted Almond", "nuts", 14, null, false],
      ["rocky-road", "Rocky Road", "nuts", 11, 4, true],
      ["cc-cookie-dough", "CC Cookie Dough", "chips", 30, 5, true],
      ["chocolate-chip", "Chocolate Chip", "chips", 9, null, false],
      ["raspberry-brownie-chunk", "Raspberry Brownie Chunk", "chips", 12, null, false],
      ["mocha-chip", "Mocha Chip", "chips", 15, 3, true],
      ["chocolate", "Chocolate", "chocolates", 18, 4, true],
      ["swiss-orange-chip", "Swiss Orange Chip", "chocolates", 8, null, false],
      ["strawberry", "Strawberry", "fruits", 16, 3, true],
      ["lemon-blueberry", "Lemon Blueberry", "fruits", 10, null, false],
      ["raspberry-sorbet", "Raspberry Sorbet", "sherbets", 7, 2, true],
      ["lime-sherbet", "Lime Sherbet", "sherbets", 6, null, false],
      ["coconut", "Coconut", "seasonals", 5, 1, true],
      ["peach", "Peach", "seasonals", 4, null, false],
    ].map(([id, name, category, canCount, halfGallonCount, tracksHalfGallons], index) => ({
      id: `preview-${id}`,
      name,
      category,
      sort_order: index + 1,
      tracksHalfGallons,
      canCount,
      halfGallonCount,
      active: true,
    }));
    const canDates = ["2026-09-01", "2026-09-03", "2026-09-05", null, null];
    const halfDates = ["2026-09-01", "2026-09-03", "2026-09-05", null, null];
    const slots = canDates.map((date, slotIndex) => ({
      slot_number: slotIndex + 1,
      can_date: date,
      half_gallon_date: halfDates[slotIndex],
      cells: previewFlavors.map((flavor, flavorIndex) => ({
        flavor_id: flavor.id,
        can_quantity: date && (flavorIndex + slotIndex) % 4 === 0 ? (flavorIndex % 3) + 1 : 0,
        half_gallon_quantity: date && flavor.tracksHalfGallons && (flavorIndex + slotIndex) % 5 === 0 ? 1 : 0,
      })),
    }));
    state.inventoryCatalog = previewFlavors;
    state.inventoryFlavors = previewFlavors;
    const previewSnapshot = previewFlavors.map((flavor) => ({
      flavor_id: flavor.id,
      name: flavor.name,
      category: flavor.category,
      sort_order: flavor.sort_order,
      tracks_half_gallons: flavor.tracksHalfGallons,
      can_count: flavor.canCount,
      half_gallon_count: flavor.halfGallonCount,
    }));
    const archivedSlots = (dates, variation) => dates.map((date, slotIndex) => ({
      slot_number: slotIndex + 1,
      can_date: date,
      half_gallon_date: date,
      cells: previewFlavors.map((flavor, flavorIndex) => ({
        flavor_id: flavor.id,
        can_quantity: (flavorIndex + slotIndex + variation) % 5 === 0 ? (flavorIndex % 3) + 1 : 0,
        half_gallon_quantity: flavor.tracksHalfGallons && (flavorIndex + slotIndex + variation) % 7 === 0 ? 1 : 0,
      })),
    }));
    state.productionSheets = [
      {
        id: "preview-sheet-1",
        sheet_number: 7,
        status: "active",
        started_on: "2026-09-01",
        completed_at: null,
        completed_by_name: null,
        inventory_snapshot: null,
        slots,
      },
      {
        id: "preview-sheet-archive-6",
        sheet_number: 6,
        status: "complete",
        started_on: "2026-08-17",
        completed_at: "2026-08-28T20:15:00.000Z",
        completed_by_name: "Gabriel",
        inventory_snapshot: previewSnapshot,
        slots: archivedSlots(["2026-08-18", "2026-08-20", "2026-08-22", "2026-08-25", "2026-08-27"], 1),
      },
      {
        id: "preview-sheet-archive-5",
        sheet_number: 5,
        status: "complete",
        started_on: "2026-08-03",
        completed_at: "2026-08-14T19:40:00.000Z",
        completed_by_name: "Israel",
        inventory_snapshot: previewSnapshot,
        slots: archivedSlots(["2026-08-04", "2026-08-06", "2026-08-08", "2026-08-11", "2026-08-13"], 3),
      },
    ];
    state.productionSheetViewId = "preview-sheet-1";
    state.inventoryHistory = [
      {
        id: "preview-usage-can-2", entry_type: "usage", occurred_on: "2026-09-08", note: "Confirmed morning used-can strip", created_by_name: "Gabriel",
        events: [
          { flavor_id: "preview-vanilla", inventory_kind: "can", delta: -2, count_before: 26, count_after: 24, flavor_name: "Vanilla" },
          { flavor_id: "preview-cookies-n-cream", inventory_kind: "can", delta: -3, count_before: 33, count_after: 30, flavor_name: "Cookies N Cream" },
          { flavor_id: "preview-chocolate", inventory_kind: "can", delta: -1, count_before: 19, count_after: 18, flavor_name: "Chocolate" },
        ],
      },
      {
        id: "preview-usage-half-1", entry_type: "usage", occurred_on: "2026-09-06", note: "Morning front-freezer refill", created_by_name: "Paul",
        events: [
          { flavor_id: "preview-vanilla", inventory_kind: "half_gallon", delta: -1, count_before: 7, count_after: 6, flavor_name: "Vanilla" },
          { flavor_id: "preview-caramel-marble", inventory_kind: "half_gallon", delta: -2, count_before: 5, count_after: 3, flavor_name: "Caramel Marble" },
          { flavor_id: "preview-rocky-road", inventory_kind: "half_gallon", delta: -1, count_before: 5, count_after: 4, flavor_name: "Rocky Road" },
        ],
      },
      {
        id: "preview-usage-can-1", entry_type: "usage", occurred_on: "2026-09-04", note: "Confirmed used-can strip", created_by_name: "Israel",
        events: [
          { flavor_id: "preview-cc-cookie-dough", inventory_kind: "can", delta: -2, count_before: 32, count_after: 30, flavor_name: "CC Cookie Dough" },
          { flavor_id: "preview-strawberry", inventory_kind: "can", delta: -1, count_before: 17, count_after: 16, flavor_name: "Strawberry" },
        ],
      },
    ];
    state.inventoryLoading = false;
    state.inventoryError = "";
  }

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

  const demoStorageKey = "swensens-demo-requests-v3";
  const demoDateRequestsStorageKey = "swensens-demo-date-requests-v1";
  const demoShiftChangeStorageKey = "swensens-demo-shift-changes-v2";
  const demoMessagesStorageKey = "swensens-demo-messages-v1";
  const emergencyContactsStorageKey = "swensens-emergency-contacts-preview-v1";

  function loadDemoTeam() {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(demoStorageKey));
      if (saved?.weekStart === demoData.defaultSettings.weekStart && Array.isArray(saved.team)) {
        if (Array.isArray(saved.priorityOrder)) state.settings.priorityOrder = saved.priorityOrder;
        if (Number(saved.weekendPriorityStart)) state.settings.weekendPriorityStart = Number(saved.weekendPriorityStart);
        return saved.team;
      }
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
        priorityOrder: state.settings.priorityOrder,
        weekendPriorityStart: state.settings.weekendPriorityStart,
      }));
    } catch (_) {
      // Demo persistence is a convenience; real accounts save through Supabase.
    }
  }

  function demoShiftChangeSeed() {
    const weekStart = currentScheduleTuesday();
    return [{
      id: "preview-emergency-calloff",
      schedule_week_start: weekStart,
      assignment_id: demoAssignmentId("demo-ryan", "Friday", "PM", weekStart),
      employee_id: "demo-ryan",
      request_type: "call_off",
      target_assignment_id: null,
      status: "pending",
      urgent: true,
      note: "Family emergency—please help cover tonight.",
      work_day: 5,
      assignment_type: "PM",
      submitted_at: "2026-10-02T17:15:00.000Z",
      shift_cover_offers: [],
    }];
  }

  function loadDemoShiftChanges() {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(demoShiftChangeStorageKey));
      if (Array.isArray(saved)) return saved;
    } catch (_) {
      // The preview still works when browser storage is blocked.
    }
    return demoShiftChangeSeed();
  }

  function saveDemoShiftChanges() {
    try {
      window.sessionStorage.setItem(demoShiftChangeStorageKey, JSON.stringify(state.shiftChangeRequests));
    } catch (_) {
      // Demo persistence is optional; live requests save through Supabase.
    }
  }

  function demoChatSeed() {
    const now = Date.now();
    const teamMembers = state.team.map((employee) => employee.id);
    if (state.profile?.id && !teamMembers.includes(state.profile.id)) teamMembers.push(state.profile.id);
    const partner = state.team.find((employee) => String(employee.id) !== String(state.profile?.id)) || state.team[0];
    return {
      threads: [
        {
          id: "preview-team-chat",
          title: "Whole Team",
          thread_type: "team",
          member_ids: teamMembers,
          created_at: new Date(now - 86400000).toISOString(),
          updated_at: new Date(now - 18 * 60000).toISOString(),
        },
        ...(partner ? [{
          id: "preview-direct-chat",
          title: partner.name,
          thread_type: "direct",
          member_ids: [state.profile?.id, partner.id].filter(Boolean),
          created_at: new Date(now - 7200000).toISOString(),
          updated_at: new Date(now - 7200000).toISOString(),
        }] : []),
      ],
      messages: [
        { id: "preview-message-1", thread_id: "preview-team-chat", sender_id: "demo-gabriel", body: "The new schedule is posted. Please check this week and next week.", created_at: new Date(now - 3600000).toISOString() },
        { id: "preview-message-2", thread_id: "preview-team-chat", sender_id: "demo-cherie", body: "Got it—thank you!", created_at: new Date(now - 18 * 60000).toISOString() },
        ...(partner ? [{ id: "preview-message-3", thread_id: "preview-direct-chat", sender_id: partner.id, body: "Can you check the schedule when you have a minute?", created_at: new Date(now - 7200000).toISOString() }] : []),
      ],
    };
  }

  function loadDemoMessages() {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(demoMessagesStorageKey));
      if (Array.isArray(saved?.threads) && Array.isArray(saved?.messages)) return saved;
    } catch (_) {
      // Messages still open with preview content when browser storage is unavailable.
    }
    return demoChatSeed();
  }

  function saveDemoMessages() {
    try {
      window.sessionStorage.setItem(demoMessagesStorageKey, JSON.stringify({ threads: state.chatThreads, messages: state.chatMessages }));
    } catch (_) {
      // Preview persistence is optional; live messages save through Supabase.
    }
  }

  function demoDateRequestSeed() {
    const weekStart = state.settings.weekStart;
    return [{
      id: "preview-late-date-request",
      employee_id: "demo-ryan",
      request_date: addDaysToIso(weekStart, 3),
      schedule_week_start: weekStart,
      shift_scope: "ALL_DAY",
      request_kind: "time_off",
      notes: "Appointment that came up after the Thursday cutoff.",
      status: "submitted",
      is_late: true,
      schedule_was_published: false,
      submitted_at: new Date(requestDeadlineForWeek(weekStart).getTime() + 86400000).toISOString(),
    }];
  }

  function loadDemoDateRequests() {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(demoDateRequestsStorageKey));
      if (Array.isArray(saved)) return saved;
    } catch (_) {
      // The preview remains usable when browser storage is unavailable.
    }
    return demoDateRequestSeed();
  }

  function saveDemoDateRequests() {
    try {
      window.sessionStorage.setItem(demoDateRequestsStorageKey, JSON.stringify(state.dateRequests));
    } catch (_) {
      // Demo persistence is a convenience; real requests save through Supabase.
    }
  }

  function loadEmergencyContacts() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(emergencyContactsStorageKey));
      return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
    } catch (_) {
      return {};
    }
  }

  function saveEmergencyContacts() {
    try {
      window.localStorage.setItem(emergencyContactsStorageKey, JSON.stringify(state.emergencyContacts));
    } catch (_) {
      showToast("This browser could not save the preview contact.");
    }
  }

  function findTeamEmployee(employeeId) {
    return [...state.team, ...state.hiddenTeam].find((employee) => String(employee.id) === String(employeeId)) || null;
  }

  function emergencyContactFor(employee) {
    return employee ? state.emergencyContacts[String(employee.id)] || null : null;
  }

  function emergencyPhoneHref(value) {
    const compact = String(value || "").trim().replace(/[^\d+]/g, "");
    return compact ? `tel:${compact}` : "";
  }

  function openEmergencyContactDialog(employeeId) {
    const employee = findTeamEmployee(employeeId);
    if (!employee || state.role !== "manager" || !elements.emergencyContactDialog) return;
    const contact = emergencyContactFor(employee);
    state.emergencyContactEmployeeId = String(employee.id);
    elements.emergencyContactForm.reset();
    elements.emergencyContactForm.elements.contactName.value = contact?.name || "";
    elements.emergencyContactForm.elements.relationship.value = contact?.relationship || "";
    elements.emergencyContactForm.elements.phone.value = contact?.phone || "";
    elements.emergencyContactTitle.textContent = `${employee.name}'s emergency contact`;
    elements.emergencyContactEmployee.textContent = `For ${employee.name}`;
    elements.removeEmergencyContact.hidden = !contact;
    elements.emergencyContactCallPanel.innerHTML = contact
      ? `<a class="emergency-contact-call" href="${emergencyPhoneHref(contact.phone)}"><span aria-hidden="true">☎</span><span><small>Call now</small><strong>${escapeHtml(contact.name)}</strong><b>${escapeHtml(contact.phone)}</b></span></a><p>${escapeHtml(contact.relationship)} to ${escapeHtml(employee.name)}</p>`
      : `<div class="emergency-contact-empty"><strong>No contact saved yet</strong><span>Add their name, relationship, and phone number below.</span></div>`;
    elements.emergencyContactDialog.showModal();
    window.setTimeout(() => elements.emergencyContactForm.elements.contactName.focus(), 80);
  }

  function closeEmergencyContactDialog() {
    state.emergencyContactEmployeeId = "";
    elements.emergencyContactDialog?.close();
  }

  function saveEmergencyContact(form) {
    const employee = findTeamEmployee(state.emergencyContactEmployeeId);
    if (!employee) return;
    const formData = new FormData(form);
    const contact = {
      name: String(formData.get("contactName") || "").trim(),
      relationship: String(formData.get("relationship") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
    };
    if (!contact.name || !contact.relationship || !emergencyPhoneHref(contact.phone)) {
      showToast("Enter the contact's name, relationship, and phone number.");
      return;
    }
    state.emergencyContacts[String(employee.id)] = contact;
    saveEmergencyContacts();
    renderTeam();
    closeEmergencyContactDialog();
    showToast(`${employee.name}'s emergency contact was saved on this device.`);
  }

  function removeEmergencyContact() {
    const employee = findTeamEmployee(state.emergencyContactEmployeeId);
    if (!employee || !emergencyContactFor(employee)) return;
    delete state.emergencyContacts[String(employee.id)];
    saveEmergencyContacts();
    renderTeam();
    closeEmergencyContactDialog();
    showToast(`${employee.name}'s preview contact was removed.`);
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
    if (!value) return "No saved system check yet.";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "No saved system check yet.";
    return `Last successful check: ${new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date)}`;
  }

  function renderSystemCheckStatus(check = state.latestSystemCheck) {
    const messageTargets = document.querySelectorAll("[data-system-check-message]");
    const areaTargets = document.querySelectorAll("[data-system-check-areas]");
    const setMessage = (message) => messageTargets.forEach((target) => { target.textContent = message; });
    const setAreas = (markup) => areaTargets.forEach((target) => { target.innerHTML = markup; });
    if (!check) {
      setMessage("No saved system check yet.");
      setAreas("");
      return;
    }
    if (check.setup_error) {
      setMessage("Health-check setup is pending. Apply the newest Supabase migration, then run this check again.");
      setAreas("");
      return;
    }
    const labels = {
      employees: "Employees",
      requests: "Requests",
      schedules: "Schedules",
      inventory: "Inventory",
      master_sheets: "Master sheets",
      database_write: "Database write",
    };
    const checks = check.checks || {};
    setMessage(`${systemCheckTimestampLabel(check.checked_at)} · ${check.preview ? "Preview only" : "Read and write verified"}.`);
    setAreas(Object.entries(labels).map(([key, label]) => {
      const result = checks[key] || {};
      const count = Number.isFinite(Number(result.records)) ? ` · ${Number(result.records)} records` : "";
      const assignments = Number.isFinite(Number(result.assignments)) ? ` · ${Number(result.assignments)} assignments` : "";
      return `<span class="system-check-area ${result.ok ? "healthy" : "failed"}"><b>${result.ok ? "✓" : "!"}</b>${escapeHtml(label)}${count}${assignments}</span>`;
    }).join(""));
  }

  async function loadLatestSystemHealthCheck(profile = state.profile) {
    if (!supabaseClient || !isGabrielAccount(profile)) return;
    const { data, error } = await supabaseClient.rpc("get_latest_system_health_check");
    state.latestSystemCheck = error ? { setup_error: true } : data || null;
  }

  async function runDatabaseHealthCheck() {
    if (!isGabrielAccount() || state.systemCheckBusy) return;
    state.systemCheckBusy = true;
    const buttons = document.querySelectorAll("[data-run-database-health-check]");
    buttons.forEach((button) => { button.disabled = true; button.textContent = "Checking…"; });
    document.querySelectorAll("[data-system-check-message]").forEach((target) => {
      target.textContent = "Checking records and verifying a real database write…";
    });

    if (state.isItPreview) {
      state.latestSystemCheck = {
        status: "healthy",
        checked_at: new Date().toISOString(),
        write_verified: true,
        preview: true,
        checks: Object.fromEntries(["employees", "requests", "schedules", "inventory", "master_sheets", "database_write"].map((key) => [key, { ok: true }])),
      };
      renderSystemCheckStatus();
      showToast("IT health-check preview completed. No live database was changed.");
    } else if (state.mode === "supabase" && supabaseClient) {
      const { data, error } = await supabaseClient.rpc("run_system_health_check", { p_app_version: "reliability-v1" });
      if (error) {
        const setupMissing = /run_system_health_check|schema cache|function/i.test(error.message || "");
        document.querySelectorAll("[data-system-check-message]").forEach((target) => {
          target.textContent = setupMissing
            ? "Health-check setup is missing. Apply the newest Supabase migration first."
            : `Health check failed: ${error.message}. If the project is paused, resume it in Supabase first.`;
        });
        document.querySelectorAll("[data-system-check-areas]").forEach((target) => { target.innerHTML = ""; });
        showToast("Database health check failed.");
      } else {
        state.latestSystemCheck = data;
        renderSystemCheckStatus();
        showToast("Database reads and write are healthy.");
      }
    }

    state.systemCheckBusy = false;
    buttons.forEach((button) => { button.disabled = false; button.textContent = "Run real health check"; });
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

  function demoAssignmentId(employeeId, dayName, assignmentType, weekStart = state.employeeScheduleWeekStart || state.settings.weekStart) {
    return `preview-assignment:${weekStart}:${dayName}:${employeeId}:${assignmentType}`;
  }

  function scheduleCellParts(option, dayName, employeeId) {
    const record = option.schedule[dayName];
    if (!record) return [];
    const parts = [];
    const morning = record.AM.find((item) => item.employeeId === employeeId);
    const night = record.PM.find((item) => item.employeeId === employeeId);
    if (morning) parts.push({ text: `11:30${morning.requiresApproval ? "*" : ""}`, type: "morning", hours: 6, assignmentId: demoAssignmentId(employeeId, dayName, "AM") });
    if (night) parts.push({ text: `5:30${night.requiresApproval ? "*" : ""}`, type: "night", hours: 5, assignmentId: demoAssignmentId(employeeId, dayName, "PM") });
    const icAssignment = record.IC.find((item) => item.employeeId === employeeId);
    if (icAssignment) {
      const productionLabel = icAssignment.productionShift === "AM" ? "11:30 IC" : icAssignment.productionShift === "PM" ? "5:30 IC" : "IC";
      parts.push({ text: `${productionLabel}${icAssignment.requiresApproval ? "*" : ""}`, type: "ic", hours: 11, fullDay: true, productionShift: icAssignment.productionShift || "FULL", assignmentId: demoAssignmentId(employeeId, dayName, "IC") });
    }
    record.training.filter((item) => item.employeeId === employeeId && item.role === "trainee" && Number(item.shiftCredits) > 0).forEach((item) => {
      const time = item.shift === "AM" ? "11:30" : item.shift === "PM" ? "5:30" : "IC";
      parts.push({
        text: time,
        type: item.shift === "AM" ? "morning" : item.shift === "PM" ? "night" : "ic",
        hours: item.shift === "AM" ? 6 : item.shift === "PM" ? 5 : 11,
        fullDay: item.shift === "FULL",
        assignmentId: demoAssignmentId(employeeId, dayName, "TRAINING"),
      });
    });
    return parts;
  }

  function mobileScheduleEntry(part) {
    const approval = part.text.includes("*") ? "*" : "";
    if (part.type === "morning") return { time: `11:30${approval}`, note: "" };
    if (part.type === "night") return { time: `5:30${approval}`, note: "" };
    if (part.type === "ic") return { time: part.text.replace("*", ""), note: part.text.includes("*") ? "approval" : "" };
    return { time: part.text.replace("*", ""), note: part.text.includes("*") ? "approval" : "" };
  }

  function buildMobileScheduleSheet(option, dateFormatter, weekStart = state.settings.weekStart, roster = state.team) {
    const workingDays = scheduleWeekRows(weekStart).filter((day) => !day.closed);
    const dayHeaders = workingDays.map((day) => `<th scope="col"><strong>${escapeHtml(day.name.slice(0, 3))}</strong><small>${dateFormatter.format(day.date)}</small></th>`).join("");
    const employeeRows = roster.map((employee) => {
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
      <div class="mobile-schedule-title"><strong>Full week</strong><span>${scheduleWeekLabel(weekStart)}</span></div>
      <table class="mobile-schedule-sheet">
        <thead><tr><th scope="col">Team</th>${dayHeaders}</tr></thead>
        <tbody><tr class="mobile-schedule-closed"><th scope="row">Monday</th><td colspan="${workingDays.length}">CLOSED</td></tr>${employeeRows}</tbody>
      </table>
      <div class="mobile-schedule-legend"><span><b>11:30</b> morning</span><span><b>5:30</b> night</span><span><b>IC</b> production</span><span><b>*</b> approval</span></div>
    </div>`;
  }

  function buildScheduleSheet(option, weekStart = state.settings.weekStart, roster = state.team) {
    const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric" });
    const rows = scheduleWeekRows(weekStart).map((day) => {
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
          <caption>Swensen's Weekly Schedule · ${scheduleWeekLabel(weekStart)}</caption>
          <thead><tr><th class="day-column">Day</th>${roster.map((employee) => `<th title="${escapeHtml(employee.name)}">${escapeHtml(employee.name)}</th>`).join("")}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="schedule-legend"><span><b>11:30</b> Morning</span><span><b>5:30</b> Night</span><span><b>IC</b> Production</span><span><b>*</b> Approval needed</span><span><b>×</b> Off</span></div>
    </div>${buildMobileScheduleSheet(option, dateFormatter, weekStart, roster)}`;
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function downloadScheduleFile(option, weekStart, roster, filename) {
    const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric", year: "numeric" });
    const rows = [
      ["Swensen's Weekly Schedule", scheduleWeekLabel(weekStart)],
      [],
      ["Day", "Date", ...roster.map((employee) => employee.name)],
      ...scheduleWeekRows(weekStart).map((day) => [
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
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
    showToast("Schedule CSV downloaded");
  }

  function downloadSchedule(optionIndex) {
    const option = state.options[optionIndex];
    if (!option) return;
    downloadScheduleFile(
      option,
      state.settings.weekStart,
      state.team,
      `swensens-schedule-${state.settings.weekStart}-option-${optionIndex + 1}.csv`,
    );
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

  function scheduleRecordRoster(record) {
    const knownEmployees = new Map([...state.team, ...state.hiddenTeam].map((employee) => [String(employee.id), employee]));
    const snapshot = Array.isArray(record.roster_snapshot) ? record.roster_snapshot : [];
    if (snapshot.length) {
      return snapshot.map((employee) => ({
        id: employee.id,
        code: employee.code || employee.employee_code || "",
        name: employee.name || employee.display_name || knownEmployees.get(String(employee.id))?.name || "Archived employee",
      }));
    }
    const employeeIds = [...new Set((record.assignments || []).map((assignment) => String(assignment.employee_id)))];
    return employeeIds.map((employeeId) => knownEmployees.get(employeeId) || {
      id: employeeId,
      code: "ARCHIVED",
      name: "Archived employee",
    });
  }

  function scheduleRecordOption(record) {
    const schedule = Object.fromEntries(demoData.days.map((day) => [day.name, { AM: [], PM: [], IC: [], training: [] }]));
    (record.assignments || []).forEach((assignment) => {
      if (assignment.coverage_status === "open") return;
      const day = demoData.days.find((item) => item.number === Number(assignment.work_day));
      if (!day || !schedule[day.name]) return;
      const base = {
        employeeId: assignment.employee_id,
        isDouble: Boolean(assignment.is_double),
        requiresApproval: Boolean(assignment.requires_approval && !assignment.approved),
      };
      if (assignment.assignment_type === "AM" || assignment.assignment_type === "PM") {
        schedule[day.name][assignment.assignment_type].push(base);
      } else if (assignment.assignment_type === "IC") {
        const productionShift = String(assignment.notes || "").match(/production:(AM|PM)/)?.[1] || "FULL";
        const floorShift = String(assignment.notes || "").match(/floor:(AM|PM)/)?.[1] || null;
        schedule[day.name].IC.push({ ...base, productionShift, floorShift, requiresApproval: Boolean(assignment.requires_approval && !assignment.approved) });
      } else if (assignment.assignment_type === "TRAINING") {
        const [role = "training", shift = "FULL"] = String(assignment.notes || "training:FULL").split(":");
        schedule[day.name].training.push({
          ...base,
          role,
          shift,
          shiftCredits: Number(assignment.shift_credits) || 1,
        });
      }
    });
    return {
      schedule,
      score: Number(record.score) || 0,
      warnings: Array.isArray(record.warnings) ? record.warnings : [],
    };
  }

  function findScheduleRecord(recordId) {
    return state.scheduleHistory.find((record) => String(record.id) === String(recordId));
  }

  function printScheduleRecord(recordId) {
    const record = findScheduleRecord(recordId);
    if (!record) return;
    const option = scheduleRecordOption(record);
    const roster = scheduleRecordRoster(record);
    const printRoot = document.querySelector("#printScheduleRoot");
    printRoot.innerHTML = `<section class="print-document"><header><p>Swensen's Ice Cream · San Francisco</p><h1>Weekly Staff Schedule</h1><span>${scheduleWeekLabel(record.week_start)} · ${record.status === "published" ? "Published" : "Archived record"}</span></header>${buildScheduleSheet(option, record.week_start, roster)}</section>`;
    document.body.classList.add("printing-schedule");
    window.addEventListener("afterprint", () => {
      document.body.classList.remove("printing-schedule");
      printRoot.innerHTML = "";
    }, { once: true });
    window.requestAnimationFrame(() => window.print());
  }

  function downloadScheduleRecord(recordId) {
    const record = findScheduleRecord(recordId);
    if (!record) return;
    downloadScheduleFile(
      scheduleRecordOption(record),
      record.week_start,
      scheduleRecordRoster(record),
      `swensens-schedule-${record.week_start}-${record.status}.csv`,
    );
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
    if (state.mode === "demo" && !state.chatThreads.length) {
      const demoMessages = loadDemoMessages();
      state.chatThreads = demoMessages.threads;
      state.chatMessages = demoMessages.messages;
    }
    document.querySelectorAll(".nav-item[data-nav]").forEach((button) => {
      const page = button.dataset.nav;
      button.hidden = state.role === "manager"
        ? false
        : button.classList.contains("manager-only-nav") || (page === "inventory" && !state.canAccessInventory);
    });
    document.querySelector("#displayName").textContent = profile.display_name || "Manager";
    document.querySelector("#roleBadge").textContent = state.role === "manager" ? "Manager" : state.canAccessInventory ? "IC Maker" : "Employee";
    elements.logoutButton.textContent = (profile.display_name || "Manager").slice(0, 2).toUpperCase();
    elements.databaseHealthPanel.hidden = state.role !== "manager" || !isGabrielAccount(profile) || (state.mode !== "supabase" && !state.isItPreview);
    if (!elements.databaseHealthPanel.hidden) renderSystemCheckStatus();
    syncSchedulingPolicy();
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
    state.publishedSchedules = [];
    state.employeeAssignments = [];
    state.employeeScheduleWeekStart = "";
    state.scheduleHistory = [];
    state.selectedScheduleRecordId = "";
    state.employeePortalView = "schedule";
    state.dateRequests = [];
    state.dateRequestSetupMissing = false;
    state.requestCalendarWeekStart = "";
    state.requestDraftWeekStart = "";
    state.requestDraftDates = {};
    state.activeRequestDate = "";
    state.dateRequestKind = "time_off";
    state.dateRequestNotes = "";
    state.dateRequestBusy = false;
    state.shiftChangeRequests = [];
    state.shiftChangeOffers = [];
    state.shiftChangeSetupMissing = false;
    state.shiftChangeAssignmentId = "";
    state.shiftChangeType = "cover";
    state.shiftChangeBusy = false;
    state.chatThreads = [];
    state.chatMessages = [];
    state.activeChatThreadId = "";
    state.newChatOpen = false;
    state.messagesSetupMissing = false;
    state.messageBusy = false;
    state.directChatOpeningId = "";
    state.mobileMessagesThreadOpen = false;
    state.editingEmployeeId = null;
    state.editingSkillsEmployeeId = null;
    state.hiddenTeam = [];
    state.staffDirectory = [];
    state.showingEmployeeAccountForm = false;
    state.teamView = "active";
    state.scheduleModuleView = "availability";
    state.priorityEditing = false;
    state.priorityPolicySnapshot = null;
    state.priorityDragCode = "";
    state.schedulingPolicyBusy = false;
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
    state.reportStart = "";
    state.reportEnd = "";
    state.reportData = null;
    state.reportLoading = false;
    state.reportError = "";
    state.systemCheckBusy = false;
    state.latestSystemCheck = null;
    state.isItPreview = false;
    state.planningWeather = [];
    state.planningWeatherStatus = "idle";
    state.planningWeatherError = "";
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
    if (state.role !== "manager" && !["schedule", "messages"].includes(pageName) && !(state.canAccessInventory && pageName === "inventory")) pageName = "schedule";
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
    syncSchedulingPolicy();
    if (state.role !== "manager") {
      renderRequests();
      renderScheduleModule();
      renderMessages();
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
    renderRecords();
    renderReports();
    renderMessages();
  }

  function nextPlanningTuesday(value = new Date()) {
    const date = value instanceof Date ? new Date(value) : new Date(`${value}T12:00:00`);
    date.setHours(12, 0, 0, 0);
    let daysAhead = (2 - date.getDay() + 7) % 7;
    if (daysAhead === 0) daysAhead = 7;
    date.setDate(date.getDate() + daysAhead);
    return date;
  }

  function planningDateRange() {
    const start = nextPlanningTuesday();
    const end = new Date(start);
    end.setDate(end.getDate() + 5);
    const startLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(start);
    const endLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(end);
    return { start, end, label: `${startLabel}–${endLabel}` };
  }

  function dateDifferenceInDays(later, earlier = new Date()) {
    const end = new Date(later);
    const start = new Date(earlier);
    end.setHours(12, 0, 0, 0);
    start.setHours(12, 0, 0, 0);
    return Math.round((end.getTime() - start.getTime()) / 86400000);
  }

  function planningTrendData() {
    const planningStart = nextPlanningTuesday();
    const finalSunday = new Date(planningStart);
    finalSunday.setDate(finalSunday.getDate() - 2);
    const weeks = Array.from({ length: 8 }, (_, index) => {
      const start = new Date(finalSunday);
      start.setDate(start.getDate() - ((7 - index) * 7) - 5);
      const end = new Date(start);
      end.setDate(end.getDate() + 5);
      return {
        start,
        end,
        label: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(start),
        cans: 0,
        halves: 0,
      };
    });
    state.inventoryHistory
      .filter((batch) => batch.entry_type === "usage")
      .forEach((batch) => {
        const occurred = new Date(`${batch.occurred_on}T12:00:00`);
        const week = weeks.find((item) => occurred >= item.start && occurred <= item.end);
        if (!week) return;
        (batch.events || []).forEach((event) => {
          const quantity = event.delta < 0 ? Math.abs(Number(event.delta) || 0) : 0;
          if (event.inventory_kind === "half_gallon") week.halves += quantity;
          else if (event.inventory_kind === "can") week.cans += quantity;
        });
      });
    const populatedWeeks = weeks.filter((week) => week.cans + week.halves > 0).length;
    if (populatedWeeks >= 4) return { weeks, live: true };
    const previewCans = [18, 21, 19, 24, 23, 27, 29, 32];
    const previewHalves = [7, 8, 9, 8, 10, 12, 11, 14];
    return {
      live: false,
      weeks: weeks.map((week, index) => ({ ...week, cans: previewCans[index], halves: previewHalves[index] })),
    };
  }

  function renderDemandTrend(trend) {
    const target = document.querySelector("#demandTrendChart");
    if (!target) return;
    const values = trend.weeks.flatMap((week) => [week.cans, week.halves]);
    const max = Math.max(1, ...values) * 1.15;
    const width = 700;
    const top = 10;
    const bottom = 122;
    const x = (index) => 28 + ((width - 56) / (trend.weeks.length - 1)) * index;
    const y = (value) => bottom - ((Number(value) || 0) / max) * (bottom - top);
    const cansPoints = trend.weeks.map((week, index) => `${x(index).toFixed(1)},${y(week.cans).toFixed(1)}`).join(" ");
    const halfPoints = trend.weeks.map((week, index) => `${x(index).toFixed(1)},${y(week.halves).toFixed(1)}`).join(" ");
    const areaPoints = `${x(0)},${bottom} ${cansPoints} ${x(trend.weeks.length - 1)},${bottom}`;
    const grid = [0, .33, .66, 1].map((ratio) => `<line class="trend-grid-line" x1="0" y1="${(top + ratio * (bottom - top)).toFixed(1)}" x2="${width}" y2="${(top + ratio * (bottom - top)).toFixed(1)}"></line>`).join("");
    const canDots = trend.weeks.map((week, index) => `<circle class="trend-point-cans" cx="${x(index).toFixed(1)}" cy="${y(week.cans).toFixed(1)}" r="3.5"><title>${week.label}: ${week.cans} cans</title></circle>`).join("");
    const halfDots = trend.weeks.map((week, index) => `<circle class="trend-point-halves" cx="${x(index).toFixed(1)}" cy="${y(week.halves).toFixed(1)}" r="3"><title>${week.label}: ${week.halves} half-gallons</title></circle>`).join("");
    target.setAttribute("aria-label", `${trend.live ? "Recorded" : "Illustrative"} eight-week inventory usage trend. Latest week: ${trend.weeks.at(-1).cans} cans and ${trend.weeks.at(-1).halves} half-gallons.`);
    target.innerHTML = `<svg viewBox="0 0 ${width} 136" preserveAspectRatio="none" aria-hidden="true">${grid}<polygon class="trend-area" points="${areaPoints}"></polygon><polyline class="trend-line-cans" points="${cansPoints}"></polyline><polyline class="trend-line-halves" points="${halfPoints}"></polyline>${canDots}${halfDots}</svg><div class="trend-axis-labels">${trend.weeks.map((week) => `<span>${escapeHtml(week.label)}</span>`).join("")}</div><span class="trend-source-label ${trend.live ? "live" : ""}">${trend.live ? "Recorded inventory usage" : "Illustrative trend until 4+ weeks of usage are recorded"}</span>`;
  }

  function weatherPresentation(code) {
    const numericCode = Number(code);
    if (numericCode === 0) return { icon: "☀️", label: "Clear" };
    if ([1, 2].includes(numericCode)) return { icon: "🌤️", label: "Partly sunny" };
    if (numericCode === 3) return { icon: "☁️", label: "Cloudy" };
    if ([45, 48].includes(numericCode)) return { icon: "🌫️", label: "Fog" };
    if ([51, 53, 55, 56, 57].includes(numericCode)) return { icon: "🌦️", label: "Drizzle" };
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(numericCode)) return { icon: "🌧️", label: "Rain" };
    if ([95, 96, 99].includes(numericCode)) return { icon: "⛈️", label: "Storm" };
    return { icon: "🌤️", label: "Mixed" };
  }

  function previewWeatherForTwoWeeks() {
    const start = new Date(`${currentScheduleTuesday()}T12:00:00`);
    const samples = [
      { max: 67, min: 54, precipitation: 8, code: 2 },
      { max: 69, min: 55, precipitation: 6, code: 1 },
      { max: 71, min: 56, precipitation: 4, code: 1 },
      { max: 73, min: 56, precipitation: 5, code: 0 },
      { max: 75, min: 57, precipitation: 7, code: 0 },
      { max: 70, min: 56, precipitation: 12, code: 2 },
      { max: 68, min: 55, precipitation: 9, code: 2 },
      { max: 70, min: 55, precipitation: 6, code: 1 },
      { max: 72, min: 56, precipitation: 5, code: 1 },
      { max: 74, min: 57, precipitation: 4, code: 0 },
      { max: 76, min: 58, precipitation: 6, code: 0 },
      { max: 71, min: 56, precipitation: 10, code: 2 },
    ];
    return samples.map((sample, index) => {
      const date = new Date(start);
      date.setDate(date.getDate() + index + (index >= 6 ? 1 : 0));
      return { ...sample, date: localIsoDate(date) };
    });
  }

  async function loadPlanningWeather() {
    if (state.planningWeatherStatus !== "idle") return;
    state.planningWeatherStatus = "loading";
    renderPlanningWeather();
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8500);
    try {
      const endpoint = "https://api.open-meteo.com/v1/forecast?latitude=37.7996&longitude=-122.4193&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&timezone=America%2FLos_Angeles&past_days=6&forecast_days=16";
      const response = await fetch(endpoint, { signal: controller.signal });
      if (!response.ok) throw new Error(`Weather request returned ${response.status}`);
      const data = await response.json();
      const daily = data?.daily;
      if (!Array.isArray(daily?.time)) throw new Error("Weather response did not include daily forecasts");
      state.planningWeather = daily.time.map((date, index) => ({
        date,
        code: Number(daily.weather_code?.[index]),
        max: Math.round(Number(daily.temperature_2m_max?.[index])),
        min: Math.round(Number(daily.temperature_2m_min?.[index])),
        precipitation: Math.round(Number(daily.precipitation_probability_max?.[index]) || 0),
      }));
      const currentWeekStart = currentScheduleTuesday();
      const requestedDates = [
        ...Array.from({ length: 6 }, (_, index) => addDaysToIso(currentWeekStart, index)),
        ...Array.from({ length: 6 }, (_, index) => addDaysToIso(currentWeekStart, index + 7)),
      ];
      if (!requestedDates.every((date) => state.planningWeather.some((day) => day.date === date))) throw new Error("The two-week weather window is not available yet");
      state.planningWeatherStatus = "live";
      state.planningWeatherError = "";
    } catch (error) {
      state.planningWeather = previewWeatherForTwoWeeks();
      state.planningWeatherStatus = "preview";
      state.planningWeatherError = error?.message || "Live weather is unavailable";
    } finally {
      window.clearTimeout(timer);
      renderDashboard();
    }
  }

  function planningDailyForecast() {
    const start = nextPlanningTuesday();
    return planningStaffing.map((setting, index) => {
      const date = new Date(start);
      date.setDate(date.getDate() + index);
      const dateIso = localIsoDate(date);
      const weather = state.planningWeather.find((item) => item.date === dateIso);
      let score = setting.score;
      if (weather) {
        if (weather.max >= 74) score += 5;
        else if (weather.max >= 69) score += 2;
        if (weather.precipitation >= 55) score -= 7;
        else if (weather.precipitation >= 35) score -= 3;
      }
      score = Math.max(35, Math.min(98, Math.round(score)));
      const level = score >= 86 ? "Very busy" : score >= 70 ? "Busy" : "Steady";
      return { ...setting, date, dateIso, weather, score, level };
    });
  }

  function renderDailyForecast(days) {
    const target = document.querySelector("#dailyForecastStrip");
    if (!target) return;
    target.innerHTML = days.map((day) => {
      const weather = weatherPresentation(day.weather?.code);
      const dateLabel = new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric" }).format(day.date);
      return `<article class="forecast-day ${day.score >= 86 ? "peak" : ""}"><header><strong>${day.day} ${dateLabel}</strong><span title="${escapeHtml(weather.label)}">${weather.icon}</span></header><b>${day.level}</b><meter min="0" max="100" value="${day.score}">${day.score}</meter><small>${day.weather ? `${day.weather.max}° · ${day.weather.precipitation}% rain` : "Weather loading"}</small></article>`;
    }).join("");
  }

  function renderForecastDrivers(trend, days) {
    const target = document.querySelector("#forecastDrivers");
    if (!target) return;
    const latest = trend.weeks.at(-1);
    const prior = trend.weeks.slice(-4, -1);
    const baseline = prior.length ? prior.reduce((total, week) => total + week.cans + week.halves, 0) / prior.length : latest.cans + latest.halves;
    const recentDelta = baseline ? Math.round((((latest.cans + latest.halves) - baseline) / baseline) * 100) : 0;
    const warmest = Math.max(...days.map((day) => day.weather?.max || 0));
    const peak = days.reduce((best, day) => day.score > best.score ? day : best, days[0]);
    target.innerHTML = `
      <div class="forecast-driver"><span class="forecast-driver-icon">IC</span><span><strong>Inventory pull trend</strong><small>${trend.live ? "Recorded" : "Preview"}: ${latest.cans} cans + ${latest.halves} half-gallons in the latest week</small></span><b class="${recentDelta > 0 ? "" : "neutral"}">${recentDelta > 0 ? "+" : ""}${recentDelta}%</b></div>
      <div class="forecast-driver"><span class="forecast-driver-icon">WX</span><span><strong>Weather effect</strong><small>${state.planningWeatherStatus === "live" ? `Live forecast; warmest day ${warmest}°F` : "Preview values until live weather loads"}</small></span><b class="${warmest >= 72 ? "" : "neutral"}">${warmest >= 72 ? "Positive" : "Neutral"}</b></div>
      <div class="forecast-driver"><span class="forecast-driver-icon">WK</span><span><strong>Weekend pattern</strong><small>${peak.day} is projected to carry the most pressure</small></span><b>High</b></div>`;
  }

  function seasonalOccurrence(launch, today = new Date()) {
    const currentYear = today.getFullYear();
    let release = new Date(currentYear, launch.month - 1, launch.day, 12);
    let days = dateDifferenceInDays(release, today);
    let live = days < 0 && days >= -28;
    if (days < -28) {
      release = new Date(currentYear + 1, launch.month - 1, launch.day, 12);
      days = dateDifferenceInDays(release, today);
      live = false;
    }
    const prep = new Date(release);
    prep.setDate(prep.getDate() - 5);
    return { ...launch, release, prep, days, live };
  }

  function formatPlanningDate(date, includeYear = false) {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", ...(includeYear ? { year: "numeric" } : {}) }).format(date);
  }

  function renderSeasonalBoard() {
    const target = document.querySelector("#seasonalLaunchBoard");
    if (!target) return [];
    const launches = seasonalLaunches.map((launch) => seasonalOccurrence(launch)).sort((a, b) => a.release - b.release);
    target.innerHTML = launches.map((launch, index) => {
      const countdown = launch.live ? "Live now" : launch.days === 0 ? "Today" : launch.days === 1 ? "Tomorrow" : `${launch.days} days`;
      return `<article class="season-card ${escapeHtml(launch.id)} ${index === 0 ? "next" : ""}"><span class="season-swatch" aria-hidden="true"></span><div class="season-card-content"><header><div><small>${escapeHtml(launch.season)}</small><strong>Out ${formatPlanningDate(launch.release)}</strong></div><span class="season-countdown">${countdown}</span></header><p class="season-flavors">${launch.flavors.map(escapeHtml).join(" · ")}</p><p class="season-history">${escapeHtml(launch.history)}</p><div class="season-prep"><span>Recommended prep</span><strong>${formatPlanningDate(launch.prep)}</strong></div></div></article>`;
    }).join("");
    return launches;
  }

  function renderPlanningTasks(launches, days) {
    const target = document.querySelector("#planningTaskBoard");
    if (!target) return;
    const nextLaunch = launches.find((launch) => !launch.live) || launches[0];
    const peak = days.reduce((best, day) => day.score > best.score ? day : best, days[0]);
    const prepUrgency = dateDifferenceInDays(nextLaunch.prep) <= 14 ? "urgent" : "";
    const trainee = state.team.find((employee) => String(employee.id) === String(state.settings.traineeId));
    const tasks = [
      {
        className: prepUrgency,
        marker: "IC",
        title: `Prepare ${nextLaunch.season.toLowerCase()} seasonal production`,
        detail: nextLaunch.flavors.join(" · "),
        due: `Prep by ${formatPlanningDate(nextLaunch.prep)}`,
      },
      {
        className: "ready",
        marker: "SCH",
        title: `Review ${peak.day} coverage for a ${peak.level.toLowerCase()} day`,
        detail: `Projected demand ${peak.score}/100; keep the extra peak coverage in the draft.`,
        due: "Before scheduling",
      },
      {
        className: "",
        marker: "SF",
        title: "Verify major SF events for the planning window",
        detail: "Event impact is intentionally excluded until a trusted calendar feed is connected.",
        due: "Data setup",
      },
      {
        className: "ready",
        marker: "TRN",
        title: `Plan ${trainee?.name || "trainee"}’s training pairings`,
        detail: "Keep training earlier in the week with an available trainer; avoid the Saturday peak.",
        due: "Before scheduling",
      },
    ];
    document.querySelector("#planningTaskCount").textContent = `${tasks.length} items`;
    target.innerHTML = tasks.map((task) => `<article class="planning-task ${task.className}"><span class="task-marker">${task.marker}</span><div><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.detail)}</small></div><span class="task-due">${escapeHtml(task.due)}</span></article>`).join("");
  }

  function weatherWeekMarkup(label, startIso, planningFocus = false) {
    const dates = Array.from({ length: 6 }, (_, index) => addDaysToIso(startIso, index));
    const start = new Date(`${startIso}T12:00:00`);
    const end = new Date(`${dates.at(-1)}T12:00:00`);
    const range = `${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(start)}–${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(end)}`;
    const todayIso = localIsoDate(new Date());
    const cards = dates.map((dateIso) => {
      const date = new Date(`${dateIso}T12:00:00`);
      const day = state.planningWeather.find((item) => item.date === dateIso);
      const weather = weatherPresentation(day?.code);
      const dayLabel = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
      const dateLabel = new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric" }).format(date);
      return `<article class="weather-day ${dateIso < todayIso ? "past" : ""}"><strong>${dayLabel}</strong><span class="weather-date">${dateLabel}</span><span class="weather-icon" title="${escapeHtml(weather.label)}">${weather.icon}</span><b>${day?.max ?? "—"}° / ${day?.min ?? "—"}°</b><small>${day?.precipitation ?? 0}% rain</small></article>`;
    }).join("");
    return `<section class="weather-week ${planningFocus ? "planning-focus" : ""}"><header><div><strong>${label}</strong><span>${range} · Tue–Sun</span></div>${planningFocus ? `<b>Schedule focus</b>` : ""}</header><div class="weather-week-grid">${cards}</div></section>`;
  }

  function renderPlanningWeather() {
    const target = document.querySelector("#weatherForecastBoard");
    const boardStatus = document.querySelector("#weatherBoardStatus");
    const sourceStatus = document.querySelector("#weatherSourceStatus");
    const freshness = document.querySelector("#forecastFreshness");
    const readiness = document.querySelector(".source-readiness-heading span");
    if (!target) return;
    if (state.planningWeatherStatus === "loading" || state.planningWeatherStatus === "idle") {
      target.innerHTML = `<div class="weather-loading">Loading this week and next week in San Francisco…</div>`;
      if (boardStatus) { boardStatus.textContent = "Loading weather"; boardStatus.className = "live-source-badge"; }
      return;
    }
    const currentWeekStart = currentScheduleTuesday();
    const nextWeekStart = addDaysToIso(currentWeekStart, 7);
    target.innerHTML = `${weatherWeekMarkup("Next week", nextWeekStart, true)}${weatherWeekMarkup("This week", currentWeekStart)}`;
    const isLive = state.planningWeatherStatus === "live";
    if (boardStatus) {
      boardStatus.textContent = isLive ? "Live SF forecast" : "Weather preview";
      boardStatus.className = `live-source-badge ${isLive ? "live" : "preview"}`;
    }
    if (sourceStatus) {
      sourceStatus.className = `source-row ${isLive ? "connected" : "error"}`;
      sourceStatus.querySelector("small").textContent = isLive ? "Open-Meteo daily forecast" : "Preview values shown";
      sourceStatus.querySelector("b").textContent = isLive ? "Connected" : "Preview";
    }
    if (readiness) readiness.textContent = `${isLive ? 2 : 1} of 4 live`;
    if (freshness) {
      freshness.className = isLive ? "live" : "";
      freshness.innerHTML = `<i aria-hidden="true"></i> ${isLive ? "Live weather · demand forecast updated" : "Forecast preview · live weather unavailable"}`;
    }
  }

  function renderScheduleRecommendation(days) {
    const target = document.querySelector("#scheduleRecommendation");
    if (!target) return;
    target.innerHTML = days.map((day) => {
      let am = day.am;
      let pm = day.pm;
      if (day.score >= 88) { am = Math.max(am, 4); pm = Math.max(pm, 4); }
      else if (day.score >= 80) { am = Math.max(am, 3); pm = Math.max(pm, 4); }
      else if (day.score >= 70) { am = Math.max(am, 3); pm = Math.max(pm, 3); }
      return `<div class="schedule-day-setting ${day.score >= 86 ? "peak" : ""}"><strong>${day.day}</strong><span class="shift-needs"><span>AM <b>${am}</b></span><span>PM <b>${pm}</b></span></span></div>`;
    }).join("");
  }

  function renderDashboard() {
    const range = planningDateRange();
    const weekLabel = document.querySelector("#planningWeekLabel");
    if (weekLabel) weekLabel.textContent = `${range.label} · Tuesday–Sunday`;
    const trend = planningTrendData();
    renderDemandTrend(trend);
    const days = planningDailyForecast();
    renderDailyForecast(days);
    renderForecastDrivers(trend, days);
    renderPlanningWeather();
    renderScheduleRecommendation(days);
    const launches = renderSeasonalBoard();
    renderPlanningTasks(launches, days);
    const averageScore = Math.round(days.reduce((total, day) => total + day.score, 0) / days.length);
    const forecastScore = document.querySelector("#forecastScore");
    const forecastBadge = document.querySelector("#forecastLevelBadge");
    const forecastChange = document.querySelector("#forecastChange");
    const narrative = document.querySelector("#forecastNarrative");
    const peak = days.reduce((best, day) => day.score > best.score ? day : best, days[0]);
    const level = averageScore >= 83 ? "Very busy" : averageScore >= 68 ? "Busy" : "Steady";
    if (forecastScore) forecastScore.textContent = averageScore;
    if (forecastBadge) {
      forecastBadge.textContent = level;
      forecastBadge.className = `forecast-level-badge ${level === "Very busy" ? "very-busy" : level === "Steady" ? "steady" : ""}`;
    }
    if (forecastChange) forecastChange.textContent = `↑ ${Math.max(0, Math.round(((averageScore - 64) / 64) * 100))}% vs. recent baseline`;
    if (narrative) narrative.textContent = `Plan for a stronger Friday–Sunday, with the highest pressure on ${peak.day} at ${peak.score}/100.`;
    if (state.planningWeatherStatus === "idle") loadPlanningWeather();
  }

  function applyDateRequestsToTeam(weekStart) {
    state.dateRequests.filter((request) => request.schedule_week_start === weekStart).forEach((request) => {
      const employee = dateRequestEmployee(request);
      if (!employee) return;
      const date = new Date(`${request.request_date}T12:00:00`);
      const day = demoData.days.find((item) => item.number === date.getDay());
      if (!day || !employee.availability?.[day.name]) return;
      if (request.shift_scope === "ALL_DAY" || request.shift_scope === "AM") employee.availability[day.name].AM = "unavailable";
      if (request.shift_scope === "ALL_DAY" || request.shift_scope === "PM") employee.availability[day.name].PM = "unavailable";
      if (employee.availability[day.name].AM === "unavailable" || employee.availability[day.name].PM === "unavailable") {
        employee.willingDouble = employee.willingDouble.filter((value) => value !== day.name);
      }
    });
  }

  async function loadDateRequestsForPortal({ role = state.role, weekStart = state.settings.weekStart, announce = false } = {}) {
    if (state.mode !== "supabase" || !supabaseClient) return;
    let query = supabaseClient.from("date_requests")
      .select("id, employee_id, request_date, schedule_week_start, shift_scope, request_kind, notes, status, is_late, schedule_was_published, submitted_at")
      .order("request_date");
    if (role === "manager") {
      query = query.eq("schedule_week_start", weekStart);
    } else {
      const firstWeek = upcomingRequestWeeks()[0];
      query = query.gte("request_date", firstWeek).lte("request_date", addDaysToIso(firstWeek, 48));
    }
    const previousIds = new Set(state.dateRequests.map((request) => request.id));
    const { data, error } = await query;
    if (error) {
      state.dateRequestSetupMissing = /date_requests|schema cache|relation/i.test(error.message || "");
      state.dateRequests = [];
      return;
    }
    state.dateRequestSetupMissing = false;
    state.dateRequests = data || [];
    if (role === "manager") applyDateRequestsToTeam(weekStart);
    const newLate = state.dateRequests.filter((request) => dateRequestIsLate(request) && !previousIds.has(request.id));
    if (announce && newLate.length) {
      const employee = dateRequestEmployee(newLate[0]);
      showToast(`Late request received${employee ? ` from ${employee.name}` : ""}.`);
    }
  }

  async function loadShiftChangeRequests({ announce = false, role = state.role } = {}) {
    if (state.mode === "demo") {
      state.shiftChangeRequests = loadDemoShiftChanges();
      state.shiftChangeSetupMissing = false;
      return;
    }
    if (state.mode !== "supabase" || !supabaseClient) return;
    const previousIds = new Set(state.shiftChangeRequests.map((request) => request.id));
    let query = supabaseClient.from("shift_change_requests")
      .select("*, shift_cover_offers(id, employee_id, note, offered_at)")
      .order("submitted_at", { ascending: false });
    if (role === "manager") {
      query = query.in("schedule_week_start", managerPublishedScheduleWeeks());
    } else {
      const visibleWeeks = [...new Set(state.publishedSchedules.map((schedule) => schedule.week_start))];
      query = visibleWeeks.length
        ? query.in("schedule_week_start", visibleWeeks)
        : query.eq("schedule_week_start", currentScheduleTuesday());
    }
    const { data, error } = await query;
    if (error) {
      state.shiftChangeSetupMissing = /shift_change_requests|shift_cover_offers|schema cache|relation/i.test(error.message || "");
      state.shiftChangeRequests = [];
      return;
    }
    state.shiftChangeSetupMissing = false;
    state.shiftChangeRequests = data || [];
    const urgent = state.shiftChangeRequests.find((request) => request.urgent && !previousIds.has(request.id));
    if (announce && role === "manager" && urgent) {
      const employee = state.team.find((item) => String(item.id) === String(urgent.employee_id));
      showToast(`Urgent call-off${employee ? ` from ${employee.name}` : ""}.`);
    }
  }

  async function reloadPublishedAssignments() {
    if (state.mode !== "supabase" || !supabaseClient || state.role === "manager") return;
    const scheduleIds = state.publishedSchedules.map((schedule) => schedule.id);
    if (!scheduleIds.length) {
      state.employeeAssignments = [];
      return;
    }
    const { data, error } = await supabaseClient.from("schedule_assignments")
      .select("id, schedule_id, employee_id, work_day, assignment_type, shift_credits, is_double, requires_approval, approved, coverage_status, notes")
      .in("schedule_id", scheduleIds);
    if (!error) state.employeeAssignments = data || [];
  }

  async function refreshWeeklyRequests() {
    if (state.mode !== "supabase" || state.role !== "manager") return;
    state.team.forEach((employee) => {
      employee.availability = clone(employee.baseAvailability || employee.availability || demoData.availability());
      employee.willingDouble = clone(employee.baseWillingDouble || []);
      employee.submitted = false;
      employee.submittedAt = null;
      employee.lateRequest = false;
      employee.requestType = "weekly_availability";
    });
    const { data: requestRows, error } = await supabaseClient.from("weekly_requests")
      .select("*, availability_slots(*)").eq("week_start", state.settings.weekStart);
    if (error) return;
    (requestRows || []).forEach((request) => {
      const employee = state.team.find((item) => item.id === request.employee_id);
      if (!employee) return;
      employee.notes = request.notes;
      employee.submitted = true;
      employee.submittedAt = request.submitted_at;
      employee.lateRequest = new Date(request.submitted_at).getTime() > requestDeadlineForWeek(request.week_start).getTime();
      employee.requestType = employee.requestType || "weekly_availability";
      employee.willingDouble = [];
      (request.availability_slots || []).forEach((slot) => {
        const day = demoData.days.find((item) => item.number === slot.work_day);
        if (!day) return;
        employee.availability[day.name][slot.shift] = slot.preference;
        if (slot.willing_double && !employee.willingDouble.includes(day.name)) employee.willingDouble.push(day.name);
      });
    });
    await loadDateRequestsForPortal({ role: "manager", weekStart: state.settings.weekStart, announce: true });
    await loadShiftChangeRequests({ announce: true });
    renderDashboard();
    renderAvailabilityMatrix();
    if (!state.editingEmployeeId) renderRequests();
    renderScheduleModule();
  }

  function queueRequestRefresh() {
    window.clearTimeout(state.requestRefreshDebounce);
    state.requestRefreshDebounce = window.setTimeout(refreshWeeklyRequests, 550);
  }

  function queueShiftChangeRefresh() {
    window.clearTimeout(state.shiftChangeRefreshDebounce);
    state.shiftChangeRefreshDebounce = window.setTimeout(async () => {
      await loadShiftChangeRequests({ announce: true });
      if (state.role === "manager") {
        await loadScheduleHistory();
        renderDashboard();
        if (!state.editingEmployeeId) renderRequests();
      } else {
        await reloadPublishedAssignments();
        renderEmployeePortal();
      }
    }, 350);
  }

  function chatDataFingerprint() {
    return JSON.stringify([
      state.chatThreads.map((thread) => [thread.id, thread.updated_at, (thread.member_ids || []).length]),
      state.chatMessages.map((message) => [message.id, message.created_at]),
    ]);
  }

  async function refreshChatData() {
    if (state.mode !== "supabase" || state.chatRefreshBusy || !state.profile || document.hidden) return;
    state.chatRefreshBusy = true;
    const before = chatDataFingerprint();
    const composer = document.querySelector("#chatMessageForm textarea");
    const draft = composer?.value || "";
    const composerFocused = document.activeElement === composer;
    const threadId = state.activeChatThreadId;
    try {
      await loadChatData({ ensureTeam: false });
      if (chatDataFingerprint() !== before) {
        renderMessages();
        const nextComposer = document.querySelector("#chatMessageForm textarea");
        if (nextComposer && String(state.activeChatThreadId) === String(threadId) && draft) {
          nextComposer.value = draft;
          if (composerFocused) nextComposer.focus();
        }
        const list = document.querySelector("[data-chat-message-list]");
        if (list) list.scrollTop = list.scrollHeight;
      }
    } finally {
      state.chatRefreshBusy = false;
    }
  }

  function queueChatRefresh() {
    window.clearTimeout(state.chatRefreshDebounce);
    state.chatRefreshDebounce = window.setTimeout(refreshChatData, 250);
  }

  async function refreshInventoryData() {
    if (state.mode !== "supabase" || !state.canAccessInventory || state.inventoryBusy || state.inventoryRefreshBusy || document.hidden) return;
    state.inventoryRefreshBusy = true;
    try {
      await loadInventoryData({ silent: true });
      renderInventory();
      renderRecords();
    } finally {
      state.inventoryRefreshBusy = false;
    }
  }

  function queueInventoryRefresh() {
    window.clearTimeout(state.inventoryRefreshDebounce);
    state.inventoryRefreshDebounce = window.setTimeout(refreshInventoryData, 350);
  }

  function startRequestSync() {
    stopRequestSync();
    if (state.mode !== "supabase") return;
    let channel = supabaseClient.channel("swensens-weekly-request-sync");
    if (state.role === "manager") {
      channel = channel
        .on("postgres_changes", { event: "*", schema: "public", table: "weekly_requests" }, queueRequestRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "availability_slots" }, queueRequestRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "date_requests" }, queueRequestRefresh);
      state.requestRefreshTimer = window.setInterval(refreshWeeklyRequests, 30000);
    }
    channel = channel
      .on("postgres_changes", { event: "*", schema: "public", table: "shift_change_requests" }, queueShiftChangeRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "shift_cover_offers" }, queueShiftChangeRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "schedule_assignments" }, queueShiftChangeRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_threads" }, queueChatRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_members" }, queueChatRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, queueChatRefresh);
    if (state.canAccessInventory) {
      ["ice_cream_flavors", "ice_cream_inventory", "ice_cream_inventory_batches", "ice_cream_inventory_events", "ice_cream_production_sheets", "ice_cream_production_slots", "ice_cream_production_cells"].forEach((table) => {
        channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, queueInventoryRefresh);
      });
      state.inventoryRefreshTimer = window.setInterval(refreshInventoryData, 10000);
    }
    state.requestSyncChannel = channel.subscribe();
    state.chatRefreshTimer = window.setInterval(refreshChatData, 5000);
  }

  function stopRequestSync() {
    window.clearInterval(state.requestRefreshTimer);
    window.clearInterval(state.chatRefreshTimer);
    window.clearInterval(state.inventoryRefreshTimer);
    window.clearTimeout(state.requestRefreshDebounce);
    window.clearTimeout(state.shiftChangeRefreshDebounce);
    window.clearTimeout(state.chatRefreshDebounce);
    window.clearTimeout(state.inventoryRefreshDebounce);
    state.requestRefreshTimer = null;
    state.chatRefreshTimer = null;
    state.inventoryRefreshTimer = null;
    state.requestRefreshDebounce = null;
    state.shiftChangeRefreshDebounce = null;
    state.chatRefreshDebounce = null;
    state.inventoryRefreshDebounce = null;
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

  function reportIsoDate(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  }

  function reportQuarterRange(quarterOffset = 0) {
    const [year, month] = inventoryDateValue().split("-").map(Number);
    const startMonth = Math.floor((month - 1) / 3) * 3 + quarterOffset * 3;
    const start = new Date(Date.UTC(year, startMonth, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 3, 0));
    return { start: reportIsoDate(start), end: reportIsoDate(end) };
  }

  function ensureReportRange() {
    if (state.reportStart && state.reportEnd) return;
    const range = reportQuarterRange();
    state.reportStart = range.start;
    state.reportEnd = range.end;
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

  function mobileProductionMaster(sheetFlavors, slots) {
    const productionCell = (slot, flavor, kind) => {
      const cell = productionSheetCell(slot, flavor.id);
      const value = kind === "can" ? cell?.can_quantity : cell?.half_gallon_quantity;
      return `<td>${Number(value) > 0 ? value : ""}</td>`;
    };
    const rows = inventoryPaperRows(sheetFlavors, 13, (flavor) => `<tr>
      <th scope="row">${escapeHtml(flavor.name)}</th>
      <td class="mobile-sheet-current-count">${Number.isInteger(flavor.canCount) ? flavor.canCount : "—"}</td>
      ${slots.map((slot) => productionCell(slot, flavor, "can")).join("")}
      <td class="mobile-sheet-half-divider"></td>
      ${slots.map((slot) => productionCell(slot, flavor, "half_gallon")).join("")}
    </tr>`);
    return `<div class="inventory-mobile-master production-mobile-master" aria-label="Complete mobile production master sheet">
      <div class="mobile-full-sheet-label"><strong>Full 5-day master sheet</strong><span>All columns shown</span></div>
      <div class="mobile-production-sheet-frame">
        <table class="mobile-production-sheet">
          <caption>Full-can master count with five can-production dates and five half-gallon production dates</caption>
          <colgroup><col class="mobile-sheet-flavor-col"><col class="mobile-sheet-count-col">${slots.map(() => '<col class="mobile-sheet-day-col">').join("")}<col class="mobile-sheet-divider-col">${slots.map(() => '<col class="mobile-sheet-day-col">').join("")}</colgroup>
          <thead>
            <tr><th rowspan="2" scope="col">Flavor</th><th rowspan="2" scope="col">Cans</th><th colspan="5" scope="colgroup">Cans made</th><th rowspan="2" scope="col" class="mobile-sheet-half-divider">½ gal</th><th colspan="5" scope="colgroup">½ gallons made</th></tr>
            <tr class="mobile-sheet-date-row">${slots.map((slot) => `<th scope="col">${inventoryShortDate(slot.can_date)}</th>`).join("")}${slots.map((slot) => `<th scope="col">${inventoryShortDate(slot.half_gallon_date)}</th>`).join("")}</tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  }

  function mobileHalfGallonMaster(flavors) {
    const groups = Object.entries(inventoryCategoryLabels).map(([category, label]) => {
      const rows = flavors.filter((flavor) => flavor.category === category);
      if (!rows.length) return "";
      return `<section class="mobile-master-category"><header><strong>${label}</strong><span>${rows.length} flavor${rows.length === 1 ? "" : "s"}</span></header><div>${rows.map((flavor) => `<article class="mobile-half-gallon-row"><span>${escapeHtml(flavor.name)}</span><strong class="${Number.isInteger(flavor.halfGallonCount) ? "" : "missing"}">${Number.isInteger(flavor.halfGallonCount) ? flavor.halfGallonCount : "Count needed"}</strong></article>`).join("")}</div></section>`;
    }).join("");
    return `<div class="inventory-mobile-master half-gallon-mobile-master" aria-label="Mobile half-gallon count sheet">${groups}</div>`;
  }

  function productionSheetCellMarkup(slot, flavor, kind) {
    const cell = productionSheetCell(slot, flavor.id);
    const value = kind === "can" ? cell?.can_quantity : cell?.half_gallon_quantity;
    return `<td>${Number(value) > 0 ? value : ""}</td>`;
  }

  function productionMasterTableMarkup(sheet, sheetFlavors, slots, extraClass = "") {
    return `<div class="inventory-paper-scroll inventory-desktop-master ${extraClass}" aria-label="Production master sheet with all date columns.">
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
          ${slots.map((slot) => productionSheetCellMarkup(slot, flavor, "can")).join("")}
          <td class="half-gallon-divider"></td>
          ${slots.map((slot) => productionSheetCellMarkup(slot, flavor, "half_gallon")).join("")}
        </tr>`)}</tbody>
      </table>
    </div>`;
  }

  function renderInventoryMaster() {
    const kind = state.inventoryMasterView;
    const isHalfGallons = kind === "half_gallon";
    const halfFlavors = state.inventoryFlavors.filter((flavor) => flavor.tracksHalfGallons);
    const sheet = viewedProductionSheet();
    const activeSheet = activeProductionSheet();
    const slots = productionSheetSlots(sheet);
    const sheetFlavors = productionSheetFlavors(sheet);
    const sheetChoices = state.productionSheets.map((item) => `<option value="${item.id}" ${item.id === sheet?.id ? "selected" : ""}>Sheet #${item.sheet_number}${item.status === "active" ? " · Current" : " · Complete"}</option>`).join("");
    const daysUsed = productionSheetDaysUsed(sheet);
    const productionSheet = productionMasterTableMarkup(sheet, sheetFlavors, slots);
    const halfGallonSheet = `<div class="inventory-paper-scroll half-gallon-paper-scroll inventory-desktop-master">
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
      ${isHalfGallons ? `${halfGallonSheet}${mobileHalfGallonMaster(halfFlavors)}` : `${productionSheet}${mobileProductionMaster(sheetFlavors, slots)}`}
      <p class="inventory-paper-note">${isHalfGallons ? "This count changes whenever ½ gallons are made, used, or physically corrected." : sheet?.status === "complete" ? "Archived sheets stay read-only. Print them again or download their structured data at any time." : "Production entries automatically fill the complete five-day sheet on both phone and laptop."}</p>
    </section>`;
  }

  function renderProductionArchiveLibrary() {
    const completed = state.productionSheets.filter((sheet) => sheet.status === "complete");
    return `<section class="panel production-archive-panel">
      <div class="panel-heading"><div><p class="eyebrow">Completed records</p><h3>Past master sheets</h3><p>Every completed five-day sheet stays here with its frozen counts and production details.</p></div><span class="count-badge">${completed.length}</span></div>
      ${completed.length ? `<div class="production-archive-list">${completed.map((sheet) => {
        const totals = productionSheetTotals(sheet);
        return `<article class="production-archive-card"><div><span class="inventory-history-type archive">Archived</span><strong>Master sheet #${sheet.sheet_number}</strong><p>${productionSheetDateRange(sheet)}</p><small>${totals.cans} cans made · ${totals.halfGallons} half gallons made${sheet.completed_by_name ? ` · Completed by ${escapeHtml(sheet.completed_by_name)}` : ""}</small></div><div class="production-archive-actions"><button type="button" class="secondary-button compact" data-view-production-sheet="${sheet.id}">View sheet</button><button type="button" class="secondary-button compact" data-print-production-sheet="${sheet.id}">Print / Save PDF</button><button type="button" class="secondary-button compact" data-download-production-sheet="${sheet.id}">Download data</button></div></article>`;
      }).join("")}</div>` : `<div class="inventory-empty">The first finished five-day sheet will appear here.</div>`}
    </section>`;
  }

  function renderRecords() {
    if (!elements.records || state.role !== "manager") return;
    let inventoryMarkup = "";
    const inventoryHeading = `<div class="records-section-heading"><div><p class="eyebrow">Inventory records</p><h3>Production master sheets</h3><p>Follow the current sheet live, then return to every completed five-day sheet.</p></div></div>`;
    if (state.inventoryLoading && !state.productionSheets.length) {
      inventoryMarkup = `${inventoryHeading}<section class="panel inventory-loading"><strong>Loading master sheet records…</strong></section>`;
      elements.records.innerHTML = `${scheduleRecordsMarkup()}<section class="records-section">${inventoryMarkup}</section>`;
      return;
    }
    if (state.inventoryError) {
      inventoryMarkup = `${inventoryHeading}<section class="panel inventory-error"><h3>Inventory records are not connected yet.</h3><p>${escapeHtml(state.inventoryError)}</p></section>`;
      elements.records.innerHTML = `${scheduleRecordsMarkup()}<section class="records-section">${inventoryMarkup}</section>`;
      return;
    }
    const sheet = activeProductionSheet();
    if (!sheet) {
      inventoryMarkup = `${inventoryHeading}<section class="panel records-empty-state"><p class="eyebrow">Live records</p><h3>No production master sheet yet</h3><p>The current sheet will appear here as soon as inventory setup creates it.</p></section>${renderProductionArchiveLibrary()}`;
      elements.records.innerHTML = `${scheduleRecordsMarkup()}<section class="records-section">${inventoryMarkup}</section>`;
      return;
    }
    const slots = productionSheetSlots(sheet);
    const flavors = productionSheetFlavors(sheet);
    const totals = productionSheetTotals(sheet);
    const daysUsed = productionSheetDaysUsed(sheet);
    inventoryMarkup = `${inventoryHeading}<section class="panel live-record-panel">
      <div class="panel-heading records-current-heading"><div><p class="eyebrow">Current · updates automatically</p><h3>Master sheet #${sheet.sheet_number}</h3><p>${daysUsed}/5 production days filled · ${productionSheetDateRange(sheet)}</p></div><span class="records-live-badge"><i aria-hidden="true"></i> Live</span></div>
      <div class="records-current-stats"><span><small>Full cans made</small><strong>${totals.cans}</strong></span><span><small>½ gallons made</small><strong>${totals.halfGallons}</strong></span><span><small>Sheet progress</small><strong>${daysUsed}/5</strong></span></div>
      ${productionMasterTableMarkup(sheet, flavors, slots, "records-master-table")}
      ${mobileProductionMaster(flavors, slots)}
      <div class="records-current-actions"><button type="button" class="secondary-button compact" data-view-production-sheet="${sheet.id}">Open in Inventory</button><button type="button" class="secondary-button compact" data-print-production-sheet="${sheet.id}">Print / Save PDF</button></div>
    </section>${renderProductionArchiveLibrary()}`;
    elements.records.innerHTML = `${scheduleRecordsMarkup()}<section class="records-section">${inventoryMarkup}</section>`;
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

  function renderManualMobileHalfCounts() {
    const halfFlavors = state.inventoryFlavors.filter((flavor) => flavor.tracksHalfGallons);
    return `<div class="manual-mobile-count-list manual-half-count-mobile">
      ${inventoryGroupedMarkup(halfFlavors, (flavor) => `<label class="manual-mobile-count-row"><span>${escapeHtml(flavor.name)}</span>${openingCountInput(flavor, "half_gallon")}</label>`)}
    </div>`;
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
            <p>Enter the exact physical count beside each flavor. Use 0 when a flavor is empty.</p>
            ${renderManualMobileHalfCounts()}
            <div class="inventory-paper-scroll opening-count-scroll manual-half-count-desktop">
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
    const title = mode === "production" ? "Add today's production" : mode === "usage_can" ? "Record full cans used" : "Record morning ½-gallon refill";
    const copy = mode === "production"
      ? "Enter the full cans and ½-gallon tubs made for each flavor. Both master lists update together."
      : mode === "usage_can"
        ? "Enter each flavor from the paper strip. Repeated names become a larger quantity; circled or crossed-out names are already accounted for and stay out."
        : "Enter the tubs listed for the morning front-freezer refill. Because each flavor is restored to four, every tub brought up from the freezer room counts as one ½ gallon used.";
    const submitLabel = mode === "production" ? "Add production" : mode === "usage_can" ? "Subtract used cans" : "Save refill list";
    const flavors = mode === "usage_half_gallon" ? state.inventoryFlavors.filter((flavor) => flavor.tracksHalfGallons) : state.inventoryFlavors;
    const dual = mode === "production";
    return `<section class="panel inventory-entry-panel">
      <div class="inventory-mode-tabs" role="tablist" aria-label="Inventory entry type">
        <button type="button" data-inventory-mode="production" class="${mode === "production" ? "active" : ""}">+ Production</button>
        <button type="button" data-inventory-mode="usage_can" class="${mode === "usage_can" ? "active" : ""}">− Used cans</button>
        <button type="button" data-inventory-mode="usage_half_gallon" class="${mode === "usage_half_gallon" ? "active" : ""}">½-gal refill</button>
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
        const before = event.count_before === null || event.count_before === undefined ? "—" : event.count_before;
        const after = event.count_after === null || event.count_after === undefined ? "—" : event.count_after;
        const numericDelta = Number(event.delta);
        const delta = Number.isFinite(numericDelta) ? `${numericDelta > 0 ? "+" : ""}${numericDelta}` : "—";
        const deltaClass = numericDelta > 0 ? "positive" : numericDelta < 0 ? "negative" : "";
        return `<li class="inventory-history-change">
          <div class="inventory-history-flavor"><strong>${escapeHtml(event.flavor_name)}</strong><span>${unit}</span></div>
          <span class="inventory-history-value"><small>Before</small><b>${before}</b></span>
          <span class="inventory-history-arrow" aria-hidden="true">→</span>
          <span class="inventory-history-value"><small>After</small><b>${after}</b></span>
          <span class="inventory-history-delta ${deltaClass}">${delta}</span>
        </li>`;
      }).join("");
      return `<article class="inventory-history-row">
        <header><span class="inventory-history-type ${batch.entry_type}">${entryLabels[batch.entry_type] || "Inventory"}</span><time>${inventoryDateLabel(batch.occurred_on)}</time></header>
        <div class="inventory-history-meta"><span><small>Changed by</small><strong>${escapeHtml(batch.created_by_name)}</strong></span><span><small>Changes</small><strong>${batch.events.length}</strong></span></div>
        <ul class="inventory-history-changes">${changes}</ul>
        ${batch.entry_type === "manual_recount" ? `<p class="manual-log-note">Manual physical count—not calculated from production or usage.</p>` : ""}
        ${batch.note ? `<p class="inventory-history-note"><strong>Note</strong><span>${escapeHtml(batch.note)}</span></p>` : ""}
      </article>`;
    }).join("");
    return `<details class="panel inventory-collapsible inventory-history-panel">
      <summary><span><strong>Audit history</strong><small>See who changed each flavor and compare the before and after counts.</small></span><span class="collapsible-summary-status"><b>${state.inventoryHistory.length} recent</b><i class="collapsible-arrow" aria-hidden="true">⌄</i></span></summary>
      <div class="inventory-collapsible-body inventory-history-body">${rows || `<div class="inventory-empty">No inventory changes have been recorded yet.</div>`}</div>
    </details>`;
  }

  function renderInventory() {
    if (!elements.inventory || !state.canAccessInventory) return;
    if (state.mode === "demo" && !state.inventoryFlavors.length) {
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
      ${renderOpeningCountForm(missingUnitCount)}
      ${missingUnitCount ? "" : renderInventoryEntryForm()}
      ${renderFlavorManager()}
      ${renderInventoryHistory()}`;
  }

  function reportRowMap() {
    return new Map(state.inventoryCatalog.map((flavor) => [flavor.id, {
      id: flavor.id,
      name: flavor.name,
      category: flavor.category,
      sortOrder: Number(flavor.sort_order) || 0,
      cansMade: 0,
      cansUsed: 0,
      halfGallonsMade: 0,
      halfGallonsUsed: 0,
    }]));
  }

  function reportRowFor(rows, flavorId) {
    if (!rows.has(flavorId)) {
      rows.set(flavorId, {
        id: flavorId,
        name: "Removed flavor",
        category: "seasonals",
        sortOrder: 9999,
        cansMade: 0,
        cansUsed: 0,
        halfGallonsMade: 0,
        halfGallonsUsed: 0,
      });
    }
    return rows.get(flavorId);
  }

  function buildInventoryReport(start, end, canSlots, halfSlots, usageBatches, usageEvents) {
    const rows = reportRowMap();
    const sheetIds = new Set();
    const productionDays = new Set();
    const usageKindsByBatch = new Map();
    const slotCells = (slot) => slot.ice_cream_production_cells || slot.cells || [];

    canSlots.forEach((slot) => {
      if (!slot.can_date || slot.can_date < start || slot.can_date > end) return;
      if (slot.sheet_id) sheetIds.add(slot.sheet_id);
      productionDays.add(slot.can_date);
      slotCells(slot).forEach((cell) => {
        reportRowFor(rows, cell.flavor_id).cansMade += Number(cell.can_quantity) || 0;
      });
    });
    halfSlots.forEach((slot) => {
      if (!slot.half_gallon_date || slot.half_gallon_date < start || slot.half_gallon_date > end) return;
      if (slot.sheet_id) sheetIds.add(slot.sheet_id);
      productionDays.add(slot.half_gallon_date);
      slotCells(slot).forEach((cell) => {
        reportRowFor(rows, cell.flavor_id).halfGallonsMade += Number(cell.half_gallon_quantity) || 0;
      });
    });
    usageEvents.forEach((event) => {
      const kind = event.inventory_kind === "half_gallon" ? "half_gallon" : "can";
      const row = reportRowFor(rows, event.flavor_id);
      const quantity = Math.abs(Number(event.delta) || 0);
      if (kind === "half_gallon") row.halfGallonsUsed += quantity;
      else row.cansUsed += quantity;
      const kinds = usageKindsByBatch.get(event.batch_id) || new Set();
      kinds.add(kind);
      usageKindsByBatch.set(event.batch_id, kinds);
    });

    const categoryOrder = new Map(Object.keys(inventoryCategoryLabels).map((category, index) => [category, index]));
    const activityRows = [...rows.values()].filter((row) => row.cansMade || row.cansUsed || row.halfGallonsMade || row.halfGallonsUsed)
      .sort((a, b) => (categoryOrder.get(a.category) ?? 99) - (categoryOrder.get(b.category) ?? 99) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    const totals = activityRows.reduce((sum, row) => ({
      cansMade: sum.cansMade + row.cansMade,
      cansUsed: sum.cansUsed + row.cansUsed,
      halfGallonsMade: sum.halfGallonsMade + row.halfGallonsMade,
      halfGallonsUsed: sum.halfGallonsUsed + row.halfGallonsUsed,
    }), { cansMade: 0, cansUsed: 0, halfGallonsMade: 0, halfGallonsUsed: 0 });
    return {
      start,
      end,
      rows: activityRows,
      totals,
      sources: {
        masterSheets: sheetIds.size,
        productionDays: productionDays.size,
        canStrips: usageBatches.filter((batch) => usageKindsByBatch.get(batch.id)?.has("can")).length,
        halfGallonRefills: usageBatches.filter((batch) => usageKindsByBatch.get(batch.id)?.has("half_gallon")).length,
      },
    };
  }

  async function fetchReportSlots(dateField, start, end) {
    const rows = [];
    const pageSize = 500;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabaseClient.from("ice_cream_production_slots")
        .select("sheet_id, slot_number, can_date, half_gallon_date, ice_cream_production_cells(flavor_id, can_quantity, half_gallon_quantity)")
        .gte(dateField, start).lte(dateField, end).order(dateField).order("sheet_id").order("slot_number").range(from, from + pageSize - 1);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }
    return rows;
  }

  async function fetchReportUsage(start, end) {
    const batches = [];
    const pageSize = 500;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabaseClient.from("ice_cream_inventory_batches")
        .select("id, occurred_on, note, created_by_name")
        .eq("entry_type", "usage").gte("occurred_on", start).lte("occurred_on", end)
        .order("occurred_on").order("id").range(from, from + pageSize - 1);
      if (error) throw error;
      batches.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }
    const events = [];
    const batchIds = batches.map((batch) => batch.id);
    for (let index = 0; index < batchIds.length; index += 100) {
      const ids = batchIds.slice(index, index + 100);
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabaseClient.from("ice_cream_inventory_events")
          .select("id, batch_id, flavor_id, inventory_kind, delta")
          .in("batch_id", ids).order("id").range(from, from + pageSize - 1);
        if (error) throw error;
        events.push(...(data || []));
        if (!data || data.length < pageSize) break;
      }
    }
    return { batches, events };
  }

  function loadedReportSources(start, end) {
    const canSlots = [];
    const halfSlots = [];
    state.productionSheets.forEach((sheet) => (sheet.slots || []).forEach((slot) => {
      const source = { ...slot, sheet_id: sheet.id };
      if (slot.can_date >= start && slot.can_date <= end) canSlots.push(source);
      if (slot.half_gallon_date >= start && slot.half_gallon_date <= end) halfSlots.push(source);
    }));
    const batches = state.inventoryHistory.filter((batch) => batch.entry_type === "usage" && batch.occurred_on >= start && batch.occurred_on <= end);
    const events = batches.flatMap((batch) => batch.events.map((event) => ({ ...event, batch_id: batch.id })));
    return { canSlots, halfSlots, batches, events };
  }

  async function loadInventoryReport() {
    if (state.role !== "manager" || state.reportLoading) return;
    ensureReportRange();
    if (state.reportStart > state.reportEnd) {
      state.reportError = "The start date must be before the end date.";
      state.reportData = null;
      renderReports();
      return;
    }
    state.reportLoading = true;
    state.reportError = "";
    renderReports();
    try {
      let sources;
      if (state.mode === "supabase") {
        const [canSlots, halfSlots, usage] = await Promise.all([
          fetchReportSlots("can_date", state.reportStart, state.reportEnd),
          fetchReportSlots("half_gallon_date", state.reportStart, state.reportEnd),
          fetchReportUsage(state.reportStart, state.reportEnd),
        ]);
        sources = { canSlots, halfSlots, batches: usage.batches, events: usage.events };
      } else {
        sources = loadedReportSources(state.reportStart, state.reportEnd);
      }
      state.reportData = buildInventoryReport(state.reportStart, state.reportEnd, sources.canSlots, sources.halfSlots, sources.batches, sources.events);
    } catch (error) {
      state.reportData = null;
      state.reportError = error?.message || "The report records could not be loaded.";
    }
    state.reportLoading = false;
    renderReports();
  }

  function reportNetClass(value) {
    return value > 0 ? "positive" : value < 0 ? "negative" : "";
  }

  function renderReportRows(report) {
    if (!report.rows.length) return `<div class="report-empty"><strong>No recorded activity in this period</strong><span>Choose a wider date range or confirm that master sheets and usage lists were saved.</span></div>`;
    const desktopGroups = Object.entries(inventoryCategoryLabels).map(([category, label]) => {
      const rows = report.rows.filter((row) => row.category === category);
      if (!rows.length) return "";
      return `<tr class="report-category-row"><th colspan="7">${label}</th></tr>${rows.map((row) => {
        const canNet = row.cansMade - row.cansUsed;
        const halfNet = row.halfGallonsMade - row.halfGallonsUsed;
        return `<tr><th scope="row">${escapeHtml(row.name)}</th><td>${row.cansMade}</td><td>${row.cansUsed}</td><td class="report-net ${reportNetClass(canNet)}">${canNet > 0 ? "+" : ""}${canNet}</td><td>${row.halfGallonsMade}</td><td>${row.halfGallonsUsed}</td><td class="report-net ${reportNetClass(halfNet)}">${halfNet > 0 ? "+" : ""}${halfNet}</td></tr>`;
      }).join("")}`;
    }).join("");
    const mobileRows = report.rows.map((row) => {
      const canNet = row.cansMade - row.cansUsed;
      const halfNet = row.halfGallonsMade - row.halfGallonsUsed;
      return `<article class="report-flavor-card"><header><strong>${escapeHtml(row.name)}</strong><span>${inventoryCategoryLabels[row.category] || row.category}</span></header><div class="report-flavor-units"><section><h4>Full cans</h4><div><span><small>Made</small><b>${row.cansMade}</b></span><span><small>Used</small><b>${row.cansUsed}</b></span><span class="report-net ${reportNetClass(canNet)}"><small>Net</small><b>${canNet > 0 ? "+" : ""}${canNet}</b></span></div></section><section><h4>½ gallons</h4><div><span><small>Made</small><b>${row.halfGallonsMade}</b></span><span><small>Used</small><b>${row.halfGallonsUsed}</b></span><span class="report-net ${reportNetClass(halfNet)}"><small>Net</small><b>${halfNet > 0 ? "+" : ""}${halfNet}</b></span></div></section></div></article>`;
    }).join("");
    return `<div class="report-desktop-table"><table class="report-table"><caption>Flavor production and usage totals</caption><thead><tr><th rowspan="2">Flavor</th><th colspan="3">Full cans</th><th colspan="3">½ gallons</th></tr><tr><th>Made</th><th>Used</th><th>Net</th><th>Made</th><th>Used</th><th>Net</th></tr></thead><tbody>${desktopGroups}</tbody></table></div><div class="report-mobile-list">${mobileRows}</div>`;
  }

  function renderReports() {
    if (!elements.reports || state.role !== "manager") return;
    ensureReportRange();
    const report = state.reportData;
    const currentQuarter = reportQuarterRange();
    const lastQuarter = reportQuarterRange(-1);
    const currentYear = inventoryDateValue().slice(0, 4);
    const presetClass = (start, end) => state.reportStart === start && state.reportEnd === end ? "active" : "";
    const results = state.reportLoading
      ? `<div class="report-loading"><strong>Building report…</strong><span>Reading master sheets, can strips, and refill lists.</span></div>`
      : state.reportError
        ? `<div class="report-error"><strong>Report could not be created</strong><span>${escapeHtml(state.reportError)}</span></div>`
        : report
          ? `<section class="report-summary-grid"><article><span>Full cans made</span><strong>${report.totals.cansMade}</strong></article><article><span>Full cans used</span><strong>${report.totals.cansUsed}</strong></article><article><span>½ gallons made</span><strong>${report.totals.halfGallonsMade}</strong></article><article><span>½ gallons used</span><strong>${report.totals.halfGallonsUsed}</strong></article></section>
            <section class="panel report-results-panel"><div class="report-results-heading"><div><p class="eyebrow">${inventoryDateLabel(report.start)} – ${inventoryDateLabel(report.end)}</p><h3>Flavor totals</h3><p>Made totals come from dated master-sheet columns. Used totals come from confirmed can strips and morning ½-gallon refill lists.</p></div><button type="button" class="secondary-button compact" data-download-report>Download CSV</button></div><div class="report-source-strip"><span><strong>${report.sources.masterSheets}</strong> master sheets</span><span><strong>${report.sources.productionDays}</strong> production days</span><span><strong>${report.sources.canStrips}</strong> used-can strips</span><span><strong>${report.sources.halfGallonRefills}</strong> refill lists</span></div>${renderReportRows(report)}</section>`
          : `<div class="report-empty"><strong>Choose a reporting period</strong><span>The report will combine production and usage by flavor.</span></div>`;
    elements.reports.innerHTML = `<section class="panel report-range-panel"><form id="reportRangeForm"><div class="report-range-heading"><div><p class="eyebrow">Reporting period</p><h3>Choose any dates</h3></div><div class="report-presets"><button type="button" class="${presetClass(currentQuarter.start, currentQuarter.end)}" data-report-preset="current">This quarter</button><button type="button" class="${presetClass(lastQuarter.start, lastQuarter.end)}" data-report-preset="last">Last quarter</button><button type="button" class="${presetClass(`${currentYear}-01-01`, `${currentYear}-12-31`)}" data-report-preset="year">This year</button></div></div><div class="report-date-fields"><label>From<input name="reportStart" type="date" value="${state.reportStart}" required></label><label>Through<input name="reportEnd" type="date" value="${state.reportEnd}" required></label><button class="primary-button compact" type="submit" ${state.reportLoading ? "disabled" : ""}>Generate report</button></div></form></section>${results}<section class="panel report-refill-panel"><div><p class="eyebrow">Daily ½-gallon usage</p><h3>Morning front-freezer refill</h3><p>The front freezer is stocked four high per flavor. Record every tub brought up from the freezer room; that quantity is counted as used for the report.</p></div><button type="button" class="primary-button compact" data-open-half-gallon-refill>Open refill list</button></section>`;
  }

  function setReportPreset(preset) {
    let range;
    if (preset === "last") range = reportQuarterRange(-1);
    else if (preset === "year") {
      const year = inventoryDateValue().slice(0, 4);
      range = { start: `${year}-01-01`, end: `${year}-12-31` };
    } else range = reportQuarterRange();
    state.reportStart = range.start;
    state.reportEnd = range.end;
    state.reportData = null;
    loadInventoryReport();
  }

  function downloadInventoryReport() {
    const report = state.reportData;
    if (!report) return;
    const rows = [["period_start", "period_end", "flavor", "category", "full_cans_made", "full_cans_used", "full_can_net", "half_gallons_made", "half_gallons_used", "half_gallon_net"]];
    report.rows.forEach((row) => rows.push([
      report.start, report.end, row.name, inventoryCategoryLabels[row.category] || row.category,
      row.cansMade, row.cansUsed, row.cansMade - row.cansUsed,
      row.halfGallonsMade, row.halfGallonsUsed, row.halfGallonsMade - row.halfGallonsUsed,
    ]));
    const blob = new Blob([rows.map((row) => row.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `swensens-inventory-report-${report.start}-to-${report.end}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
    showToast("Report downloaded for data analysis.");
  }

  async function loadInventoryData({ silent = false } = {}) {
    if (!state.canAccessInventory || !supabaseClient) return;
    if (!silent) state.inventoryLoading = true;
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
    state.reportData = null;
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
        <h3>IC production target</h3><p>IC work is normally a flexible full day. If coverage or training cannot work otherwise, the scheduler may suggest IC in one shift and floor work in the other as an approval-only last resort.</p>
        <div class="segmented" id="icTargetButtons">${[2, 3, 4].map((number) => `<button data-ic-target="${number}" class="${state.settings.icTarget === number ? "active" : ""}">${number}</button>`).join("")}</div>
        <p class="ic-gap-note">Normal rule: leave at least one full day between IC production days.</p>
        <div class="switch-row ${state.settings.icTarget === 4 ? "" : "muted-fields"}"><span><strong class="switch-title">Emergency back-to-back IC</strong><small>Four IC days cannot fit Tuesday–Sunday with the normal gap. Manager approval is required.</small></span><label class="switch"><input id="allowConsecutiveICInput" type="checkbox" ${state.settings.allowConsecutiveIC ? "checked" : ""} ${state.settings.icTarget === 4 ? "" : "disabled"}><span></span></label></div>
      </article>
      <article class="setting-card">
        <h3>Double shifts</h3><p>Doubles appear only as suggestions and always require manager approval.</p>
        <div class="switch-row"><span class="field-label">Approval required</span><label class="switch"><input type="checkbox" checked disabled><span></span></label></div>
      </article>
      <article class="setting-card training-settings">
        <h3>Training week</h3><p>The scheduler automatically uses as many available training days as the trainee’s manager-set maximum allows.</p>
        <div class="switch-row"><span class="field-label">Include training</span><label class="switch"><input id="trainingEnabledInput" type="checkbox" ${state.settings.trainingEnabled ? "checked" : ""}><span></span></label></div>
        <div class="form-grid ${state.settings.trainingEnabled ? "" : "muted-fields"}">
          <label class="field-label">Trainee<select id="traineeInput" ${state.settings.trainingEnabled ? "" : "disabled"}>${trainees}</select></label>
          <label class="field-label">Skill<select id="trainingSkillInput" ${state.settings.trainingEnabled ? "" : "disabled"}><option value="ic_production" ${state.settings.trainingSkill === "ic_production" ? "selected" : ""}>IC production</option><option value="store_operations" ${state.settings.trainingSkill === "store_operations" ? "selected" : ""}>Store operations</option></select></label>
        </div>
        <div class="auto-rule-note"><strong>No forced training day</strong><span>The trainee is never placed alone. Availability, qualifications, and business coverage rules still apply.</span></div>
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
      elements.schedulePriorityModule.hidden = true;
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
    elements.schedulePriorityModule.hidden = state.scheduleModuleView !== "priority";
    if (state.scheduleModuleView === "priority") renderSchedulingPriority();
    elements.scheduleRequestsModule.hidden = false;
    elements.scheduleRequestsModule.open = state.requestsExpanded;
    document.querySelector("#generateButtonTop").hidden = state.scheduleModuleView !== "builder";
  }

  function scheduleRecordDate(value) {
    if (!value) return "Not published";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function scheduleRecordsMarkup() {
    if (state.role !== "manager") return "";
    const records = state.scheduleHistory;
    if (state.selectedScheduleRecordId && !findScheduleRecord(state.selectedScheduleRecordId)) {
      state.selectedScheduleRecordId = "";
    }
    const selected = findScheduleRecord(state.selectedScheduleRecordId);
    const cards = records.map((record) => {
      const published = record.status === "published";
      const assignmentCount = (record.assignments || []).length;
      const rosterCount = scheduleRecordRoster(record).length;
      return `<article class="schedule-record-card ${published ? "current" : ""}">
        <div class="schedule-record-copy"><span class="inventory-history-type archive">${published ? "Published" : "Archived"}</span><strong>Week of ${scheduleWeekLabel(record.week_start)}</strong><p>${scheduleRecordDate(record.published_at || record.created_at)}</p><small>Option ${Number(record.option_number) || 1} · ${rosterCount} employees · ${assignmentCount} assignments</small></div>
        <div class="schedule-record-actions"><button type="button" class="secondary-button compact" data-view-schedule-record="${escapeHtml(record.id)}">View schedule</button><button type="button" class="secondary-button compact" data-print-schedule-record="${escapeHtml(record.id)}">Print / Save PDF</button><button type="button" class="secondary-button compact" data-download-schedule-record="${escapeHtml(record.id)}">Download CSV</button></div>
      </article>`;
    }).join("");
    const selectedMarkup = selected ? `<section class="panel schedule-record-preview" id="selectedScheduleRecord">
      <div class="panel-heading"><div><p class="eyebrow">Saved record</p><h3>Week of ${scheduleWeekLabel(selected.week_start)}</h3><p>${selected.status === "published" ? "Current published schedule" : "Archived schedule"} · saved in Supabase</p></div><button class="text-button" type="button" data-close-schedule-record>Close</button></div>
      ${buildScheduleSheet(scheduleRecordOption(selected), selected.week_start, scheduleRecordRoster(selected))}
      <div class="schedule-record-preview-actions"><button type="button" class="secondary-button compact" data-print-schedule-record="${escapeHtml(selected.id)}">Print / Save PDF</button><button type="button" class="secondary-button compact" data-download-schedule-record="${escapeHtml(selected.id)}">Download CSV</button></div>
    </section>` : "";
    return `<section class="records-section schedule-records-section">
      <section class="panel schedule-record-intro">
        <div class="panel-heading"><div><p class="eyebrow">Schedule records</p><h3>Published schedule history</h3><p>Every published schedule stays here instead of being deleted. Print a PDF or download a CSV whenever you also want a copy outside the Hub.</p></div><span class="count-badge">${records.length}</span></div>
      </section>
      ${selectedMarkup}
      ${records.length ? `<div class="schedule-record-list">${cards}</div>` : `<div class="panel inventory-empty">Your first published schedule will appear here and remain available after a newer schedule replaces it.</div>`}
    </section>`;
  }

  function renderSchedulingPriority() {
    if (state.role !== "manager" || !elements.schedulingPriorityContent) return;
    const mobileDirectReorder = isMobilePriorityMode();
    const reorderEnabled = state.priorityEditing || mobileDirectReorder;
    const orderedTeam = priorityOrderedTeam();
    const rows = orderedTeam.map((employee, index) => {
      const rank = index + 1;
      const weekendDaysOffered = employeeWeekendDaysOffered(employee);
      const weekendStatus = employee.weekendDaysRequired
        ? weekendDaysOffered >= employee.weekendDaysRequired
          ? `<span class="priority-weekend-status ready">${weekendDaysOffered}/3 weekend offered</span>`
          : `<span class="priority-weekend-status missing">Needs ${employee.weekendDaysRequired}/3 weekend</span>`
        : `<span class="priority-weekend-status neutral">0/3 required</span>`;
      return `<article class="priority-row ${state.priorityEditing ? "editing" : ""} ${mobileDirectReorder ? "direct-reorder" : ""}" data-priority-code="${escapeHtml(employee.code)}">
        <span class="priority-rank" aria-label="Priority rank ${rank}">${rank}</span>
        <div class="priority-person" ${reorderEnabled ? `data-priority-drag-source data-priority-code="${escapeHtml(employee.code)}"` : ""}><strong>${escapeHtml(employee.name)}</strong><small>${escapeHtml(employee.code)} · ${employee.skills.length ? employee.skills.map(roleLabel).join(", ") : "Team member"}</small><span class="priority-manager-limits">${employee.minShifts}–${employee.maxShifts} days · ${employee.weekdayRequirement}/3 weekdays · ${employee.weekendDaysRequired}/3 weekend</span></div>
        ${weekendStatus}
        ${state.priorityEditing && !mobileDirectReorder ? `<button type="button" class="priority-drag-handle" data-priority-drag-handle data-priority-code="${escapeHtml(employee.code)}" aria-label="Drag ${escapeHtml(employee.name)} to a new priority. Use up and down arrow keys for keyboard reordering."><span aria-hidden="true">≡</span></button>` : ""}
      </article>`;
    }).join("");
    elements.schedulingPriorityContent.innerHTML = `
      <section class="panel priority-policy-panel">
        <div class="priority-policy-heading"><div><p class="eyebrow">Manager only</p><h3>Scheduling priority</h3></div>${state.priorityEditing || mobileDirectReorder ? "" : `<button type="button" class="secondary-button compact" data-edit-priority>✎ Edit</button>`}</div>
        <p class="priority-policy-principle">Base the order on reliability, consistency, performance, and current business needs.</p>
        <button type="button" class="priority-availability-link" data-open-availability-rules>Edit minimums, maximums & availability rules →</button>
      </section>
      ${mobileDirectReorder ? `<p class="priority-mobile-reorder-note">Press and hold a name, then drag it into place. The order saves when you let go.</p>` : ""}
      <section class="priority-list" aria-label="Scheduling priority order">${rows}</section>
      ${state.priorityEditing && !mobileDirectReorder ? `<div class="priority-edit-actions"><button type="button" class="secondary-button" data-cancel-priority>Cancel</button><button type="button" class="primary-button" data-save-priority ${state.schedulingPolicyBusy ? "disabled" : ""}>${state.schedulingPolicyBusy ? "Saving…" : "Save order"}</button></div><p class="priority-save-note">Press and hold any employee name, then drag. Move near the top or bottom edge to scroll quickly.</p>` : ""}`;
  }

  function isMobilePriorityMode() {
    return window.matchMedia("(max-width: 760px)").matches;
  }

  function canReorderPriority() {
    return state.role === "manager" && !state.schedulingPolicyBusy && (state.priorityEditing || isMobilePriorityMode());
  }

  function beginPriorityEdit() {
    state.priorityPolicySnapshot = {
      priorityOrder: [...state.settings.priorityOrder],
    };
    state.priorityEditing = true;
    renderSchedulingPriority();
  }

  function cancelPriorityEdit() {
    cancelPriorityPointerPress();
    const snapshot = state.priorityPolicySnapshot;
    if (snapshot) {
      state.settings.priorityOrder = [...snapshot.priorityOrder];
      syncSchedulingPolicy();
    }
    state.priorityEditing = false;
    state.priorityPolicySnapshot = null;
    state.priorityDragCode = "";
    renderSchedulingPriority();
  }

  async function saveSchedulingPolicy({ revertOrder = null, successMessage = "Scheduling priority saved." } = {}) {
    if (state.role !== "manager" || state.schedulingPolicyBusy) return;
    syncSchedulingPolicy();
    state.schedulingPolicyBusy = true;
    renderSchedulingPriority();
    const policies = schedulingPolicyPayload();
    if (state.mode === "supabase") {
      const { error } = await supabaseClient.rpc("save_staff_scheduling_policy", { p_policies: policies });
      if (error) {
        if (revertOrder) {
          state.settings.priorityOrder = [...revertOrder];
          syncSchedulingPolicy();
        }
        state.schedulingPolicyBusy = false;
        const setupMissing = /save_staff_scheduling_policy|weekday_days_required|weekend_required|schema cache|function/i.test(error.message || "");
        showToast(setupMissing ? "The manager scheduling-rules update still needs its Supabase migration." : `Could not save scheduling priority: ${error.message}`);
        renderSchedulingPriority();
        return;
      }
    } else {
      saveDemoTeam();
    }
    state.schedulingPolicyBusy = false;
    state.priorityEditing = false;
    state.priorityPolicySnapshot = null;
    state.priorityDragCode = "";
    renderSchedulingPriority();
    renderAvailabilityMatrix();
    showToast(successMessage);
  }

  function schedulingPolicyPayload() {
    syncSchedulingPolicy();
    return priorityOrderedTeam().map((employee, index) => ({
      employee_id: employee.id,
      schedule_priority: index + 1,
      min_shifts: employee.minShifts,
      max_shifts: employee.maxShifts,
      weekday_days_required: employee.weekdayRequirement,
      weekend_days_required: employee.weekendDaysRequired,
      weekend_required: employee.weekendDaysRequired > 0,
    }));
  }

  function movePriorityCode(code, direction) {
    const order = [...state.settings.priorityOrder];
    const index = order.indexOf(code);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return false;
    [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
    state.settings.priorityOrder = order;
    syncSchedulingPolicy();
    renderSchedulingPriority();
    window.requestAnimationFrame(() => document.querySelector(`[data-priority-drag-handle][data-priority-code="${CSS.escape(code)}"]`)?.focus());
    return true;
  }

  function refreshPriorityRanksInPlace() {
    document.querySelectorAll(".priority-list .priority-row").forEach((row, index) => {
      const rank = row.querySelector(".priority-rank");
      if (rank) {
        rank.textContent = String(index + 1);
        rank.setAttribute("aria-label", `Priority rank ${index + 1}`);
      }
    });
  }

  function priorityDragHitY(clientY) {
    const bottomNav = document.querySelector(".bottom-nav");
    const navVisible = bottomNav && window.getComputedStyle(bottomNav).display !== "none";
    const lowerEdge = navVisible ? bottomNav.getBoundingClientRect().top - 12 : window.innerHeight - 12;
    return Math.max(12, Math.min(clientY, lowerEdge));
  }

  function reorderPriorityRowAtPointer(clientX, clientY) {
    if (!priorityPointerDrag) return;
    const hitY = priorityDragHitY(clientY);
    const target = document.elementFromPoint(clientX, hitY)?.closest(".priority-row[data-priority-code]");
    const { row, list } = priorityPointerDrag;
    if (!target || target === row || target.parentElement !== list) return;
    const rect = target.getBoundingClientRect();
    if (hitY < rect.top + rect.height / 2) list.insertBefore(row, target);
    else list.insertBefore(row, target.nextElementSibling);
    refreshPriorityRanksInPlace();
  }

  function priorityDragAutoScroll(timestamp) {
    if (!priorityPointerDrag) return;
    const drag = priorityPointerDrag;
    const edge = Math.min(220, Math.max(145, window.innerHeight * 0.28));
    const y = drag.clientY;
    let direction = 0;
    let intensity = 0;
    if (y < edge) {
      direction = -1;
      intensity = Math.min(1, (edge - y) / edge);
    } else if (y > window.innerHeight - edge) {
      direction = 1;
      intensity = Math.min(1, (y - (window.innerHeight - edge)) / edge);
    }
    const elapsed = drag.lastFrameTime ? Math.min(32, Math.max(8, timestamp - drag.lastFrameTime)) : 16;
    drag.lastFrameTime = timestamp;
    if (direction) {
      const pixelsPerSecond = 1050 + (intensity * 2850);
      const scrollingElement = document.scrollingElement || document.documentElement;
      scrollingElement.scrollTop += direction * pixelsPerSecond * (elapsed / 1000);
      reorderPriorityRowAtPointer(priorityPointerDrag.clientX, priorityPointerDrag.clientY);
    }
    drag.raf = window.requestAnimationFrame(priorityDragAutoScroll);
  }

  function startPriorityPointerDrag(event, source) {
    if (!canReorderPriority() || priorityPointerDrag || event.button > 0) return;
    const row = source.closest(".priority-row[data-priority-code]");
    const list = row?.parentElement;
    if (!row || !list?.classList.contains("priority-list")) return;
    const rect = row.getBoundingClientRect();
    const ghost = row.cloneNode(true);
    ghost.classList.add("priority-drag-ghost");
    ghost.classList.remove("editing");
    ghost.setAttribute("aria-hidden", "true");
    Object.assign(ghost.style, {
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      left: `${rect.left}px`,
      top: `${rect.top}px`,
    });
    document.body.append(ghost);
    row.classList.add("priority-placeholder");
    document.body.classList.add("priority-is-dragging");
    document.documentElement.classList.add("priority-is-dragging");
    state.priorityDragCode = row.dataset.priorityCode;
    priorityPointerDrag = {
      pointerId: event.pointerId,
      source,
      row,
      list,
      ghost,
      offsetY: event.clientY - rect.top,
      clientX: event.clientX,
      clientY: event.clientY,
      originalOrder: [...state.settings.priorityOrder],
      autoSave: isMobilePriorityMode() && !state.priorityEditing,
      lastFrameTime: 0,
      raf: 0,
    };
    source.setPointerCapture?.(event.pointerId);
    priorityPointerDrag.raf = window.requestAnimationFrame(priorityDragAutoScroll);
    event.preventDefault();
  }

  function cancelPriorityPointerPress() {
    if (!priorityPointerPress) return;
    window.clearTimeout(priorityPointerPress.timer);
    priorityPointerPress.source.classList.remove("priority-pressing");
    priorityPointerPress = null;
  }

  function beginPriorityPointerPress(event, source) {
    if (!canReorderPriority() || priorityPointerDrag || priorityPointerPress || event.button > 0) return;
    if (!source.closest(".priority-row[data-priority-code]")) return;
    if (event.pointerType === "mouse") {
      startPriorityPointerDrag(event, source);
      return;
    }
    source.classList.add("priority-pressing");
    priorityPointerPress = {
      pointerId: event.pointerId,
      source,
      startX: event.clientX,
      startY: event.clientY,
      clientX: event.clientX,
      clientY: event.clientY,
      timer: window.setTimeout(() => {
        if (!priorityPointerPress || priorityPointerPress.pointerId !== event.pointerId) return;
        const press = priorityPointerPress;
        priorityPointerPress = null;
        press.source.classList.remove("priority-pressing");
        startPriorityPointerDrag({
          pointerId: press.pointerId,
          pointerType: event.pointerType,
          button: 0,
          clientX: press.clientX,
          clientY: press.clientY,
          preventDefault() {},
        }, press.source);
      }, 180),
    };
  }

  function updatePriorityPointerDrag(event) {
    if (priorityPointerPress && event.pointerId === priorityPointerPress.pointerId) {
      priorityPointerPress.clientX = event.clientX;
      priorityPointerPress.clientY = event.clientY;
      if (Math.hypot(event.clientX - priorityPointerPress.startX, event.clientY - priorityPointerPress.startY) > 16) cancelPriorityPointerPress();
    }
    if (!priorityPointerDrag || event.pointerId !== priorityPointerDrag.pointerId) return;
    priorityPointerDrag.clientX = event.clientX;
    priorityPointerDrag.clientY = event.clientY;
    priorityPointerDrag.ghost.style.top = `${event.clientY - priorityPointerDrag.offsetY}px`;
    reorderPriorityRowAtPointer(event.clientX, event.clientY);
    event.preventDefault();
  }

  function finishPriorityPointerDrag(cancelled = false) {
    if (!priorityPointerDrag) return;
    const drag = priorityPointerDrag;
    window.cancelAnimationFrame(drag.raf);
    try { drag.source.releasePointerCapture?.(drag.pointerId); } catch (_) { /* Pointer capture can already be released by iOS. */ }
    const order = cancelled
      ? drag.originalOrder
      : [...drag.list.querySelectorAll(".priority-row[data-priority-code]")].map((row) => row.dataset.priorityCode);
    drag.ghost.remove();
    drag.row.classList.remove("priority-placeholder");
    document.body.classList.remove("priority-is-dragging");
    document.documentElement.classList.remove("priority-is-dragging");
    priorityPointerDrag = null;
    state.priorityDragCode = "";
    state.settings.priorityOrder = order;
    syncSchedulingPolicy();
    const changed = order.some((code, index) => code !== drag.originalOrder[index]);
    if (!cancelled && drag.autoSave && changed) {
      saveSchedulingPolicy({ revertOrder: drag.originalOrder, successMessage: "Priority order saved." });
      return;
    }
    renderSchedulingPriority();
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
    syncSchedulingPolicy();
    const targetRow = `<tr class="availability-target-row"><th scope="row"><strong>Monday</strong><small>Store closed</small></th><td class="availability-closed-cell" colspan="${Math.max(1, state.team.length)}">CLOSED</td></tr>`;
    const dayRows = demoData.days.map((day) => `<tr class="availability-day-row"><th scope="row"><strong>${day.name}</strong><small>${day.short}</small></th>${state.team.map((employee) => availabilityShiftCellMarkup(employee, day)).join("")}</tr>`).join("");
    const noteRow = `<tr class="availability-notes-row"><th scope="row"><strong>Notes</strong><small>Rules & preferences</small></th>${state.team.map((employee) => `<td class="availability-note-cell"><textarea rows="2" data-availability-note="${employee.id}" aria-label="${escapeHtml(employee.name)} scheduling note" placeholder="—">${escapeHtml(employee.notes || "")}</textarea></td>`).join("")}</tr>`;
    const headers = state.team.map((employee) => `<th><strong>${escapeHtml(employee.name)}</strong><small>P${employee.schedulePriority} · ${escapeHtml(employee.code || "")}</small></th>`).join("");
    const selectedMobileEmployee = state.team.find((employee) => String(employee.id) === String(state.availabilityMobileEmployeeId)) || state.team[0];
    if (selectedMobileEmployee) state.availabilityMobileEmployeeId = selectedMobileEmployee.id;
    const selectedMobileIndex = selectedMobileEmployee ? state.team.findIndex((employee) => String(employee.id) === String(selectedMobileEmployee.id)) : -1;
    const mobileEmployeeOptions = state.team.map((employee) => `<option value="${escapeHtml(String(employee.id))}" ${String(employee.id) === String(selectedMobileEmployee?.id) ? "selected" : ""}>${escapeHtml(employee.name)}</option>`).join("");
    const mobileWorkingDays = scheduleWeekRows(state.settings.weekStart).filter((day) => !day.closed);
    const mobileDateFormatter = new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric" });
    const mobileDayHeaders = mobileWorkingDays.map((day) => `<th scope="col"><strong>${escapeHtml(day.name.slice(0, 3))}</strong><small>${mobileDateFormatter.format(day.date)}</small></th>`).join("");
    const mobileOverviewRows = state.team.map((employee) => `<tr><th scope="row"><strong>${escapeHtml(employee.name)}</strong><small>Priority ${employee.schedulePriority} · ${employee.weekendDaysRequired}/3 weekend</small></th>${demoData.days.map((day) => mobileAvailabilityOverviewCellMarkup(employee, day)).join("")}</tr>`).join("");
    const policyDayOptions = (selected, minimum = 0) => Array.from({ length: 7 - minimum }, (_, optionIndex) => optionIndex + minimum)
      .map((value) => `<option value="${value}" ${value === selected ? "selected" : ""}>${value}</option>`).join("");
    const availabilityEditor = selectedMobileEmployee ? `<details class="availability-employee-editor" open>
        <summary><span><strong>Edit availability & rules</strong><small>Manager-only controls · one employee at a time</small></span><span aria-hidden="true">⌄</span></summary>
        <div class="availability-employee-editor-body">
          <div class="mobile-availability-picker">
            <button type="button" data-mobile-availability-step="-1" aria-label="Previous employee">‹</button>
            <label><span>Employee ${selectedMobileIndex + 1} of ${state.team.length}</span><select data-mobile-availability-employee aria-label="Choose employee">${mobileEmployeeOptions}</select></label>
            <button type="button" data-mobile-availability-step="1" aria-label="Next employee">›</button>
          </div>
          <section class="manager-availability-rules" aria-label="Manager-only scheduling rules for ${escapeHtml(selectedMobileEmployee.name)}">
            <div class="manager-rule-heading"><span><strong>Manager rules</strong><small>Employees do not see or set these values.</small></span><b>Priority ${selectedMobileEmployee.schedulePriority}</b></div>
            <div class="manager-rule-grid">
              <label><span>Minimum days</span><select data-policy-min="${escapeHtml(selectedMobileEmployee.code)}">${policyDayOptions(selectedMobileEmployee.minShifts)}</select></label>
              <label><span>Maximum days</span><select data-policy-max="${escapeHtml(selectedMobileEmployee.code)}">${policyDayOptions(selectedMobileEmployee.maxShifts, 1)}</select></label>
              <label><span>Weekdays to offer</span><select data-policy-weekdays="${escapeHtml(selectedMobileEmployee.code)}">${Array.from({ length: 4 }, (_, value) => `<option value="${value}" ${value === selectedMobileEmployee.weekdayRequirement ? "selected" : ""}>${value}/3</option>`).join("")}</select></label>
              <label class="manager-weekend-days-rule"><span>Weekend days to offer</span><select data-policy-weekend-days="${escapeHtml(selectedMobileEmployee.code)}">${Array.from({ length: 3 }, (_, value) => `<option value="${value}" ${value === selectedMobileEmployee.weekendDaysRequired ? "selected" : ""}>${value}/3</option>`).join("")}</select><small>Friday · Saturday · Sunday</small></label>
            </div>
          </section>
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
      </section>` : `<section class="availability-mobile-view"><p class="inventory-empty">No active employees.</p></section>`;
    elements.availabilityMatrix.innerHTML = `<div class="availability-matrix-summary"><span><strong>${state.team.length}</strong> active employees</span><span><strong>${scheduleWeekLabel(state.settings.weekStart)}</strong> schedule week</span></div>
      <div class="availability-desktop-view"><div class="availability-matrix-wrap"><table class="availability-matrix"><caption>Team availability for ${scheduleWeekLabel(state.settings.weekStart)}</caption><thead><tr><th>Day</th>${headers}</tr></thead><tbody>${targetRow}${dayRows}${noteRow}</tbody></table></div></div>
      ${mobileAvailability}
      ${availabilityEditor}
      <div class="availability-matrix-legend"><span><b class="legend-available">blank</b> Available</span><span><b class="legend-preferred">★</b> Preferred</span><span><b class="legend-unavailable">×</b> Cannot work</span><small>A divider appears only when morning and night differ: morning is above the line and night is below it. A large X means the employee cannot work that entire day.</small></div>`;
  }

  async function saveAvailabilityMatrix() {
    if (state.role !== "manager" || state.availabilitySheetBusy) return;
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
          min_shifts: 0,
          max_shifts: 6,
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
        const { error: policyError } = await supabaseClient.rpc("save_staff_scheduling_policy", { p_policies: schedulingPolicyPayload() });
        if (policyError) throw new Error(policyError.message);
      }
      state.team.forEach((employee) => { employee.submitted = true; });
      renderDashboard();
      renderRequests();
      renderAvailabilityMatrix();
      renderScheduleModule();
      showToast("Availability and manager-only scheduling rules saved.");
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
          <label class="field-label">Phone number<input name="phoneNumber" type="tel" inputmode="tel" maxlength="30" autocomplete="tel" placeholder="(415) 555-0123" required><small>Visible to active staff in the team directory.</small></label>
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
    const message = form.querySelector("#employeeAccountMessage");
    const phoneNumber = String(formData.get("phoneNumber") || "").trim();
    if (!emergencyPhoneHref(phoneNumber)) {
      message.textContent = "Enter a valid phone number for the staff directory.";
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
        minDays: 0,
        maxDays: 6,
        phoneNumber,
        skills: formData.getAll("skills"),
      });
      const employee = result.employee;
      state.team = state.team.filter((item) => item.id !== employee.id && item.code !== employee.employee_code);
      state.hiddenTeam = state.hiddenTeam.filter((item) => item.id !== employee.id && item.code !== employee.employee_code);
      state.team.push({
        id: employee.id,
        code: employee.employee_code,
        name: employee.display_name,
        phone: employee.phone_number || phoneNumber,
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
      showToast(state.mode === "demo" ? "Sign in with the manager account to archive real access." : "Manager access is required.");
      return;
    }
    const employee = findManagedEmployee(employeeId);
    if (!employee) return;
    const approved = window.confirm(`Archive ${employee.name}'s login access?\n\nTheir login will be removed, but their employee record, availability requests, and schedule history will all be kept. If they return, create a login again with the same employee ID.`);
    if (!approved) return;
    state.accountActionBusy = true;
    const button = document.querySelector(`[data-remove-employee="${CSS.escape(employeeId)}"]`);
    if (button) {
      button.disabled = true;
      button.textContent = "Archiving…";
    }
    try {
      await invokeEmployeeAccountAction({ action: "remove", employeeId });
      state.team = state.team.filter((item) => item.id !== employeeId);
      state.hiddenTeam = state.hiddenTeam.filter((item) => item.id !== employeeId);
      state.hiddenTeam.push({ ...employee, active: false, hasLogin: false });
      state.hiddenTeam.sort((a, b) => a.name.localeCompare(b.name));
      state.teamView = "hidden";
      renderAll();
      openTeamOnHome();
      showToast(`${employee.name}'s login was archived and their history was kept.`);
    } catch (error) {
      showToast(error.message);
      if (button) {
        button.disabled = false;
        button.textContent = "Archive access";
      }
    } finally {
      state.accountActionBusy = false;
    }
  }

  function savedAssignmentParts(dayNumber, employeeId = state.profile?.id, scheduleId = selectedEmployeeSchedule()?.id) {
    return state.employeeAssignments.filter((assignment) =>
      Number(assignment.work_day) === Number(dayNumber)
      && (!scheduleId || String(assignment.schedule_id) === String(scheduleId))
      && assignment.coverage_status !== "open"
      && String(assignment.employee_id || state.profile?.id) === String(employeeId)
    ).map((assignment) => {
      if (assignment.assignment_type === "AM") return { text: `11:30${assignment.requires_approval ? "*" : ""}`, type: "morning", hours: 6, assignmentId: assignment.id };
      if (assignment.assignment_type === "PM") return { text: `5:30${assignment.requires_approval ? "*" : ""}`, type: "night", hours: 5, assignmentId: assignment.id };
      if (assignment.assignment_type === "IC") {
        const productionShift = String(assignment.notes || "").match(/production:(AM|PM)/)?.[1] || "FULL";
        const label = productionShift === "AM" ? "11:30 IC" : productionShift === "PM" ? "5:30 IC" : "IC";
        return { text: `${label}${assignment.requires_approval ? "*" : ""}`, type: "ic", hours: 11, fullDay: true, productionShift, assignmentId: assignment.id };
      }
      const [, shift = "FULL"] = String(assignment.notes || "training:FULL").split(":");
      const time = shift === "AM" ? "11:30" : shift === "PM" ? "5:30" : "IC";
      return {
        text: time,
        type: shift === "AM" ? "morning" : shift === "PM" ? "night" : "ic",
        hours: shift === "AM" ? 6 : shift === "PM" ? 5 : 11,
        fullDay: shift === "FULL",
        assignmentId: assignment.id,
      };
    });
  }

  function estimatedDayHours(parts) {
    if (parts.some((part) => part.fullDay)) return 11;
    return parts.reduce((total, part) => total + (part.hours || 0), 0);
  }

  function employeeScheduleParts(employee, day, schedule = selectedEmployeeSchedule()) {
    if (!schedule) return [];
    return savedAssignmentParts(day.number, employee.id, schedule.id);
  }

  function allPublishedAssignments() {
    if (state.role !== "manager") return state.employeeAssignments;
    const published = state.scheduleHistory.find((schedule) => schedule.status === "published" && schedule.week_start === state.settings.weekStart)
      || state.scheduleHistory.find((schedule) => schedule.status === "published");
    return published?.assignments || [];
  }

  function currentPublishedAssignments(schedule = selectedEmployeeSchedule()) {
    const assignments = allPublishedAssignments();
    if (!schedule?.id || state.role === "manager") return assignments;
    return assignments.filter((assignment) => String(assignment.schedule_id) === String(schedule.id));
  }

  function assignmentEmployee(assignment) {
    return state.team.find((employee) => String(employee.id) === String(assignment?.employee_id));
  }

  function assignmentTypeLabel(assignment) {
    if (assignment?.assignment_type === "AM") return "Morning · 11:30";
    if (assignment?.assignment_type === "PM") return "Night · 5:30";
    if (assignment?.assignment_type === "IC") {
      const productionShift = String(assignment.notes || "").match(/production:(AM|PM)/)?.[1];
      return productionShift ? `IC · ${productionShift === "AM" ? "morning" : "night"}` : "IC";
    }
    const shift = String(assignment?.notes || "").split(":")[1] || "FULL";
    return shift === "AM" ? "Morning · 11:30" : shift === "PM" ? "Night · 5:30" : "IC";
  }

  function assignmentWeekStart(assignment) {
    if (assignment?.schedule_week_start) return assignment.schedule_week_start;
    const scheduleId = assignment?.schedule_id;
    return state.publishedSchedules.find((schedule) => String(schedule.id) === String(scheduleId))?.week_start
      || state.scheduleHistory.find((schedule) => String(schedule.id) === String(scheduleId))?.week_start
      || selectedEmployeeScheduleWeek().weekStart
      || state.settings.weekStart;
  }

  function assignmentDateLabel(assignment, weekStart = assignmentWeekStart(assignment)) {
    const day = demoData.days.find((item) => item.number === Number(assignment?.work_day));
    if (!day) return "Published shift";
    const date = new Date(`${weekStart}T12:00:00`);
    date.setDate(date.getDate() + day.number - 2);
    const formatted = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(date);
    return `${formatted} · ${assignmentTypeLabel(assignment)}`;
  }

  function shiftRequestAssignment(request, target = false) {
    const assignmentId = target ? request?.target_assignment_id : request?.assignment_id;
    const found = allPublishedAssignments().find((assignment) => String(assignment.id) === String(assignmentId));
    if (found) return found;
    if (target) return null;
    return request?.work_day ? { id: assignmentId, employee_id: request.employee_id, work_day: request.work_day, assignment_type: request.assignment_type } : null;
  }

  function publishedScheduleRoster(schedule = selectedEmployeeSchedule()) {
    if (state.mode === "demo") return state.team.map(({ id, code, name }) => ({ id, code, name }));
    const snapshot = Array.isArray(schedule?.roster_snapshot) ? schedule.roster_snapshot : [];
    if (snapshot.length) return snapshot.map((employee) => ({
      id: employee.id,
      code: employee.code || employee.employee_code || "",
      name: employee.name || employee.display_name || "Employee",
    }));
    return (state.staffDirectory.length ? state.staffDirectory : state.team).map((employee) => ({
      id: employee.id,
      code: employee.code || "",
      name: employee.name,
    }));
  }

  function teamScheduleGroupMarkup(entries, label, time, className) {
    return `<section class="published-shift-group ${className}"><header><span>${escapeHtml(label)}</span><strong>${escapeHtml(time)}</strong></header><div>${entries.length ? entries.map((entry) => `<span class="published-coworker ${entry.current ? "current" : ""}"><b>${escapeHtml(entry.name)}</b>${entry.note ? `<small>${escapeHtml(entry.note)}</small>` : ""}</span>`).join("") : `<span class="published-shift-empty">No one assigned</span>`}</div></section>`;
  }

  function employeeScheduleWeekSwitcherMarkup() {
    const current = currentScheduleTuesday();
    const next = addDaysToIso(current, 7);
    const choices = publishedScheduleChoices();
    return `<section class="schedule-week-switcher" aria-label="Published schedule weeks">
      <div><p class="eyebrow">Schedule calendar</p><h3>Current & upcoming weeks</h3><p>Choose a week to see your shifts, coworkers, and shift-change options.</p></div>
      <div class="schedule-week-choice-list">${choices.map(({ weekStart, schedule }) => {
        const period = weekStart === current ? "This week" : weekStart === next ? "Next week" : "Upcoming";
        return `<button type="button" class="schedule-week-choice ${weekStart === state.employeeScheduleWeekStart ? "active" : ""}" data-employee-schedule-week="${weekStart}"><span>${period}</span><strong>${scheduleWeekLabel(weekStart)}</strong><small>${schedule ? "Published" : "Not posted"}</small></button>`;
      }).join("")}</div>
    </section>`;
  }

  function renderPublishedTeamSchedule() {
    const { weekStart, schedule } = selectedEmployeeScheduleWeek();
    const hasPublishedSchedule = Boolean(schedule);
    if (!hasPublishedSchedule) {
      return `<section class="panel published-team-panel"><div class="panel-heading"><div><p class="eyebrow">Team schedule</p><h3>Who is working · ${scheduleWeekLabel(weekStart)}</h3></div><span class="request-status missing">Not posted</span></div><div class="warning-box">The full team schedule for this week will appear here as soon as a manager publishes it.</div></section>`;
    }
    const roster = publishedScheduleRoster(schedule);
    const dayNumberByName = Object.fromEntries(demoData.days.map((day) => [day.name, day.number]));
    const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
    const currentEmployeeId = state.profile?.id;
    const dayCards = scheduleWeekRows(weekStart).map((day) => {
      if (day.closed) return `<article class="published-team-day closed"><header><div><span>${day.name}</span><strong>${dateFormatter.format(day.date)}</strong></div><b>Store closed</b></header></article>`;
      const groups = { AM: [], PM: [], IC: [] };
      roster.forEach((employee) => {
        const parts = employeeScheduleParts(employee, { ...day, number: dayNumberByName[day.name] }, schedule);
        parts.forEach((part) => {
          const group = part.type === "morning" || part.text.startsWith("11:30")
            ? "AM"
            : part.type === "night" || part.text.startsWith("5:30")
              ? "PM"
              : "IC";
          const note = part.type === "ic" ? (part.productionShift === "FULL" ? "" : "IC") : part.text.includes("*") ? "Approval needed" : "";
          groups[group].push({ name: employee.name, note, current: String(employee.id) === String(currentEmployeeId) });
        });
      });
      return `<article class="published-team-day"><header><div><span>${day.name}</span><strong>${dateFormatter.format(day.date)}</strong></div></header><div class="published-shift-groups">${teamScheduleGroupMarkup(groups.AM, "Morning", "11:30", "morning")}${teamScheduleGroupMarkup(groups.PM, "Night", "5:30", "night")}${teamScheduleGroupMarkup(groups.IC, "IC", "Flexible", "ic")}</div></article>`;
    }).join("");
    const uniqueAssignmentEmployees = new Set(currentPublishedAssignments(schedule).map((assignment) => assignment.employee_id).filter(Boolean));
    const activationNote = state.mode === "supabase" && roster.length > 1 && uniqueAssignmentEmployees.size <= 1
      ? `<div class="warning-box team-schedule-activation">The published schedule is available, but the team-wide viewing permission still needs the newest Supabase update.</div>`
      : "";
    return `<section class="panel published-team-panel">
      <div class="panel-heading"><div><p class="eyebrow">Published team schedule</p><h3>See who you are working with</h3><p>${scheduleWeekLabel(weekStart)}</p></div><span class="request-status submitted">Published</span></div>
      ${activationNote}<div class="published-team-days">${dayCards}</div>
      <p class="portal-note"><strong>Your name is highlighted.</strong> This is the same approved schedule every active employee sees.</p>
    </section>`;
  }

  const shiftChangeTypeLabels = {
    call_off: "Emergency call-off",
    cover: "Ask the team to cover",
    swap: "Swap with a coworker",
  };

  function shiftRequestStatusLabel(request) {
    if (request.status === "approved") return "Manager approved";
    if (request.status === "declined") return "Declined";
    if (request.status === "coworker_accepted") return "Coworker accepted";
    if (request.status === "awaiting_coworker") return "Waiting for coworker";
    return request.request_type === "call_off" ? "Manager alerted" : "Open";
  }

  function shiftChangePanelMarkup(employee) {
    if (!state.shiftChangeAssignmentId) return "";
    const assignment = allPublishedAssignments().find((item) => String(item.id) === String(state.shiftChangeAssignmentId));
    if (!assignment || String(assignment.employee_id) !== String(employee.id)) return "";
    const swapTargets = allPublishedAssignments().filter((item) =>
      String(item.schedule_id) === String(assignment.schedule_id)
      && String(item.employee_id) !== String(employee.id)
      && ["AM", "PM"].includes(item.assignment_type)
    );
    const targetOptions = swapTargets.map((item) => {
      const coworker = assignmentEmployee(item);
      return `<option value="${escapeHtml(String(item.id))}">${escapeHtml(coworker?.name || "Coworker")} · ${escapeHtml(assignmentDateLabel(item))}</option>`;
    }).join("");
    return `<section class="panel shift-change-panel" id="shiftChangePanel">
      <div class="shift-change-panel-heading"><div><p class="eyebrow">Published shift</p><h3>${escapeHtml(assignmentDateLabel(assignment))}</h3><p>Choose the kind of help you need. The schedule does not change until a manager approves it.</p></div><button type="button" class="text-button" data-close-shift-change>Close</button></div>
      <form id="shiftChangeForm" data-assignment-id="${escapeHtml(String(assignment.id))}" data-shift-change-mode="${escapeHtml(state.shiftChangeType)}">
        <div class="shift-change-options" role="radiogroup" aria-label="Shift request type">
          ${Object.entries(shiftChangeTypeLabels).map(([value, label]) => `<label class="shift-change-choice ${state.shiftChangeType === value ? "active" : ""}"><input type="radio" name="shiftChangeType" value="${value}" ${state.shiftChangeType === value ? "checked" : ""}><span><strong>${label}</strong><small>${value === "call_off" ? "Emergencies only—managers are alerted immediately." : value === "cover" ? "Coworkers can offer to take this shift." : "Choose a coworker’s published shift to exchange."}</small></span></label>`).join("")}
        </div>
        <label class="field-label shift-swap-target" data-swap-target ${state.shiftChangeType === "swap" ? "" : "hidden"}>Shift I want to swap for<select name="targetAssignmentId" ${state.shiftChangeType === "swap" ? "required" : "disabled"}><option value="">Choose a coworker’s shift</option>${targetOptions}</select></label>
        <label class="field-label">Message for managers<textarea name="note" rows="3" maxlength="500" placeholder="Briefly explain what happened or what coverage you need…" required></textarea></label>
        <div class="shift-change-submit-row"><p>${state.shiftChangeType === "call_off" ? "This sends an urgent in-app manager alert. Also call the store if the shift is soon." : "A manager must approve any final coverage or swap."}</p><button class="primary-button" type="submit" ${state.shiftChangeBusy ? "disabled" : ""}>${state.shiftChangeBusy ? "Sending…" : state.shiftChangeType === "call_off" ? "Send emergency alert" : "Send request"}</button></div>
      </form>
    </section>`;
  }

  function employeeShiftRequestsMarkup(employee) {
    const ownRequests = state.shiftChangeRequests.filter((request) => String(request.employee_id) === String(employee.id));
    const incomingSwaps = state.shiftChangeRequests.filter((request) => {
      if (request.request_type !== "swap" || request.status !== "awaiting_coworker") return false;
      const target = shiftRequestAssignment(request, true);
      return String(target?.employee_id) === String(employee.id);
    });
    const openCoverage = state.shiftChangeRequests.filter((request) =>
      ["call_off", "cover"].includes(request.request_type) && ["pending", "coworker_accepted"].includes(request.status) && String(request.employee_id) !== String(employee.id)
    );
    const ownMarkup = ownRequests.map((request) => {
      const assignment = shiftRequestAssignment(request);
      return `<article class="employee-shift-request ${request.urgent ? "urgent" : ""}"><div><span>${escapeHtml(shiftChangeTypeLabels[request.request_type] || "Shift request")}</span><strong>${escapeHtml(assignmentDateLabel(assignment || request))}</strong><small>${escapeHtml(shiftRequestStatusLabel(request))}</small></div><b>${escapeHtml(request.status === "approved" ? "Approved" : request.status === "declined" ? "Closed" : "Pending")}</b></article>`;
    }).join("");
    const incomingMarkup = incomingSwaps.map((request) => {
      const requester = state.team.find((item) => String(item.id) === String(request.employee_id));
      const offered = shiftRequestAssignment(request);
      const target = shiftRequestAssignment(request, true);
      return `<article class="coverage-request-card swap"><div><span>Swap request from ${escapeHtml(requester?.name || "Coworker")}</span><strong>${escapeHtml(assignmentDateLabel(target))}</strong><p>They would take your shift and you would take ${escapeHtml(assignmentDateLabel(offered))}.</p></div><div><button type="button" class="secondary-button compact" data-respond-swap="decline" data-shift-request-id="${escapeHtml(String(request.id))}">Decline</button><button type="button" class="primary-button compact" data-respond-swap="accept" data-shift-request-id="${escapeHtml(String(request.id))}">Accept swap</button></div></article>`;
    }).join("");
    const coverageMarkup = openCoverage.map((request) => {
      const requester = state.team.find((item) => String(item.id) === String(request.employee_id));
      const assignment = shiftRequestAssignment(request);
      const offeredAlready = (request.shift_cover_offers || []).some((offer) => String(offer.employee_id) === String(employee.id));
      return `<article class="coverage-request-card ${request.urgent ? "urgent" : ""}"><div><span>${request.urgent ? "Urgent coverage" : "Coverage needed"}</span><strong>${escapeHtml(assignmentDateLabel(assignment || request))}</strong><p>${escapeHtml(requester?.name || "Coworker")} needs someone to cover this shift.</p></div><button type="button" class="secondary-button compact" data-offer-shift-cover="${escapeHtml(String(request.id))}" ${offeredAlready ? "disabled" : ""}>${offeredAlready ? "Offer sent" : "I can cover"}</button></article>`;
    }).join("");
    if (!ownMarkup && !incomingMarkup && !coverageMarkup) return "";
    return `<section class="panel shift-request-center"><div class="panel-heading"><div><p class="eyebrow">Shift changes</p><h3>Coverage & swaps</h3><p>Requests still need manager approval.</p></div></div>${incomingMarkup ? `<div class="shift-request-group"><h4>Needs your answer</h4>${incomingMarkup}</div>` : ""}${coverageMarkup ? `<div class="shift-request-group"><h4>Open coverage</h4>${coverageMarkup}</div>` : ""}${ownMarkup ? `<div class="shift-request-group"><h4>My requests</h4>${ownMarkup}</div>` : ""}</section>`;
  }

  function renderEmployeeWeek(employee) {
    const { weekStart, schedule } = selectedEmployeeScheduleWeek();
    const hasPublishedSchedule = Boolean(schedule);
    const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
    const dayNumberByName = Object.fromEntries(demoData.days.map((day) => [day.name, day.number]));
    let estimatedHours = 0;
    const dayCards = scheduleWeekRows(weekStart).map((day) => {
      if (day.closed) return `<article class="employee-day-card closed"><span>${day.name}</span><strong>Closed</strong><small>${dateFormatter.format(day.date)}</small></article>`;
      const parts = hasPublishedSchedule ? employeeScheduleParts(employee, { ...day, number: dayNumberByName[day.name] }, schedule) : [];
      const dayHours = estimatedDayHours(parts);
      estimatedHours += dayHours;
      const helpAssignment = parts.find((part) => ["morning", "night"].includes(part.type)) || parts[0];
      return `<article class="employee-day-card ${parts.length ? "working" : "off"}"><span>${day.name}</span><strong>${parts.length ? parts.map((part) => `<b class="portal-shift ${part.type}">${escapeHtml(part.text)}</b>`).join("") : "Off"}</strong>${dayHours ? `<em>Est. ${dayHours}h</em>` : ""}<small>${dateFormatter.format(day.date)}</small>${helpAssignment?.assignmentId ? `<button type="button" class="shift-help-button" data-open-shift-change="${escapeHtml(String(helpAssignment.assignmentId))}">Call off · cover · swap</button>` : ""}</article>`;
    }).join("");
    return `${employeeScheduleWeekSwitcherMarkup()}<section class="panel employee-week-panel">
      <div class="panel-heading"><div><p class="eyebrow">My published schedule</p><h3>${scheduleWeekLabel(weekStart)}</h3></div><span class="request-status ${hasPublishedSchedule ? "submitted" : "missing"}">${hasPublishedSchedule ? `Est. ${estimatedHours}h` : "Not posted"}</span></div>
      ${hasPublishedSchedule ? `<div class="employee-week-grid">${dayCards}</div><p class="portal-note">Morning is estimated at 6 hours and night at 5 hours. IC uses an 11-hour estimate, though actual flexible production time may vary. Contact a manager before treating an assignment marked * as approved.</p>` : `<div class="warning-box">No schedule has been published for this week yet. You can still choose another week above or send a future-date request.</div>`}
    </section>${shiftChangePanelMarkup(employee)}${employeeShiftRequestsMarkup(employee)}`;
  }

  function renderTeamCard(employee, hidden = false) {
    const skills = employee.skills.length ? employee.skills : ["team_member"];
    const emergencyContact = emergencyContactFor(employee);
    const accessLabel = hidden && !employee.hasLogin ? "Access archived" : hidden ? "Hidden" : employee.hasLogin ? "Portal ready" : "Setup needed";
    const accessClass = hidden || !employee.hasLogin ? "missing" : "submitted";
    const actions = hidden
      ? employee.hasLogin
        ? `<button class="secondary-button employee-action-button" type="button" data-edit-skills="${employee.id}">Edit qualifications</button><button class="primary-button employee-action-button" type="button" data-restore-employee="${employee.id}">Restore employee</button><button class="remove-access-button" type="button" data-remove-employee="${employee.id}">Archive access</button>`
        : `<button class="secondary-button employee-action-button" type="button" data-edit-skills="${employee.id}">Edit qualifications</button><span class="archived-access-note">History retained. Re-create the login with this employee ID if they return.</span>`
      : `<button class="secondary-button employee-action-button" type="button" data-edit-skills="${employee.id}">Edit qualifications</button><button class="secondary-button employee-action-button" type="button" data-hide-employee="${employee.id}">Hide employee</button><button class="remove-access-button" type="button" data-remove-employee="${employee.id}">Archive access</button>`;
    return `<article class="team-card ${hidden ? "hidden-team-card" : ""}" data-initial="${escapeHtml(employee.name[0])}">
      <div class="team-card-heading"><div><h3>${escapeHtml(employee.name)}</h3><p>${escapeHtml(employee.code || "No employee ID")}</p></div><span class="request-status ${accessClass}">${accessLabel}</span></div>
      <p>${employee.phone ? escapeHtml(employee.phone) : "Phone number needed"}${hidden ? "" : ` · Scheduling priority ${employee.schedulePriority || "—"}`}</p>
      <div class="skill-tags">${skills.map((skill) => `<span class="${skill === "key_holder" ? "key" : skill === "ic_maker" ? "ic" : skill === "trainer" ? "train" : ""}">${skill === "team_member" ? "Team member" : roleLabel(skill)}</span>`).join("")}</div>
      ${state.role === "manager" ? `<button class="emergency-contact-button ${emergencyContact ? "saved" : "missing"}" type="button" data-emergency-contact="${employee.id}" aria-label="${emergencyContact ? `Open ${escapeHtml(employee.name)}'s emergency contact` : `Add an emergency contact for ${escapeHtml(employee.name)}`}"><span class="emergency-contact-icon" aria-hidden="true">☎</span><span class="emergency-contact-copy"><small>Emergency contact</small><strong>${emergencyContact ? escapeHtml(emergencyContact.name) : "Add contact"}</strong><b>${emergencyContact ? `${escapeHtml(emergencyContact.relationship)} · ${escapeHtml(emergencyContact.phone)}` : "Name, relationship, and phone"}</b></span><span class="emergency-contact-arrow" aria-hidden="true">›</span></button>` : ""}
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

  function staffDirectoryMarkup() {
    const contacts = [...(state.staffDirectory.length ? state.staffDirectory : state.team)].sort((a, b) => a.name.localeCompare(b.name));
    return `<section class="panel staff-directory-panel">
      <div class="panel-heading"><div><p class="eyebrow">Team contacts</p><h3>Call or message a coworker</h3></div><span class="directory-count">${contacts.length} active</span></div>
      <p class="staff-directory-intro">Use these numbers for work communication. This directory is visible only to active staff with portal access.</p>
      <div class="staff-contact-list">${contacts.map((contact) => {
        const phoneHref = emergencyPhoneHref(contact.phone);
        const isCurrent = String(contact.id) === String(state.profile?.id) || contact.code === state.profile?.employee_code;
        return `<article class="staff-contact-card"><span class="staff-contact-avatar">${escapeHtml(contact.name.slice(0, 1).toUpperCase())}</span><div><strong>${escapeHtml(contact.name)}${isCurrent ? " (you)" : ""}</strong><small>${contact.phone ? escapeHtml(contact.phone) : "Phone number not added"}</small></div><div class="staff-contact-actions">${phoneHref ? `<a href="${phoneHref}" aria-label="Call ${escapeHtml(contact.name)}">Call</a><a href="sms:${phoneHref.slice(4)}" aria-label="Message ${escapeHtml(contact.name)}">Message</a>` : `<span>Unavailable</span>`}</div></article>`;
      }).join("")}</div>
    </section>`;
  }

  function chatDirectory() {
    const people = new Map();
    [...state.staffDirectory, ...state.team].forEach((person) => {
      if (person?.id) people.set(String(person.id), { id: person.id, name: person.name || person.display_name || "Employee" });
    });
    if (state.profile?.id) people.set(String(state.profile.id), { id: state.profile.id, name: state.profile.display_name || "Me" });
    return [...people.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  function chatPersonName(employeeId) {
    return chatDirectory().find((person) => String(person.id) === String(employeeId))?.name || "Staff member";
  }

  function chatThreadTitle(thread) {
    if (thread.thread_type === "team") return "Whole Team";
    if (thread.thread_type === "direct") {
      const otherId = (thread.member_ids || []).find((id) => String(id) !== String(state.profile?.id));
      return otherId ? chatPersonName(otherId) : thread.title || "Direct message";
    }
    return thread.title || "Group chat";
  }

  function directChatThreadFor(employeeId) {
    return state.chatThreads.find((thread) => thread.thread_type === "direct"
      && (thread.member_ids || []).some((id) => String(id) === String(state.profile?.id))
      && (thread.member_ids || []).some((id) => String(id) === String(employeeId))) || null;
  }

  function latestChatMessage(threadId) {
    return state.chatMessages
      .filter((message) => String(message.thread_id) === String(threadId))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] || null;
  }

  function chatTimeLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const today = new Date();
    const sameDay = date.toDateString() === today.toDateString();
    return new Intl.DateTimeFormat("en-US", sameDay
      ? { hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
  }

  function activeChatThread() {
    if (!state.chatThreads.some((thread) => String(thread.id) === String(state.activeChatThreadId))) {
      state.activeChatThreadId = state.chatThreads.find((thread) => thread.thread_type === "team")?.id
        || state.chatThreads[0]?.id
        || "";
    }
    return state.chatThreads.find((thread) => String(thread.id) === String(state.activeChatThreadId)) || null;
  }

  function renderNewChatForm() {
    const participants = chatDirectory().filter((person) => String(person.id) !== String(state.profile?.id));
    return `<form id="newChatForm" class="new-chat-form">
      <div class="new-chat-heading"><div><p class="eyebrow">New group</p><h3>Choose who can join</h3><p>For a direct message, just tap a coworker in the inbox.</p></div><button type="button" class="text-button" data-close-new-chat>Close</button></div>
      <input type="hidden" name="chatKind" value="group">
      <label class="field-label">Group name (optional)<input name="title" maxlength="80" placeholder="Closing crew, IC team…"></label>
      <fieldset class="chat-participant-picker"><legend>People</legend>${participants.map((person) => `<label><input type="checkbox" name="memberIds" value="${escapeHtml(String(person.id))}"><span class="staff-contact-avatar">${escapeHtml(person.name.slice(0, 1).toUpperCase())}</span><strong>${escapeHtml(person.name)}</strong></label>`).join("")}</fieldset>
      <button class="primary-button" type="submit">Create group</button>
    </form>`;
  }

  function renderMessages() {
    if (!elements.messages || !state.profile) return;
    const thread = activeChatThread();
    const messages = thread
      ? state.chatMessages.filter((message) => String(message.thread_id) === String(thread.id)).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      : [];
    const contacts = chatDirectory().filter((person) => String(person.id) !== String(state.profile?.id));
    const activeContactIds = new Set(contacts.map((person) => String(person.id)));
    const teamThread = state.chatThreads.find((item) => item.thread_type === "team") || null;
    const groupThreads = state.chatThreads.filter((item) => item.thread_type === "group");
    const previousDirectThreads = state.chatThreads.filter((item) => {
      if (item.thread_type !== "direct") return false;
      const otherId = (item.member_ids || []).find((id) => String(id) !== String(state.profile?.id));
      return otherId && !activeContactIds.has(String(otherId));
    });
    const standardThreadCard = (item, label = "") => {
      const latest = latestChatMessage(item.id);
      const title = chatThreadTitle(item);
      return `<button type="button" class="chat-thread-card ${String(item.id) === String(thread?.id) ? "active" : ""}" data-chat-thread="${escapeHtml(String(item.id))}"><span class="chat-thread-avatar ${item.thread_type}">${item.thread_type === "team" ? "ALL" : escapeHtml(title.slice(0, 2).toUpperCase())}</span><span><strong>${escapeHtml(title)}</strong><small>${latest ? escapeHtml(latest.body) : label || `${(item.member_ids || []).length} members`}</small></span><time>${latest ? escapeHtml(chatTimeLabel(latest.created_at)) : ""}</time></button>`;
    };
    const contactCards = contacts.map((person) => {
      const directThread = directChatThreadFor(person.id);
      const latest = directThread ? latestChatMessage(directThread.id) : null;
      const opening = String(state.directChatOpeningId) === String(person.id) && state.messageBusy;
      const active = directThread && String(directThread.id) === String(thread?.id);
      return `<button type="button" class="chat-contact-card ${active ? "active" : ""}" data-chat-person="${escapeHtml(String(person.id))}" ${opening ? "disabled" : ""}><span class="chat-contact-avatar">${escapeHtml(person.name.slice(0, 1).toUpperCase())}</span><span class="chat-contact-copy"><strong>${escapeHtml(person.name)}</strong><small>${opening ? "Opening…" : latest ? escapeHtml(latest.body) : directThread ? "No messages yet" : "Start a conversation"}</small></span>${latest ? `<time>${escapeHtml(chatTimeLabel(latest.created_at))}</time>` : `<span class="chat-contact-state">${directThread ? "Open" : "Message"}</span>`}</button>`;
    }).join("");
    const groupCards = groupThreads.map((item) => standardThreadCard(item, "Group conversation")).join("");
    const previousCards = previousDirectThreads.map((item) => standardThreadCard(item, "Previous conversation")).join("");
    const messageMarkup = messages.map((message) => {
      const mine = String(message.sender_id) === String(state.profile?.id);
      return `<article class="chat-message ${mine ? "mine" : "theirs"}"><span>${mine ? "You" : escapeHtml(chatPersonName(message.sender_id))}</span><p>${escapeHtml(message.body)}</p><time>${escapeHtml(chatTimeLabel(message.created_at))}</time></article>`;
    }).join("");
    elements.messages.innerHTML = `${state.messagesSetupMissing && state.mode === "supabase" ? `<div class="warning-box">Messages are designed and ready, but the new Messages Supabase migration must be applied before live accounts can use them.</div>` : ""}
      ${state.newChatOpen ? renderNewChatForm() : ""}
      <section class="messages-shell ${state.mobileMessagesThreadOpen ? "mobile-thread-open" : ""}">
        <aside class="chat-thread-list" aria-label="Messages inbox">
          <div class="chat-thread-list-heading"><div><strong>Inbox</strong><small>${contacts.length} coworkers</small></div><button type="button" data-new-chat aria-label="Create a group chat" title="Create a group chat">＋</button></div>
          <div class="chat-inbox-scroll">
            ${teamThread ? `<section class="chat-inbox-section"><h3>Team</h3>${standardThreadCard(teamThread, "Everyone at Swensen’s")}</section>` : ""}
            <section class="chat-inbox-section"><h3>People</h3>${contactCards || `<p class="chat-empty">No active coworkers found.</p>`}</section>
            ${groupCards ? `<section class="chat-inbox-section"><h3>Groups</h3>${groupCards}</section>` : ""}
            ${previousCards ? `<section class="chat-inbox-section"><h3>Previous chats</h3>${previousCards}</section>` : ""}
          </div>
        </aside>
        <section class="chat-room">${thread ? `<header><button type="button" class="chat-back-button" data-chat-back aria-label="Back to inbox">‹</button><span class="chat-room-avatar ${thread.thread_type}">${thread.thread_type === "team" ? "ALL" : escapeHtml(chatThreadTitle(thread).slice(0, 2).toUpperCase())}</span><div><p class="eyebrow">${thread.thread_type === "team" ? "Everyone" : thread.thread_type === "direct" ? "Direct message" : "Group"}</p><h3>${escapeHtml(chatThreadTitle(thread))}</h3><small>${thread.thread_type === "team" ? "All active staff" : thread.thread_type === "direct" ? "Private conversation" : `${(thread.member_ids || []).length} members`}</small></div></header><div class="chat-message-list" data-chat-message-list>${messageMarkup || `<p class="chat-empty">Start the conversation.</p>`}</div><form id="chatMessageForm" data-thread-id="${escapeHtml(String(thread.id))}" class="chat-composer"><label><span class="sr-only">Message</span><textarea name="message" rows="1" maxlength="2000" placeholder="Message ${escapeHtml(chatThreadTitle(thread))}" required></textarea></label><button class="primary-button compact" type="submit" ${state.messageBusy ? "disabled" : ""}>${state.messageBusy ? "Sending…" : "Send"}</button></form>` : `<div class="chat-room-empty"><strong>Choose someone to message</strong><p>Tap any active coworker. Their conversation opens whether you have messaged before or not.</p></div>`}</section>
      </section>`;
  }

  async function loadChatData({ ensureTeam = true } = {}) {
    if (state.mode === "demo") {
      const saved = loadDemoMessages();
      state.chatThreads = saved.threads;
      state.chatMessages = saved.messages;
      state.messagesSetupMissing = false;
      return;
    }
    if (!supabaseClient || !state.profile) return;
    if (ensureTeam) {
      const ensured = await supabaseClient.rpc("ensure_team_chat");
      if (ensured.error) {
        state.messagesSetupMissing = /ensure_team_chat|chat_threads|schema cache|function|relation/i.test(ensured.error.message || "");
        state.chatThreads = [];
        state.chatMessages = [];
        return;
      }
    }
    const threadResult = await supabaseClient.from("chat_threads")
      .select("id, title, thread_type, created_by, created_at, updated_at, chat_members(employee_id)")
      .order("updated_at", { ascending: false });
    if (threadResult.error) {
      if (ensureTeam) {
        state.messagesSetupMissing = true;
        state.chatThreads = [];
        state.chatMessages = [];
      }
      return;
    }
    state.messagesSetupMissing = false;
    state.chatThreads = (threadResult.data || []).map((thread) => ({
      ...thread,
      member_ids: (thread.chat_members || []).map((member) => member.employee_id),
    }));
    const threadIds = state.chatThreads.map((thread) => thread.id);
    if (!threadIds.length) {
      state.chatMessages = [];
      return;
    }
    const messageResult = await supabaseClient.from("chat_messages")
      .select("id, thread_id, sender_id, body, created_at")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: true });
    if (!messageResult.error) state.chatMessages = messageResult.data || [];
    else if (ensureTeam) state.chatMessages = [];
  }

  async function openDirectChat(employeeId) {
    if (state.messageBusy || String(employeeId) === String(state.profile?.id)) return;
    const person = chatDirectory().find((item) => String(item.id) === String(employeeId));
    if (!person) {
      showToast("That coworker is no longer active.");
      return;
    }
    const existing = directChatThreadFor(employeeId);
    if (existing) {
      state.activeChatThreadId = existing.id;
      state.newChatOpen = false;
      state.mobileMessagesThreadOpen = true;
      renderMessages();
      return;
    }

    state.messageBusy = true;
    state.directChatOpeningId = employeeId;
    renderMessages();
    if (state.mode === "demo") {
      const now = new Date().toISOString();
      const thread = {
        id: `preview-chat-${Date.now()}`,
        title: person.name,
        thread_type: "direct",
        member_ids: [state.profile.id, employeeId],
        created_by: state.profile.id,
        created_at: now,
        updated_at: now,
      };
      state.chatThreads.unshift(thread);
      state.activeChatThreadId = thread.id;
      saveDemoMessages();
    } else {
      const { data: threadId, error } = await supabaseClient.rpc("create_chat_thread", {
        p_title: "",
        p_member_ids: [employeeId],
      });
      if (error) {
        state.messageBusy = false;
        state.directChatOpeningId = "";
        renderMessages();
        showToast(`Could not open chat: ${error.message}`);
        return;
      }
      state.activeChatThreadId = threadId;
      await loadChatData();
    }
    state.messageBusy = false;
    state.directChatOpeningId = "";
    state.newChatOpen = false;
    state.mobileMessagesThreadOpen = true;
    renderMessages();
    window.requestAnimationFrame(() => document.querySelector("#chatMessageForm textarea")?.focus());
  }

  async function createChat(form) {
    if (state.messageBusy) return;
    const data = new FormData(form);
    const kind = String(data.get("chatKind") || "direct");
    const memberIds = data.getAll("memberIds").map(String);
    if (kind === "direct" && memberIds.length !== 1) {
      showToast("Choose exactly one coworker for a direct message.");
      return;
    }
    if (kind === "group" && memberIds.length < 2) {
      showToast("Choose at least two coworkers for a group chat.");
      return;
    }
    const title = String(data.get("title") || "").trim();
    state.messageBusy = true;
    if (state.mode === "demo") {
      const thread = {
        id: `preview-chat-${Date.now()}`,
        title: kind === "direct" ? chatPersonName(memberIds[0]) : title || memberIds.map(chatPersonName).join(", "),
        thread_type: kind,
        member_ids: [state.profile.id, ...memberIds],
        created_by: state.profile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      state.chatThreads.unshift(thread);
      state.activeChatThreadId = thread.id;
      saveDemoMessages();
    } else {
      const { data: threadId, error } = await supabaseClient.rpc("create_chat_thread", {
        p_title: title,
        p_member_ids: memberIds,
      });
      if (error) {
        state.messageBusy = false;
        showToast(`Could not create chat: ${error.message}`);
        return;
      }
      state.activeChatThreadId = threadId;
      await loadChatData();
    }
    state.messageBusy = false;
    state.newChatOpen = false;
    state.mobileMessagesThreadOpen = true;
    renderMessages();
    showToast(kind === "direct" ? "Direct message ready." : "Group chat created.");
  }

  async function sendChatMessage(form) {
    if (state.messageBusy) return;
    const body = String(new FormData(form).get("message") || "").trim();
    const threadId = form.dataset.threadId;
    if (!body || !threadId) return;
    state.messageBusy = true;
    if (state.mode === "demo") {
      state.chatMessages.push({
        id: `preview-message-${Date.now()}`,
        thread_id: threadId,
        sender_id: state.profile.id,
        body,
        created_at: new Date().toISOString(),
      });
      const thread = state.chatThreads.find((item) => String(item.id) === String(threadId));
      if (thread) thread.updated_at = new Date().toISOString();
      saveDemoMessages();
    } else {
      const { error } = await supabaseClient.rpc("send_chat_message", { p_thread_id: threadId, p_body: body });
      if (error) {
        state.messageBusy = false;
        showToast(`Could not send message: ${error.message}`);
        return;
      }
      await loadChatData();
    }
    state.messageBusy = false;
    renderMessages();
    window.requestAnimationFrame(() => {
      const list = document.querySelector("[data-chat-message-list]");
      if (list) list.scrollTop = list.scrollHeight;
    });
  }

  function employeeItToolsMarkup() {
    return `<section class="panel employee-it-panel">
      <div class="panel-heading"><div><p class="eyebrow">Gabriel only</p><h3>IT Tools</h3><p>Check that the Hub and Supabase are responding before store workflows are affected.</p></div><span class="system-check-icon" aria-hidden="true">DB</span></div>
      <div class="it-tools-content">
        <div class="system-check-content">
          <div><p>Runs a real read-and-write check and saves the latest result in Supabase.</p><p class="system-check-message" data-system-check-message role="status">No saved system check yet.</p><div class="system-check-areas" data-system-check-areas aria-label="System check results"></div></div>
          <button class="primary-button compact" type="button" data-run-database-health-check>Run real health check</button>
        </div>
        <details class="recovery-guide"><summary>Supabase pause recovery</summary><ol><li>Open the Swensen’s project in Supabase.</li><li>Choose Restore or Resume and wait for Healthy.</li><li>Return here and run the real health check.</li><li>Test one manager save and one employee login.</li></ol></details>
        <details class="recovery-guide"><summary>Deployment checklist</summary><ol><li>Run the complete automated tests.</li><li>Apply the newest database update.</li><li>Publish the Hub and run this health check.</li><li>Test scheduling, requests, records, and inventory.</li></ol></details>
      </div>
    </section>`;
  }

  function employeePortalTabsMarkup() {
    const tabs = [
      ["schedule", "Schedule"],
      ["requests", "Requests"],
      ["availability", "Availability"],
      ["contacts", "Contacts"],
      ...(isGabrielAccount() ? [["it", "IT Tools"]] : []),
    ];
    return `<div class="employee-portal-tabs" role="tablist" aria-label="Employee portal sections">${tabs.map(([value, label]) => `<button type="button" role="tab" class="employee-portal-tab ${state.employeePortalView === value ? "active" : ""}" data-employee-portal-view="${value}" aria-selected="${state.employeePortalView === value}">${label}${value === "requests" && state.dateRequests.some((request) => String(request.employee_id) === String(state.profile?.id) && dateRequestIsLate(request)) ? `<span class="employee-tab-alert">!</span>` : ""}</button>`).join("")}</div>`;
  }

  function ensureRequestDraft(employee) {
    const weeks = upcomingRequestWeeks();
    if (!state.requestCalendarWeekStart || !weeks.includes(state.requestCalendarWeekStart)) state.requestCalendarWeekStart = weeks[0];
    if (state.requestDraftWeekStart === state.requestCalendarWeekStart) return;
    const existing = state.dateRequests.filter((request) =>
      String(request.employee_id) === String(employee.id) && request.schedule_week_start === state.requestCalendarWeekStart
    );
    state.requestDraftWeekStart = state.requestCalendarWeekStart;
    state.requestDraftDates = Object.fromEntries(existing.map((request) => [request.request_date, request.shift_scope]));
    state.activeRequestDate = existing[0]?.request_date || "";
    state.dateRequestKind = existing[0]?.request_kind || "time_off";
    state.dateRequestNotes = existing[0]?.notes || "";
  }

  function requestWeekStatus(weekStart, employee) {
    const requests = state.dateRequests.filter((request) => String(request.employee_id) === String(employee.id) && request.schedule_week_start === weekStart);
    const published = Boolean(publishedScheduleForWeek(weekStart));
    const late = Date.now() > requestDeadlineForWeek(weekStart).getTime();
    if (published) return { className: "published", label: "Schedule published" };
    if (requests.length) return { className: requests.some(dateRequestIsLate) ? "late" : "sent", label: `${requests.length} date${requests.length === 1 ? "" : "s"} sent` };
    if (late) return { className: "late", label: "Late request" };
    return { className: "open", label: "Request open" };
  }

  function renderDateRequestCalendar(employee) {
    ensureRequestDraft(employee);
    const weekStart = state.requestCalendarWeekStart;
    const deadline = requestDeadlineForWeek(weekStart);
    const deadlinePassed = Date.now() > deadline.getTime();
    const published = Boolean(publishedScheduleForWeek(weekStart));
    const dateFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
    const compactDateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
    const weekButtons = upcomingRequestWeeks().map((value) => {
      const status = requestWeekStatus(value, employee);
      return `<button type="button" class="request-week-card ${value === weekStart ? "active" : ""} ${status.className}" data-request-week="${value}"><strong>${scheduleWeekLabel(value)}</strong><small>${status.label}</small></button>`;
    }).join("");
    const todayIso = localIsoDate(new Date());
    const dateButtons = scheduleWeekRows(weekStart).map((day) => {
      const value = localIsoDate(day.date);
      const selectedScope = state.requestDraftDates[value];
      const disabled = day.closed || value < todayIso;
      return `<button type="button" class="request-date-card ${selectedScope ? "selected" : ""} ${state.activeRequestDate === value ? "active" : ""} ${day.closed ? "closed" : ""}" data-request-date="${value}" ${disabled ? "disabled" : ""}><span>${day.name.slice(0, 3)}</span><strong>${day.date.getDate()}</strong><small>${day.closed ? "Closed" : selectedScope ? requestScopeLabel(selectedScope) : value < todayIso ? "Past" : "Select"}</small></button>`;
    }).join("");
    const selectedEntries = Object.entries(state.requestDraftDates).sort(([a], [b]) => a.localeCompare(b));
    const activeScope = state.activeRequestDate ? state.requestDraftDates[state.activeRequestDate] : "";
    const activeDateLabel = state.activeRequestDate ? dateFormatter.format(new Date(`${state.activeRequestDate}T12:00:00`)) : "Choose a date above";
    const selectedSummary = selectedEntries.length
      ? `<div class="selected-date-requests">${selectedEntries.map(([date, scope]) => `<button type="button" data-request-date="${date}" class="selected-date-chip ${date === state.activeRequestDate ? "active" : ""}"><strong>${compactDateFormatter.format(new Date(`${date}T12:00:00`))}</strong><span>${requestScopeLabel(scope)}</span></button>`).join("")}</div>`
      : `<p class="date-request-empty">No dates selected yet.</p>`;
    const deadlineCopy = published
      ? `<h3>The schedule is already published</h3><p>You can still send this as a schedule-change or call-off notice. Contact a manager directly if it is urgent.</p>`
      : deadlinePassed
        ? `<h3>The Thursday deadline passed</h3><p>You can still send the request. Managers will immediately see a red Late alert in their portal.</p>`
        : `<h3>Submit before Thursday</h3><p>Requests for this schedule are due ${requestDeadlineLabel(weekStart)}.</p>`;
    return `<form id="dateRequestForm" data-employee-id="${employee.id}" class="date-request-form">
      <section class="panel request-calendar-panel">
        <div class="panel-heading"><div><p class="eyebrow">Future dates</p><h3>Request a specific day</h3><p>Choose the schedule week, then tap every date you need.</p></div></div>
        <div class="request-week-strip" aria-label="Upcoming schedule weeks">${weekButtons}</div>
        <div class="request-calendar-heading"><div><strong>${scheduleWeekLabel(weekStart)}</strong><span>Monday–Sunday</span></div><span>${published ? "Published" : deadlinePassed ? "Late if sent now" : "Open"}</span></div>
        <div class="request-date-grid" aria-label="Choose request dates">${dateButtons}</div>
      </section>
      <section class="panel request-scope-panel">
        <div><p class="eyebrow">Selected date</p><h3>${escapeHtml(activeDateLabel)}</h3><p>What part of the day are you requesting off?</p></div>
        <div class="request-scope-options" role="radiogroup" aria-label="Requested time">${[["ALL_DAY", "All day"], ["AM", "Morning shift only"], ["PM", "Night shift only"]].map(([scope, label]) => `<button type="button" role="radio" aria-checked="${activeScope === scope}" class="request-scope-button ${activeScope === scope ? "active" : ""}" data-request-scope="${scope}" ${state.activeRequestDate ? "" : "disabled"}>${label}</button>`).join("")}</div>
        ${state.activeRequestDate ? `<button type="button" class="remove-request-date" data-remove-request-date="${state.activeRequestDate}">Remove this date</button>` : ""}
        ${selectedSummary}
      </section>
      <section class="panel request-deadline-panel ${deadlinePassed || published ? "late" : "on-time"}"><div><p class="eyebrow">Thursday reminder</p>${deadlineCopy}</div><span>${published ? "Manager alert" : deadlinePassed ? "Late" : "On time"}</span></section>
      <section class="panel date-request-details">
        <label class="field-label">Request type<select id="dateRequestKind" name="requestKind"><option value="time_off" ${state.dateRequestKind === "time_off" ? "selected" : ""}>Time off</option><option value="call_off" ${state.dateRequestKind === "call_off" ? "selected" : ""}>Call-off / schedule change</option></select></label>
        <label class="field-label">Details for managers<textarea id="dateRequestNotes" name="notes" rows="3" placeholder="Briefly explain the request…">${escapeHtml(state.dateRequestNotes)}</textarea></label>
        <p>For a call-off or urgent change, contact a manager directly. The Hub creates the record and alert.</p>
      </section>
      ${state.dateRequestSetupMissing && state.mode === "supabase" ? `<div class="warning-box">This new request calendar still needs its Supabase update before it can save live requests.</div>` : ""}
      <button class="primary-button request-submit" type="submit" ${state.dateRequestBusy || !selectedEntries.length ? "disabled" : ""}>${state.dateRequestBusy ? "Sending…" : published ? "Send schedule-change request" : deadlinePassed ? "Send late request" : "Submit date request"}</button>
    </form>`;
  }

  function managerDateRequestsMarkup() {
    const requests = state.dateRequests.filter((request) => request.schedule_week_start === state.settings.weekStart);
    const cards = requests.sort((a, b) => a.request_date.localeCompare(b.request_date) || String(a.submitted_at).localeCompare(String(b.submitted_at))).map((request) => {
      const employee = dateRequestEmployee(request);
      const date = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date(`${request.request_date}T12:00:00`));
      const late = dateRequestIsLate(request);
      return `<article class="manager-date-request ${late ? "late" : ""}"><div><span>${escapeHtml(date)}</span><strong>${escapeHtml(employee?.name || "Employee")}</strong><p>${requestScopeLabel(request.shift_scope)} · ${request.request_kind === "call_off" ? "Call-off / schedule change" : "Time off"}${request.notes ? ` · ${escapeHtml(request.notes)}` : ""}</p></div><span class="request-status ${late ? "late" : "submitted"}">${late ? "Late" : "On time"}</span></article>`;
    }).join("");
    const lateCount = requests.filter(dateRequestIsLate).length;
    return `<section class="manager-date-request-section"><div class="manager-date-request-heading"><div><p class="eyebrow">Specific dates</p><h3>Date requests</h3><p>All-day, morning-only, and night-only requests for ${scheduleWeekLabel(state.settings.weekStart)}.</p></div>${lateCount ? `<span class="late-request-summary">${lateCount} late</span>` : ""}</div>${cards ? `<div class="manager-date-request-list">${cards}</div>` : `<div class="warning-box good">No specific-date requests for this schedule week.</div>`}</section>`;
  }

  function managerShiftChangesMarkup() {
    const requests = state.shiftChangeRequests
      .filter((request) => request.schedule_week_start >= currentScheduleTuesday())
      .sort((a, b) => a.schedule_week_start.localeCompare(b.schedule_week_start) || String(b.submitted_at).localeCompare(String(a.submitted_at)));
    const pending = requests.filter((request) => !["approved", "declined", "cancelled"].includes(request.status));
    const cards = requests.map((request) => {
      const employee = state.team.find((item) => String(item.id) === String(request.employee_id));
      const assignment = shiftRequestAssignment(request);
      const target = shiftRequestAssignment(request, true);
      const targetEmployee = assignmentEmployee(target);
      const offers = request.shift_cover_offers || [];
      const offerNames = offers.map((offer) => state.team.find((item) => String(item.id) === String(offer.employee_id))?.name).filter(Boolean);
      const closed = ["approved", "declined", "cancelled"].includes(request.status);
      return `<article class="manager-shift-request ${request.urgent ? "urgent" : ""}">
        <div class="manager-shift-request-copy"><span>${request.urgent ? "Urgent call-off" : escapeHtml(shiftChangeTypeLabels[request.request_type] || "Shift change")}</span><strong>${escapeHtml(employee?.name || "Employee")} · ${escapeHtml(assignmentDateLabel(assignment || request))}</strong><p>${escapeHtml(request.note || "No message provided.")}</p>${target ? `<small>Requested swap: ${escapeHtml(targetEmployee?.name || "Coworker")} · ${escapeHtml(assignmentDateLabel(target))}</small>` : ""}${offerNames.length ? `<small>Coverage offers: ${escapeHtml(offerNames.join(", "))}</small>` : ""}</div>
        <div class="manager-shift-request-actions"><b class="request-status ${request.urgent && !closed ? "late" : closed ? "submitted" : "missing"}">${escapeHtml(shiftRequestStatusLabel(request))}</b>${closed ? "" : `<button type="button" class="secondary-button compact" data-review-shift-change="decline" data-shift-request-id="${escapeHtml(String(request.id))}">Decline</button><button type="button" class="primary-button compact" data-review-shift-change="approve" data-shift-request-id="${escapeHtml(String(request.id))}">Approve</button>`}</div>
      </article>`;
    }).join("");
    return `<section class="manager-shift-change-section"><div class="manager-date-request-heading"><div><p class="eyebrow">Published shift alerts</p><h3>Call-offs, coverage & swaps</h3><p>Current and upcoming published schedules appear here. Urgent requests trigger a live in-app manager alert; SMS can be connected after a phone provider is approved.</p></div>${pending.length ? `<span class="late-request-summary">${pending.length} open</span>` : ""}</div>${cards ? `<div class="manager-shift-request-list">${cards}</div>` : `<div class="warning-box good">No current or upcoming shift-change requests.</div>`}</section>`;
  }

  function renderEmployeePortal() {
    const employee = state.team.find((item) => String(item.id) === String(state.profile?.id)) || state.team.find((item) => item.code === state.profile?.employee_code);
    if (!employee) {
      requestHost().innerHTML = `<div class="warning-box">This account is not linked to an active employee record yet.</div>`;
      return;
    }
    if (state.employeePortalView === "it" && !isGabrielAccount()) state.employeePortalView = "schedule";
    const content = state.employeePortalView === "requests"
      ? renderDateRequestCalendar(employee)
      : state.employeePortalView === "availability"
        ? weeklyAvailabilityFormMarkup(employee, false)
        : state.employeePortalView === "contacts"
          ? staffDirectoryMarkup()
          : state.employeePortalView === "it"
            ? employeeItToolsMarkup()
            : `${renderEmployeeWeek(employee)}${renderPublishedTeamSchedule()}`;
    requestHost().innerHTML = `${employeePortalTabsMarkup()}<div class="employee-portal-content">${content}</div>`;
    if (state.employeePortalView === "availability") renderAvailabilityPreview(document.querySelector("#requestForm"));
    if (state.employeePortalView === "it") renderSystemCheckStatus();
  }

  function renderRequests() {
    if (state.role !== "manager") {
      document.querySelector("#requestPageEyebrow").textContent = "Employee portal";
      document.querySelector("#requestPageTitle").textContent = "Schedule, requests & team";
      document.querySelector("#requestPageCopy").textContent = "See the published team schedule, request future dates, and contact coworkers.";
      renderEmployeePortal();
      return;
    }
    document.querySelector("#requestPageEyebrow").textContent = "Availability";
    document.querySelector("#requestPageTitle").textContent = "Weekly requests";
    document.querySelector("#requestPageCopy").textContent = "Employees submit available days, preferred shifts, and possible doubles.";
    if (state.editingEmployeeId) {
      renderRequestForm(state.editingEmployeeId);
      return;
    }
    const lateCount = state.team.filter(isRequestLate).length + state.dateRequests.filter((request) => request.schedule_week_start === state.settings.weekStart && dateRequestIsLate(request)).length;
    requestHost().innerHTML = `<div class="request-toolbar"><div><strong>${scheduleWeekLabel(state.settings.weekStart)}</strong><p>${state.team.filter((employee) => employee.submitted).length} of ${state.team.length} submitted · Due ${requestDeadlineLabel(state.settings.weekStart)}</p></div>${lateCount ? `<span class="late-request-summary">${lateCount} late</span>` : ""}</div>
      ${managerShiftChangesMarkup()}
      ${managerDateRequestsMarkup()}
      <div class="request-list">${state.team.map((employee) => `
        <button class="request-card request-open ${isRequestLate(employee) ? "late" : ""}" data-edit-request="${employee.id}"><span><h3>${escapeHtml(employee.name)}</h3><p>${employee.submitted ? `${requestTypeLabels[employee.requestType || "weekly_availability"]} · ${employee.willingDouble.length ? "Can double " + employee.willingDouble.join(", ") : "No doubles offered"}` : "Waiting for this week's request"}</p></span><span class="request-status ${isRequestLate(employee) ? "late" : employee.submitted ? "submitted" : "missing"}">${isRequestLate(employee) ? "Late" : employee.submitted ? "Submitted" : "Missing"}</span></button>`).join("")}</div>`;
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
    return { days };
  }

  function renderAvailabilityPreview(form) {
    const preview = form?.querySelector("#availabilityPreview");
    if (!preview) return;
    const employee = state.team.find((item) => item.id === form.dataset.employeeId);
    const draft = availabilityPreviewData(form);
    const availableDays = draft.days.filter((day) => day.maxHours > 0);
    const weekdayAvailable = draft.days.filter((day) => ["Tuesday", "Wednesday", "Thursday"].includes(day.name) && day.maxHours > 0).length;
    const weekendAvailable = draft.days.filter((day) => ["Friday", "Saturday", "Sunday"].includes(day.name) && day.maxHours > 0).length;
    const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric" });
    const byName = Object.fromEntries(draft.days.map((day) => [day.name, day]));
    const rows = scheduleWeekRows(state.settings.weekStart).map((day) => {
      const heading = `<strong>${day.name}</strong><small>${dateFormatter.format(day.date)}</small>`;
      if (day.closed) return `<tr class="closed-row"><th>${heading}</th><td>CLOSED</td></tr>`;
      const availability = byName[day.name];
      return `<tr class="${availability.maxHours ? "" : "unavailable-row"}"><th>${heading}</th><td>${availability.entries}<small class="availability-cell-note">${escapeHtml(availability.label)}</small></td></tr>`;
    }).join("");
    const weekendRequired = Number(employee?.weekendDaysRequired || 0);
    const weekendReady = weekendAvailable >= weekendRequired;
    const weekendStatus = weekendRequired
      ? `<span class="${weekendReady ? "weekend-ready" : "weekend-missing"}"><strong>${weekendReady ? "✓" : "!"}</strong> ${weekendAvailable}/3 offered · ${weekendRequired}/3 needed</span>`
      : `<span><strong>✓</strong> 0/3 weekend required</span>`;
    const weekdayReady = weekdayAvailable >= Number(employee?.weekdayRequirement || 0);
    const weekdayStatus = employee?.weekdayRequirement
      ? `<span class="${weekdayReady ? "weekend-ready" : "weekend-missing"}"><strong>${weekdayReady ? "✓" : "!"}</strong> ${weekdayAvailable}/${employee.weekdayRequirement} weekdays</span>`
      : "";
    preview.innerHTML = `<div class="availability-summary"><span><strong>${availableDays.length}</strong> days available</span>${weekdayStatus}${weekendStatus}</div>
      <div class="schedule-sheet-wrap availability-sheet-wrap"><table class="schedule-sheet availability-sheet"><caption>Possible week · ${scheduleWeekLabel(state.settings.weekStart)}</caption><thead><tr><th class="day-column">Day</th><th>${escapeHtml(employee?.name || "Me")}</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="schedule-legend"><span><b>11:30</b> Morning · 6h</span><span><b>5:30</b> Night · 5h</span><span><b>×</b> Can't work</span></div>
      <p class="portal-note">This is an availability preview, not a confirmed schedule. Final days, shifts, and hours are set from store coverage and business needs.</p>`;
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

  function weeklyAvailabilityFormMarkup(employee, managerMode = state.role === "manager") {
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

    const deadline = requestDeadlineForWeek(state.settings.weekStart);
    const deadlinePassed = Date.now() > deadline.getTime();
    const requestType = employee.requestType || "weekly_availability";
    const requestTypeOption = (value) => `<option value="${value}" ${requestType === value ? "selected" : ""}>${requestTypeLabels[value]}</option>`;
    const availabilityRule = employee.weekendDaysRequired || employee.weekdayRequirement
      ? `<section class="panel weekend-requirement-card"><span class="weekend-rule-icon" aria-hidden="true">✓</span><div><p class="eyebrow">Availability needed</p><h3>${employee.weekdayRequirement ? `Offer ${employee.weekdayRequirement}/3 weekdays` : "Weekday availability is flexible"}${employee.weekendDaysRequired ? ` + ${employee.weekendDaysRequired}/3 weekend days` : ""}</h3><p>At Swensen’s, weekend means Friday, Saturday, and Sunday. Choose at least one morning or night shift on each day you offer. These are availability requirements—not guaranteed shifts.</p></div></section>`
      : "";

    return `<form id="requestForm" data-employee-id="${employee.id}" class="request-form">
        <section class="panel request-intro"><p class="eyebrow">Week of ${scheduleWeekLabel(state.settings.weekStart)}</p><h3>${managerMode ? `${escapeHtml(employee.name)}’s availability` : "My availability for next week"}</h3><p>Tell management when you can and cannot work. Final days, hours, and shifts are assigned from store coverage and business needs.</p></section>
        <section class="panel request-deadline-panel ${deadlinePassed ? "late" : "on-time"}">
          <div><p class="eyebrow">Thursday cutoff</p><h3>${deadlinePassed ? "The regular deadline has passed" : "Submit by Thursday"}</h3><p>Due ${requestDeadlineLabel(state.settings.weekStart)}—at least one week before the schedule starts. Late requests are still sent, but managers receive a late alert.</p></div><span>${deadlinePassed ? "Late if sent now" : "On time"}</span>
        </section>
        <section class="panel request-type-panel">
          <label class="field-label">What are you submitting?<select name="requestType">${requestTypeOption("weekly_availability")}${requestTypeOption("time_off")}${requestTypeOption("call_off")}</select></label>
          <p>For a call-off, also contact a manager directly. The portal creates a visible record; it does not replace urgent communication.</p>
        </section>
        ${availabilityRule}
        <section class="panel availability-preview-panel"><div class="panel-heading"><div><p class="eyebrow">Live preview</p><h3>What my week could look like</h3></div></div><div id="availabilityPreview" aria-live="polite"></div></section>
        <section class="panel"><div class="panel-heading"><div><p class="eyebrow">Availability</p><h3>Morning, night, or both</h3></div></div><div class="availability-grid">${dayRows}</div></section>
        <section class="panel"><label class="field-label">Details for managers<textarea name="notes" rows="3" placeholder="Explain time off, a call-off, or anything the scheduler should know…">${escapeHtml(employee.notes || "")}</textarea></label></section>
        <button class="primary-button request-submit" type="submit">${deadlinePassed ? "Send late request" : "Submit weekly request"}</button>
      </form>`;
  }

  function renderRequestForm(employeeId) {
    const employee = state.team.find((item) => item.id === employeeId) || state.team.find((item) => item.code === state.profile.employee_code);
    if (!employee) {
      requestHost().innerHTML = `<div class="warning-box">This account is not linked to an active employee record yet.</div>`;
      return;
    }
    requestHost().innerHTML = `${state.role === "manager" ? `<button id="backToRequests" class="text-button back-button">← All employee requests</button>` : ""}${weeklyAvailabilityFormMarkup(employee)}`;
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
    const availability = {};
    const willingDouble = [];
    demoData.days.forEach((day) => {
      availability[day.name] = { AM: formData.get(`${day.name}-AM`), PM: formData.get(`${day.name}-PM`) };
      if (formData.get(`double-${day.name}`)) willingDouble.push(day.name);
    });
    const requestType = String(formData.get("requestType") || "weekly_availability");
    const weekendDaysOffered = ["Friday", "Saturday", "Sunday"].filter((day) =>
      availability[day]?.AM !== "unavailable" || availability[day]?.PM !== "unavailable"
    ).length;
    const weekdaysOffered = ["Tuesday", "Wednesday", "Thursday"].filter((day) =>
      availability[day]?.AM !== "unavailable" || availability[day]?.PM !== "unavailable"
    ).length;
    if (requestType !== "call_off" && weekdaysOffered < Number(employee.weekdayRequirement || 0)) {
      showToast(`Please offer at least ${employee.weekdayRequirement} weekday${employee.weekdayRequirement === 1 ? "" : "s"} before submitting.`);
      return;
    }
    if (requestType !== "call_off" && weekendDaysOffered < Number(employee.weekendDaysRequired || 0)) {
      showToast(`Please offer at least ${employee.weekendDaysRequired}/3 weekend days (Friday–Sunday) before submitting.`);
      return;
    }
    const submittedAt = new Date().toISOString();
    const lateRequest = new Date(submittedAt).getTime() > requestDeadlineForWeek(state.settings.weekStart).getTime();
    Object.assign(employee, {
      availability,
      willingDouble,
      notes: formData.get("notes") || "",
      requestType,
      submittedAt,
      lateRequest,
      submitted: true,
    });

    if (state.mode === "demo") saveDemoTeam();

    if (state.mode === "supabase") {
      const requestPayload = {
        employee_id: employee.id,
        week_start: state.settings.weekStart,
        min_shifts: 0,
        max_shifts: 6,
        notes: employee.notes,
        request_kind: requestType,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      };
      let { data: request, error } = await supabaseClient.from("weekly_requests")
        .upsert(requestPayload, { onConflict: "employee_id,week_start" }).select().single();
      if (error && /request_kind/i.test(error.message || "")) {
        const legacyRequestPayload = { ...requestPayload };
        delete legacyRequestPayload.request_kind;
        ({ data: request, error } = await supabaseClient.from("weekly_requests")
          .upsert(legacyRequestPayload, { onConflict: "employee_id,week_start" }).select().single());
      }
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
    showToast(lateRequest ? `${employee.name}'s request was sent and flagged late.` : `${employee.name}'s weekly request was saved.`);
  }

  async function saveDateRequests(form) {
    const employee = state.team.find((item) => String(item.id) === String(form.dataset.employeeId));
    if (!employee || state.dateRequestBusy) return;
    const selections = Object.entries(state.requestDraftDates).sort(([a], [b]) => a.localeCompare(b));
    if (!selections.length) {
      showToast("Choose at least one future date first.");
      return;
    }
    const formData = new FormData(form);
    const weekStart = state.requestCalendarWeekStart;
    const requestKind = String(formData.get("requestKind") || state.dateRequestKind || "time_off");
    const notes = String(formData.get("notes") || state.dateRequestNotes || "").trim();
    const submittedAt = new Date().toISOString();
    const late = new Date(submittedAt).getTime() > requestDeadlineForWeek(weekStart).getTime();
    const scheduleWasPublished = Boolean(publishedScheduleForWeek(weekStart));
    state.dateRequestBusy = true;
    renderEmployeePortal();

    if (state.mode === "demo") {
      state.dateRequests = state.dateRequests.filter((request) => !(String(request.employee_id) === String(employee.id) && request.schedule_week_start === weekStart));
      selections.forEach(([requestDate, shiftScope], index) => state.dateRequests.push({
        id: `preview-date-${employee.id}-${requestDate}-${index}`,
        employee_id: employee.id,
        request_date: requestDate,
        schedule_week_start: weekStart,
        shift_scope: shiftScope,
        request_kind: requestKind,
        notes,
        status: "submitted",
        is_late: late,
        schedule_was_published: scheduleWasPublished,
        submitted_at: submittedAt,
      }));
      saveDemoDateRequests();
    } else if (state.mode === "supabase") {
      const { data, error } = await supabaseClient.rpc("replace_date_requests", {
        p_employee_id: employee.id,
        p_week_start: weekStart,
        p_requests: selections.map(([request_date, shift_scope]) => ({ request_date, shift_scope })),
        p_request_kind: requestKind,
        p_notes: notes,
      });
      if (error) {
        state.dateRequestBusy = false;
        state.dateRequestSetupMissing = /replace_date_requests|date_requests|schema cache|function/i.test(error.message || "");
        renderEmployeePortal();
        showToast(state.dateRequestSetupMissing ? "The new request calendar still needs its Supabase update." : `Could not save request: ${error.message}`);
        return;
      }
      const returnedRequests = Array.isArray(data?.requests) ? data.requests : [];
      if (returnedRequests.length) {
        state.dateRequests = state.dateRequests.filter((request) => !(String(request.employee_id) === String(employee.id) && request.schedule_week_start === weekStart));
        state.dateRequests.push(...returnedRequests);
      } else {
        await loadDateRequestsForPortal();
      }
      state.dateRequestSetupMissing = false;
    }

    state.dateRequestKind = requestKind;
    state.dateRequestNotes = notes;
    state.dateRequestBusy = false;
    state.requestDraftWeekStart = "";
    renderEmployeePortal();
    showToast(scheduleWasPublished ? "Schedule-change request sent; managers were alerted." : late ? "Late request sent; managers were alerted." : "Date request sent to management.");
  }

  async function submitShiftChangeRequest(form) {
    if (state.shiftChangeBusy) return;
    const employee = state.team.find((item) => String(item.id) === String(state.profile?.id)) || state.team.find((item) => item.code === state.profile?.employee_code);
    const assignment = allPublishedAssignments().find((item) => String(item.id) === String(form.dataset.assignmentId));
    if (!employee || !assignment || String(assignment.employee_id) !== String(employee.id)) {
      showToast("That published shift could not be found.");
      return;
    }
    const formData = new FormData(form);
    const requestType = String(formData.get("shiftChangeType") || state.shiftChangeType || "cover");
    const targetAssignmentId = requestType === "swap" ? String(formData.get("targetAssignmentId") || "") : "";
    const note = String(formData.get("note") || "").trim();
    if (!note) {
      showToast("Add a short message so managers know what is happening.");
      return;
    }
    if (requestType === "swap" && !targetAssignmentId) {
      showToast("Choose the coworker shift you want to swap for.");
      return;
    }
    if (requestType === "call_off" && !window.confirm("Send an emergency call-off alert to managers? This is for emergencies only and does not automatically remove you from the schedule.")) return;
    state.shiftChangeBusy = true;
    renderEmployeePortal();
    if (state.mode === "demo") {
      state.shiftChangeRequests.unshift({
        id: `preview-shift-request-${Date.now()}`,
        schedule_week_start: assignmentWeekStart(assignment),
        assignment_id: assignment.id,
        employee_id: employee.id,
        request_type: requestType,
        target_assignment_id: targetAssignmentId || null,
        status: requestType === "swap" ? "awaiting_coworker" : "pending",
        urgent: requestType === "call_off",
        note,
        work_day: assignment.work_day,
        assignment_type: assignment.assignment_type,
        submitted_at: new Date().toISOString(),
        shift_cover_offers: [],
      });
      saveDemoShiftChanges();
    } else {
      const { data, error } = await supabaseClient.rpc("create_shift_change_request", {
        p_assignment_id: assignment.id,
        p_request_type: requestType,
        p_target_assignment_id: targetAssignmentId || null,
        p_note: note,
      });
      if (error) {
        state.shiftChangeBusy = false;
        state.shiftChangeSetupMissing = /create_shift_change_request|shift_change_requests|schema cache|function/i.test(error.message || "");
        renderEmployeePortal();
        showToast(state.shiftChangeSetupMissing ? "The call-off and coverage workflow still needs its Supabase migration." : `Could not send shift request: ${error.message}`);
        return;
      }
      if (data) state.shiftChangeRequests.unshift(data);
      await loadShiftChangeRequests();
    }
    state.shiftChangeBusy = false;
    state.shiftChangeAssignmentId = "";
    state.shiftChangeType = "cover";
    renderEmployeePortal();
    showToast(requestType === "call_off" ? "Emergency call-off sent; managers were alerted." : requestType === "swap" ? "Swap request sent to your coworker and managers." : "Coverage request posted to the team.");
  }

  async function offerShiftCover(requestId) {
    const employee = state.team.find((item) => String(item.id) === String(state.profile?.id)) || state.team.find((item) => item.code === state.profile?.employee_code);
    const request = state.shiftChangeRequests.find((item) => String(item.id) === String(requestId));
    if (!employee || !request) return;
    if (state.mode === "demo") {
      request.shift_cover_offers = request.shift_cover_offers || [];
      if (!request.shift_cover_offers.some((offer) => String(offer.employee_id) === String(employee.id))) {
        request.shift_cover_offers.push({ id: `preview-cover-${Date.now()}`, employee_id: employee.id, offered_at: new Date().toISOString(), note: "" });
      }
      request.status = "coworker_accepted";
      saveDemoShiftChanges();
    } else {
      const { error } = await supabaseClient.rpc("offer_shift_coverage", { p_request_id: requestId, p_note: "" });
      if (error) {
        showToast(`Could not send coverage offer: ${error.message}`);
        return;
      }
      await loadShiftChangeRequests();
    }
    renderEmployeePortal();
    showToast("Your coverage offer was sent to the employee and managers.");
  }

  async function respondToShiftSwap(requestId, response) {
    const request = state.shiftChangeRequests.find((item) => String(item.id) === String(requestId));
    if (!request) return;
    if (state.mode === "demo") {
      request.status = response === "accept" ? "coworker_accepted" : "declined";
      saveDemoShiftChanges();
    } else {
      const { error } = await supabaseClient.rpc("respond_to_shift_swap", { p_request_id: requestId, p_response: response });
      if (error) {
        showToast(`Could not update the swap: ${error.message}`);
        return;
      }
      await loadShiftChangeRequests();
    }
    renderEmployeePortal();
    showToast(response === "accept" ? "Swap accepted and sent to managers for approval." : "Swap declined.");
  }

  async function reviewShiftChangeRequest(requestId, decision) {
    const request = state.shiftChangeRequests.find((item) => String(item.id) === String(requestId));
    if (!request || state.role !== "manager") return;
    if (state.mode === "demo") {
      request.status = decision === "approve" ? "approved" : "declined";
      saveDemoShiftChanges();
    } else {
      const selectedOffer = (request.shift_cover_offers || [])[0]?.employee_id || null;
      const { error } = await supabaseClient.rpc("review_shift_change_request", {
        p_request_id: requestId,
        p_decision: decision,
        p_selected_cover_employee_id: selectedOffer,
        p_manager_note: "",
      });
      if (error) {
        showToast(`Could not review shift request: ${error.message}`);
        return;
      }
      await loadShiftChangeRequests();
      await loadScheduleHistory();
    }
    renderDashboard();
    renderRequests();
    showToast(decision === "approve" ? "Shift change approved." : "Shift change declined.");
  }

  function scheduleAssignmentPayload(option) {
    const dayNumber = Object.fromEntries(demoData.days.map((day) => [day.name, day.number]));
    const rows = [];
    Object.entries(option.schedule).forEach(([day, record]) => {
      ["AM", "PM"].forEach((shift) => record[shift].forEach((assignment) => rows.push({
        employee_id: assignment.employeeId, work_day: dayNumber[day],
        assignment_type: shift, shift_credits: 1, is_double: assignment.isDouble,
        requires_approval: assignment.requiresApproval, approved: !assignment.requiresApproval,
        notes: assignment.isIcSplit ? "ic_split_floor" : "",
      })));
      record.IC.forEach((assignment) => rows.push({
        employee_id: assignment.employeeId, work_day: dayNumber[day],
        assignment_type: "IC", shift_credits: 2,
        requires_approval: Boolean(assignment.requiresApproval), approved: !assignment.requiresApproval,
        notes: assignment.productionShift && assignment.productionShift !== "FULL" ? `production:${assignment.productionShift};floor:${assignment.floorShift}` : "",
      }));
      record.training.filter((assignment) => assignment.shiftCredits > 0).forEach((assignment) => rows.push({
        employee_id: assignment.employeeId, work_day: dayNumber[day],
        assignment_type: "TRAINING", shift_credits: assignment.shiftCredits, approved: true,
        notes: `${assignment.role || "training"}:${assignment.shift || "FULL"}${assignment.isIcSplit ? ":ic_split" : ""}`,
      }));
    });
    return rows;
  }

  function demoPublishedScheduleRecords(option) {
    const current = currentScheduleTuesday();
    const weeks = [...new Set([current, addDaysToIso(current, 7), addDaysToIso(current, 14), state.settings.weekStart])]
      .filter((weekStart) => weekStart >= current)
      .sort();
    return weeks.slice(0, 4).map((weekStart, index) => {
      const scheduleId = `preview-published-${weekStart}`;
      return {
        id: scheduleId,
        week_start: weekStart,
        status: "published",
        published_at: new Date(Date.now() - index * 60000).toISOString(),
        roster_snapshot: state.team.map((employee) => ({ id: employee.id, code: employee.code, name: employee.name })),
        assignments: scheduleAssignmentPayload(option).map((assignment) => {
          const day = demoData.days.find((item) => item.number === assignment.work_day);
          return {
            ...assignment,
            id: demoAssignmentId(assignment.employee_id, day?.name || assignment.work_day, assignment.assignment_type, weekStart),
            schedule_id: scheduleId,
            coverage_status: "assigned",
          };
        }),
      };
    });
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

    const { data: scheduleId, error } = await supabaseClient.rpc("save_schedule_draft", {
      p_week_start: state.settings.weekStart,
      p_option_number: optionIndex + 1,
      p_score: option.score,
      p_warnings: option.warnings,
      p_assignments: scheduleAssignmentPayload(option),
      p_roster: state.team.map((employee) => ({ id: employee.id, code: employee.code, name: employee.name })),
    });
    if (error) {
      const setupMissing = /save_schedule_draft|schema cache|function/i.test(error.message || "");
      showToast(setupMissing ? "Schedule safety update is missing. Apply the newest Supabase migration first." : `Could not save schedule: ${error.message}`);
      return;
    }
    state.savedScheduleIds[optionIndex] = scheduleId;
    state.selectedOption = optionIndex;
    renderScheduleResults();
    showToast("Schedule and every assignment were saved together as one draft.");
  }

  async function publishScheduleOption(optionIndex) {
    if (state.role !== "manager" || state.mode !== "supabase") return;
    const scheduleId = state.savedScheduleIds[optionIndex];
    if (!scheduleId) {
      showToast("Save this option as a draft first.");
      return;
    }
    const { error } = await supabaseClient.rpc("publish_schedule", { p_schedule_id: scheduleId });
    if (error) {
      const setupMissing = /publish_schedule|schema cache|function/i.test(error.message || "");
      showToast(setupMissing ? "Schedule safety update is missing. Apply the newest Supabase migration first." : `Could not publish schedule: ${error.message}`);
      return;
    }
    state.publishedOption = optionIndex;
    await loadScheduleHistory();
    renderScheduleResults();
    showToast("Schedule published safely; the previous version remains in Records.");
  }

  async function loadScheduleHistory() {
    if (!supabaseClient) return;
    const { data: schedules, error } = await supabaseClient.from("schedules")
      .select("id, week_start, option_number, score, status, warnings, roster_snapshot, created_at, published_at")
      .in("status", ["published", "archived"])
      .order("week_start", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(104);
    if (error) {
      state.scheduleHistory = [];
      return;
    }
    const scheduleIds = (schedules || []).map((schedule) => schedule.id);
    let assignments = [];
    if (scheduleIds.length) {
      const result = await supabaseClient.from("schedule_assignments")
        .select("id, schedule_id, employee_id, work_day, assignment_type, shift_credits, is_double, requires_approval, approved, coverage_status, notes")
        .in("schedule_id", scheduleIds)
        .order("work_day");
      if (!result.error) assignments = result.data || [];
    }
    state.scheduleHistory = (schedules || []).map((schedule) => ({
      ...schedule,
      assignments: assignments.filter((assignment) => assignment.schedule_id === schedule.id),
    }));
    if (state.selectedScheduleRecordId && !findScheduleRecord(state.selectedScheduleRecordId)) state.selectedScheduleRecordId = "";
    if (state.role === "manager") renderRecords();
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

    const { data: directoryRows } = await supabaseClient.from("staff_directory")
      .select("employee_id, display_name, phone_number");
    const directoryByEmployeeId = new Map((directoryRows || []).map((row) => [row.employee_id, row.phone_number]));
    state.staffDirectory = teamRows.filter((employee) => employee.active).map((employee) => ({
      id: employee.id,
      code: employee.employee_code,
      name: employee.display_name,
      phone: directoryByEmployeeId.get(employee.id) || "",
    }));

    const mappedTeam = teamRows.filter((employee) => employee.account_role !== "manager").map((employee) => {
      const recurring = recurringAvailabilityFor(employee);
      const baseAvailability = clone(recurring?.availability || demoData.availability());
      const baseWillingDouble = clone(recurring?.willingDouble || []);
      return {
        id: employee.id,
        code: employee.employee_code,
        name: employee.display_name,
        phone: directoryByEmployeeId.get(employee.id) || recurring?.phone || "",
        schedulePriority: Number(employee.schedule_priority) || recurring?.schedulePriority || (seniorityRank.get(employee.employee_code) ?? state.team.length) + 1,
        minShifts: Number.isFinite(Number(employee.min_shifts)) ? Number(employee.min_shifts) : recurring?.minShifts ?? 2,
        maxShifts: Number.isFinite(Number(employee.max_shifts)) ? Number(employee.max_shifts) : recurring?.maxShifts ?? 4,
        weekdayRequirement: Number.isFinite(Number(employee.weekday_days_required)) ? Number(employee.weekday_days_required) : recurring?.weekdayRequirement ?? 2,
        weekendDaysRequired: Number.isFinite(Number(employee.weekend_days_required))
          ? Number(employee.weekend_days_required)
          : typeof employee.weekend_required === "boolean"
            ? (employee.weekend_required ? 1 : 0)
            : Number(recurring?.weekendDaysRequired ?? (recurring?.weekendRequired ? 1 : 0)),
        skills: employee.employee_skills.map((row) => row.skill),
        submitted: Boolean(recurring),
        willingDouble: clone(baseWillingDouble),
        baseWillingDouble,
        availability: clone(baseAvailability),
        baseAvailability,
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
      employee.notes = request.notes;
      employee.submitted = true;
      employee.submittedAt = request.submitted_at;
      employee.lateRequest = new Date(request.submitted_at).getTime() > requestDeadlineForWeek(request.week_start).getTime();
      employee.requestType = request.request_kind || "weekly_availability";
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
    loadedSettings.priorityOrder = [...state.team]
      .sort((a, b) => a.schedulePriority - b.schedulePriority)
      .map((employee) => employee.code);
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
        weekendPriorityStart: savedSettings.weekend_priority_start || loadedSettings.weekendPriorityStart,
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
    state.publishedSchedules = [];
    state.employeeAssignments = [];
    state.employeeScheduleWeekStart = "";
    state.scheduleHistory = [];
    state.selectedScheduleRecordId = "";
    if (profile.account_role === "manager") {
      await loadScheduleHistory();
    } else {
      const { data: publishedSchedules } = await supabaseClient.from("schedules")
        .select("id, week_start, published_at, roster_snapshot").eq("status", "published")
        .gte("week_start", currentScheduleTuesday())
        .order("week_start", { ascending: true }).limit(8);
      state.publishedSchedules = publishedSchedules || [];
      state.employeeScheduleWeekStart = state.publishedSchedules.find((schedule) => schedule.week_start === currentScheduleTuesday())?.week_start
        || state.publishedSchedules[0]?.week_start
        || currentScheduleTuesday();
      state.publishedSchedule = selectedEmployeeSchedule();
      if (state.publishedSchedules.length) {
        const scheduleIds = state.publishedSchedules.map((schedule) => schedule.id);
        const { data: assignments } = await supabaseClient.from("schedule_assignments")
          .select("id, schedule_id, employee_id, work_day, assignment_type, shift_credits, is_double, requires_approval, approved, coverage_status, notes")
          .in("schedule_id", scheduleIds);
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

    const appProfile = { ...profile, email: session.user.email || "", display_name: profile.display_name, account_role: profile.account_role, skills: state.profileSkills };
    if (isGabrielAccount(appProfile)) await loadLatestSystemHealthCheck(appProfile);
    state.mode = "supabase";
    state.profile = appProfile;
    await loadDateRequestsForPortal({ role: profile.account_role, weekStart: state.settings.weekStart });
    await loadShiftChangeRequests({ role: profile.account_role });
    await loadChatData();
    openApp(appProfile);
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
    state.emergencyContacts = loadEmergencyContacts();
    const previewView = new URLSearchParams(window.location.search).get("preview");
    const previewHost = window.location.hostname === "terminal.local" || window.location.hostname.endsWith(".chatgpt.site");
    const employeePreviewViews = new Set(["employee", "employee-requests", "employee-availability", "employee-contacts", "employee-messages", "it"]);
    const previewMode = previewHost && ["home", "schedule", "priority", "schedule-records", "records", "employee", "employee-requests", "employee-availability", "employee-contacts", "employee-messages", "messages", "inventory", "team", "reports", "it"].includes(previewView);
    if (previewMode) {
      state.mode = "demo";
      const previewByCode = new Map(demoData.team.map((employee) => [employee.code, clone(employee)]));
      loadDemoTeam().forEach((employee) => previewByCode.set(employee.code, employee));
      const previewTeam = [...previewByCode.values()];
      state.team = sortTeamBySeniority(previewTeam.filter((employee) => activeSeniorityCodes.has(employee.code))).map((employee) => ({
        ...employee,
        baseAvailability: clone(employee.baseAvailability || employee.availability),
        baseWillingDouble: clone(employee.baseWillingDouble || employee.willingDouble || []),
      }));
      state.staffDirectory = state.team.map(({ id, code, name, phone }) => ({ id, code, name, phone }));
      state.dateRequests = loadDemoDateRequests();
      state.shiftChangeRequests = loadDemoShiftChanges();
      state.hiddenTeam = previewTeam
        .filter((employee) => !activeSeniorityCodes.has(employee.code))
        .map((employee) => ({ ...employee, active: false, hasLogin: true }))
        .sort((a, b) => a.name.localeCompare(b.name));
      state.scheduleModuleView = previewView === "priority" ? "priority" : "availability";
      const previewSchedules = scheduler.generateOptions(state.team, state.settings, 2);
      state.scheduleHistory = previewSchedules.map((option, index) => {
        const week = new Date(`${state.settings.weekStart}T12:00:00`);
        week.setDate(week.getDate() - ((index + 1) * 7));
        const weekStart = week.toISOString().slice(0, 10);
        const savedAt = new Date(Date.now() - ((index + 1) * 7 * 86400000)).toISOString();
        return {
          id: `preview-schedule-${index + 1}`,
          week_start: weekStart,
          option_number: index + 1,
          score: option.score,
          status: index === 0 ? "published" : "archived",
          warnings: option.warnings,
          roster_snapshot: state.team.map((employee) => ({ id: employee.id, code: employee.code, name: employee.name })),
          assignments: scheduleAssignmentPayload(option).map((assignment) => {
            const day = demoData.days.find((item) => item.number === assignment.work_day);
            return { ...assignment, id: demoAssignmentId(assignment.employee_id, day?.name || assignment.work_day, assignment.assignment_type), schedule_id: `preview-schedule-${index + 1}` };
          }),
          created_at: savedAt,
          published_at: savedAt,
        };
      });
      if (["home", "team", "inventory", "records", "schedule-records", "reports"].includes(previewView)) loadInventoryPreviewData();
      if (previewView === "team" && !state.emergencyContacts["demo-paul"]) {
        state.emergencyContacts["demo-paul"] = { name: "Sample Contact", relationship: "Mother", phone: "(415) 555-0142" };
      }
      if (employeePreviewViews.has(previewView)) {
        state.role = "manager";
        syncSchedulingPolicy();
        state.options = scheduler.generateOptions(state.team, state.settings, 1);
        state.publishedOption = 0;
        state.publishedSchedules = demoPublishedScheduleRecords(state.options[0]);
        state.employeeAssignments = state.publishedSchedules.flatMap((schedule) => schedule.assignments);
        state.employeeScheduleWeekStart = currentScheduleTuesday();
        state.publishedSchedule = selectedEmployeeSchedule();
        state.employeePortalView = previewView === "employee-requests" ? "requests" : previewView === "employee-availability" ? "availability" : previewView === "employee-contacts" ? "contacts" : previewView === "it" ? "it" : "schedule";
        state.isItPreview = previewView === "it";
        openApp(previewView === "it"
          ? { id: "demo-gabriel", employee_code: "GABRIEL01", email: "gsilva0r.sf@gmail.com", display_name: "Gabriel", account_role: "employee", skills: ["ic_maker", "trainer"] }
          : { id: "demo-gianna", employee_code: "GIANNA01", display_name: "Gianna", account_role: "employee", skills: [] });
      } else {
        openApp({ id: "preview-manager", employee_code: "SWENSENSMANAGER", display_name: "Manager Preview", account_role: "manager", skills: ["manager"] });
      }
      navigate(["home", "team"].includes(previewView) ? "home" : previewView === "inventory" ? "inventory" : ["records", "schedule-records"].includes(previewView) ? "records" : previewView === "reports" ? "reports" : ["messages", "employee-messages"].includes(previewView) ? "messages" : "schedule");
      if (previewView === "team") document.querySelector("#homeTeamDrawer").open = true;
      if (previewView === "reports") loadInventoryReport();
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
  elements.removeEmergencyContact.addEventListener("click", removeEmergencyContact);
  elements.emergencyContactDialog.addEventListener("cancel", () => {
    state.emergencyContactEmployeeId = "";
  });
  elements.showEmployeeAccountForm.addEventListener("click", () => {
    state.showingEmployeeAccountForm = !state.showingEmployeeAccountForm;
    renderEmployeeAccountManager();
    if (state.showingEmployeeAccountForm) document.querySelector('#employeeAccountForm input[name="displayName"]')?.focus();
  });
  document.querySelector("#generateButtonTop").addEventListener("click", generateSchedules);

  document.addEventListener("click", (event) => {
    const healthCheckButton = event.target.closest("[data-run-database-health-check]");
    if (healthCheckButton) {
      runDatabaseHealthCheck();
      return;
    }

    const employeePortalTab = event.target.closest("[data-employee-portal-view]");
    if (employeePortalTab && state.role !== "manager") {
      state.employeePortalView = employeePortalTab.dataset.employeePortalView;
      renderEmployeePortal();
      return;
    }

    if (event.target.closest("[data-new-chat]")) {
      state.newChatOpen = true;
      state.mobileMessagesThreadOpen = false;
      renderMessages();
      window.setTimeout(() => document.querySelector("#newChatForm")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
      return;
    }

    if (event.target.closest("[data-close-new-chat]")) {
      state.newChatOpen = false;
      renderMessages();
      return;
    }

    if (event.target.closest("[data-chat-back]")) {
      state.mobileMessagesThreadOpen = false;
      renderMessages();
      return;
    }

    const chatPersonButton = event.target.closest("[data-chat-person]");
    if (chatPersonButton) {
      openDirectChat(chatPersonButton.dataset.chatPerson);
      return;
    }

    const chatThreadButton = event.target.closest("[data-chat-thread]");
    if (chatThreadButton) {
      state.activeChatThreadId = chatThreadButton.dataset.chatThread;
      state.newChatOpen = false;
      state.mobileMessagesThreadOpen = true;
      renderMessages();
      return;
    }

    const employeeScheduleWeekButton = event.target.closest("[data-employee-schedule-week]");
    if (employeeScheduleWeekButton && state.role !== "manager") {
      state.employeeScheduleWeekStart = employeeScheduleWeekButton.dataset.employeeScheduleWeek;
      state.publishedSchedule = selectedEmployeeSchedule();
      state.shiftChangeAssignmentId = "";
      renderEmployeePortal();
      return;
    }

    const openShiftChangeButton = event.target.closest("[data-open-shift-change]");
    if (openShiftChangeButton && state.role !== "manager") {
      state.shiftChangeAssignmentId = openShiftChangeButton.dataset.openShiftChange;
      state.shiftChangeType = "cover";
      renderEmployeePortal();
      window.setTimeout(() => document.querySelector("#shiftChangePanel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
      return;
    }

    if (event.target.closest("[data-close-shift-change]") && state.role !== "manager") {
      state.shiftChangeAssignmentId = "";
      state.shiftChangeType = "cover";
      renderEmployeePortal();
      return;
    }

    const coverOfferButton = event.target.closest("[data-offer-shift-cover]");
    if (coverOfferButton && state.role !== "manager") {
      offerShiftCover(coverOfferButton.dataset.offerShiftCover);
      return;
    }

    const swapResponseButton = event.target.closest("[data-respond-swap][data-shift-request-id]");
    if (swapResponseButton && state.role !== "manager") {
      respondToShiftSwap(swapResponseButton.dataset.shiftRequestId, swapResponseButton.dataset.respondSwap);
      return;
    }

    const shiftReviewButton = event.target.closest("[data-review-shift-change][data-shift-request-id]");
    if (shiftReviewButton && state.role === "manager") {
      reviewShiftChangeRequest(shiftReviewButton.dataset.shiftRequestId, shiftReviewButton.dataset.reviewShiftChange);
      return;
    }

    const requestWeekButton = event.target.closest("[data-request-week]");
    if (requestWeekButton && state.role !== "manager") {
      state.requestCalendarWeekStart = requestWeekButton.dataset.requestWeek;
      state.requestDraftWeekStart = "";
      renderEmployeePortal();
      return;
    }

    const requestDateButton = event.target.closest("[data-request-date]");
    if (requestDateButton && state.role !== "manager") {
      const requestDate = requestDateButton.dataset.requestDate;
      if (!state.requestDraftDates[requestDate]) state.requestDraftDates[requestDate] = "ALL_DAY";
      state.activeRequestDate = requestDate;
      renderEmployeePortal();
      return;
    }

    const requestScopeButton = event.target.closest("[data-request-scope]");
    if (requestScopeButton && state.role !== "manager" && state.activeRequestDate) {
      state.requestDraftDates[state.activeRequestDate] = requestScopeButton.dataset.requestScope;
      renderEmployeePortal();
      return;
    }

    const removeRequestDateButton = event.target.closest("[data-remove-request-date]");
    if (removeRequestDateButton && state.role !== "manager") {
      delete state.requestDraftDates[removeRequestDateButton.dataset.removeRequestDate];
      state.activeRequestDate = Object.keys(state.requestDraftDates).sort()[0] || "";
      renderEmployeePortal();
      return;
    }

    const emergencyContactButton = event.target.closest("[data-emergency-contact]");
    if (emergencyContactButton) {
      openEmergencyContactDialog(emergencyContactButton.dataset.emergencyContact);
      return;
    }
    if (event.target.closest("[data-close-emergency-contact]")) {
      closeEmergencyContactDialog();
      return;
    }

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

    if (event.target.closest("[data-edit-priority]") && state.role === "manager") {
      beginPriorityEdit();
      return;
    }

    if (event.target.closest("[data-cancel-priority]") && state.role === "manager") {
      cancelPriorityEdit();
      return;
    }

    if (event.target.closest("[data-save-priority]") && state.role === "manager") {
      saveSchedulingPolicy();
      return;
    }

    if (event.target.closest("[data-open-availability-rules]") && state.role === "manager") {
      state.scheduleModuleView = "availability";
      renderAvailabilityMatrix();
      renderScheduleModule();
      window.setTimeout(() => document.querySelector(".availability-employee-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
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
    const viewScheduleRecordButton = event.target.closest("[data-view-schedule-record]");
    if (viewScheduleRecordButton) {
      state.selectedScheduleRecordId = viewScheduleRecordButton.dataset.viewScheduleRecord;
      renderRecords();
      window.setTimeout(() => document.querySelector("#selectedScheduleRecord")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      return;
    }
    if (event.target.closest("[data-close-schedule-record]")) {
      state.selectedScheduleRecordId = "";
      renderRecords();
      return;
    }
    const printScheduleRecordButton = event.target.closest("[data-print-schedule-record]");
    if (printScheduleRecordButton) {
      printScheduleRecord(printScheduleRecordButton.dataset.printScheduleRecord);
      return;
    }
    const downloadScheduleRecordButton = event.target.closest("[data-download-schedule-record]");
    if (downloadScheduleRecordButton) {
      downloadScheduleRecord(downloadScheduleRecordButton.dataset.downloadScheduleRecord);
      return;
    }
    if (navButton) {
      if (state.role === "manager" && navButton.dataset.nav === "schedule") {
        state.scheduleModuleView = "availability";
        renderAvailabilityMatrix();
        renderScheduleModule();
      }
      navigate(navButton.dataset.nav);
      if (navButton.dataset.nav === "messages") renderMessages();
      if (state.role === "manager" && navButton.dataset.nav === "records") renderRecords();
      if (state.role === "manager" && navButton.dataset.nav === "reports" && !state.reportData && !state.reportLoading) loadInventoryReport();
    }

    const reportPreset = event.target.closest("[data-report-preset]");
    if (reportPreset && state.role === "manager") {
      setReportPreset(reportPreset.dataset.reportPreset);
      return;
    }

    if (event.target.closest("[data-download-report]")) {
      downloadInventoryReport();
      return;
    }

    if (event.target.closest("[data-open-half-gallon-refill]")) {
      state.inventoryEntryMode = "usage_half_gallon";
      renderInventory();
      navigate("inventory");
      window.setTimeout(() => document.querySelector("#inventoryEntryForm")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      return;
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
      navigate("inventory");
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

  document.addEventListener("pointerdown", (event) => {
    const handle = event.target.closest("[data-priority-drag-handle]");
    if (handle) {
      startPriorityPointerDrag(event, handle);
      return;
    }
    const source = event.target.closest("[data-priority-drag-source]");
    if (source) beginPriorityPointerPress(event, source);
  });
  document.addEventListener("contextmenu", (event) => {
    if (isMobilePriorityMode() && event.target.closest("[data-priority-drag-source]")) event.preventDefault();
  });
  document.addEventListener("pointermove", updatePriorityPointerDrag, { passive: false });
  document.addEventListener("pointerup", (event) => {
    if (priorityPointerPress && event.pointerId === priorityPointerPress.pointerId) cancelPriorityPointerPress();
    if (priorityPointerDrag && event.pointerId === priorityPointerDrag.pointerId) finishPriorityPointerDrag(false);
  });
  document.addEventListener("pointercancel", (event) => {
    if (priorityPointerPress && event.pointerId === priorityPointerPress.pointerId) cancelPriorityPointerPress();
    if (priorityPointerDrag && event.pointerId === priorityPointerDrag.pointerId) finishPriorityPointerDrag(true);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden || state.mode !== "supabase") return;
    refreshChatData();
    refreshInventoryData();
  });
  document.addEventListener("keydown", (event) => {
    const handle = event.target.closest("[data-priority-drag-handle][data-priority-code]");
    if (!handle || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
    if (movePriorityCode(handle.dataset.priorityCode, event.key === "ArrowUp" ? -1 : 1)) event.preventDefault();
  });

  document.addEventListener("change", async (event) => {
    if (event.target.matches('#shiftChangeForm input[name="shiftChangeType"]')) {
      state.shiftChangeType = event.target.value;
      const form = event.target.closest("#shiftChangeForm");
      form.dataset.shiftChangeMode = state.shiftChangeType;
      form.querySelectorAll(".shift-change-choice").forEach((choice) => choice.classList.toggle("active", choice.contains(event.target)));
      const swapTarget = form.querySelector("[data-swap-target]");
      const select = swapTarget?.querySelector("select");
      if (swapTarget) swapTarget.hidden = state.shiftChangeType !== "swap";
      if (select) select.disabled = state.shiftChangeType !== "swap";
      const submit = form.querySelector('button[type="submit"]');
      if (submit) submit.textContent = state.shiftChangeType === "call_off" ? "Send emergency alert" : "Send request";
      const note = form.querySelector(".shift-change-submit-row p");
      if (note) note.textContent = state.shiftChangeType === "call_off" ? "This sends an urgent in-app manager alert. Also call the store if the shift is soon." : "A manager must approve any final coverage or swap.";
      return;
    }
    const policyCode = event.target.dataset.policyMin || event.target.dataset.policyMax || event.target.dataset.policyWeekdays || event.target.dataset.policyWeekendDays;
    if (policyCode && state.role === "manager") {
      const employee = state.team.find((item) => item.code === policyCode);
      if (!employee) return;
      if (event.target.matches("[data-policy-min]")) {
        employee.minShifts = Number(event.target.value);
        if (employee.maxShifts < employee.minShifts) employee.maxShifts = employee.minShifts;
      }
      if (event.target.matches("[data-policy-max]")) {
        employee.maxShifts = Number(event.target.value);
        if (employee.minShifts > employee.maxShifts) employee.minShifts = employee.maxShifts;
      }
      if (event.target.matches("[data-policy-weekdays]")) employee.weekdayRequirement = Number(event.target.value);
      if (event.target.matches("[data-policy-weekend-days]")) {
        employee.weekendDaysRequired = Number(event.target.value);
        employee.weekendRequired = employee.weekendDaysRequired > 0;
      }
      renderAvailabilityMatrix();
      return;
    }
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
      if (state.mode === "supabase" && state.role === "manager") await refreshWeeklyRequests();
      renderAvailabilityMatrix();
      renderRequests();
      renderScheduleModule();
    }
    if (event.target.id === "dateRequestKind") state.dateRequestKind = event.target.value;
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
    if (event.target.matches("[data-availability-note]")) {
      const employeeId = event.target.dataset.availabilityNote;
      const employee = state.team.find((item) => item.id === employeeId);
      if (employee) {
        employee.notes = event.target.value;
      }
    }
    if (event.target.matches("[data-scan-note]")) state.inventoryScanUserNote = event.target.value;
    if (event.target.matches("[data-production-note]")) state.productionScanUserNote = event.target.value;
    if (event.target.id === "dateRequestNotes") state.dateRequestNotes = event.target.value;
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
    if (event.target.id === "newChatForm") {
      event.preventDefault();
      createChat(event.target);
      return;
    }
    if (event.target.id === "chatMessageForm") {
      event.preventDefault();
      sendChatMessage(event.target);
      return;
    }
    if (event.target.id === "reportRangeForm") {
      event.preventDefault();
      const formData = new FormData(event.target);
      state.reportStart = String(formData.get("reportStart") || "");
      state.reportEnd = String(formData.get("reportEnd") || "");
      state.reportData = null;
      loadInventoryReport();
      return;
    }
    if (event.target.id === "emergencyContactForm") {
      event.preventDefault();
      saveEmergencyContact(event.target);
      return;
    }
    if (event.target.id === "requestForm") {
      event.preventDefault();
      saveRequest(event.target);
    }
    if (event.target.id === "dateRequestForm") {
      event.preventDefault();
      saveDateRequests(event.target);
    }
    if (event.target.id === "shiftChangeForm") {
      event.preventDefault();
      submitShiftChangeRequest(event.target);
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
