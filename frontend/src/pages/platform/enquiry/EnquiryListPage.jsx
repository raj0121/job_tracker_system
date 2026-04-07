import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { getEnquiryStatusMeta } from "../../../config/status.config";
import { DEFAULT_GC_TIME, DEFAULT_PAGE_SIZE, DEFAULT_STALE_TIME } from "../../../config/constants";
import { useListController } from "../../../hooks/useListController";
import { listCompanies } from "../../../services/company.service";
import { deleteEnquiry, listEnquiries } from "../../../services/enquiry.service";
import PageShell from "../../../components/layout/PageShell";
import HeroPanel from "../../../components/layout/HeroPanel";
import SectionCard from "../../../components/layout/SectionCard";
import Pagination from "../../../components/ui/Pagination";
import Table from "../../../components/ui/Table";
import { formatDate, getStatusTone } from "../../../config/ui.config";
import notify from "../../../utils/notify";
import {
  resolveCompanyLabel
} from "./enquiryConfig";
import { mapEnquiry } from "../../../utils/atsMappers";

const EnquiryListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
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
    initialFilters: { search: "", status: "", company_id: "" }
  });
  const companyFilter = filters.company_id || "";

  const enquiriesQuery = useQuery({
    queryKey: ["platform", "enquiries", page, debouncedSearch, companyFilter, filters.status || ""],
    queryFn: () => listEnquiries({
      page,
      limit: DEFAULT_PAGE_SIZE,
      search: debouncedSearch || undefined,
      company_id: companyFilter || undefined,
      status: filters.status || undefined
    }),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEnquiry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "enquiries"] });
      notify.success("Enquiry deleted successfully.");
    },
    onError: (requestError) => {
      notify.error(requestError?.response?.data?.message || "Failed to delete enquiry.");
    }
  });

  const enquiries = useMemo(() => {
    const payload = enquiriesQuery.data;
    const rows = Array.isArray(payload) ? payload : (payload?.data || []);
    return rows.map((item) => mapEnquiry(item, resolveCompanyLabel));
  }, [enquiriesQuery.data]);
  const pagination = enquiriesQuery.data?.pagination || null;
  const companiesQuery = useQuery({
    queryKey: ["companies", "list"],
    queryFn: listCompanies,
    staleTime: DEFAULT_STALE_TIME,
    enabled: canReadCompanies
  });
  const companiesPayload = companiesQuery.data;
  const companies = Array.isArray(companiesPayload)
    ? companiesPayload
    : (companiesPayload?.data || []);

  const canWrite = hasPermission("enquiries:write:any");
  
  if (enquiriesQuery.isLoading) {
    return <p>Loading enquiries...</p>;
  }

  if (enquiriesQuery.isError) {
    return <p>Unable to load enquiries.</p>;
  }

  return (
    <PageShell>
      <HeroPanel
        title="Enquiry Management"
        subtitle="Track leads, follow-up activity, and conversion readiness with the same list experience used across ATS modules."
        actions={
          canWrite ? (
            <button className="btn-primary" onClick={() => navigate("/app/enquiry/create")}>
              <Plus size={16} /> Create Enquiry
            </button>
          ) : null
        }
      />

      <SectionCard>
        <div className="page-header page-section-header">
          <div>
            <h3 className="card-title">Enquiry Inbox</h3>
            <p className="card-subtitle">Track incoming leads, contact details, and follow-up status with a consistent review workflow.</p>
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
              placeholder="Search enquiries"
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
              <Table.HeadCell>Client Name</Table.HeadCell>
              <Table.HeadCell>Company</Table.HeadCell>
              <Table.HeadCell>Mobile NO</Table.HeadCell>
              <Table.HeadCell>Email</Table.HeadCell>
              <Table.HeadCell>Remarks</Table.HeadCell>
              <Table.HeadCell>Industry</Table.HeadCell>
              <Table.HeadCell>City</Table.HeadCell>
              <Table.HeadCell>Enquiry Date</Table.HeadCell>
              <Table.HeadCell>Status</Table.HeadCell>
              <Table.HeadCell>Created By</Table.HeadCell>
              <Table.HeadCell align="right">Actions</Table.HeadCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {enquiries.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={11}>
                  <div className="empty-state">No enquiries found.</div>
                </Table.Cell>
              </Table.Row>
            ) : (
              enquiries.map((item) => {
                const { key: statusKey, label: statusLabel } = getEnquiryStatusMeta(item.status);

                return (
                  <Table.Row key={item.id}>
                    <Table.Cell>
                      <div className="table-title">{item.clientName}</div>
                    </Table.Cell>
                    <Table.Cell>{item.companyName}</Table.Cell>
                    <Table.Cell>{item.contactNumber}</Table.Cell>
                    <Table.Cell>{item.email}</Table.Cell>
                    <Table.Cell>{item.remarks}</Table.Cell>
                    <Table.Cell>{item.industry}</Table.Cell>
                    <Table.Cell>{item.city}</Table.Cell>
                    <Table.Cell>{formatDate(item.enquiryDate)}</Table.Cell>
                    <Table.Cell>
                      <span className={getStatusTone(statusKey)}>{statusLabel}</span>
                    </Table.Cell>
                    <Table.Cell>{item.createdBy}</Table.Cell>
                    <Table.Cell align="right">
                      {canWrite ? (
                        <div className="table-actions justify-end">
                          <button
                            className="btn-secondary"
                            onClick={() => navigate(`/app/enquiry/edit/${item.id}`)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-secondary"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (window.confirm(`Delete enquiry for ${item.clientName}?`)) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                          >
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      ) : (
                        <span className="action-note">No actions</span>
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
          disabled={enquiriesQuery.isFetching}
          onPageChange={setPage}
        />
      </SectionCard>
    </PageShell>
  );
};

export default EnquiryListPage;
