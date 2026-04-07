export const resolvePagePagination = (query = {}, options = {}) => {
  const defaultLimit = Number(options.defaultLimit) || 50;
  const maxLimit = Number(options.maxLimit) || 500;
  const rawPage = query?.page;
  const enabled = rawPage !== undefined && rawPage !== null && rawPage !== "";
  const page = Math.max(1, Number(rawPage) || 1);
  const limit = Math.max(1, Math.min(maxLimit, Number(query?.limit) || defaultLimit));

  return {
    enabled,
    page,
    limit,
    offset: (page - 1) * limit
  };
};

export const buildPageResult = (rows, count, pagination) => ({
  data: rows,
  pagination: {
    currentPage: pagination.page,
    totalPages: count ? Math.ceil(count / pagination.limit) : 0,
    totalItems: count,
    limit: pagination.limit,
    hasNextPage: pagination.page * pagination.limit < count
  }
});
