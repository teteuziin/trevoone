/**
 * Trevo One — Standalone Offline Shell Renderer
 *
 * Core Policies:
 * - Pure vanilla browser JavaScript (zero framework, zero remote imports).
 * - Safe DOM manipulation (textContent only, zero innerHTML with snapshot data).
 * - Multi-tenant and cross-user isolation via OfflineActiveContext.
 * - Enforces 72h offline authorization TTL before exposing any data.
 */

(function () {
  "use strict";

  const DB_NAME = "trevo_offline_v3";
  const DB_VERSION = 4;
  const OFFLINE_CONTEXT_STORE = "offline_context";
  const WORKOUT_SNAPSHOT_STORE = "workout_snapshots";
  const NUTRITION_SNAPSHOT_STORE = "nutrition_snapshots";
  const PENDING_OPERATIONS_STORE = "pending_operations";
  const ACTIVE_CONTEXT_ID = "active_context";

  let activeTrainingSnapshot = null;
  let activeNutritionSnapshot = null;
  let currentTab = "training"; // "training" | "nutrition"

  // Elements
  const contextCard = document.getElementById("context-card");
  const ctxConsultancyName = document.getElementById("ctx-consultancy-name");
  const ctxUserName = document.getElementById("ctx-user-name");
  const ctxSyncTime = document.getElementById("ctx-sync-time");
  const tabBar = document.getElementById("tab-bar");
  const tabTraining = document.getElementById("tab-training");
  const tabNutrition = document.getElementById("tab-nutrition");
  const contentView = document.getElementById("offline-view");
  const btnReconnect = document.getElementById("btn-reconnect");
  const onlineAlert = document.getElementById("online-alert");
  const networkBadge = document.getElementById("network-badge");
  const networkStatusText = document.getElementById("network-status-text");

  // Format Brazilian date/time
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

  // Open IndexedDB safely for read-only query using trevo_offline_v3 schema version 4
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

  // Render an empty/fallback state
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

  // Render Training Snapshot
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
    contentView.appendChild(titleCard);

    // Blocks / Routines / Items
    const blocks = plan.blocks || plan.routines || plan.items || [];
    if (blocks.length === 0) {
      const emptyRoutine = document.createElement("div");
      emptyRoutine.className = "item-card";
      const txt = document.createElement("p");
      txt.className = "item-title";
      txt.textContent = "Nenhum bloco ou exercício cadastrado neste plano.";
      emptyRoutine.appendChild(txt);
      contentView.appendChild(emptyRoutine);
      return;
    }

    blocks.forEach((block, bIdx) => {
      const routineCard = document.createElement("div");
      routineCard.className = "card";

      const routineHeader = document.createElement("div");
      routineHeader.style.marginBottom = "12px";

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
      if (items.length === 0) {
        const noEx = document.createElement("p");
        noEx.className = "empty-desc";
        noEx.textContent = "Nenhum exercício neste bloco.";
        routineCard.appendChild(noEx);
      } else {
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

          const metaGroup = document.createElement("div");
          metaGroup.className = "item-meta";

          const setsCount = Array.isArray(item.sets) ? item.sets.length : item.sets;
          if (setsCount) {
            const pillSets = document.createElement("span");
            pillSets.className = "badge-pill";
            pillSets.textContent = `${setsCount} séries`;
            metaGroup.appendChild(pillSets);
          }

          if (item.reps || (Array.isArray(item.sets) && item.sets[0] && item.sets[0].targetReps)) {
            const repsVal = item.reps || item.sets[0].targetReps;
            const pillReps = document.createElement("span");
            pillReps.className = "badge-pill";
            pillReps.textContent = `${repsVal} reps`;
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

          if (item.notes) {
            const exNotes = document.createElement("p");
            exNotes.className = "item-notes";
            exNotes.textContent = item.notes;
            exItem.appendChild(exNotes);
          }

          listContainer.appendChild(exItem);
        });

        routineCard.appendChild(listContainer);
      }

      contentView.appendChild(routineCard);
    });
  }

  // Render Nutrition Snapshot
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
    subtitleEl.textContent = plan.targetCalories ? `Meta: ${plan.targetCalories} kcal` : "Plano nutricional personalizado";

    titleCard.appendChild(nameEl);
    titleCard.appendChild(subtitleEl);
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
      mealHeader.style.marginBottom = "12px";

      const mealTitle = document.createElement("h3");
      mealTitle.className = "item-title";
      mealTitle.textContent = meal.name || meal.title || `Refeição ${mIdx + 1}`;

      mealHeader.appendChild(mealTitle);

      if (meal.time || meal.timeFormatted) {
        const pillTime = document.createElement("span");
        pillTime.className = "badge-pill";
        pillTime.textContent = meal.timeFormatted || meal.time;
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

  // Switch Active Tab
  function switchTab(tab) {
    currentTab = tab;

    if (tab === "training") {
      tabTraining.classList.add("active");
      tabNutrition.classList.remove("active");
      renderTrainingView();
    } else {
      tabTraining.classList.remove("active");
      tabNutrition.classList.add("active");
      renderNutritionView();
    }
  }

  // Initialize and Boot Shell
  async function bootOfflineShell() {
    // 1. Check path preference
    const path = window.location.pathname || "";
    if (path.includes("/nutricao")) {
      currentTab = "nutrition";
    } else {
      currentTab = "training";
    }

    const db = await openDatabase();
    if (!db) {
      renderEmptyState(
        "Nenhum conteúdo offline disponível",
        "Conecte-se à internet para sincronizar seu treino e sua alimentação."
      );
      return;
    }

    // 2. Read Active Context
    if (!db.objectStoreNames.contains(OFFLINE_CONTEXT_STORE)) {
      renderEmptyState(
        "Nenhum conteúdo offline disponível",
        "Conecte-se à internet para sincronizar seu treino e sua alimentação."
      );
      return;
    }

    const context = await new Promise((resolve) => {
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

    if (!context || !context.userPublicId || !context.consultancyPublicId) {
      renderEmptyState(
        "Nenhum conteúdo offline disponível",
        "Conecte-se à internet para sincronizar seu treino e sua alimentação."
      );
      return;
    }

    // 3. Validate TTL & Scope
    const now = Date.now();
    const expiry = new Date(context.validUntil).getTime();
    if (isNaN(expiry) || now > expiry) {
      renderEmptyState(
        "Seu acesso offline expirou",
        "Conecte-se à internet para validar e sincronizar suas prescrições novamente."
      );
      return;
    }

    const activeRole = context.role || "STUDENT";

    // 4. Update Header & Profile UI
    if (contextCard && ctxConsultancyName && ctxUserName && ctxSyncTime) {
      ctxConsultancyName.textContent = context.consultancyName || "Trevo One";
      ctxUserName.textContent = context.userName ? `Aluno: ${context.userName}` : "Acesso Offline";
      ctxSyncTime.textContent = `Sincronizado em ${formatDateTime(context.syncedAt)}`;
      contextCard.style.display = "block";
    }

    tabBar.style.display = "flex";

    // 5. Read Training Snapshot via by_scope index
    if (db.objectStoreNames.contains(WORKOUT_SNAPSHOT_STORE)) {
      activeTrainingSnapshot = await new Promise((resolve) => {
        try {
          const tx = db.transaction(WORKOUT_SNAPSHOT_STORE, "readonly");
          const store = tx.objectStore(WORKOUT_SNAPSHOT_STORE);
          const index = store.index("by_scope");
          const req = index.getAll(IDBKeyRange.only([context.userPublicId, context.consultancyPublicId, activeRole]));
          req.onsuccess = () => {
            const list = req.result || [];
            resolve(list.length > 0 ? list[0] : null);
          };
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }

    // 6. Read Nutrition Snapshot by scoped key
    if (db.objectStoreNames.contains(NUTRITION_SNAPSHOT_STORE)) {
      activeNutritionSnapshot = await new Promise((resolve) => {
        try {
          const tx = db.transaction(NUTRITION_SNAPSHOT_STORE, "readonly");
          const store = tx.objectStore(NUTRITION_SNAPSHOT_STORE);
          const req = store.get([context.userPublicId, context.consultancyPublicId, activeRole]);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }

    // 7. Check pending operations count
    if (db.objectStoreNames.contains(PENDING_OPERATIONS_STORE)) {
      pendingOpsCount = await new Promise((resolve) => {
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

      if (pendingOpsCount > 0 && ctxSyncTime) {
        ctxSyncTime.textContent += ` • ${pendingOpsCount} ${pendingOpsCount === 1 ? "alteração pendente" : "alterações pendentes"}`;
      }
    }

    // 8. Initial View
    switchTab(currentTab);
  }

  // Event Listeners
  if (tabTraining) {
    tabTraining.addEventListener("click", () => switchTab("training"));
  }

  if (tabNutrition) {
    tabNutrition.addEventListener("click", () => switchTab("nutrition"));
  }

  if (btnReconnect) {
    btnReconnect.addEventListener("click", () => {
      window.location.reload();
    });
  }


  window.addEventListener("online", () => {
    if (onlineAlert) {
      onlineAlert.style.display = "block";
    }
    if (networkStatusText) {
      networkStatusText.textContent = "Online";
    }
    if (networkBadge) {
      networkBadge.style.backgroundColor = "var(--brand-soft)";
      networkBadge.style.color = "var(--brand)";
      networkBadge.style.borderColor = "var(--brand-border)";
    }
  });

  window.addEventListener("offline", () => {
    if (onlineAlert) {
      onlineAlert.style.display = "none";
    }
    if (networkStatusText) {
      networkStatusText.textContent = "Modo Offline";
    }
    if (networkBadge) {
      networkBadge.style.backgroundColor = "var(--warning-bg)";
      networkBadge.style.color = "var(--warning-text)";
      networkBadge.style.borderColor = "var(--warning-border)";
    }
  });

  // Start Boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootOfflineShell);
  } else {
    bootOfflineShell();
  }
})();
