(function () {
  const days = [
    { name: "Tuesday", short: "Tue", number: 2, amNeed: 2, pmNeed: 3 },
    { name: "Wednesday", short: "Wed", number: 3, amNeed: 2, pmNeed: 3 },
    { name: "Thursday", short: "Thu", number: 4, amNeed: 2, pmNeed: 3 },
    { name: "Friday", short: "Fri", number: 5, amNeed: 3, pmNeed: 4 },
    { name: "Saturday", short: "Sat", number: 6, amNeed: 3, pmNeed: 4 },
    { name: "Sunday", short: "Sun", number: 7, amNeed: 3, pmNeed: 4 },
  ];

  function availability(unavailable = [], preferred = []) {
    const result = {};
    days.forEach((day) => {
      result[day.name] = { AM: "available", PM: "available" };
    });
    unavailable.forEach((slot) => {
      const [day, shift] = slot.split("-");
      if (result[day]) result[day][shift] = "unavailable";
    });
    preferred.forEach((slot) => {
      const [day, shift] = slot.split("-");
      if (result[day]) result[day][shift] = "preferred";
    });
    return result;
  }

  const team = [
    {
      id: "demo-cherie", code: "CHERIE01", name: "Cherie", schedulePriority: 2, phone: "(415) 555-0102",
      skills: ["key_holder"], submitted: true, willingDouble: ["Friday", "Saturday"],
      availability: availability(),
    },
    {
      id: "demo-paul", code: "PAUL01", name: "Paul", schedulePriority: 1, phone: "(415) 555-0101",
      skills: ["key_holder"], submitted: true, willingDouble: ["Friday", "Saturday"],
      availability: availability(), avoidDays: ["Sunday"],
      notes: "Prefers not to work Sunday.",
    },
    {
      id: "demo-capp", code: "CAPP01", name: "Capp", schedulePriority: 50, phone: "(415) 555-0150",
      skills: [], submitted: true, willingDouble: ["Saturday"], availability: availability([], ["Friday-PM"]),
    },
    {
      id: "demo-andrew", code: "ANDREW01", name: "Andrew", schedulePriority: 10, phone: "(415) 555-0110",
      skills: ["key_holder"], submitted: true, willingDouble: [],
      availability: availability(["Tuesday-AM", "Tuesday-PM", "Wednesday-AM", "Wednesday-PM", "Friday-AM", "Friday-PM", "Saturday-AM", "Saturday-PM"]),
    },
    {
      id: "demo-christopher", code: "CHRISTOPHER01", name: "Christopher", schedulePriority: 9, phone: "(415) 555-0109",
      skills: [], submitted: true, willingDouble: ["Sunday"],
      availability: availability(),
    },
    {
      id: "demo-dania", code: "DANIA01", name: "Dania", schedulePriority: 7, phone: "(415) 555-0107",
      skills: ["key_holder", "trainer"], submitted: true, willingDouble: ["Thursday"],
      availability: availability(["Tuesday-AM", "Thursday-PM", "Sunday-AM", "Sunday-PM"]),
    },
    {
      id: "demo-evelyn", code: "EVELYN01", name: "Evelyn", schedulePriority: 6, phone: "(415) 555-0106",
      skills: ["key_holder", "trainer"], submitted: true, willingDouble: ["Sunday"],
      availability: availability(["Tuesday-AM", "Tuesday-PM", "Wednesday-AM", "Wednesday-PM", "Thursday-AM", "Thursday-PM", "Friday-AM", "Friday-PM"]),
    },
    {
      id: "demo-gabriel", code: "GABRIEL01", name: "Gabriel", schedulePriority: 3, phone: "(415) 555-0103",
      skills: ["manager", "key_holder", "ic_maker", "trainer"], submitted: true,
      willingDouble: ["Tuesday", "Thursday", "Friday", "Saturday", "Sunday"],
      availability: availability(["Wednesday-AM", "Wednesday-PM", "Thursday-PM", "Friday-PM", "Saturday-AM", "Saturday-PM"]),
    },
    {
      id: "demo-israel", code: "ISRAEL01", name: "Israel", schedulePriority: 4, phone: "(415) 555-0104",
      skills: ["manager", "key_holder", "ic_maker", "trainer"], submitted: true,
      willingDouble: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      availability: availability(), maxWeekendDays: 1,
      notes: "Hard rule: schedule no more than one weekend day.",
    },
    {
      id: "demo-juliette", code: "JULIETTE01", name: "Juliette", schedulePriority: 8, phone: "(415) 555-0108",
      skills: ["key_holder"], submitted: true, willingDouble: ["Saturday"],
      availability: availability(["Tuesday-AM", "Wednesday-AM", "Thursday-AM", "Friday-AM", "Sunday-AM"]),
    },
    {
      id: "demo-mia", code: "MIA01", name: "Mia", schedulePriority: 51, phone: "(415) 555-0151",
      skills: [], submitted: true, willingDouble: ["Friday", "Sunday"], availability: availability(),
    },
    {
      id: "demo-nora", code: "NORA01", name: "Nora", schedulePriority: 52, phone: "(415) 555-0152",
      skills: ["key_holder"], submitted: false, willingDouble: [], availability: availability(),
    },
    {
      id: "demo-rory", code: "RORY01", name: "Rory", schedulePriority: 5, phone: "(415) 555-0105",
      skills: ["key_holder"], submitted: true, willingDouble: ["Sunday"],
      availability: availability(["Tuesday-AM", "Tuesday-PM", "Thursday-AM", "Thursday-PM"]),
    },
    {
      id: "demo-ryan", code: "RYAN01", name: "Ryan", schedulePriority: 11, phone: "(415) 555-0111",
      skills: [], submitted: true, willingDouble: ["Saturday"],
      availability: availability(["Tuesday-AM", "Wednesday-AM", "Wednesday-PM", "Thursday-AM"]),
      requestType: "time_off", lateRequest: true, submittedAt: "2026-09-18T18:30:00.000Z",
    },
    {
      id: "demo-gianna", code: "GIANNA01", name: "Gianna", schedulePriority: 12, phone: "(415) 555-0112",
      skills: [], submitted: true, willingDouble: [],
      availability: availability(["Tuesday-AM", "Wednesday-AM", "Thursday-AM", "Friday-AM", "Saturday-PM", "Sunday-PM"]),
      requestType: "weekly_availability", trainingTargetDays: 3,
    },
  ];

  const managerPolicies = {
    PAUL01: { minShifts: 3, maxShifts: 5, weekdayRequirement: 2, weekendRequired: false },
    CHERIE01: { minShifts: 3, maxShifts: 5, weekdayRequirement: 2, weekendRequired: false },
    GABRIEL01: { minShifts: 3, maxShifts: 5, weekdayRequirement: 2, weekendRequired: false },
    ISRAEL01: { minShifts: 3, maxShifts: 5, weekdayRequirement: 2, weekendRequired: false },
    RORY01: { minShifts: 2, maxShifts: 4, weekdayRequirement: 2, weekendRequired: true },
    EVELYN01: { minShifts: 2, maxShifts: 4, weekdayRequirement: 0, weekendRequired: true },
    DANIA01: { minShifts: 2, maxShifts: 4, weekdayRequirement: 2, weekendRequired: true },
    JULIETTE01: { minShifts: 1, maxShifts: 3, weekdayRequirement: 1, weekendRequired: true },
    CHRISTOPHER01: { minShifts: 2, maxShifts: 4, weekdayRequirement: 2, weekendRequired: true },
    ANDREW01: { minShifts: 1, maxShifts: 2, weekdayRequirement: 1, weekendRequired: true },
    RYAN01: { minShifts: 2, maxShifts: 4, weekdayRequirement: 2, weekendRequired: true },
    GIANNA01: { minShifts: 3, maxShifts: 4, weekdayRequirement: 2, weekendRequired: true },
  };

  team.forEach((employee) => {
    Object.assign(employee, {
      minShifts: 2,
      maxShifts: 4,
      weekdayRequirement: 2,
      weekendRequired: employee.schedulePriority >= 9,
    }, managerPolicies[employee.code] || {});
  });

  function nextTuesday(date = new Date()) {
    const result = new Date(date);
    result.setHours(12, 0, 0, 0);
    const day = result.getDay();
    let add = (2 - day + 7) % 7;
    if (add === 0 && result.getHours() >= 0) add = 7;
    result.setDate(result.getDate() + add);
    return result;
  }

  function isoDate(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function nextRequestTuesday(date = new Date()) {
    const result = nextTuesday(date);
    result.setDate(result.getDate() + 7);
    return result;
  }

  window.SWENSENS = {
    days,
    team,
    availability,
    nextTuesday,
    isoDate,
    defaultSettings: {
      weekStart: isoDate(nextRequestTuesday()),
      icTarget: 3,
      allowConsecutiveIC: false,
      staffing: Object.fromEntries(days.map((day) => [day.name, {
        AM: day.amNeed,
        PM: day.pmNeed,
      }])),
      trainingEnabled: true,
      traineeId: "demo-gianna",
      trainingSkill: "store_operations",
      weekendPriorityStart: 9,
      priorityOrder: ["PAUL01", "CHERIE01", "GABRIEL01", "ISRAEL01", "RORY01", "EVELYN01", "DANIA01", "JULIETTE01", "CHRISTOPHER01", "ANDREW01", "RYAN01", "GIANNA01"],
    },
  };
})();
