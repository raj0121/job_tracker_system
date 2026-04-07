const SENSITIVE_FIELD_FRAGMENTS = [
  "password",
  "token",
  "secret",
  "hash",
  "salt",
  "otp",
  "mfa",
  "session",
  "cookie",
  "csrf",
  "deletedat",
  "deleted_at",
  "metadata"
];

const isPlainObject = (value) => Object.prototype.toString.call(value) === "[object Object]";

const normalizeFieldToken = (field) => String(field || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const shouldExcludeField = (field, excludedFields = []) => {
  const normalizedField = normalizeFieldToken(field);
  if (!normalizedField) {
    return false;
  }

  const normalizedExcludedFields = excludedFields.map((item) => normalizeFieldToken(item));
  if (normalizedExcludedFields.includes(normalizedField)) {
    return true;
  }

  return SENSITIVE_FIELD_FRAGMENTS.some((fragment) => normalizedField.includes(fragment));
};

const humanizeSegment = (segment) => (
  String(segment || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
);

export const humanizeFieldName = (field) => (
  String(field || "")
    .split(".")
    .filter(Boolean)
    .map(humanizeSegment)
    .join(" ")
);

const sanitizeArrayValue = (value, excludedFields) => {
  if (!Array.isArray(value)) {
    return value;
  }

  if (value.every((item) => !isPlainObject(item))) {
    return value.join(", ");
  }

  return JSON.stringify(
    value.map((item) => {
      if (!isPlainObject(item)) {
        return item;
      }

      const nested = {};
      Object.entries(item).forEach(([key, nestedValue]) => {
        if (!shouldExcludeField(key, excludedFields)) {
          nested[key] = nestedValue;
        }
      });
      return nested;
    })
  );
};

const flattenRecord = (record, excludedFields = [], prefix = "", target = {}) => {
  if (!isPlainObject(record)) {
    return target;
  }

  Object.entries(record).forEach(([key, value]) => {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    if (shouldExcludeField(fieldPath, excludedFields) || shouldExcludeField(key, excludedFields)) {
      return;
    }

    if (value === null || value === undefined) {
      target[fieldPath] = "";
      return;
    }

    if (Array.isArray(value)) {
      target[fieldPath] = sanitizeArrayValue(value, excludedFields);
      return;
    }

    if (isPlainObject(value)) {
      flattenRecord(value, excludedFields, fieldPath, target);
      return;
    }

    if (typeof value === "boolean") {
      target[fieldPath] = value ? "Yes" : "No";
      return;
    }

    target[fieldPath] = value;
  });

  return target;
};

const getColumnOrder = (rows) => {
  const seen = new Set();
  const columns = [];

  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    });
  });

  return columns;
};

const normalizeCellValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return value;
};

const buildWorksheetRows = (rows, columns) => {
  const headers = columns.map((column) => humanizeFieldName(column));
  const body = rows.map((row) => columns.map((column) => normalizeCellValue(row[column])));
  return [headers, ...body];
};

const buildColumnWidths = (rows, columns) => (
  columns.map((column) => {
    const headerLength = humanizeFieldName(column).length;
    const contentLength = rows.reduce((longest, row) => {
      const value = normalizeCellValue(row[column]);
      return Math.max(longest, String(value || "").length);
    }, 0);

    return {
      wch: Math.min(Math.max(headerLength, contentLength, 12), 42)
    };
  })
);

const normalizeFilename = (filename) => {
  const baseName = String(filename || "export").trim() || "export";
  return baseName.toLowerCase().endsWith(".xlsx") ? baseName : `${baseName}.xlsx`;
};

export const prepareExportRows = (data, options = {}) => {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .filter((item) => isPlainObject(item))
    .map((item) => flattenRecord(item, options.excludedFields || []))
    .filter((item) => Object.keys(item).length > 0);
};

export const exportToExcel = async (data, filename, options = {}) => {
  const rows = prepareExportRows(data, options);
  if (!rows.length) {
    throw new Error("No data available for export");
  }

  const columns = getColumnOrder(rows);
  const worksheetRows = buildWorksheetRows(rows, columns);
  const XLSXModule = await import("xlsx");
  const XLSX = XLSXModule.default || XLSXModule;
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetRows);
  worksheet["!cols"] = buildColumnWidths(rows, columns);

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    options.sheetName || "Export"
  );

  XLSX.writeFile(workbook, normalizeFilename(filename));
};

export const collectPaginatedData = async ({
  fetchPage,
  initialPageParam = 1,
  getItems = (payload) => payload?.data || [],
  getNextPageParam,
  maxPages = 1000,
  onProgress
}) => {
  if (typeof fetchPage !== "function") {
    throw new Error("fetchPage must be a function");
  }

  if (typeof getNextPageParam !== "function") {
    throw new Error("getNextPageParam must be a function");
  }

  let pageParam = initialPageParam;
  let pageCount = 0;
  const records = [];

  while (pageCount < maxPages) {
    const payload = await fetchPage(pageParam);
    const items = getItems(payload, pageParam) || [];
    records.push(...items);
    pageCount += 1;

    if (typeof onProgress === "function") {
      onProgress({
        pageCount,
        pageParam,
        fetchedCount: items.length,
        totalCount: records.length
      });
    }

    const nextPageParam = getNextPageParam(payload, pageParam, items);
    if (nextPageParam === null || nextPageParam === undefined || nextPageParam === false) {
      return records;
    }

    pageParam = nextPageParam;
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
  }

  throw new Error("Export exceeded the maximum number of pages");
};
