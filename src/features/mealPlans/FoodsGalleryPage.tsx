import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ImageOff, Search } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import * as mealPlanService from "@/lib/services/mealPlanService";
import { normalizeSearchText } from "@/lib/utils";
import { foodImageUrl } from "@/lib/foodImages";
import { FOOD_CATEGORY_OPTIONS, FOOD_CATEGORY_LABELS, type FoodListItem } from "@/types/mealPlan";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Las fotos vienen empaquetadas con la app (public/food-images/<slug>.webp),
// no de la base ni de Firestore. Si el alimento no tiene foto, onError muestra
// el placeholder.
function FoodImage({ food }: { food: FoodListItem }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-surface-muted">
        <ImageOff className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }
  return (
    <img
      src={foodImageUrl(food.name)}
      alt={food.name}
      loading="lazy"
      onError={() => setFailed(true)}
      className="aspect-square w-full rounded-lg bg-surface-muted object-cover"
    />
  );
}

export function FoodsGalleryPage() {
  const { user } = useAuth();
  const gymId = user?.gymId ?? null;
  const navigate = useNavigate();

  const [foods, setFoods] = useState<FoodListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    if (!gymId) return;
    setLoading(true);
    setError(null);
    try {
      setFoods(await mealPlanService.getFoods(gymId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el catálogo de alimentos.");
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const foodsByCategory = useMemo(() => {
    const term = normalizeSearchText(search.trim());
    const groups = new Map<string, FoodListItem[]>();
    for (const food of foods) {
      if (term && !normalizeSearchText(food.name).includes(term)) continue;
      const list = groups.get(food.category) ?? [];
      list.push(food);
      groups.set(food.category, list);
    }
    return groups;
  }, [foods, search]);

  if (!gymId) {
    return <div className="text-sm text-muted-foreground">No hay un gimnasio asociado a este usuario.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate("/alimentacion")}
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Plan de Alimentación
      </button>

      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Alimentos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fotos del catálogo de alimentos (fijas, no se editan desde acá). El cliente las ve al elegir un alimento
          en la app.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Buscar alimento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando catálogo...</p>
      ) : (
        <div className="flex flex-col gap-8">
          {FOOD_CATEGORY_OPTIONS.map((option) => {
            const items = foodsByCategory.get(option.value) ?? [];
            if (items.length === 0) return null;
            return (
              <div key={option.value}>
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  {FOOD_CATEGORY_LABELS[option.value]} · {items.length}
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {items.map((food) => (
                    <Card key={food.id} className="overflow-hidden p-2">
                      <FoodImage food={food} />
                      <p className="mt-2 line-clamp-2 text-xs font-medium text-foreground">{food.name}</p>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
          {foods.length > 0 && foodsByCategory.size === 0 && (
            <p className="text-sm text-muted-foreground">Sin resultados para "{search}".</p>
          )}
        </div>
      )}
    </div>
  );
}
