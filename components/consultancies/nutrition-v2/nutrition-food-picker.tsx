"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  searchFoodsForPickerAction,
  getFoodPortionsForPickerAction,
} from "@/app/consultoria/[slug]/planos-v2/actions";
import type { FoodListItemDto, FoodWithPortionsDto } from "@/lib/nutrition-v2/food-repository";
import { Button } from "@/components/ui/button";

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

  // Debounced search execution with cancellation guard to prevent race conditions
  useEffect(() => {
    if (!isOpen || activeTab !== "CATALOG" || selectedFood) return;

    let isCurrent = true;
    const timer = setTimeout(() => {
      startSearchTransition(async () => {
        const res = await searchFoodsForPickerAction(slug, query, scopeFilter, page);
        if (isCurrent && res.success && res.data) {
          setItems(res.data.items);
          setTotalPages(res.data.totalPages);
        }
      });
    }, 200);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [isOpen, activeTab, selectedFood, query, scopeFilter, page, slug]);

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
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden depth-surface">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--brand)] flex items-center justify-center shrink-0">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">{title}</h2>
              <p className="text-xs text-[var(--text-secondary)]">Catálogo Trevo One, consultoria ou preparação personalizada</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar"
            className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab switch (only if not currently configuring a selected food) */}
        {!selectedFood && (
          <div className="flex border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]/50 px-5 pt-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("CATALOG")}
              className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
                activeTab === "CATALOG"
                  ? "border-[var(--brand)] text-[var(--brand)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Catálogo de Alimentos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("CUSTOM")}
              className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
                activeTab === "CUSTOM"
                  ? "border-[var(--brand)] text-[var(--brand)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
                    }}
                    placeholder="Buscar no catálogo (ex: Arroz, Frango, Maçã)..."
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors"
                  />
                  <svg className="w-4 h-4 absolute left-3 top-3 text-[var(--text-tertiary)] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
                      scopeFilter === "ALL"
                        ? "bg-[var(--brand)] text-white"
                        : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
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
                    className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
                      scopeFilter === "GLOBAL"
                        ? "bg-[var(--brand)] text-white"
                        : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
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
                    className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
                      scopeFilter === "CONSULTANCY"
                        ? "bg-[var(--brand)] text-white"
                        : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    Minha Consultoria
                  </button>
                </div>
              </div>

              {/* Food List */}
              {isLoadingPortions && (
                <div className="py-3 text-center text-xs text-[var(--brand)] font-medium animate-pulse">
                  Carregando detalhes do alimento...
                </div>
              )}
              {isSearching ? (
                <div className="py-12 text-center text-xs text-[var(--text-secondary)]">Buscando alimentos...</div>
              ) : items.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--text-secondary)]">Nenhum alimento encontrado.</div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {items.map((food) => (
                    <div
                      key={food.publicId}
                      onClick={() => handlePickFood(food)}
                      className="p-3.5 rounded-xl border border-[var(--border-default)] hover:border-[var(--brand)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] cursor-pointer transition-all flex items-center justify-between gap-3 depth-interactive"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate">
                            {food.displayNamePtBr || food.name}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                              food.scope === "GLOBAL"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                            }`}
                          >
                            {food.scope === "GLOBAL" ? "Trevo One" : "Minha Consultoria"}
                          </span>
                          {food.scope === "GLOBAL" && food.sourceKey && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                              {food.sourceKey.startsWith("USDA") ? "USDA" : food.sourceKey === "TACO" ? "TACO" : food.sourceKey}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-2 text-[11px] text-[var(--text-secondary)]">
                          <span>Ref: {food.referenceAmount} {food.referenceUnitCode}</span>
                          <span className="font-bold text-[var(--brand)]">
                            {food.caloriesKcal != null ? `${food.caloriesKcal} kcal` : "-"}
                          </span>
                          <span>P: {food.proteinG != null ? `${food.proteinG}g` : "-"}</span>
                          <span>C: {food.carbohydrateG != null ? `${food.carbohydrateG}g` : "-"}</span>
                          <span>G: {food.fatG != null ? `${food.fatG}g` : "-"}</span>
                          {food.portionsCount > 0 && (
                            <span className="text-[var(--brand)] font-semibold">
                              ({food.portionsCount} {food.portionsCount === 1 ? "porção" : "porções"})
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="text-xs min-h-[32px] shrink-0 pointer-events-none"
                      >
                        Selecionar
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-xs">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="min-h-[32px]"
                  >
                    Anterior
                  </Button>
                  <span className="text-[var(--text-secondary)] font-medium">
                    Página {page} de {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="min-h-[32px]"
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* TAB 1 (Step 2): CONFIGURE PRESCRIBED QUANTITY / PORTION */}
          {activeTab === "CATALOG" && selectedFood && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">
                      {selectedFood.displayNamePtBr || selectedFood.name}
                    </h3>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        selectedFood.scope === "GLOBAL"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                      }`}
                    >
                      {selectedFood.scope === "GLOBAL" ? "Trevo One" : "Minha Consultoria"}
                    </span>
                    {selectedFood.scope === "GLOBAL" && selectedFood.sourceKey && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                        {selectedFood.sourceKey.startsWith("USDA") ? "USDA" : selectedFood.sourceKey === "TACO" ? "TACO" : selectedFood.sourceKey}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
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
                  className="text-xs font-bold text-[var(--brand)] hover:underline shrink-0"
                >
                  Trocar alimento
                </button>
              </div>

              {/* Household portions (if available) */}
              {selectedFood.portions.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">
                    Medida Caseira / Porção:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPortionId("");
                        setUnitCode(selectedFood.referenceUnitCode || "G");
                      }}
                      className={`p-3 rounded-xl border text-left text-xs transition-colors depth-interactive ${
                        !selectedPortionId
                          ? "border-[var(--brand)] bg-[var(--brand)]/10 font-bold text-[var(--brand)]"
                          : "border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                      }`}
                    >
                      <div className="font-bold">Medida Padrão</div>
                      <div className="text-[11px] opacity-80">
                        {selectedFood.referenceAmount} {selectedFood.referenceUnitCode}
                      </div>
                    </button>
                    {selectedFood.portions.map((p) => (
                      <button
                        key={p.publicId}
                        type="button"
                        onClick={() => {
                          setSelectedPortionId(p.publicId);
                          setQuantity("1");
                        }}
                        className={`p-3 rounded-xl border text-left text-xs transition-colors depth-interactive ${
                          selectedPortionId === p.publicId
                            ? "border-[var(--brand)] bg-[var(--brand)]/10 font-bold text-[var(--brand)]"
                            : "border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                        }`}
                      >
                        <div className="font-bold">{p.label}</div>
                        <div className="text-[11px] opacity-80">
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
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    {selectedPortionId ? "Número de porções:" : "Quantidade prescrita:"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors"
                  />
                </div>
                {!selectedPortionId && (
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">Unidade:</label>
                    <select
                      value={unitCode}
                      onChange={(e) => setUnitCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors"
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
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Observações de preparo / consumo (opcional):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: sem sal, cozido no vapor, picado..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors"
                />
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM INLINE ITEM */}
          {activeTab === "CUSTOM" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Nome da preparação / alimento *
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ex: Suco verde detox, Panqueca de aveia caseira..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    Quantidade (opcional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={customQuantity}
                    onChange={(e) => setCustomQuantity(e.target.value)}
                    placeholder="Ex: 1, 200..."
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">Unidade</label>
                  <select
                    value={customUnitCode}
                    onChange={(e) => setCustomUnitCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors"
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
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Ingredientes / Modo de preparo (opcional)
                </label>
                <textarea
                  rows={3}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Ex: 1 folha de couve, 1/2 maçã, 200ml água de coco..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/30">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleClose}
            className="font-semibold min-h-[38px]"
          >
            Cancelar
          </Button>
          {activeTab === "CATALOG" && selectedFood && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmLibraryFood}
              className="font-bold min-h-[38px] shadow-sm"
            >
              Adicionar ao Plano
            </Button>
          )}
          {activeTab === "CUSTOM" && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmCustom}
              className="font-bold min-h-[38px] shadow-sm"
            >
              Adicionar Customizado
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
