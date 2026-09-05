"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  searchFoodsForPickerAction,
  getFoodPortionsForPickerAction,
} from "@/app/consultoria/[slug]/planos-v2/actions";
import type { FoodListItemDto, FoodWithPortionsDto } from "@/lib/nutrition-v2/food-repository";

export interface FoodSelectionResult {
  foodPublicId?: string | null;
  customName?: string | null;
  prescribedQuantity?: number | null;
  prescribedUnitCode?: string | null;
  prescribedUnitLabel?: string | null;
  portionPublicId?: string | null;
  notes?: string | null;
}

interface NutritionFoodPickerProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (result: FoodSelectionResult) => void;
  title?: string;
}

const CANONICAL_UNITS = [
  { code: "G", label: "Gramas (g)" },
  { code: "KG", label: "Quilogramas (kg)" },
  { code: "ML", label: "Mililitros (ml)" },
  { code: "L", label: "Litros (l)" },
  { code: "UNIDADE", label: "Unidade(s)" },
  { code: "FATIA", label: "Fatia(s)" },
  { code: "COLHER_SOPA", label: "Colher(es) de sopa" },
  { code: "COLHER_CHA", label: "Colher(es) de chá" },
  { code: "XICARA", label: "Xícara(s)" },
  { code: "SCOOP", label: "Scoop(s)" },
  { code: "PORCAO", label: "Porção" },
];

export function NutritionFoodPicker({
  slug,
  isOpen,
  onClose,
  onSelect,
  title = "Adicionar Alimento",
}: NutritionFoodPickerProps) {
  const [activeTab, setActiveTab] = useState<"CATALOG" | "CUSTOM">("CATALOG");

  // Catalog search state
  const [query, setQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "GLOBAL" | "CONSULTANCY">("ALL");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<FoodListItemDto[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isSearching, startSearchTransition] = useTransition();

  // Selection & prescription state
  const [selectedFood, setSelectedFood] = useState<FoodWithPortionsDto | null>(null);
  const [isLoadingPortions, setIsLoadingPortions] = useState(false);
  const [selectedPortionId, setSelectedPortionId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("100");
  const [unitCode, setUnitCode] = useState<string>("G");
  const [notes, setNotes] = useState<string>("");

  // Custom inline state
  const [customName, setCustomName] = useState<string>("");
  const [customQuantity, setCustomQuantity] = useState<string>("");
  const [customUnitCode, setCustomUnitCode] = useState<string>("UNIDADE");
  const [customNotes, setCustomNotes] = useState<string>("");

  // Search execution
  const doSearch = useCallback((q: string, sc: "ALL" | "GLOBAL" | "CONSULTANCY", p: number) => {
    startSearchTransition(async () => {
      const res = await searchFoodsForPickerAction(slug, q, sc, p);
      if (res.success && res.data) {
        setItems(res.data.items);
        setTotalPages(res.data.totalPages);
      }
    });
  }, [slug]);

  useEffect(() => {
    if (isOpen && activeTab === "CATALOG" && !selectedFood) {
      doSearch(query, scopeFilter, page);
    }
  }, [isOpen, activeTab, scopeFilter, page, query, selectedFood, doSearch]);

  // Handle food selection
  const handlePickFood = async (foodItem: FoodListItemDto) => {
    setIsLoadingPortions(true);
    const res = await getFoodPortionsForPickerAction(slug, foodItem.publicId);
    setIsLoadingPortions(false);

    if (res.success && res.data) {
      setSelectedFood(res.data);
      setQuantity(String(res.data.referenceAmount || 100));
      setUnitCode(res.data.referenceUnitCode || "G");
      setSelectedPortionId("");
      setNotes("");
    }
  };

  const handleConfirmLibraryFood = () => {
    if (!selectedFood) return;

    const numQty = parseFloat(quantity.replace(",", "."));
    if (isNaN(numQty) || numQty <= 0) {
      alert("Informe uma quantidade válida e positiva.");
      return;
    }

    let unitLabel = "";
    if (selectedPortionId) {
      const p = selectedFood.portions.find((pt) => pt.publicId === selectedPortionId);
      if (p) unitLabel = p.label;
    } else {
      const u = CANONICAL_UNITS.find((un) => un.code === unitCode);
      unitLabel = u ? u.label : unitCode;
    }

    onSelect({
      foodPublicId: selectedFood.publicId,
      prescribedQuantity: numQty,
      prescribedUnitCode: selectedPortionId ? "PORCAO" : unitCode,
      prescribedUnitLabel: unitLabel,
      portionPublicId: selectedPortionId || null,
      notes: notes.trim() || null,
    });

    handleClose();
  };

  const handleConfirmCustom = () => {
    if (!customName.trim()) {
      alert("O nome do alimento customizado é obrigatório.");
      return;
    }

    const numQty = customQuantity ? parseFloat(customQuantity.replace(",", ".")) : null;
    const u = CANONICAL_UNITS.find((un) => un.code === customUnitCode);
    const unitLabel = u ? u.label : customUnitCode;

    onSelect({
      customName: customName.trim(),
      prescribedQuantity: numQty && numQty > 0 ? numQty : null,
      prescribedUnitCode: customQuantity ? customUnitCode : null,
      prescribedUnitLabel: customQuantity ? unitLabel : null,
      notes: customNotes.trim() || null,
    });

    handleClose();
  };

  const handleClose = () => {
    setSelectedFood(null);
    setSelectedPortionId("");
    setQuantity("100");
    setUnitCode("G");
    setNotes("");
    setCustomName("");
    setCustomQuantity("");
    setCustomNotes("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
              <p className="text-xs text-[var(--text-muted)]">Catálogo Trevo One, consultoria ou preparação personalizada</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-secondary)]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab switch (only if not currently configuring a selected food) */}
        {!selectedFood && (
          <div className="flex border-b border-[var(--border)] bg-[var(--surface-secondary)]/50 px-5 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab("CATALOG")}
              className={`pb-2.5 px-4 text-xs font-medium border-b-2 transition-colors ${
                activeTab === "CATALOG"
                  ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Catálogo de Alimentos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("CUSTOM")}
              className={`pb-2.5 px-4 text-xs font-medium border-b-2 transition-colors ${
                activeTab === "CUSTOM"
                  ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Preparação Customizada
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: CATALOG */}
          {activeTab === "CATALOG" && !selectedFood && (
            <div className="space-y-4">
              {/* Search & Scope Filter */}
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                      doSearch(e.target.value, scopeFilter, 1);
                    }}
                    placeholder="Buscar no catálogo (ex: Arroz, Frango, Maçã)..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                  />
                  <svg className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <div className="flex gap-1.5 overflow-x-auto text-xs pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setScopeFilter("ALL");
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                      scopeFilter === "ALL"
                        ? "bg-[var(--brand-primary)] text-white"
                        : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScopeFilter("GLOBAL");
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                      scopeFilter === "GLOBAL"
                        ? "bg-[var(--brand-primary)] text-white"
                        : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
                    }`}
                  >
                    Trevo One
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScopeFilter("CONSULTANCY");
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                      scopeFilter === "CONSULTANCY"
                        ? "bg-[var(--brand-primary)] text-white"
                        : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
                    }`}
                  >
                    Minha Consultoria
                  </button>
                </div>
              </div>

              {/* Food List */}
              {isLoadingPortions && (
                <div className="py-3 text-center text-xs text-[var(--brand-primary)] font-medium animate-pulse">
                  Carregando detalhes do alimento...
                </div>
              )}
              {isSearching ? (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">Buscando alimentos...</div>
              ) : items.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">Nenhum alimento encontrado.</div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {items.map((food) => (
                    <div
                      key={food.publicId}
                      onClick={() => handlePickFood(food)}
                      className="p-3 rounded-xl border border-[var(--border)] hover:border-[var(--brand-primary)] bg-[var(--surface-primary)] hover:bg-[var(--surface-secondary)]/50 cursor-pointer transition-all flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] truncate">
                            {food.name}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                              food.scope === "GLOBAL"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                            }`}
                          >
                            {food.scope === "GLOBAL" ? "Trevo One" : "Minha Consultoria"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-2 text-[11px] text-[var(--text-secondary)]">
                          <span>Ref: {food.referenceAmount} {food.referenceUnitCode}</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {food.caloriesKcal != null ? `${food.caloriesKcal} kcal` : "-"}
                          </span>
                          <span>P: {food.proteinG != null ? `${food.proteinG}g` : "-"}</span>
                          <span>C: {food.carbohydrateG != null ? `${food.carbohydrateG}g` : "-"}</span>
                          <span>G: {food.fatG != null ? `${food.fatG}g` : "-"}</span>
                          {food.portionsCount > 0 && (
                            <span className="text-[var(--brand-primary)] font-medium">
                              ({food.portionsCount} {food.portionsCount === 1 ? "porção" : "porções"})
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="px-2.5 py-1 text-xs rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-primary)] font-medium shrink-0"
                      >
                        Selecionar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded bg-[var(--surface-secondary)] border border-[var(--border)] disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="text-[var(--text-muted)] font-medium">
                    Página {page} de {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 rounded bg-[var(--surface-secondary)] border border-[var(--border)] disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 1 (Step 2): CONFIGURE PRESCRIBED QUANTITY / PORTION */}
          {activeTab === "CATALOG" && selectedFood && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-[var(--text-primary)]">{selectedFood.name}</h3>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        selectedFood.scope === "GLOBAL"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {selectedFood.scope === "GLOBAL" ? "Trevo One" : "Minha Consultoria"}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Referência: {selectedFood.referenceAmount} {selectedFood.referenceUnitCode} ·{" "}
                    {selectedFood.caloriesKcal != null ? `${selectedFood.caloriesKcal} kcal` : "-"} ·{" "}
                    P: {selectedFood.proteinG != null ? `${selectedFood.proteinG}g` : "-"} ·{" "}
                    C: {selectedFood.carbohydrateG != null ? `${selectedFood.carbohydrateG}g` : "-"} ·{" "}
                    G: {selectedFood.fatG != null ? `${selectedFood.fatG}g` : "-"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFood(null)}
                  className="text-xs text-[var(--brand-primary)] hover:underline"
                >
                  Trocar alimento
                </button>
              </div>

              {/* Household portions (if available) */}
              {selectedFood.portions.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Medida Caseira / Porção:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPortionId("");
                        setUnitCode(selectedFood.referenceUnitCode || "G");
                      }}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-colors ${
                        !selectedPortionId
                          ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 font-semibold text-[var(--brand-primary)]"
                          : "border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
                      }`}
                    >
                      Medida Padrão ({selectedFood.referenceAmount} {selectedFood.referenceUnitCode})
                    </button>
                    {selectedFood.portions.map((p) => (
                      <button
                        key={p.publicId}
                        type="button"
                        onClick={() => {
                          setSelectedPortionId(p.publicId);
                          setQuantity("1");
                        }}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-colors ${
                          selectedPortionId === p.publicId
                            ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 font-semibold text-[var(--brand-primary)]"
                            : "border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
                        }`}
                      >
                        <div>{p.label}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          Equiv. {p.equivalentReferenceAmount} {selectedFood.referenceUnitCode}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    {selectedPortionId ? "Número de porções:" : "Quantidade prescrita:"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                  />
                </div>
                {!selectedPortionId && (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Unidade:</label>
                    <select
                      value={unitCode}
                      onChange={(e) => setUnitCode(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                    >
                      {CANONICAL_UNITS.map((u) => (
                        <option key={u.code} value={u.code}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Observações de preparo / consumo (opcional):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: sem sal, cozido no vapor, picado..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                />
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM INLINE ITEM */}
          {activeTab === "CUSTOM" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Nome da preparação / alimento: *
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ex: Suco verde detox, Panqueca de aveia caseira..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Quantidade (opcional):
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={customQuantity}
                    onChange={(e) => setCustomQuantity(e.target.value)}
                    placeholder="Ex: 1, 200..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Unidade:</label>
                  <select
                    value={customUnitCode}
                    onChange={(e) => setCustomUnitCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                  >
                    {CANONICAL_UNITS.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Ingredientes / Modo de preparo (opcional):
                </label>
                <textarea
                  rows={3}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Ex: 1 folha de couve, 1/2 maçã, 200ml água de coco..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)] resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--border)] bg-[var(--surface-secondary)]/30">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] rounded-xl border border-[var(--border)]"
          >
            Cancelar
          </button>
          {activeTab === "CATALOG" && selectedFood && (
            <button
              type="button"
              onClick={handleConfirmLibraryFood}
              className="px-4 py-2 text-xs font-medium bg-[var(--brand-primary)] text-white rounded-xl hover:opacity-90 shadow-sm"
            >
              Adicionar ao Plano
            </button>
          )}
          {activeTab === "CUSTOM" && (
            <button
              type="button"
              onClick={handleConfirmCustom}
              className="px-4 py-2 text-xs font-medium bg-[var(--brand-primary)] text-white rounded-xl hover:opacity-90 shadow-sm"
            >
              Adicionar Customizado
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
