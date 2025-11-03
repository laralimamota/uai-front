"use client";

import dayjs from "dayjs";
import "dayjs/locale/pt-br";

dayjs.locale("pt-br");

export default function MonthSelector({ competencia, onPrevious, onNext }) {
  const formatted = dayjs(`${competencia}-01`).format("MMMM [de] YYYY");

  return (
    <div className="month-selector d-flex align-items-center justify-content-between gap-3 mb-4">
      <button
        type="button"
        className="btn btn-outline-light month-selector__button"
        onClick={onPrevious}
      >
        ← Mês anterior
      </button>
      <span className="month-selector__label text-uppercase fw-semibold">{formatted}</span>
      <button
        type="button"
        className="btn btn-outline-light month-selector__button"
        onClick={onNext}
      >
        Próximo mês →
      </button>
    </div>
  );
}
