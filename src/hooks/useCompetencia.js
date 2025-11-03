"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";

const STORAGE_KEY = "uai:competencia";

function clampMonthSegment(value) {
  if (!value) return null;
  const matches = /^(\d{4})-(\d{2})$/.exec(value);
  if (!matches) return null;
  const normalized = dayjs(`${matches[1]}-${matches[2]}-01`);
  if (!normalized.isValid()) return null;
  return normalized.format("YYYY-MM");
}

export default function useCompetencia(initialValue) {
  const [competencia, setCompetenciaState] = useState(() => {
    const fromInitial = clampMonthSegment(initialValue);
    if (fromInitial) {
      return fromInitial;
    }
    if (typeof window === "undefined") {
      return dayjs().format("YYYY-MM");
    }
    const stored = clampMonthSegment(window.localStorage.getItem(STORAGE_KEY));
    return stored ?? dayjs().format("YYYY-MM");
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, competencia);
  }, [competencia]);

  const setCompetencia = useCallback((nextValue) => {
    const normalized = clampMonthSegment(nextValue);
    if (!normalized) return;
    setCompetenciaState(normalized);
  }, []);

  const goToNextMonth = useCallback(() => {
    setCompetenciaState((current) => dayjs(`${current}-01`).add(1, "month").format("YYYY-MM"));
  }, []);

  const goToPreviousMonth = useCallback(() => {
    setCompetenciaState((current) => dayjs(`${current}-01`).subtract(1, "month").format("YYYY-MM"));
  }, []);

  const helpers = useMemo(
    () => ({
      competencia,
      setCompetencia,
      goToNextMonth,
      goToPreviousMonth,
      competenciaDate: dayjs(`${competencia}-01`),
    }),
    [competencia, goToNextMonth, goToPreviousMonth, setCompetencia],
  );

  return helpers;
}
