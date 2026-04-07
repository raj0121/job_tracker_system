const SOURCE_REGEX = /\/\*\s*source\s*:\s*([^\*]+?)\s*\*\//i;

export const attachQuerySource = (sql, source) => {
  if (!source) {
    return sql;
  }

  const trimmed = String(sql || "").trim();
  return `/* source: ${source} */ ${trimmed}`;
};

export const extractQuerySource = (sql) => {
  if (!sql) {
    return null;
  }

  const match = String(sql).match(SOURCE_REGEX);
  return match ? match[1].trim() : null;
};
