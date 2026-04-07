import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { exportToExcel } from "../../utils/exportToExcel";

const ExportExcelButton = ({
  filename,
  data,
  getData,
  disabled = false,
  label = "Export Excel",
  className = "btn-secondary",
  sheetName,
  excludedFields,
  onError
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");

  const handleExport = async () => {
    if (disabled || isExporting) {
      return;
    }

    setIsExporting(true);
    setError("");

    try {
      const records = typeof getData === "function" ? await getData() : data;
      await exportToExcel(records, filename, {
        sheetName,
        excludedFields
      });
    } catch (exportError) {
      const message = exportError?.message || "Failed to export records";
      setError(message);
      if (typeof onError === "function") {
        onError(exportError);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="grid gap-1.5">
      <button
        type="button"
        className={className}
        onClick={handleExport}
        disabled={disabled || isExporting}
      >
        <FileSpreadsheet size={16} /> {isExporting ? "Exporting..." : label}
      </button>

      {error && (
        <span className="text-xs text-rose-600">
          {error}
        </span>
      )}
    </div>
  );
};

export default ExportExcelButton;
