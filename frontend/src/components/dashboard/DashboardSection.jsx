import { Suspense } from "react";
import ErrorBoundary from "./ErrorBoundary";
import Skeleton from "../ui/Skeleton";
import Card from "../ui/Card";

/**
 * A standard wrapper for dashboard sections.
 * Handles loading behavior (Suspense) and error boundaries.
 */
const DashboardSection = ({ 
  children, 
  loading = false, 
  error = null, 
  fallback = <Skeleton className="h-64 w-full" />,
  errorMessage = "Unable to load this section."
}) => {
  if (loading) {
    return (
      <div className="section-loading">
        {fallback}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="section p-6 text-center text-red-500 font-medium">
        {error?.response?.data?.message || errorMessage}
      </Card>
    );
  }

  return (
    <ErrorBoundary message={errorMessage}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

export default DashboardSection;
