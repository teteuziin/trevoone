/**
 * Trevo One — Standalone Offline Shell Renderer
 *
 * Core Policies:
 * - Pure vanilla browser JavaScript (zero external dependencies).
 * - Multi-tenant and cross-user isolation via OfflineActiveContext (UUID byte-a-byte).
 * - Enforces 72h offline authorization TTL before exposing any data.
 * - Reactive connectivity check with /api/ping.
 * - ZERO sync engine duplication: redirects to normal app on reconnection.
 * - Interactive workout execution using strictly compatible IndexedDB schema.
 */

(function () {
  "use strict";

  const DB_NAME = "trevo_offline_v3";
  const DB_VERSION = 4;

  const OFFLINE_CONTEXT_STORE = "offline_context";
  const WORKOUT_SNAPSHOT_STORE = "workout_snapshots";
  const WORKOUT_SESSION_STORE = "workout_sessions";
  const PENDING_OPERATIONS_STORE = "pending_operations";
  const NUTRITION_SNAPSHOT_STORE = "nutrition_snapshots";
  const FORM_SNAPSHOT_STORE = "form_snapshots";
  const EVOLUTION_SNAPSHOT_STORE = "evolution_snapshots";
  const ACTIVE_CONTEXT_ID = "active_context";

  let db = null;
  let activeContext = null;
  let activeTrainingSnapshot = null;
  let activeWorkoutSession = null;
  let activeNutritionSnapshot = null;
  let formSnapshots = [];
  let activeEvolutionSnapshot = null;
  let currentTab = "training"; // "training" | "nutrition" | "forms" | "evolution"

  // Elements
  const contextCard = document.getElementById("context-card");
  const ctxConsultancyName = document.getElementById("ctx-consultancy-name");
  const ctxUserName = document.getElementById("ctx-user-name");
  const ctxSyncTime = document.getElementById("ctx-sync-time");
  const tabBar = document.getElementById("tab-bar");
  const tabTraining = document.getElementById("tab-training");
  const tabNutrition = document.getElementById("tab-nutrition");
  const tabForms = document.getElementById("tab-forms");
  const tabEvolution = document.getElementById("tab-evolution");
  const contentView = document.getElementById("offline-view");
  const btnReconnect = document.getElementById("btn-reconnect");
  const btnReconnectText = document.getElementById("btn-reconnect-text");
  const reconnectFeedback = document.getElementById("reconnect-feedback");
  const onlineAlert = document.getElementById("online-alert");
  const networkBadge = document.getElementById("network-badge");
  const networkStatusText = document.getElementById("network-status-text");

  function generateUuidV4() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function formatDateTime(isoString) {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "";
      const pad = (n) => String(n).padStart(2, "0");
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return "";
    }
  }

  function openDatabase() {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.indexedDB) {
        resolve(null);
        return;
      }

      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);

        req.onupgradeneeded = (e) => {
          if (e.oldVersion === 0) {
            try {
              e.target.transaction.abort();
            } catch {
              // Ignore
            }
            resolve(null);
          }
        };
      } catch {
        resolve(null);
      }
    });
  }

  // --- CONNECTIVITY & RECONNECT ENGINE ---

  async function checkRealConnectivity(timeoutMs = 3500) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const resp = await fetch("/api/ping?_t=" + Date.now(), {
        method: "GET",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return resp.status === 204 || resp.ok;
    } catch {
      return false;
    }
  }

  function updateBadgeStatus(status) {
    if (!networkBadge || !networkStatusText) return;

    if (status === "ONLINE") {
      networkStatusText.textContent = "Online";
      networkBadge.style.backgroundColor = "var(--brand-soft)";
      networkBadge.style.color = "var(--brand)";
      networkBadge.style.borderColor = "var(--brand-border)";
    } else if (status === "OFFLINE") {
      networkStatusText.textContent = "Modo Offline";
      networkBadge.style.backgroundColor = "var(--warning-bg)";
      networkBadge.style.color = "var(--warning-text)";
      networkBadge.style.borderColor = "var(--warning-border)";
    } else if (status === "SYNCING") {
      networkStatusText.textContent = "Sincronizando...";
      networkBadge.style.backgroundColor = "var(--brand-soft)";
      networkBadge.style.color = "var(--brand)";
      networkBadge.style.borderColor = "var(--brand-border)";
    } else {
      networkStatusText.textContent = "Verificando...";
      networkBadge.style.backgroundColor = "var(--surface-subtle)";
      networkBadge.style.color = "var(--text-secondary)";
      networkBadge.style.borderColor = "var(--border-subtle)";
    }
  }

  function returnToApplication() {
    if (onlineAlert) onlineAlert.style.display = "block";
    updateBadgeStatus("SYNCING");

    setTimeout(() => {
      const path = window.location.pathname || "";
      if (path && path !== "/offline.html" && path !== "/offline") {
        window.location.replace(window.location.href);
      } else if (activeContext && activeContext.consultancySlug) {
        window.location.replace(`/consultoria/${activeContext.consultancySlug}`);
      } else {
        window.location.replace("/");
      }
    }, 400);
  }

  async function handleReconnectAttempt() {
    if (btnReconnectText) btnReconnectText.textContent = "Verificando conexão...";
    if (reconnectFeedback) reconnectFeedback.style.display = "none";
    updateBadgeStatus("CHECKING");

    const isConnected = await checkRealConnectivity(3500);

    if (isConnected) {
      if (btnReconnectText) btnReconnectText.textContent = "Conectado! Retornando...";
      returnToApplication();
    } else {
      if (btnReconnectText) btnReconnectText.textContent = "Tentar reconectar";
      updateBadgeStatus("OFFLINE");
      if (reconnectFeedback) {
        reconnectFeedback.textContent = "Ainda sem conexão. Seus dados salvos continuam disponíveis.";
        reconnectFeedback.style.display = "block";
      }
    }
  }

  // --- RENDERING VIEWS ---

  function renderEmptyState(title, description) {
    contentView.replaceChildren();

    const container = document.createElement("div");
    container.className = "empty-state";

    const titleEl = document.createElement("p");
    titleEl.className = "empty-title";
    titleEl.textContent = title;

    const descEl = document.createElement("p");
    descEl.className = "empty-desc";
    descEl.textContent = description;

    container.appendChild(titleEl);
    container.appendChild(descEl);
    contentView.appendChild(container);
  }

  // Render Training View with Interactive Execution (Section 12)
  function renderTrainingView() {
    contentView.replaceChildren();

    if (!activeTrainingSnapshot) {
      renderEmptyState(
        "Treino não sincronizado",
        "Nenhum plano de treino foi salvo offline para este perfil. Conecte-se à internet para sincronizar."
      );
      return;
    }

    const plan = activeTrainingSnapshot.workout || activeTrainingSnapshot.data || activeTrainingSnapshot;
    const assignmentPublicId = activeTrainingSnapshot.assignmentPublicId || plan.assignmentPublicId || "active_assignment";

    // Plan Title Card
    const titleCard = document.createElement("div");
    titleCard.className = "plan-title-card";

    const nameEl = document.createElement("h2");
    nameEl.className = "plan-name";
    nameEl.textContent = plan.planName || plan.name || activeTrainingSnapshot.planTitle || "Plano de Treino";

    const subtitleEl = document.createElement("p");
    subtitleEl.className = "plan-subtitle";
    subtitleEl.textContent = plan.goal ? `Objetivo: ${plan.goal}` : "Prescrição personalizada de treino";

    titleCard.appendChild(nameEl);
    titleCard.appendChild(subtitleEl);

    // Session Execution Action Banner
    const actionBanner = document.createElement("div");
    actionBanner.style.marginTop = "12px";
    actionBanner.style.display = "flex";
    actionBanner.style.alignItems = "center";
    actionBanner.style.justifyContent = "space-between";
    actionBanner.style.gap = "8px";

    if (!activeWorkoutSession) {
      const btnStart = document.createElement("button");
      btnStart.type = "button";
      btnStart.className = "action-btn action-btn-primary";
      btnStart.textContent = "Iniciar Treino";
      btnStart.addEventListener("click", () => startOfflineWorkoutSession(plan, assignmentPublicId));
      actionBanner.appendChild(btnStart);
    } else if (activeWorkoutSession.status === "IN_PROGRESS") {
      const sessionNotice = document.createElement("span");
      sessionNotice.className = "badge-pill";
      sessionNotice.textContent = "Treino em andamento";

      const btnComplete = document.createElement("button");
      btnComplete.type = "button";
      btnComplete.className = "action-btn action-btn-primary";
      btnComplete.textContent = "Concluir Treino";
      btnComplete.addEventListener("click", () => completeOfflineWorkoutSession(activeWorkoutSession, assignmentPublicId));

      actionBanner.appendChild(sessionNotice);
      actionBanner.appendChild(btnComplete);
    } else {
      const completedNotice = document.createElement("span");
      completedNotice.className = "badge-pill";
      completedNotice.textContent = "Treino concluído (pendente de envio)";
      actionBanner.appendChild(completedNotice);
    }

    titleCard.appendChild(actionBanner);
    contentView.appendChild(titleCard);

    // Blocks & Exercises
    const blocks = plan.blocks || plan.routines || plan.items || [];
    if (blocks.length === 0) {
      const emptyRoutine = document.createElement("div");
      emptyRoutine.className = "item-card";
      const txt = document.createElement("p");
      txt.className = "item-title";
      txt.textContent = "Nenhum bloco cadastrado neste treino.";
      emptyRoutine.appendChild(txt);
      contentView.appendChild(emptyRoutine);
      return;
    }

    blocks.forEach((block, bIdx) => {
      const routineCard = document.createElement("div");
      routineCard.className = "card";

      const routineHeader = document.createElement("div");
      routineHeader.style.marginBottom = "10px";

      const routineTitle = document.createElement("h3");
      routineTitle.className = "item-title";
      routineTitle.textContent = block.title || block.name || `Bloco ${bIdx + 1}`;
      routineHeader.appendChild(routineTitle);

      if (block.notes) {
        const rNotes = document.createElement("p");
        rNotes.className = "item-notes";
        rNotes.style.marginTop = "6px";
        rNotes.textContent = block.notes;
        routineHeader.appendChild(rNotes);
      }

      routineCard.appendChild(routineHeader);

      const items = block.items || block.exercises || [];
      const listContainer = document.createElement("div");
      listContainer.style.display = "flex";
      listContainer.style.flexDirection = "column";
      listContainer.style.gap = "10px";

      items.forEach((item, eIdx) => {
        const exItem = document.createElement("div");
        exItem.className = "item-card";

        const exHeader = document.createElement("div");
        exHeader.className = "item-header";

        const exName = document.createElement("p");
        exName.className = "item-title";
        exName.textContent = `${eIdx + 1}. ${item.exerciseName || item.name || "Exercício"}`;
        exHeader.appendChild(exName);
        exItem.appendChild(exHeader);

        // Sets Checklist when session is in progress
        const setsList = Array.isArray(item.sets) ? item.sets : [];
        if (activeWorkoutSession && activeWorkoutSession.status === "IN_PROGRESS" && setsList.length > 0) {
          const setsContainer = document.createElement("div");
          setsContainer.style.display = "flex";
          setsContainer.style.flexDirection = "column";
          setsContainer.style.gap = "6px";
          setsContainer.style.marginTop = "6px";

          setsList.forEach((set, sIdx) => {
            const sessionSet = (activeWorkoutSession.sets || []).find(
              (s) => s.blockItemPublicId === item.publicId && s.setNumber === (sIdx + 1)
            );

            const isDone = Boolean(sessionSet && sessionSet.completedAt);

            const setRow = document.createElement("div");
            setRow.className = isDone ? "set-row completed" : "set-row";

            const setLabel = document.createElement("span");
            const repsTarget = set.targetReps || set.prescribedReps || "reps";
            const loadTarget = set.targetLoadKg ? `${set.targetLoadKg}kg` : "";
            setLabel.textContent = `Série ${sIdx + 1}: ${repsTarget} reps ${loadTarget}`;

            const check = document.createElement("input");
            check.type = "checkbox";
            check.className = "set-check";
            check.checked = isDone;
            check.addEventListener("change", (ev) => {
              markOfflineSetToggle(activeWorkoutSession, item.publicId, sIdx + 1, ev.target.checked);
            });

            setRow.appendChild(setLabel);
            setRow.appendChild(check);
            setsContainer.appendChild(setRow);
          });

          exItem.appendChild(setsContainer);
        } else {
          // Standard meta tags
          const metaGroup = document.createElement("div");
          metaGroup.className = "item-meta";

          const count = setsList.length;
          if (count > 0) {
            const pillSets = document.createElement("span");
            pillSets.className = "badge-pill";
            pillSets.textContent = `${count} séries`;
            metaGroup.appendChild(pillSets);
          }

          if (item.reps || (setsList[0] && setsList[0].targetReps)) {
            const pillReps = document.createElement("span");
            pillReps.className = "badge-pill";
            pillReps.textContent = `${item.reps || setsList[0].targetReps} reps`;
            metaGroup.appendChild(pillReps);
          }

          if (item.restSeconds || item.rest) {
            const pillRest = document.createElement("span");
            pillRest.className = "badge-pill";
            pillRest.textContent = `Descanso: ${item.restSeconds ? `${item.restSeconds}s` : item.rest}`;
            metaGroup.appendChild(pillRest);
          }

          if (metaGroup.children.length > 0) {
            exItem.appendChild(metaGroup);
          }
        }

        if (item.notes) {
          const exNotes = document.createElement("p");
          exNotes.className = "item-notes";
          exNotes.textContent = item.notes;
          exItem.appendChild(exNotes);
        }

        listContainer.appendChild(exItem);
      });

      routineCard.appendChild(listContainer);
      contentView.appendChild(routineCard);
    });
  }

  // Start Offline Workout Session
  async function startOfflineWorkoutSession(plan, assignmentPublicId) {
    if (!db || !activeContext) return;

    const flattenedSets = [];
    let setCounter = 1;

    const blocks = plan.blocks || plan.routines || [];
    blocks.forEach((b) => {
      (b.items || b.exercises || []).forEach((item) => {
        (item.sets || []).forEach((set) => {
          flattenedSets.push({
            setPublicId: generateUuidV4(),
            blockItemPublicId: item.publicId || "",
            setNumber: setCounter++,
            setType: set.setType || "NORMAL",
            prescribedReps: set.targetReps || null,
            prescribedRepsMax: set.targetRepsMax || null,
            prescribedLoadKg: set.targetLoadKg || null,
            prescribedRestSeconds: set.targetRestSeconds || null,
            actualReps: null,
            actualLoadKg: null,
            completedAt: null,
          });
        });
      });
    });

    const newSession = {
      clientExecutionId: generateUuidV4(),
      userPublicId: activeContext.userPublicId,
      consultancyPublicId: activeContext.consultancyPublicId,
      role: activeContext.role || "STUDENT",
      assignmentPublicId: assignmentPublicId,
      status: "IN_PROGRESS",
      startedAt: new Date().toISOString(),
      completedAt: null,
      sets: flattenedSets,
      updatedAt: new Date().toISOString(),
    };

    try {
      const tx = db.transaction(WORKOUT_SESSION_STORE, "readwrite");
      tx.objectStore(WORKOUT_SESSION_STORE).put(newSession);
      activeWorkoutSession = newSession;
      renderTrainingView();
    } catch {
      // Safe fallback
    }
  }

  // Toggle Completed Set
  async function markOfflineSetToggle(session, blockItemPublicId, setNumber, isChecked) {
    if (!db || !session) return;

    const nowIso = isChecked ? new Date().toISOString() : null;
    let target = null;

    session.sets = session.sets.map((s) => {
      if (s.blockItemPublicId === blockItemPublicId && s.setNumber === setNumber) {
        target = {
          ...s,
          completedAt: nowIso,
          actualReps: isChecked ? (s.prescribedReps || 10) : null,
          actualLoadKg: isChecked ? (s.prescribedLoadKg || null) : null,
        };
        return target;
      }
      return s;
    });

    session.updatedAt = new Date().toISOString();

    try {
      const tx = db.transaction(WORKOUT_SESSION_STORE, "readwrite");
      tx.objectStore(WORKOUT_SESSION_STORE).put(session);
      renderTrainingView();
    } catch {
      // Safe
    }
  }

  // Complete Offline Workout Session & Queue Operation
  async function completeOfflineWorkoutSession(session, assignmentPublicId) {
    if (!db || !session || !activeContext) return;

    const nowIso = new Date().toISOString();
    session.status = "PENDING_SYNC";
    session.completedAt = nowIso;
    session.updatedAt = nowIso;

    const pendingOp = {
      operationId: generateUuidV4(),
      clientOperationId: generateUuidV4(),
      userPublicId: activeContext.userPublicId,
      consultancyPublicId: activeContext.consultancyPublicId,
      consultancySlug: activeContext.consultancySlug,
      role: activeContext.role || "STUDENT",
      entityType: "WORKOUT_EXECUTION",
      entityId: assignmentPublicId,
      operationType: "COMPLETE_WORKOUT",
      payload: {
        clientExecutionId: session.clientExecutionId,
        assignmentPublicId: assignmentPublicId,
        startedAt: session.startedAt,
        completedAt: nowIso,
        sets: session.sets.map((s) => ({
          setPublicId: s.setPublicId,
          actualReps: s.actualReps != null ? s.actualReps : (s.prescribedReps || 0),
          actualLoadKg: s.actualLoadKg != null ? s.actualLoadKg : s.prescribedLoadKg,
          completedAt: s.completedAt || nowIso,
        })),
      },
      status: "PENDING",
      retryCount: 0,
      createdAt: nowIso,
    };

    try {
      const tx = db.transaction([WORKOUT_SESSION_STORE, PENDING_OPERATIONS_STORE], "readwrite");
      tx.objectStore(WORKOUT_SESSION_STORE).put(session);
      tx.objectStore(PENDING_OPERATIONS_STORE).put(pendingOp);
      activeWorkoutSession = session;
      renderTrainingView();
    } catch {
      // Safe
    }
  }

  // Render Nutrition View (Section 13)
  function renderNutritionView() {
    contentView.replaceChildren();

    if (!activeNutritionSnapshot) {
      renderEmptyState(
        "Nutrição não sincronizada",
        "Nenhum plano alimentar foi salvo offline para este perfil. Conecte-se à internet para sincronizar."
      );
      return;
    }

    const plan = activeNutritionSnapshot.data || activeNutritionSnapshot;

    // Plan Title Card
    const titleCard = document.createElement("div");
    titleCard.className = "plan-title-card";

    const nameEl = document.createElement("h2");
    nameEl.className = "plan-name";
    nameEl.textContent = plan.title || plan.name || activeNutritionSnapshot.planTitle || "Plano Alimentar";

    const subtitleEl = document.createElement("p");
    subtitleEl.className = "plan-subtitle";
    subtitleEl.textContent = plan.subtitle || "Prescrição alimentar personalizada";

    titleCard.appendChild(nameEl);
    titleCard.appendChild(subtitleEl);

    // Macros Grid (Calories, Protein, Carbs, Fats)
    const targetCalories = plan.targetCalories || plan.calories || (plan.version && plan.version.targetCalories);
    const targetProtein = plan.targetProtein || plan.protein || (plan.version && plan.version.targetProtein);
    const targetCarbs = plan.targetCarbs || plan.carbs || (plan.version && plan.version.targetCarbs);
    const targetFats = plan.targetFats || plan.fats || (plan.version && plan.version.targetFats);

    if (targetCalories || targetProtein || targetCarbs || targetFats) {
      const macrosGrid = document.createElement("div");
      macrosGrid.className = "macros-grid";

      const macroList = [
        { label: "Calorias", val: targetCalories ? `${targetCalories} kcal` : "—" },
        { label: "Proteína", val: targetProtein ? `${targetProtein}g` : "—" },
        { label: "Carboidrato", val: targetCarbs ? `${targetCarbs}g` : "—" },
        { label: "Gordura", val: targetFats ? `${targetFats}g` : "—" },
      ];

      macroList.forEach((m) => {
        const mCard = document.createElement("div");
        mCard.className = "macro-card";

        const mLabel = document.createElement("div");
        mLabel.className = "macro-label";
        mLabel.textContent = m.label;

        const mVal = document.createElement("div");
        mVal.className = "macro-value";
        mVal.textContent = m.val;

        mCard.appendChild(mLabel);
        mCard.appendChild(mVal);
        macrosGrid.appendChild(mCard);
      });

      titleCard.appendChild(macrosGrid);
    }

    // PDF Online-only note
    const pdfNotice = document.createElement("p");
    pdfNotice.className = "sync-timestamp";
    pdfNotice.style.marginTop = "8px";
    pdfNotice.textContent = "Exportação de PDF disponível apenas com conexão à internet.";
    titleCard.appendChild(pdfNotice);

    contentView.appendChild(titleCard);

    // Meals
    const meals = plan.meals || plan.items || [];
    if (meals.length === 0) {
      const emptyMeal = document.createElement("div");
      emptyMeal.className = "item-card";
      const txt = document.createElement("p");
      txt.className = "item-title";
      txt.textContent = "Nenhuma refeição cadastrada no plano.";
      emptyMeal.appendChild(txt);
      contentView.appendChild(emptyMeal);
      return;
    }

    meals.forEach((meal, mIdx) => {
      const mealCard = document.createElement("div");
      mealCard.className = "card";

      const mealHeader = document.createElement("div");
      mealHeader.style.display = "flex";
      mealHeader.style.justifyContent = "space-between";
      mealHeader.style.alignItems = "center";
      mealHeader.style.marginBottom = "10px";

      const mealTitle = document.createElement("h3");
      mealTitle.className = "item-title";
      mealTitle.textContent = meal.name || meal.title || `Refeição ${mIdx + 1}`;
      mealHeader.appendChild(mealTitle);

      if (meal.time || meal.scheduledTime || meal.timeFormatted) {
        const pillTime = document.createElement("span");
        pillTime.className = "badge-pill";
        pillTime.textContent = meal.timeFormatted || meal.scheduledTime || meal.time;
        mealHeader.appendChild(pillTime);
      }

      mealCard.appendChild(mealHeader);

      if (meal.notes) {
        const mNotes = document.createElement("p");
        mNotes.className = "item-notes";
        mNotes.style.marginBottom = "10px";
        mNotes.textContent = meal.notes;
        mealCard.appendChild(mNotes);
      }

      const foods = meal.foods || meal.items || [];
      if (foods.length === 0) {
        const noFood = document.createElement("p");
        noFood.className = "empty-desc";
        noFood.textContent = "Nenhum alimento nesta refeição.";
        mealCard.appendChild(noFood);
      } else {
        const listContainer = document.createElement("div");
        listContainer.style.display = "flex";
        listContainer.style.flexDirection = "column";
        listContainer.style.gap = "8px";

        foods.forEach((food) => {
          const foodItem = document.createElement("div");
          foodItem.className = "item-card";

          const foodHeader = document.createElement("div");
          foodHeader.className = "item-header";

          const foodName = document.createElement("p");
          foodName.className = "item-title";
          foodName.textContent = food.foodName || food.name || "Alimento";

          const foodPortion = document.createElement("span");
          foodPortion.className = "badge-pill";
          foodPortion.textContent = food.portion || `${food.amount || ""} ${food.unit || ""}`.trim() || "1 porção";

          foodHeader.appendChild(foodName);
          foodHeader.appendChild(foodPortion);
          foodItem.appendChild(foodHeader);

          if (food.substitutions && food.substitutions.length > 0) {
            const subTitle = document.createElement("p");
            subTitle.className = "item-notes";
            const subList = Array.isArray(food.substitutions)
              ? food.substitutions.map((s) => (typeof s === "string" ? s : s.name || s.foodName)).join(", ")
              : String(food.substitutions);
            subTitle.textContent = `Substituições: ${subList}`;
            foodItem.appendChild(subTitle);
          }

          listContainer.appendChild(foodItem);
        });

        mealCard.appendChild(listContainer);
      }

      contentView.appendChild(mealCard);
    });
  }

  // Render Forms View
  function renderFormsView() {
    contentView.replaceChildren();

    if (formSnapshots.length === 0) {
      renderEmptyState(
        "Nenhum formulário sincronizado",
        "Não há formulários atribuídos salvos offline para este perfil."
      );
      return;
    }

    formSnapshots.forEach((form) => {
      const card = document.createElement("div");
      card.className = "item-card";

      const title = document.createElement("h3");
      title.className = "item-title";
      title.textContent = form.title || "Formulário";

      const desc = document.createElement("p");
      desc.className = "empty-desc";
      desc.textContent = form.description || "Formulário de acompanhamento.";

      const fieldsCount = document.createElement("span");
      fieldsCount.className = "badge-pill";
      fieldsCount.textContent = `${(form.fields || []).length} campos`;

      card.appendChild(title);
      card.appendChild(desc);
      card.appendChild(fieldsCount);
      contentView.appendChild(card);
    });
  }

  // Render Evolution View
  function renderEvolutionView() {
    contentView.replaceChildren();

    if (!activeEvolutionSnapshot) {
      renderEmptyState(
        "Evolução não sincronizada",
        "Nenhum dado escalar de evolução foi salvo offline para este perfil."
      );
      return;
    }

    const hub = activeEvolutionSnapshot.hubData || activeEvolutionSnapshot;
    const summary = hub.summary || {};

    const card = document.createElement("div");
    card.className = "card";

    const title = document.createElement("h3");
    title.className = "item-title";
    title.textContent = "Resumo de Evolução";
    card.appendChild(title);

    const metricsGrid = document.createElement("div");
    metricsGrid.className = "macros-grid";

    const mList = [
      { label: "Peso Inicial", val: summary.initialWeightKg ? `${summary.initialWeightKg} kg` : "—" },
      { label: "Peso Atual", val: summary.currentWeightKg ? `${summary.currentWeightKg} kg` : "—" },
      { label: "Meta", val: summary.goalWeightKg ? `${summary.goalWeightKg} kg` : "—" },
      { label: "Diferença", val: summary.weightDiffKg ? `${summary.weightDiffKg > 0 ? "+" : ""}${summary.weightDiffKg} kg` : "—" },
    ];

    mList.forEach((m) => {
      const mCard = document.createElement("div");
      mCard.className = "macro-card";

      const mLabel = document.createElement("div");
      mLabel.className = "macro-label";
      mLabel.textContent = m.label;

      const mVal = document.createElement("div");
      mVal.className = "macro-value";
      mVal.textContent = m.val;

      mCard.appendChild(mLabel);
      mCard.appendChild(mVal);
      metricsGrid.appendChild(mCard);
    });

    card.appendChild(metricsGrid);
    contentView.appendChild(card);
  }

  function switchTab(tab) {
    currentTab = tab;

    if (tabTraining) tabTraining.classList.toggle("active", tab === "training");
    if (tabNutrition) tabNutrition.classList.toggle("active", tab === "nutrition");
    if (tabForms) tabForms.classList.toggle("active", tab === "forms");
    if (tabEvolution) tabEvolution.classList.toggle("active", tab === "evolution");

    if (tab === "training") {
      renderTrainingView();
    } else if (tab === "nutrition") {
      renderNutritionView();
    } else if (tab === "forms") {
      renderFormsView();
    } else if (tab === "evolution") {
      renderEvolutionView();
    }
  }

  // --- BOOT OFFLINE SHELL ---

  async function bootOfflineShell() {
    updateBadgeStatus("CHECKING");

    // 1. Initial connectivity test
    checkRealConnectivity(3000).then((isConnected) => {
      if (isConnected) {
        updateBadgeStatus("ONLINE");
        returnToApplication();
      } else {
        updateBadgeStatus("OFFLINE");
      }
    });

    db = await openDatabase();
    if (!db) {
      logDiagnostics(null, false, 0, 0, 0, 0);
      renderEmptyState(
        "Nenhum conteúdo offline disponível",
        "Conecte-se à internet para sincronizar seu treino e sua alimentação."
      );
      return;
    }

    // 2. Read Active Context
    if (!db.objectStoreNames.contains(OFFLINE_CONTEXT_STORE)) {
      logDiagnostics(null, false, 0, 0, 0, 0);
      renderEmptyState(
        "Nenhum conteúdo offline disponível",
        "Conecte-se à internet para sincronizar seu treino e sua alimentação."
      );
      return;
    }

    activeContext = await new Promise((resolve) => {
      try {
        const tx = db.transaction(OFFLINE_CONTEXT_STORE, "readonly");
        const store = tx.objectStore(OFFLINE_CONTEXT_STORE);
        const req = store.get(ACTIVE_CONTEXT_ID);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });

    if (!activeContext || !activeContext.userPublicId || !activeContext.consultancyPublicId) {
      logDiagnostics(activeContext, false, 0, 0, 0, 0);
      renderEmptyState(
        "Nenhum conteúdo offline disponível",
        "Conecte-se à internet para sincronizar seu treino e sua alimentação."
      );
      return;
    }

    // 3. Validate TTL
    const now = Date.now();
    const expiry = new Date(activeContext.validUntil).getTime();
    if (isNaN(expiry) || now > expiry) {
      logDiagnostics(activeContext, false, 0, 0, 0, 0);
      renderEmptyState(
        "Seu acesso offline expirou",
        "Conecte-se à internet para validar e sincronizar suas prescrições novamente."
      );
      return;
    }

    const activeRole = activeContext.role || "STUDENT";

    // 4. Update Header Profile UI
    if (contextCard && ctxConsultancyName && ctxUserName && ctxSyncTime) {
      ctxConsultancyName.textContent = activeContext.consultancyName || "Trevo One";
      ctxUserName.textContent = activeContext.userName ? `Aluno: ${activeContext.userName}` : "Acesso Offline";
      ctxSyncTime.textContent = `Sincronizado em ${formatDateTime(activeContext.syncedAt)}`;
      contextCard.style.display = "block";
    }

    tabBar.style.display = "flex";

    // 5. Read Workout Snapshot via by_scope index
    let workoutSnapshots = [];
    if (db.objectStoreNames.contains(WORKOUT_SNAPSHOT_STORE)) {
      workoutSnapshots = await new Promise((resolve) => {
        try {
          const tx = db.transaction(WORKOUT_SNAPSHOT_STORE, "readonly");
          const store = tx.objectStore(WORKOUT_SNAPSHOT_STORE);
          const index = store.index("by_scope");
          const req = index.getAll(IDBKeyRange.only([activeContext.userPublicId, activeContext.consultancyPublicId, activeRole]));
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      });
      activeTrainingSnapshot = workoutSnapshots.length > 0 ? workoutSnapshots[0] : null;
    }

    // 6. Read Active Workout Session
    if (activeTrainingSnapshot && db.objectStoreNames.contains(WORKOUT_SESSION_STORE)) {
      const assignmentId = activeTrainingSnapshot.assignmentPublicId || activeTrainingSnapshot.workout?.assignmentPublicId;
      activeWorkoutSession = await new Promise((resolve) => {
        try {
          const tx = db.transaction(WORKOUT_SESSION_STORE, "readonly");
          const store = tx.objectStore(WORKOUT_SESSION_STORE);
          const index = store.index("by_assignment");
          const req = index.openCursor(IDBKeyRange.only([
            activeContext.userPublicId,
            activeContext.consultancyPublicId,
            activeRole,
            assignmentId,
          ]));
          req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
              resolve(cursor.value);
            } else {
              resolve(null);
            }
          };
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }

    // 7. Read Nutrition Snapshot
    if (db.objectStoreNames.contains(NUTRITION_SNAPSHOT_STORE)) {
      activeNutritionSnapshot = await new Promise((resolve) => {
        try {
          const tx = db.transaction(NUTRITION_SNAPSHOT_STORE, "readonly");
          const store = tx.objectStore(NUTRITION_SNAPSHOT_STORE);
          const req = store.get([activeContext.userPublicId, activeContext.consultancyPublicId, activeRole]);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }

    // 8. Read Form Snapshots
    if (db.objectStoreNames.contains(FORM_SNAPSHOT_STORE)) {
      formSnapshots = await new Promise((resolve) => {
        try {
          const tx = db.transaction(FORM_SNAPSHOT_STORE, "readonly");
          const store = tx.objectStore(FORM_SNAPSHOT_STORE);
          const index = store.index("by_scope");
          const req = index.getAll(IDBKeyRange.only([activeContext.userPublicId, activeContext.consultancyPublicId, activeRole]));
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      });

      if (formSnapshots.length > 0 && tabForms) {
        tabForms.style.display = "inline-block";
      }
    }

    // 9. Read Evolution Snapshot
    if (db.objectStoreNames.contains(EVOLUTION_SNAPSHOT_STORE)) {
      activeEvolutionSnapshot = await new Promise((resolve) => {
        try {
          const tx = db.transaction(EVOLUTION_SNAPSHOT_STORE, "readonly");
          const store = tx.objectStore(EVOLUTION_SNAPSHOT_STORE);
          const req = store.get([activeContext.userPublicId, activeContext.consultancyPublicId, activeRole]);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });

      if (activeEvolutionSnapshot && tabEvolution) {
        tabEvolution.style.display = "inline-block";
      }
    }

    // 10. Check Pending Operations Count
    if (db.objectStoreNames.contains(PENDING_OPERATIONS_STORE)) {
      const pendingCount = await new Promise((resolve) => {
        try {
          const tx = db.transaction(PENDING_OPERATIONS_STORE, "readonly");
          const store = tx.objectStore(PENDING_OPERATIONS_STORE);
          const req = store.count();
          req.onsuccess = () => resolve(req.result || 0);
          req.onerror = () => resolve(0);
        } catch {
          resolve(0);
        }
      });

      if (pendingCount > 0 && ctxSyncTime) {
        ctxSyncTime.textContent += ` • ${pendingCount} ${pendingCount === 1 ? "alteração pendente" : "alterações pendentes"}`;
      }
    }

    // Log diagnostics internally for QA
    logDiagnostics(
      activeContext,
      true,
      workoutSnapshots.length,
      activeNutritionSnapshot ? 1 : 0,
      formSnapshots.length,
      activeEvolutionSnapshot ? 1 : 0
    );

    // Initial Tab Selection based on URL preference
    const path = window.location.pathname || "";
    if (path.includes("/nutricao")) {
      currentTab = "nutrition";
    } else if (path.includes("/formularios") && formSnapshots.length > 0) {
      currentTab = "forms";
    } else if (path.includes("/progresso") && activeEvolutionSnapshot) {
      currentTab = "evolution";
    } else {
      currentTab = "training";
    }

    switchTab(currentTab);
  }

  function logDiagnostics(context, valid, wCount, nCount, fCount, eCount) {
    const diag = {
      contextFound: Boolean(context),
      contextValid: Boolean(valid),
      hasUser: Boolean(context && context.userPublicId),
      hasConsultancy: Boolean(context && context.consultancyPublicId),
      role: context ? context.role : null,
      workoutSnapshotsCount: wCount,
      nutritionSnapshotsCount: nCount,
      formSnapshotsCount: fCount,
      evolutionSnapshotsCount: eCount,
    };
    window.__TREVO_OFFLINE_DIAGNOSTICS__ = diag;
    if (typeof console !== "undefined" && console.info) {
      console.info("[Offline 360 QA Diagnostic]", diag);
    }
  }

  // Event Listeners
  if (tabTraining) {
    tabTraining.addEventListener("click", () => switchTab("training"));
  }

  if (tabNutrition) {
    tabNutrition.addEventListener("click", () => switchTab("nutrition"));
  }

  if (tabForms) {
    tabForms.addEventListener("click", () => switchTab("forms"));
  }

  if (tabEvolution) {
    tabEvolution.addEventListener("click", () => switchTab("evolution"));
  }

  if (btnReconnect) {
    btnReconnect.addEventListener("click", handleReconnectAttempt);
  }

  window.addEventListener("online", () => {
    checkRealConnectivity().then((isConnected) => {
      if (isConnected) {
        updateBadgeStatus("ONLINE");
        returnToApplication();
      }
    });
  });

  window.addEventListener("offline", () => {
    updateBadgeStatus("OFFLINE");
    if (onlineAlert) onlineAlert.style.display = "none";
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootOfflineShell);
  } else {
    bootOfflineShell();
  }
})();
