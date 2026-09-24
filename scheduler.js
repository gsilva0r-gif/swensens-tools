(function () {
  function combinations(items, count, start = 0, chosen = [], results = []) {
    if (chosen.length === count) {
      results.push([...chosen]);
      return results;
    }
    for (let index = start; index <= items.length - (count - chosen.length); index += 1) {
      chosen.push(items[index]);
      combinations(items, count, index + 1, chosen, results);
      chosen.pop();
    }
    return results;
  }

  function adjacentPairs(pattern, numberByDay) {
    return pattern.slice(1).flatMap((day, index) =>
      numberByDay[day] - numberByDay[pattern[index]] === 1
        ? [[pattern[index], day]]
        : []
    );
  }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return function random() {
      value += 0x6d2b79f5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hasSkill(employee, skill) {
    return employee.skills.includes(skill);
  }

  function storeTrainerRank(employee) {
    if (employee.code === "ISRAEL01") return 0;
    if (employee.code === "GABRIEL01") return 1;
    if (employee.code === "EVELYN01" || employee.code === "DANIA01") return 2;
    return 3;
  }

  function canWork(employee, day, shift) {
    return (employee.availability?.[day]?.[shift] || "available") !== "unavailable";
  }

  function generateOne(team, settings, seed) {
    const random = seededRandom(seed);
    const employees = team.map((employee) => ({
      ...employee,
      skills: [...employee.skills],
      minShifts: Math.max(0, Math.min(6, Number(employee.minShifts) || 0)),
      maxShifts: Math.max(1, Math.min(6, Number(employee.maxShifts) || 6)),
      weekdayRequirement: Math.max(0, Math.min(3, Number(employee.weekdayRequirement) || 0)),
      weekendDaysRequired: Math.max(0, Math.min(2, Number.isFinite(Number(employee.weekendDaysRequired))
        ? Number(employee.weekendDaysRequired)
        : employee.weekendRequired ? 1 : 0)),
      credits: 0,
      estimatedHours: 0,
      dayCount: {},
      daysWorked: new Set(),
    }));
    const byId = new Map(employees.map((employee) => [employee.id, employee]));
    const warnings = [];
    const days = window.SWENSENS.days;
    const schedule = Object.fromEntries(days.map((day) => [day.name, {
      AM: [], PM: [], IC: [], training: [], pendingDoubles: [],
    }]));
    const specialByDay = Object.fromEntries(days.map((day) => [day.name, new Set()]));

    function addWarning(type, text, severity = "warning") {
      warnings.push({ type, text, severity });
    }

    function preference(employee, day, shift) {
      return employee.availability?.[day]?.[shift] || "available";
    }

    function canAddWorkDay(employee, day) {
      if (employee.daysWorked.has(day)) return true;
      const businessDayCap = Number.isFinite(employee.businessDayCap) ? employee.businessDayCap : days.length;
      const managerDayCap = Number.isFinite(employee.maxShifts) ? employee.maxShifts : days.length;
      if (employee.daysWorked.size >= Math.min(businessDayCap, managerDayCap)) return false;
      if (["Friday", "Saturday", "Sunday"].includes(day) && Number.isFinite(employee.maxWeekendDays)) {
        const weekendDaysWorked = ["Friday", "Saturday", "Sunday"].filter((weekendDay) => employee.daysWorked.has(weekendDay)).length;
        if (weekendDaysWorked >= employee.maxWeekendDays) return false;
      }
      return true;
    }

    function addCredits(employee, day, credits, hours) {
      employee.credits += credits;
      employee.estimatedHours += hours;
      employee.dayCount[day] = (employee.dayCount[day] || 0) + credits;
      employee.daysWorked.add(day);
    }

    function chooseBalanced(candidates, day, shift) {
      const shuffled = [...candidates].sort(() => random() - 0.5);
      shuffled.sort((a, b) => {
        const aPreferred = preference(a, day, shift) === "preferred" ? 1 : 0;
        const bPreferred = preference(b, day, shift) === "preferred" ? 1 : 0;
        if (aPreferred !== bPreferred) return bPreferred - aPreferred;
        const aAvoidsDay = a.avoidDays?.includes(day) ? 1 : 0;
        const bAvoidsDay = b.avoidDays?.includes(day) ? 1 : 0;
        if (aAvoidsDay !== bAvoidsDay) return aAvoidsDay - bAvoidsDay;
        const aBelowMinimum = a.daysWorked.size < a.minShifts ? 1 : 0;
        const bBelowMinimum = b.daysWorked.size < b.minShifts ? 1 : 0;
        if (aBelowMinimum !== bBelowMinimum) return bBelowMinimum - aBelowMinimum;
        const aPriority = Number.isFinite(a.schedulePriority) ? a.schedulePriority : Number.MAX_SAFE_INTEGER;
        const bPriority = Number.isFinite(b.schedulePriority) ? b.schedulePriority : Number.MAX_SAFE_INTEGER;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return a.daysWorked.size - b.daysWorked.size || a.credits - b.credits;
      });
      return shuffled[0] || null;
    }

    function assignedIc(employee, day) {
      return schedule[day].IC.find((assignment) => assignment.employeeId === employee.id) || null;
    }

    function markIcSplitDuty(employee, day, floorShift, reason = "coverage") {
      const icAssignment = assignedIc(employee, day);
      if (!icAssignment || icAssignment.floorShift) return false;
      icAssignment.floorShift = floorShift;
      icAssignment.productionShift = floorShift === "AM" ? "PM" : "AM";
      icAssignment.requiresApproval = true;
      const floorName = floorShift === "AM" ? "morning" : "night";
      const productionName = icAssignment.productionShift === "AM" ? "morning" : "night";
      const reasonCopy = reason === "training" ? "so training can happen" : "to protect floor coverage";
      addWarning("ic-split-duty", `${day}: ${employee.name} makes IC in the ${productionName} and works the ${floorName} shift ${reasonCopy}. Last-resort manager approval required.`, "approval");
      return true;
    }

    function chooseRegular(day, shift, requireKey) {
      const alreadyInShift = new Set(schedule[day][shift].map((assignment) => assignment.employeeId));
      let candidates = employees.filter((employee) =>
        employee.submitted !== false &&
        canWork(employee, day, shift) &&
        canAddWorkDay(employee, day) &&
        !specialByDay[day].has(employee.id) &&
        !alreadyInShift.has(employee.id) &&
        !(settings.trainingEnabled && settings.trainingSkill === "store_operations" && employee.id === settings.traineeId) &&
        (!requireKey || hasSkill(employee, "key_holder"))
      );

      const fresh = candidates.filter((employee) => !employee.daysWorked.has(day));
      if (fresh.length) return { employee: chooseBalanced(fresh, day, shift), isDouble: false, isIcSplit: false };

      candidates = candidates.filter((employee) => employee.willingDouble?.includes(day));
      if (candidates.length) return { employee: chooseBalanced(candidates, day, shift), isDouble: true, isIcSplit: false };

      const icFallback = employees.filter((employee) => {
        const icAssignment = assignedIc(employee, day);
        return icAssignment && !icAssignment.floorShift && canWork(employee, day, shift) &&
          !alreadyInShift.has(employee.id) && (!requireKey || hasSkill(employee, "key_holder"));
      });
      if (!icFallback.length) return { employee: null, isDouble: false, isIcSplit: false };
      return { employee: chooseBalanced(icFallback, day, shift), isDouble: false, isIcSplit: true };
    }

    function assignRegular(employee, day, shift, isDouble, isIcSplit = false) {
      const assignment = { employeeId: employee.id, name: employee.name, isDouble, isIcSplit, requiresApproval: isDouble || isIcSplit };
      schedule[day][shift].push(assignment);
      if (!isIcSplit) addCredits(employee, day, 1, shift === "AM" ? 6 : 5);
      if (isDouble) {
        schedule[day].pendingDoubles.push(employee.name);
        addWarning("double", `${day}: ${employee.name} is suggested for a double and needs manager approval.`, "approval");
      }
      if (isIcSplit) markIcSplitDuty(employee, day, shift, "coverage");
    }

    const trainee = settings.trainingEnabled ? byId.get(settings.traineeId) : null;
    const target = Math.max(2, Math.min(4, Number(settings.icTarget) || 3));
    const dayNames = days.map((day) => day.name);
    const numberByDay = Object.fromEntries(days.map((day) => [day.name, day.number]));
    const isICTraining = settings.trainingEnabled && settings.trainingSkill === "ic_production";
    const eligibleICTrainingDays = trainee ? dayNames.filter((day) =>
      canWork(trainee, day, "AM") && canWork(trainee, day, "PM") &&
      employees.some((employee) =>
        employee.id !== trainee.id && hasSkill(employee, "ic_maker") && hasSkill(employee, "trainer") &&
        canWork(employee, day, "AM") && canWork(employee, day, "PM")
      )
    ) : [];
    let scheduledTarget = target;
    if (target === 4 && !settings.allowConsecutiveIC) {
      scheduledTarget = 3;
      addWarning("ic-spacing", "Four IC days cannot fit between Tuesday and Sunday with a full day between each one. Choose 3 days or enable the emergency back-to-back override.", "critical");
    }

    let patterns = combinations(dayNames, scheduledTarget);
    if (!settings.allowConsecutiveIC) {
      patterns = patterns.filter((pattern) => adjacentPairs(pattern, numberByDay).length === 0);
    } else {
      const fewestAdjacentPairs = Math.min(...patterns.map((pattern) => adjacentPairs(pattern, numberByDay).length));
      patterns = patterns.filter((pattern) => adjacentPairs(pattern, numberByDay).length === fewestAdjacentPairs);
    }
    if (isICTraining) {
      const trainingPatterns = patterns.filter((pattern) => pattern.some((day) => eligibleICTrainingDays.includes(day)));
      if (trainingPatterns.length) patterns = trainingPatterns;
    }

    const icDays = [...patterns[Math.floor(random() * patterns.length)]];
    const emergencyPairs = adjacentPairs(icDays, numberByDay);
    if (emergencyPairs.length) {
      const pairText = emergencyPairs.map(([first, second]) => `${first} and ${second}`).join(", ");
      addWarning("ic-spacing", `Emergency IC spacing: ${pairText} are back-to-back production days and require manager approval.`, "approval");
    }

    for (const day of icDays) {
      const candidates = employees.filter((employee) =>
        hasSkill(employee, "ic_maker") &&
        canWork(employee, day, "AM") && canWork(employee, day, "PM") &&
        canAddWorkDay(employee, day) &&
        !specialByDay[day].has(employee.id)
      );
      let pool = candidates;
      if (isICTraining && eligibleICTrainingDays.includes(day)) {
        const qualified = candidates.filter((employee) => hasSkill(employee, "trainer"));
        if (qualified.length) pool = qualified;
      }
      const chosen = chooseBalanced(pool, day, "AM");
      if (!chosen) {
        addWarning("ic", `${day}: no IC maker is available for a flexible full-day production assignment.`, "critical");
        continue;
      }
      schedule[day].IC.push({ employeeId: chosen.id, name: chosen.name, shiftCredits: 2, productionShift: "FULL", floorShift: null, requiresApproval: false });
      specialByDay[day].add(chosen.id);
      addCredits(chosen, day, 2, 11);
    }

    let trainingReady = !settings.trainingEnabled;
    if (settings.trainingEnabled) {
      if (!trainee) {
        addWarning("training", "Training is enabled but no trainee is selected.", "critical");
      } else if (settings.trainingSkill === "ic_production") {
        const trainingDays = icDays.filter((day) =>
          canWork(trainee, day, "AM") && canWork(trainee, day, "PM") && canAddWorkDay(trainee, day) &&
          schedule[day].IC.some((item) => hasSkill(byId.get(item.employeeId), "trainer"))
        ).sort((a, b) => {
          const preferredA = preference(trainee, a, "AM") === "preferred" || preference(trainee, a, "PM") === "preferred" ? 1 : 0;
          const preferredB = preference(trainee, b, "AM") === "preferred" || preference(trainee, b, "PM") === "preferred" ? 1 : 0;
          return preferredB - preferredA || random() - 0.5;
        });
        const trainingDay = trainingDays[0];
        if (!trainingDay) {
          addWarning("training", `No IC day has overlapping full-day availability for ${trainee.name} and a qualified IC trainer.`, "critical");
        } else {
          schedule[trainingDay].training.push({ employeeId: trainee.id, name: `${trainee.name} (trainee)`, role: "trainee", shift: "FULL", shiftCredits: 2 });
          specialByDay[trainingDay].add(trainee.id);
          addCredits(trainee, trainingDay, 2, 11);

          const assignedMakerIds = new Set(schedule[trainingDay].IC.map((item) => item.employeeId));
          const assignedTrainer = schedule[trainingDay].IC.find((item) => hasSkill(byId.get(item.employeeId), "trainer"));
          schedule[trainingDay].training.push({ employeeId: assignedTrainer.employeeId, name: `${assignedTrainer.name} (IC trainer)`, role: "trainer", shift: "FULL", shiftCredits: 0 });
          trainingReady = true;

          const secondTrainerCandidates = employees.filter((employee) =>
            hasSkill(employee, "trainer") && hasSkill(employee, "ic_maker") &&
            !assignedMakerIds.has(employee.id) && employee.id !== trainee.id &&
            !specialByDay[trainingDay].has(employee.id) &&
            canWork(employee, trainingDay, "AM") && canWork(employee, trainingDay, "PM") &&
            canAddWorkDay(employee, trainingDay)
          );
          const secondTrainer = chooseBalanced(secondTrainerCandidates, trainingDay, "AM");
          if (secondTrainer) {
            schedule[trainingDay].training.push({ employeeId: secondTrainer.id, name: `${secondTrainer.name} (second trainer)`, role: "trainer", shift: "FULL", shiftCredits: 2 });
            specialByDay[trainingDay].add(secondTrainer.id);
            addCredits(secondTrainer, trainingDay, 2, 11);
          } else {
            addWarning("training", `${trainingDay}: one qualified IC trainer is assigned; a second was not available.`, "info");
          }
        }
      } else {
        const requestedTarget = Math.max(1, Math.min(days.length, Number(trainee.maxShifts) || days.length));
        const regularStoreTrainerCandidates = (day, shift) => employees.filter((employee) =>
          hasSkill(employee, "trainer") && employee.id !== trainee.id &&
          canWork(employee, day, shift) && canAddWorkDay(employee, day) &&
          !specialByDay[day].has(employee.id)
        );
        const storeTrainerCandidates = (day, shift) => {
          const regular = regularStoreTrainerCandidates(day, shift);
          if (regular.length) return regular;
          return employees.filter((employee) => {
            const icAssignment = assignedIc(employee, day);
            return hasSkill(employee, "trainer") && employee.id !== trainee.id &&
              canWork(employee, day, shift) && icAssignment && !icAssignment.floorShift;
          });
        };
        const slots = days.flatMap((day) => ["AM", "PM"].map((shift) => ({ day: day.name, shift })))
          .filter(({ day, shift }) => canWork(trainee, day, shift))
          .sort((a, b) => {
            const trainerRankA = Math.min(...storeTrainerCandidates(a.day, a.shift).map(storeTrainerRank), 99);
            const trainerRankB = Math.min(...storeTrainerCandidates(b.day, b.shift).map(storeTrainerRank), 99);
            if (trainerRankA !== trainerRankB) return trainerRankA - trainerRankB;
            const preferredA = preference(trainee, a.day, a.shift) === "preferred" ? 1 : 0;
            const preferredB = preference(trainee, b.day, b.shift) === "preferred" ? 1 : 0;
            return preferredB - preferredA || random() - 0.5;
          });
        let trainingCredits = 0;
        for (const { day, shift } of slots) {
          if (trainingCredits >= requestedTarget || !canAddWorkDay(trainee, day)) break;
          if (specialByDay[day].has(trainee.id)) continue;
          const trainers = storeTrainerCandidates(day, shift);
          const bestRank = Math.min(...trainers.map(storeTrainerRank), 99);
          const trainer = chooseBalanced(trainers.filter((employee) => storeTrainerRank(employee) === bestRank), day, shift);
          if (!trainer) continue;
          const trainerUsesIcSplitDuty = Boolean(assignedIc(trainer, day));
          if (trainerUsesIcSplitDuty) markIcSplitDuty(trainer, day, shift, "training");
          schedule[day].training.push(
            { employeeId: trainee.id, name: `${trainee.name} (trainee)`, role: "trainee", shift, shiftCredits: 1 },
            { employeeId: trainer.id, name: `${trainer.name} (trainer)`, role: "trainer", shift, shiftCredits: 1, isIcSplit: trainerUsesIcSplitDuty }
          );
          specialByDay[day].add(trainee.id);
          specialByDay[day].add(trainer.id);
          addCredits(trainee, day, 1, shift === "AM" ? 6 : 5);
          if (!trainerUsesIcSplitDuty) addCredits(trainer, day, 1, shift === "AM" ? 6 : 5);
          trainingCredits += 1;
        }
        trainingReady = trainingCredits >= requestedTarget;
        if (trainingCredits === 0) {
          addWarning("training", `No shift has overlapping availability for ${trainee.name} and a trainer. ${trainee.name} was not scheduled untrained.`, "critical");
        } else if (!trainingReady) {
          addWarning("training", `${trainee.name} could be paired for ${trainingCredits} of ${requestedTarget} requested training shifts.`, "warning");
        }
      }
    }

    for (const dayConfig of days) {
      const day = dayConfig.name;
      for (const shift of ["AM", "PM"]) {
        const targetNeed = Number(settings.staffing?.[day]?.[shift]) || (shift === "AM" ? dayConfig.amNeed : dayConfig.pmNeed);
        const shiftName = shift === "AM" ? "morning" : "night";

        const keyPick = chooseRegular(day, shift, true);
        if (keyPick.employee) assignRegular(keyPick.employee, day, shift, keyPick.isDouble, keyPick.isIcSplit);
        else addWarning("key", `${day} ${shiftName}: no key holder is available.`, "critical");

        while (schedule[day][shift].length < targetNeed) {
          const pick = chooseRegular(day, shift, false);
          if (!pick.employee) {
            addWarning("coverage", `${day} ${shiftName}: regular staffing is short ${targetNeed - schedule[day][shift].length} position(s).`, "critical");
            break;
          }
          assignRegular(pick.employee, day, shift, pick.isDouble, pick.isIcSplit);
        }
      }
    }

    employees.forEach((employee) => {
      if (employee.submitted === false) {
        addWarning("request", `${employee.name} has not submitted this week's request.`, "info");
      }
      if (employee.weekendDaysRequired) {
        const weekendDaysOffered = ["Friday", "Saturday", "Sunday"].filter((day) =>
          canWork(employee, day, "AM") || canWork(employee, day, "PM")
        ).length;
        if (weekendDaysOffered < employee.weekendDaysRequired) {
          addWarning("weekend", `${employee.name} must offer ${employee.weekendDaysRequired}/3 weekend days (Friday–Sunday), but offered ${weekendDaysOffered}/3.`, "critical");
        }
      }
      const weekdaysOffered = ["Tuesday", "Wednesday", "Thursday"].filter((day) =>
        canWork(employee, day, "AM") || canWork(employee, day, "PM")
      ).length;
      if (weekdaysOffered < employee.weekdayRequirement) {
        addWarning("weekday", `${employee.name} must offer ${employee.weekdayRequirement} weekday${employee.weekdayRequirement === 1 ? "" : "s"}, but offered ${weekdaysOffered}.`, "critical");
      }
      if (employee.daysWorked.size < employee.minShifts) {
        addWarning("minimum", `${employee.name} is scheduled ${employee.daysWorked.size} day${employee.daysWorked.size === 1 ? "" : "s"}, below the manager minimum of ${employee.minShifts}.`, "warning");
      }
      if (employee.estimatedHours > 40) {
        addWarning("overtime", `${employee.name} is estimated at ${employee.estimatedHours.toFixed(1)} hours and needs overtime review.`, "approval");
      }
    });

    const severityPoints = { critical: 100, approval: 25, warning: 10, info: 2 };
    const score = warnings.reduce((total, warning) => total + severityPoints[warning.severity], 0);
    const criticalCount = warnings.filter((warning) => warning.severity === "critical").length;
    const approvalCount = warnings.filter((warning) => warning.severity === "approval").length;
    return {
      score,
      schedule,
      warnings,
      employees,
      summary: {
        criticalCount,
        approvalCount,
        icDaysScheduled: Object.values(schedule).filter((day) => day.IC.length).length,
        trainingReady,
      },
    };
  }

  function generateOptions(team, settings, count = 5) {
    const baseSeed = String(settings.weekStart || "2026-01-01").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return Array.from({ length: count }, (_, index) => ({
      optionNumber: index + 1,
      ...generateOne(team, settings, baseSeed + index * 997 + Math.floor(Math.random() * 101)),
    })).sort((a, b) => a.score - b.score || a.optionNumber - b.optionNumber);
  }

  window.SwensensScheduler = { generateOptions };
})();
