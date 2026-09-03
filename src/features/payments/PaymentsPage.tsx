import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DollarSign, Eye, Hash, Pencil, Plus, Search, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import * as clientService from "@/lib/services/clientService";
import * as paymentService from "@/lib/services/paymentService";
import { filterPayments } from "@/lib/domain/paymentFilters";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  DEFAULT_PAYMENT_FILTERS,
  type PaymentFilters,
  type PaymentListItem,
} from "@/types/payment";
import type { ClientListItem } from "@/types/client";
import { PAYMENT_METHOD_LABELS } from "@/types/membership";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { PaymentStatusBadge } from "@/components/StatusBadges";
import { PaymentFormModal } from "./PaymentFormModal";
import { PaymentDetailModal } from "./PaymentDetailModal";
import { PaymentEditModal } from "./PaymentEditModal";

export function PaymentsPage() {
  const { user } = useAuth();
  const gymId = user?.gymId ?? null;
  const [searchParams] = useSearchParams();

  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [payments, setPayments] = useState<PaymentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PaymentFilters>(DEFAULT_PAYMENT_FILTERS);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "PAID" || status === "PENDING") {
      setFilters((prev) => ({ ...prev, status }));
    }
  }, [searchParams]);

  const [formOpen, setFormOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<PaymentListItem | null>(null);
  const [editTarget, setEditTarget] = useState<PaymentListItem | null>(null);

  const loadData = useCallback(async () => {
    if (!gymId) return;
    setLoading(true);
    setError(null);
    try {
      const [clientsData, paymentsData] = await Promise.all([
        clientService.getClients(gymId),
        paymentService.getPayments(gymId),
      ]);
      setClients(clientsData);
      setPayments(paymentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la información de pagos.");
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = today.slice(0, 7);

    let totalCollected = 0;
    let paymentsToday = 0;
    let paymentsThisMonth = 0;

    for (const payment of payments) {
      if (payment.status === "PAID") {
        totalCollected += payment.amount;
        if (payment.date === today) paymentsToday += 1;
        if (payment.date.slice(0, 7) === thisMonth) paymentsThisMonth += 1;
      }
    }

    return { totalCollected, paymentsToday, paymentsThisMonth, totalCount: payments.length };
  }, [payments]);

  const filteredPayments = useMemo(() => filterPayments(payments, filters), [payments, filters]);

  if (!gymId) {
    return <div className="text-sm text-muted-foreground">No hay un gimnasio asociado a este usuario.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Pagos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta y registra los pagos de los clientes de tu gimnasio.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Registrar pago
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total recaudado" value={formatCurrency(summary.totalCollected)} icon={DollarSign} tone="success" />
        <StatCard label="Pagos de hoy" value={summary.paymentsToday.toLocaleString("es-CO")} icon={Wallet} tone="primary" delay={0.05} />
        <StatCard label="Pagos del mes" value={summary.paymentsThisMonth.toLocaleString("es-CO")} icon={Wallet} tone="primary" delay={0.1} />
        <StatCard label="Cantidad de pagos" value={summary.totalCount.toLocaleString("es-CO")} icon={Hash} tone="primary" delay={0.15} />
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Buscar por cliente, documento o concepto..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 lg:w-[640px] lg:shrink-0">
            <Select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value as PaymentFilters["status"] }))
              }
            >
              <option value="ALL">Todos los estados</option>
              <option value="PAID">Pagado</option>
              <option value="PENDING">Pendiente</option>
            </Select>
            <Select
              value={filters.method}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, method: e.target.value as PaymentFilters["method"] }))
              }
            >
              <option value="ALL">Todos los métodos</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              title="Desde"
            />
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              title="Hasta"
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {error && <div className="px-6 py-4 text-sm text-danger">{error}</div>}

        {!error && loading && (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            Cargando pagos...
          </div>
        )}

        {!error && !loading && filteredPayments.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {payments.length === 0
                ? "Aún no hay pagos registrados."
                : "No se encontraron pagos con estos filtros."}
            </p>
            {payments.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Registra el primero con el botón "Registrar pago".
              </p>
            )}
          </div>
        )}

        {!error && !loading && filteredPayments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Cliente</th>
                  <th className="px-3 py-3 font-medium">Concepto</th>
                  <th className="px-3 py-3 font-medium">Membresía</th>
                  <th className="px-3 py-3 font-medium">Fecha</th>
                  <th className="px-3 py-3 font-medium">Valor</th>
                  <th className="px-3 py-3 font-medium">Método</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                  <th className="px-6 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-6 py-3 font-medium text-foreground">{payment.clientName}</td>
                    <td className="px-3 py-3 text-muted-foreground">{payment.concept || "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{payment.planName ?? "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{formatDate(payment.date)}</td>
                    <td className="px-3 py-3 text-muted-foreground">{formatCurrency(payment.amount)}</td>
                    <td className="px-3 py-3 text-muted-foreground">{PAYMENT_METHOD_LABELS[payment.method]}</td>
                    <td className="px-3 py-3">
                      <PaymentStatusBadge status={payment.status} />
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="Ver"
                          onClick={() => setDetailTarget(payment)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => setEditTarget(payment)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PaymentFormModal
        open={formOpen}
        gymId={gymId}
        clients={clients}
        onClose={() => setFormOpen(false)}
        onSaved={loadData}
      />

      <PaymentDetailModal
        open={detailTarget !== null}
        payment={detailTarget}
        onClose={() => setDetailTarget(null)}
      />

      <PaymentEditModal
        open={editTarget !== null}
        gymId={gymId}
        payment={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={loadData}
      />
    </div>
  );
}
