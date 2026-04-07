import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { normalizePriorityValue, normalizeStatusValue } from "../../../config/status.config";
import { formatLocationLabel } from "../../../utils/location.utils";
import { mapRequirement } from "../../../utils/atsMappers";
import { DEFAULT_GC_TIME, DEFAULT_PAGE_SIZE, DEFAULT_STALE_TIME } from "../../../config/constants";
import { useListController } from "../../../hooks/useListController";
import { listCompanies } from "../../../services/company.service";
import { deleteRequirement, listRequirements } from "../../../services/requirement.service";
import PageShell from "../../../components/layout/PageShell";
import HeroPanel from "../../../components/layout/HeroPanel";
import SectionCard from "../../../components/layout/SectionCard";
import Pagination from "../../../components/ui/Pagination";
import Table from "../../../components/ui/Table";
import { formatDate, getStatusTone } from "../../../config/ui.config";
import notify from "../../../utils/notify";

const RequirementsListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission, isAuthenticated, loading: authLoading } = useAuth();
  const canReadCompanies = hasPermission("companies:read:own");
  const {
    page,
    setPage,
    search,
    setSearch,
    debouncedSearch,
    filters,
    setFilterValue
  } = useListController({
    initialFilters: { search: "", status: "", priority: "", company_id: "" }
  });
  const companyFilter = filters.company_id || "";

  const requirementsQuery = useQuery({
    queryKey: ["platform", "requirements", page, debouncedSearch, companyFilter, filters.status || "", filters.priority || ""],
    queryFn: () => listRequirements({
      page,
      limit: DEFAULT_PAGE_SIZE,
      search: debouncedSearch || undefined,
      company_id: companyFilter || undefined,
      status: filters.status || undefined,
      priority: filters.priority || undefined
    }),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    enabled: isAuthenticated && !authLoading
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRequirement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "requirements"] });
      notify.success("Requirement deleted successfully.");
    },
    onError: (requestError) => {
      notify.error(requestError?.response?.data?.message || "Failed to delete requirement.");
    }
  });

  const requirements = useMemo(() => {
    const payload = requirementsQuery.data;
    const rows = Array.isArray(payload) ? payload : (payload?.data || []);
    return rows.map(mapRequirement);
  }, [requirementsQuery.data]);
  const pagination = requirementsQuery.data?.pagination || null;
  const companiesQuery = useQuery({
    queryKey: ["companies", "list"],
    queryFn: listCompanies,
    staleTime: DEFAULT_STALE_TIME,
    enabled: isAuthenticated && !authLoading && canReadCompanies
  });
  const companiesPayload = companiesQuery.data;
  const companies = Array.isArray(companiesPayload)
    ? companiesPayload
    : (companiesPayload?.data || []);

  if (requirementsQuery.isLoading) {
    return <p>Loading requirements...</p>;
  }

  if (requirementsQuery.isError) {
    return <p>Unable to load requirements.</p>;
  }

  const canWrite = hasPermission("requirements:write:any");

  return (
    <PageShell>
      <HeroPanel
        title="Requirement Management"
        subtitle="Review active demand, urgency, and hiring coverage in the same standardized ATS list layout."
        actions={
          canWrite ? (
            <button className="btn-primary" onClick={() => navigate("/app/requirements/create")}>
              <Plus size={16} /> Create Requirement
            </button>
          ) : null
        }
      />

      <SectionCard>
        <div className="page-header page-section-header">
          <div>
            <h3 className="card-title">Requirements List</h3>
            <p className="card-subtitle">Review job demand, hiring urgency, and current requirement status in one place.</p>
          </div>
          <div className="toolbar-search">
            <select
              className="input-field"
              value={companyFilter}
              onChange={(event) => {
                setFilterValue("company_id", event.target.value);
              }}
            >
              <option value="">All companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
            <Search size={16} />
            <input
              className="input-field"
              placeholder="Search requirements..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
            />
          </div>
        </div>

        <Table>
          <Table.Head>
            <Table.Row>
              <Table.HeadCell>Requirement Name</Table.HeadCell>
              <Table.HeadCell>Job ID</Table.HeadCell>
              <Table.HeadCell>Company</Table.HeadCell>
              <Table.HeadCell>Industry / Dept</Table.HeadCell>
              <Table.HeadCell>Assign Date</Table.HeadCell>
              <Table.HeadCell>Openings</Table.HeadCell>
              <Table.HeadCell>Location</Table.HeadCell>
              <Table.HeadCell>Priority</Table.HeadCell>
              <Table.HeadCell>Status</Table.HeadCell>
              <Table.HeadCell align="right">Actions</Table.HeadCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {requirements.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={10}>
                  <div className="empty-state">No requirements found.</div>
                </Table.Cell>
              </Table.Row>
            ) : (
              requirements.map((item) => {
                const statusKey = normalizeStatusValue(item.status);
                const statusLabel = statusKey ? statusKey.replace("_", " ") : "-";
                const priorityKey = normalizePriorityValue(item.priority);
                const cityStateLocation = formatLocationLabel(item.city, item.state);
                const location = cityStateLocation !== "-" ? cityStateLocation : (item.country || "-");

                return (
                  <Table.Row key={item.id}>
                    <Table.Cell>
                      <div className="table-title">{item.title}</div>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="mono-text">
                        {item.jobId}
                      </span>
                    </Table.Cell>
                    <Table.Cell>{item.companyName}</Table.Cell>
                    <Table.Cell>
                      <div>{item.industry}</div>
                    </Table.Cell>
                    <Table.Cell>{formatDate(item.assignDate)}</Table.Cell>
                    <Table.Cell>
                      <span className="table-title">{item.openings}</span>
                    </Table.Cell>
                    <Table.Cell>{location}</Table.Cell>
                    <Table.Cell>
                      <span className="badge badge--default">{priorityKey || "medium"}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className={getStatusTone(statusKey)}>{statusLabel}</span>
                    </Table.Cell>
                    <Table.Cell align="right">
                      {canWrite ? (
                        <div className="table-actions justify-end">
                          <button
                            className="btn-secondary"
                            onClick={() => navigate(`/app/requirements/edit/${item.id}`)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-secondary"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (window.confirm(`Delete requirement "${item.title}"?`)) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span className="action-note">View only</span>
                      )}
                    </Table.Cell>
                  </Table.Row>
                );
              })
            )}
          </Table.Body>
        </Table>

        <Pagination
          currentPage={pagination?.currentPage || page}
          totalPages={pagination?.totalPages || 0}
          disabled={requirementsQuery.isFetching}
          onPageChange={setPage}
        />
      </SectionCard>
    </PageShell>
  );
};

export default RequirementsListPage;
