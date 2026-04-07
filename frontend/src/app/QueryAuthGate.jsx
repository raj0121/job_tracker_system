import { useEffect } from "react";
import { onlineManager, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";

const QueryAuthGate = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const allowQueries = isAuthenticated && !loading;
    onlineManager.setOnline(allowQueries);

    if (!allowQueries) {
      queryClient.cancelQueries();
      return;
    }

    queryClient.invalidateQueries();
  }, [isAuthenticated, loading, queryClient]);

  return children;
};

export default QueryAuthGate;
