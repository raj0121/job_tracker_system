export const normalizeString = (value) => {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
};

export const normalizeNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

export const buildFormData = (
  values,
  {
    fileFields = [],
    jsonFields = [],
    csvFields = [],
    skipFields = [],
    skipEmpty = false
  } = {}
) => {
  const formData = new FormData();

  Object.entries(values).forEach(([key, value]) => {
    if (skipFields.includes(key)) {
      return;
    }

    if (jsonFields.includes(key)) {
      formData.append(key, JSON.stringify(value ?? null));
      return;
    }

    if (csvFields.includes(key)) {
      const csvValue = Array.isArray(value) ? value.join(", ") : String(value || "");
      formData.append(key, csvValue);
      return;
    }

    if (fileFields.includes(key)) {
      if (value) {
        formData.append(key, value);
      }
      return;
    }

    if (skipEmpty && (value === "" || value === null || value === undefined)) {
      return;
    }

    formData.append(key, value ?? "");
  });

  return formData;
};
