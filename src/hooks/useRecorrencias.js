"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { recurrencesApi } from "@/api/api";

const INITIAL_STATE = {
  data: [],
  isLoading: false,
  error: "",
};

export default function useRecorrencias({ usuarioId } = {}) {
  const [state, setState] = useState(INITIAL_STATE);

  const fetchRecorrencias = useCallback(
    async ({ signal, silent = false } = {}) => {
      if (!usuarioId) {
        startTransition(() => {
          setState({
            data: [],
            isLoading: false,
            error: "Usuário não identificado.",
          });
        });
        return;
      }

      startTransition(() => {
        setState((previous) => ({
          ...previous,
          isLoading: silent ? previous.isLoading : true,
          error: "",
        }));
      });

      try {
        const response = await recurrencesApi.list(
          { usuarioId },
          signal ? { signal } : {},
        );
        const payload = response?.data;
        const normalized = Array.isArray(payload?.content)
          ? payload.content
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : [];

        startTransition(() => {
          setState({
            data: normalized,
            isLoading: false,
            error: "",
          });
        });
      } catch (requestError) {
        if (requestError?.code === "ERR_CANCELED" || requestError?.name === "CanceledError") {
          return;
        }

        const message =
          requestError?.response?.data?.message ||
          requestError?.response?.data?.erro ||
          "Não foi possível carregar as recorrências.";

        startTransition(() => {
          setState({
            data: [],
            isLoading: false,
            error: message,
          });
        });
      }
    },
    [usuarioId],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchRecorrencias({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchRecorrencias]);

  const refresh = useCallback(() => {
    fetchRecorrencias({ silent: true });
  }, [fetchRecorrencias]);

  const sortedData = useMemo(() => {
    return [...state.data].sort((a, b) => {
      const firstDate = Number(a?.diaVencimento ?? a?.dia ?? 0);
      const secondDate = Number(b?.diaVencimento ?? b?.dia ?? 0);
      return firstDate - secondDate;
    });
  }, [state.data]);

  return {
    ...state,
    data: sortedData,
    refresh,
  };
}
