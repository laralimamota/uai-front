import dayjs from "dayjs";
import "dayjs/locale/pt-br";

dayjs.locale("pt-br");

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrency(value) {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) {
    return currencyFormatter.format(0);
  }
  return currencyFormatter.format(numericValue);
}

export function formatDate(value, fallback = "-") {
  if (!value) return fallback;
  const parsed = dayjs(value);
  if (!parsed.isValid()) return fallback;
  return parsed.format("DD MMM YYYY");
}

export function formatMonth(value, fallback = "-") {
  if (!value) return fallback;
  const parsed = dayjs(`${value}-01`);
  if (!parsed.isValid()) return fallback;
  return parsed.format("MMMM [de] YYYY");
}

export function getTodayISO() {
  return dayjs().format("YYYY-MM-DD");
}

export function normalizeStatus(value) {
  if (!value) return "pendente";
  const normalized = String(value).toLowerCase();
  if (normalized.includes("pago") || normalized.includes("paid")) {
    return "pago";
  }
  return "pendente";
}
