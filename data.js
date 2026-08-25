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
      id: "demo-cherie", code: "CHERIE01", name: "Cherie", minDays: 3, maxDays: 4,
      skills: ["key_holder"], submitted: true, willingDouble: ["Friday", "Saturday"],
      availability: availability(),
    },
    {
      id: "demo-paul", code: "PAUL01", name: "Paul", minDays: 3, maxDays: 4,
      skills: ["key_holder"], submitted: true, willingDouble: ["Friday", "Saturday"],
      availability: availability(), avoidDays: ["Sunday"],
      notes: "Prefers not to work Sunday.",
    },
    {
      id: "demo-capp", code: "CAPP01", name: "Capp", minDays: 2, maxDays: 4,
      skills: [], submitted: true, willingDouble: ["Saturday"], availability: availability([], ["Friday-PM"]),
    },
    {
      id: "demo-andrew", code: "ANDREW01", name: "Andrew", minDays: 1, maxDays: 2,
      skills: ["key_holder"], submitted: true, willingDouble: [],
      availability: availability(["Tuesday-AM", "Tuesday-PM", "Wednesday-AM", "Wednesday-PM", "Friday-AM", "Friday-PM", "Saturday-AM", "Saturday-PM"]),
    },
    {
      id: "demo-christopher", code: "CHRISTOPHER01", name: "Christopher", minDays: 1, maxDays: 3,
      skills: [], submitted: true, willingDouble: ["Sunday"],
      availability: availability(),
    },
    {
      id: "demo-dania", code: "DANIA01", name: "Dania", minDays: 4, maxDays: 5,
      skills: ["key_holder", "trainer"], submitted: true, willingDouble: ["Thursday"],
      availability: availability(["Tuesday-AM", "Thursday-PM", "Sunday-AM", "Sunday-PM"]),
    },
    {
      id: "demo-evelyn", code: "EVELYN01", name: "Evelyn", minDays: 1, maxDays: 2,
      skills: ["key_holder", "trainer"], submitted: true, willingDouble: ["Sunday"],
      availability: availability(["Tuesday-AM", "Tuesday-PM", "Wednesday-AM", "Wednesday-PM", "Thursday-AM", "Thursday-PM", "Friday-AM", "Friday-PM"]),
    },
    {
      id: "demo-gabriel", code: "GABRIEL01", name: "Gabriel", minDays: 5, maxDays: 6,
      skills: ["manager", "key_holder", "ic_maker", "trainer"], submitted: true,
      willingDouble: ["Tuesday", "Thursday", "Friday", "Saturday", "Sunday"],
      availability: availability(["Wednesday-AM", "Wednesday-PM", "Thursday-PM", "Friday-PM", "Saturday-AM", "Saturday-PM"]),
    },
    {
      id: "demo-israel", code: "ISRAEL01", name: "Israel", minDays: 4, maxDays: 5,
      skills: ["manager", "key_holder", "ic_maker", "trainer"], submitted: true,
      willingDouble: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      availability: availability(), maxWeekendDays: 1,
      notes: "Hard rule: schedule no more than one weekend day.",
    },
    {
      id: "demo-juliette", code: "JULIETTE01", name: "Juliette", minDays: 1, maxDays: 2,
      skills: ["key_holder"], submitted: true, willingDouble: ["Saturday"],
      availability: availability(["Tuesday-AM", "Wednesday-AM", "Thursday-AM", "Friday-AM", "Sunday-AM"]),
    },
    {
      id: "demo-mia", code: "MIA01", name: "Mia", minDays: 2, maxDays: 4,
      skills: [], submitted: true, willingDouble: ["Friday", "Sunday"], availability: availability(),
    },
    {
      id: "demo-nora", code: "NORA01", name: "Nora", minDays: 2, maxDays: 4,
      skills: ["key_holder"], submitted: false, willingDouble: [], availability: availability(),
    },
    {
      id: "demo-rory", code: "RORY01", name: "Rory", minDays: 1, maxDays: 2,
      skills: ["key_holder"], submitted: true, willingDouble: ["Sunday"],
      availability: availability(["Tuesday-AM", "Tuesday-PM", "Thursday-AM", "Thursday-PM"]),
    },
    {
      id: "demo-ryan", code: "RYAN01", name: "Ryan", minDays: 2, maxDays: 3,
      skills: [], submitted: true, willingDouble: ["Saturday"],
      availability: availability(["Tuesday-AM", "Wednesday-AM", "Wednesday-PM", "Thursday-AM"]),
    },
    {
      id: "demo-gianna", code: "GIANNA01", name: "Gianna", minDays: 1, maxDays: 2,
      skills: [], submitted: true, willingDouble: [],
      availability: availability(["Tuesday-AM", "Wednesday-AM", "Thursday-AM", "Friday-AM", "Saturday-PM", "Sunday-PM"]),
    },
  ];

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

  window.SWENSENS = {
    days,
    team,
    availability,
    nextTuesday,
    isoDate,
    defaultSettings: {
      weekStart: isoDate(nextTuesday()),
      icTarget: 3,
      allowConsecutiveIC: false,
      staffing: Object.fromEntries(days.map((day) => [day.name, {
        AM: day.amNeed,
        PM: day.pmNeed,
      }])),
      trainingEnabled: true,
      traineeId: "demo-gianna",
      trainingSkill: "store_operations",
    },
  };
})();
