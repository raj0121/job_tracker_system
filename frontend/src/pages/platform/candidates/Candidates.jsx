import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { candidateStatusOptions } from "./candidateConfig";
import { useAuth } from "../../../context/AuthContext";
import { mapCandidate, mapRequirement } from "../../../utils/atsMappers";
import { DEFAULT_GC_TIME, DEFAULT_PAGE_SIZE, DEFAULT_STALE_TIME } from "../../../config/constants";
import { useListController } from "../../../hooks/useListController";
import { listCompanies } from "../../../services/company.service";
import { listAssignableRequirements, listCandidates, updateCandidate } from "../../../services/candidate.service";
import PageShell from "../../../components/layout/PageShell";
import HeroPanel from "../../../components/layout/HeroPanel";
import SectionCard from "../../../components/layout/SectionCard";
import Modal from "../../../components/ui/Modal";
import Pagination from "../../../components/ui/Pagination";
import Table from "../../../components/ui/Table";
import { getStatusTone } from "../../../config/ui.config";
import notify from "../../../utils/notify";

const formatExperienceRange = (years, months) => {
  const parts = [];
  if (years !== null && years !== undefined && years !== "") {
    parts.push(`${years}y`);
  }
  if (months !== null && months !== undefined && months !== "") {
    parts.push(`${months}m`);
  }
  return parts.length ? parts.join(" ") : "-";
};

const Candidates = () => {
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
    initialFilters: { search: "", company_id: "", stage: "" }
  });
  const [activeModal, setActiveModal] = useState(null);
  const [activeCandidate, setActiveCandidate] = useState(null);
  const [selectedRequirementId, setSelectedRequirementId] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [detailStatus, setDetailStatus] = useState("New");
  const [detailRemarks, setDetailRemarks] = useState("");
  const [detailError, setDetailError] = useState("");
  const companyFilter = filters.company_id || "";

  const candidatesQuery = useQuery({
    queryKey: ["platform", "candidates", page, debouncedSearch, companyFilter, filters.stage || ""],
    queryFn: () => listCandidates({
      page,
      limit: DEFAULT_PAGE_SIZE,
      search: debouncedSearch || undefined,
      company_id: companyFilter || undefined,
      stage: filters.stage || undefined
    }),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    enabled: isAuthenticated && !authLoading
  });

  const canWrite = hasPermission("candidates:write:any");
  const companiesQuery = useQuery({
    queryKey: ["companies", "list"],
    queryFn: listCompanies,
    enabled: isAuthenticated && !authLoading && canReadCompanies,
    staleTime: DEFAULT_STALE_TIME
  });

  const requirementsQuery = useQuery({
    queryKey: ["platform", "requirements", "assignable"],
    queryFn: listAssignableRequirements,
    enabled: isAuthenticated && !authLoading && canWrite && activeModal === "assignment",
    staleTime: DEFAULT_STALE_TIME
  });

  const payload = candidatesQuery.data;
  const candidates = useMemo(() => {
    const rows = Array.isArray(payload) ? payload : (payload?.data || []);
    return rows.map(mapCandidate);
  }, [payload]);
  const pagination = payload?.pagination || null;

  const requirementsPayload = requirementsQuery.data;
  const requirements = (Array.isArray(requirementsPayload)
    ? requirementsPayload
    : (requirementsPayload?.data || [])).map(mapRequirement);
  const companiesPayload = companiesQuery.data;
  const companies = Array.isArray(companiesPayload)
    ? companiesPayload
    : (companiesPayload?.data || []);
  const assignRequirementMutation = useMutation({
    mutationFn: (payload) => updateCandidate({ id: payload.id, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "candidates"] });
      setActiveModal(null);
      setActiveCandidate(null);
      setSelectedRequirementId("");
      setAssignmentError("");
      notify.success("Candidate assignment updated successfully.");
    },
    onError: (error) => {
      setAssignmentError(error?.response?.data?.message || "Unable to update assignment.");
      notify.error(error?.response?.data?.message || "Unable to update assignment.");
    }
  });

  const updateDetailsMutation = useMutation({
    mutationFn: (payload) => updateCandidate({ id: payload.id, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "candidates"] });
      setActiveModal(null);
      setActiveCandidate(null);
      setDetailStatus("New");
      setDetailRemarks("");
      setDetailError("");
      notify.success("Candidate details updated successfully.");
    },
    onError: (error) => {
      setDetailError(error?.response?.data?.message || "Unable to update candidate details.");
      notify.error(error?.response?.data?.message || "Unable to update candidate details.");
    }
  });

  const openAssignment = (candidate) => {
    setActiveCandidate(candidate);
    setSelectedRequirementId(
      candidate?.requirementId
        ? String(candidate.requirementId)
        : (candidate?.requirement?.id ? String(candidate.requirement.id) : "")
    );
    setAssignmentError("");
    setActiveModal("assignment");
  };

  const closeAssignment = () => {
    setActiveModal(null);
    setActiveCandidate(null);
    setSelectedRequirementId("");
    setAssignmentError("");
  };

  const handleAssignmentSubmit = (event) => {
    event.preventDefault();
    setAssignmentError("");

    if (!activeCandidate?.id) {
      setAssignmentError("Candidate not selected.");
      return;
    }

    const requirementId = selectedRequirementId;

    if (!requirementId) {
      setAssignmentError("Please select a job requirement.");
      return;
    }

    assignRequirementMutation.mutate({
      id: activeCandidate.id,
      requirement_id: Number(requirementId)
    });
  };

  const openDetails = (candidate) => {
    setActiveCandidate(candidate);
    setDetailStatus(candidate?.status || "New");
    setDetailRemarks(candidate?.assignmentRemarks || "");
    setDetailError("");
    setActiveModal("details");
  };

  const closeDetails = () => {
    setActiveModal(null);
    setActiveCandidate(null);
    setDetailStatus("New");
    setDetailRemarks("");
    setDetailError("");
  };

  const handleDetailSubmit = (event) => {
    event.preventDefault();
    setDetailError("");

    if (!activeCandidate?.id) {
      setDetailError("Candidate not selected.");
      return;
    }

    updateDetailsMutation.mutate({
      id: activeCandidate.id,
      status: detailStatus,
      assignment_remarks: detailRemarks.trim()
    });
  };

  const detailRequirement = activeCandidate?.requirement || null;
  const detailJobId = activeCandidate?.clientJobId || detailRequirement?.jobId || "";
  const resolveCandidateJobId = (candidate) => candidate?.clientJobId || candidate?.requirement?.jobId || "";
  const hasJobAssignment = (candidate) => Boolean(candidate?.hasJobAssignment);

  if (candidatesQuery.isLoading) {
    return <p>Loading candidates...</p>;
  }

  if (candidatesQuery.isError) {
    return <p>Unable to load candidates.</p>;
  }

  return (
    <PageShell>
      <HeroPanel
        title="Candidate Management"
        subtitle="Review candidate profiles, assignments, and status updates in one consistent hiring workflow."
        actions={
          canWrite ? (
            <button type="button" className="btn-primary" onClick={() => navigate("/app/candidates/create")}>
              <Plus size={16} /> Create Candidate
            </button>
          ) : null
        }
      />

      <SectionCard>
        <div className="page-header page-section-header">
          <div>
            <h3 className="card-title">Candidate List</h3>
            <p className="card-subtitle">Manage candidate records, linked jobs, and assignment actions with a consistent ATS workflow.</p>
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
              placeholder="Search candidates"
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
              <Table.HeadCell>Candidate Name</Table.HeadCell>
              <Table.HeadCell>Contact</Table.HeadCell>
              <Table.HeadCell>Position / Job ID</Table.HeadCell>
              <Table.HeadCell>Company</Table.HeadCell>
              <Table.HeadCell>Department</Table.HeadCell>
              <Table.HeadCell>Current Salary</Table.HeadCell>
              <Table.HeadCell>Expected Salary</Table.HeadCell>
              <Table.HeadCell>Status</Table.HeadCell>
              <Table.HeadCell>Assigned To</Table.HeadCell>
              <Table.HeadCell>Created By</Table.HeadCell>
              <Table.HeadCell align="right">Job Actions</Table.HeadCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {candidates.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={11}>
                  <div className="empty-state">No candidates found.</div>
                </Table.Cell>
              </Table.Row>
            ) : (
              candidates.map((candidate) => (
                <Table.Row key={candidate.id}>
                  <Table.Cell>
                    <div className="table-title">{candidate.name}</div>
                  </Table.Cell>
                  <Table.Cell>
                    <div>{candidate.email}</div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="table-title">
                      {candidate.position}
                    </div>
                  </Table.Cell>
                  <Table.Cell>{candidate.companyName}</Table.Cell>
                  <Table.Cell>{candidate.departmentName}</Table.Cell>
                  <Table.Cell>{candidate.currentSalary}</Table.Cell>
                  <Table.Cell>{candidate.expectedSalary}</Table.Cell>
                  <Table.Cell>
                    <span className={getStatusTone(candidate.status)}>
                      {candidate.status}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <div>{candidate.assignedTo}</div>
                  </Table.Cell>
                  <Table.Cell>{candidate.createdBy}</Table.Cell>
                  <Table.Cell align="right">
                    {hasJobAssignment(candidate) ? (
                      <div className="table-actions justify-end">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => openDetails(candidate)}
                        >
                          {resolveCandidateJobId(candidate)
                            ? `Job ID: ${resolveCandidateJobId(candidate)}`
                            : "Job Details"}
                        </button>
                        {canWrite ? (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => openAssignment(candidate)}
                          >
                            Reassign
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      canWrite ? (
                        <div className="table-actions justify-end">
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => openAssignment(candidate)}
                          >
                            Assign
                          </button>
                        </div>
                      ) : (
                        <span className="action-note">No actions</span>
                      )
                    )}
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table>

        <Pagination
          currentPage={pagination?.currentPage || page}
          totalPages={pagination?.totalPages || 0}
          disabled={candidatesQuery.isFetching}
          onPageChange={setPage}
        />
      </SectionCard>

      <Modal
        open={activeModal === "assignment"}
        title={activeCandidate?.hasJobAssignment
          ? "Reassign Job Requirement"
          : "Assign Job Requirement"}
        description={activeCandidate?.name
          ? `Select a job requirement for ${activeCandidate.name}.`
          : "Select a job requirement for this candidate."}
        onClose={closeAssignment}
        actions={(
          <>
            <button
              type="submit"
              form="candidate-assignment-form"
              className="btn-primary"
              disabled={assignRequirementMutation.isPending || !selectedRequirementId}
            >
              {assignRequirementMutation.isPending ? "Saving..." : "Assign Requirement"}
            </button>
          </>
        )}
      >
        <form id="candidate-assignment-form" onSubmit={handleAssignmentSubmit}>
          <div className="form-field">
            <label htmlFor="assign-requirement">Job requirement</label>
            <select
              id="assign-requirement"
              className="input-field"
              value={selectedRequirementId}
              onChange={(event) => setSelectedRequirementId(event.target.value)}
              disabled={requirementsQuery.isLoading}
            >
              <option value="">Select requirement</option>
              {requirements.map((requirement) => (
                <option key={requirement.id} value={requirement.id}>
                  {(requirement.jobId !== "-" ? `${requirement.jobId} - ` : "")}
                  {(requirement.clientName || "Client")} - {(requirement.position || "Role")}
                </option>
              ))}
            </select>
            {requirementsQuery.isError && (
              <span className="inline-error">
                Unable to load requirements.
              </span>
            )}
          </div>

          {assignmentError && (
            <p className="form-alert">{assignmentError}</p>
          )}
        </form>
      </Modal>

      <Modal
        open={activeModal === "details"}
        title="Job & Candidate Details"
        description={activeCandidate?.name
          ? `Manage assignment and status for ${activeCandidate.name}.`
          : "Manage assignment and status."}
        onClose={closeDetails}
        actions={(
          <>
            {canWrite ? (
              <button type="submit" form="candidate-detail-form" className="btn-primary" disabled={updateDetailsMutation.isPending}>
                {updateDetailsMutation.isPending ? "Saving..." : "Save Updates"}
              </button>
            ) : null}
          </>
        )}
      >
        <form id="candidate-detail-form" onSubmit={handleDetailSubmit}>
          <div className="detail-card">
            <div>
              <span className="metric-label">Candidate</span>
              <div className="table-title">
                {activeCandidate?.name || "-"}
              </div>
              <div className="helper-text">
                {activeCandidate?.email || "No email"}
                {activeCandidate?.phone ? ` - ${activeCandidate.phone}` : ""}
              </div>
            </div>
            <div className="detail-grid">
              <div>
                <span className="metric-label">Applied Position</span>
                <div className="table-title">
                  {activeCandidate?.position || "Role not set"}
                </div>
              </div>
              <div>
                <span className="metric-label">Job ID</span>
                <div className="table-title">
                  {detailJobId || "Not linked"}
                </div>
              </div>
              <div>
                <span className="metric-label">Current Stage</span>
                <div className="table-title">
                  {activeCandidate?.status || "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="detail-card">
            <div>
              <span className="metric-label">Job Details</span>
              <div className="table-title">
                {detailRequirement?.position || "No job assigned"}
              </div>
              <div className="helper-text">
                {(detailRequirement?.clientName || "Client")} - Job ID: {detailJobId || "-"}
              </div>
            </div>
            <div className="detail-grid">
              <div>
                <span className="metric-label">Client</span>
                <div className="table-title">
                  {detailRequirement?.clientName || "-"}
                </div>
              </div>
              <div>
                <span className="metric-label">Company</span>
                <div className="table-title">
                  {detailRequirement?.companyName || detailRequirement?.clientName || "-"}
                </div>
              </div>
              <div>
                <span className="metric-label">Positions</span>
                <div className="table-title">
                  {detailRequirement?.openings ?? "-"}
                </div>
              </div>
              <div>
                <span className="metric-label">Job Status</span>
                <div className="table-title">
                  {(detailRequirement?.status || "-").replace("_", " ")}
                </div>
              </div>
              <div>
                <span className="metric-label">Min Experience</span>
                <div className="table-title">
                  {formatExperienceRange(
                    detailRequirement?.minExperienceYears,
                    detailRequirement?.minExperienceMonths
                  )}
                </div>
              </div>
              <div>
                <span className="metric-label">Max Experience</span>
                <div className="table-title">
                  {formatExperienceRange(
                    detailRequirement?.maxExperienceYears,
                    detailRequirement?.maxExperienceMonths
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="detail-status">Candidate stage</label>
              <select
                id="detail-status"
                className="input-field"
                value={detailStatus}
                onChange={(event) => setDetailStatus(event.target.value)}
                disabled={!canWrite}
              >
                {candidateStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="detail-remarks">Remarks</label>
            <textarea
              id="detail-remarks"
              className="input-field"
              placeholder="Add screening notes, interview feedback, or next steps."
              value={detailRemarks}
              onChange={(event) => setDetailRemarks(event.target.value)}
              disabled={!canWrite}
            />
          </div>

          {detailError && (
            <p className="form-alert">{detailError}</p>
          )}
        </form>
      </Modal>
    </PageShell>
  );
};

export default Candidates;
