import Button from "./Button";

const buildPageNumbers = (currentPage, totalPages) => {
  if (!totalPages || totalPages <= 1) {
    return [];
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
};

const Pagination = ({
  currentPage = 1,
  totalPages = 0,
  onPageChange,
  disabled = false
}) => {
  const pages = buildPageNumbers(currentPage, totalPages);

  if (!totalPages || totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination">
      <Button
        variant="secondary"
        disabled={disabled || currentPage <= 1}
        onClick={() => onPageChange?.(currentPage - 1)}
      >
        Previous
      </Button>

      <div className="pagination-pages">
        {pages.map((page) => (
          <Button
            key={page}
            variant={page === currentPage ? "primary" : "secondary"}
            disabled={disabled && page !== currentPage}
            onClick={() => onPageChange?.(page)}
          >
            {page}
          </Button>
        ))}
      </div>

      <Button
        variant="secondary"
        disabled={disabled || currentPage >= totalPages}
        onClick={() => onPageChange?.(currentPage + 1)}
      >
        Next
      </Button>
    </div>
  );
};

export default Pagination;
