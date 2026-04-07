import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useDebouncedValue from "./useDebouncedValue";

export const useListController = ({ initialFilters = {} } = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);

  const filters = useMemo(() => {
    const nextFilters = { ...initialFilters };
    Object.keys(initialFilters).forEach((key) => {
      nextFilters[key] = searchParams.get(key) || initialFilters[key] || "";
    });
    return nextFilters;
  }, [initialFilters, searchParams]);

  const [search, setSearch] = useState(filters.search || "");
  const debouncedSearch = useDebouncedValue(search, 400);

  const updateParams = (updates) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        nextParams.set(key, value);
      } else {
        nextParams.delete(key);
      }
    });
    setSearchParams(nextParams);
  };

  const setSearchValue = (value) => {
    setSearch(value);
    updateParams({ search: value });
    setPage(1);
  };

  const setFilterValue = (name, value) => {
    updateParams({ [name]: value });
    setPage(1);
  };

  return {
    page,
    setPage,
    search,
    setSearch: setSearchValue,
    debouncedSearch,
    filters,
    setFilterValue,
    searchParams
  };
};
