"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { installmentsApi } from "@/api/api";

const INITIAL_STATE = {
  data: [],
  isLoading: false,
  error: "",
};

export default function useParcelamentos({ usuarioId } = {}) {
  const [state, setState] = useState(INITIAL_STATE);

  const fetchParcelamentos = useCallback(
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
        const response = await installmentsApi.list(
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
          "Não foi possível carregar os parcelamentos.";

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
    fetchParcelamentos({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchParcelamentos]);

  const refresh = useCallback(() => {
    fetchParcelamentos({ silent: true });
  }, [fetchParcelamentos]);

  const sortedData = useMemo(() => {
    return [...state.data].sort((a, b) => {
      const totalA = Number(a?.quantidadeParcelas ?? a?.qtdParcelas ?? a?.totalParcelas ?? 0);
      const paidA = Number(a?.parcelasPagas ?? a?.pagas ?? a?.parcelasQuitadas ?? 0);
      const totalB = Number(b?.quantidadeParcelas ?? b?.qtdParcelas ?? b?.totalParcelas ?? 0);
      const paidB = Number(b?.parcelasPagas ?? b?.pagas ?? b?.parcelasQuitadas ?? 0);
      const ratioA = totalA > 0 ? paidA / totalA : 0;
      const ratioB = totalB > 0 ? paidB / totalB : 0;
      return ratioB - ratioA;
    });
  }, [state.data]);

  return {
    ...state,
    data: sortedData,
    refresh,
  };
}
