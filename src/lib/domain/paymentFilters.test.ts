import { describe, expect, it } from "vitest";
import { filterPayments } from "./paymentFilters";
import { DEFAULT_PAYMENT_FILTERS, type PaymentListItem } from "@/types/payment";

const PAYMENTS: PaymentListItem[] = [
  {
    id: "p1",
    clientId: "c1",
    clientName: "Juan Pérez",
    clientDocument: "1122334455",
    membershipId: "m1",
    planName: "Mensual",
    amount: 80000,
    date: "2026-08-05",
    method: "CASH",
    status: "PAID",
    concept: "Pago de membresía: Mensual",
  },
  {
    id: "p2",
    clientId: "c2",
    clientName: "María Gómez",
    clientDocument: "2233445566",
    membershipId: "m2",
    planName: "Trimestral",
    amount: 210000,
    date: "2026-08-20",
    method: "TRANSFER",
    status: "PAID",
    concept: "Pago trimestral",
  },
  {
    id: "p3",
    clientId: "c1",
    clientName: "Juan Pérez",
    clientDocument: "1122334455",
    membershipId: null,
    planName: null,
    amount: 20000,
    date: "2026-09-01",
    method: "OTHER",
    status: "PENDING",
    concept: "Inscripción",
  },
];

describe("filterPayments", () => {
  it("sin filtros devuelve todos", () => {
    expect(filterPayments(PAYMENTS, DEFAULT_PAYMENT_FILTERS)).toHaveLength(3);
  });

  it("busca por nombre de cliente", () => {
    const result = filterPayments(PAYMENTS, { ...DEFAULT_PAYMENT_FILTERS, search: "maría" });
    expect(result.map((p) => p.id)).toEqual(["p2"]);
  });

  it("busca por documento", () => {
    const result = filterPayments(PAYMENTS, { ...DEFAULT_PAYMENT_FILTERS, search: "2233445566" });
    expect(result.map((p) => p.id)).toEqual(["p2"]);
  });

  it("busca por concepto", () => {
    const result = filterPayments(PAYMENTS, { ...DEFAULT_PAYMENT_FILTERS, search: "inscripción" });
    expect(result.map((p) => p.id)).toEqual(["p3"]);
  });

  it("filtra por método de pago", () => {
    const result = filterPayments(PAYMENTS, { ...DEFAULT_PAYMENT_FILTERS, method: "TRANSFER" });
    expect(result.map((p) => p.id)).toEqual(["p2"]);
  });

  it("filtra por rango de fechas (inclusive en ambos extremos)", () => {
    const result = filterPayments(PAYMENTS, {
      ...DEFAULT_PAYMENT_FILTERS,
      dateFrom: "2026-08-06",
      dateTo: "2026-08-31",
    });
    expect(result.map((p) => p.id)).toEqual(["p2"]);
  });

  it("combina búsqueda + método + rango de fechas", () => {
    const result = filterPayments(PAYMENTS, {
      search: "juan",
      method: "CASH",
      status: "ALL",
      dateFrom: "2026-08-01",
      dateTo: "2026-08-31",
    });
    expect(result.map((p) => p.id)).toEqual(["p1"]);
  });

  it("filtra por estado (pendiente)", () => {
    const result = filterPayments(PAYMENTS, { ...DEFAULT_PAYMENT_FILTERS, status: "PENDING" });
    expect(result.map((p) => p.id)).toEqual(["p3"]);
  });
});
