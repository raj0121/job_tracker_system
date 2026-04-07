import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import api, { extractData } from "../../../services/api";
import useDebouncedValue from "../../../hooks/useDebouncedValue";
import PageShell from "../../../components/layout/PageShell";
import HeroPanel from "../../../components/layout/HeroPanel";
import FormSection from "../../../components/layout/FormSection";
import SectionCard from "../../../components/layout/SectionCard";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Pagination from "../../../components/ui/Pagination";
import Table from "../../../components/ui/Table";
import Badge from "../../../components/ui/Badge";
import SectionHeader from "../../../components/ui/SectionHeader";
import EmptyState from "../../../components/ui/EmptyState";
import notify from "../../../utils/notify";
import { useAuth } from "../../../context/AuthContext";

const PAGE_SIZE = 10;

const Designations = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [formError, setFormError] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const canWrite = hasPermission("masters:write:any");

  const designationsQuery = useQuery({
    queryKey: ["masters", "designations", page, debouncedSearch],
    queryFn: () => api.get("/platform/designations", {
      params: {
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined
      }
    }).then(extractData),
    staleTime: 60 * 1000
  });

  const designationsPayload = designationsQuery.data;
  const designations = Array.isArray(designationsPayload)
    ? designationsPayload
    : (designationsPayload?.data || []);
  const pagination = designationsPayload?.pagination || null;

  const addMutation = useMutation({
    mutationFn: (payload) => api.post("/platform/designations", payload).then(extractData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", "designations"] });
      setName("");
      setFormError("");
      notify.success("Designation created successfully.");
    },
    onError: (requestError) => {
      notify.error(requestError?.response?.data?.message || "Unable to add designation.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      api.patch(`/platform/designations/${id}`, payload).then(extractData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", "designations"] });
      setEditingId(null);
      setEditName("");
      setFormError("");
      notify.success("Designation updated successfully.");
    },
    onError: (requestError) => {
      notify.error(requestError?.response?.data?.message || "Unable to update designation.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/platform/designations/${id}`).then(extractData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", "designations"] });
      notify.success("Designation deleted successfully.");
    },
    onError: (requestError) => {
      notify.error(requestError?.response?.data?.message || "Unable to delete designation.");
    }
  });

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("Designation name is required.");
      return;
    }
    addMutation.mutate({ name: trimmed });
  };

  const handleUpdate = (designationId) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setFormError("Designation name is required.");
      return;
    }
    updateMutation.mutate({
      id: designationId,
      payload: { name: trimmed }
    });
  };

  if (designationsQuery.isLoading) {
    return (
      <PageShell>
        <HeroPanel
          title="Designations"
          subtitle="Keep the job title catalog consistent across hiring and HR operations."
        />
        <SectionCard>
          <SectionHeader
            title="Designation Setup"
            description="Loading the designation form and current records."
          />
          <div className="card-subtitle">Loading designations...</div>
        </SectionCard>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <HeroPanel
        // title="Designations"
        // subtitle="Keep the job title catalog consistent across hiring and HR operations."
        // actions={<Badge>{designations.length} total</Badge>}
      />

      <SectionCard>
        <SectionHeader
          title="Designation Setup"
          // description="Create a designation or update an existing one using the shared ATS form components."
          badge={<Badge>{pagination?.totalItems ?? designations.length} total</Badge>}
        />

        {canWrite ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleAdd();
            }}
            className="form-sections"
          >
            <FormSection title="" grid={false}>
              <div className="form-grid">
                <div className="form-field span-2">
                  <label htmlFor="designation-name">Designation Name</label>
                  <Input
                    id="designation-name"
                    placeholder="Enter designation name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
              </div>
            </FormSection>

            <div className="page-actions">
              <Button type="submit" disabled={addMutation.isPending}>
                <Plus size={16} /> {addMutation.isPending ? "Adding..." : "Add Designation"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="card-subtitle">You have read-only access to designations.</div>
        )}

        {formError ? <div className="card-subtitle text-danger mt-12">{formError}</div> : null}
        {addMutation.isError ? (
          <div className="card-subtitle text-danger mt-12">
            {addMutation.error?.response?.data?.message || "Unable to add designation."}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard>
        <SectionHeader
          title="Designation List"
          // description="Review and maintain all configured designations in the standardized ATS table layout."
          action={(
            <div className="toolbar-search">
              <Search size={16} />
              <Input
                placeholder="Search designations"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          )}
        />

        {designations.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck size={28} color="#409eff" />}
            title="No designations found"
            description="Create the first designation to keep role names standardized across the platform."
            action={canWrite ? <Button onClick={handleAdd}>Create Designation</Button> : null}
          />
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.HeadCell>ID</Table.HeadCell>
                <Table.HeadCell>Designation</Table.HeadCell>
                <Table.HeadCell align="right">Actions</Table.HeadCell>
              </tr>
            </Table.Head>
            <Table.Body>
              {designations.map((designation) => (
                <Table.Row key={designation.id}>
                  <Table.Cell>{designation.id}</Table.Cell>
                  <Table.Cell>
                    {editingId === designation.id ? (
                      <Input
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                      />
                    ) : (
                      <div className="table-title">{designation.name}</div>
                    )}
                  </Table.Cell>
                  <Table.Cell align="right">
                    <div className="table-actions">
                      {editingId === designation.id ? (
                        <>
                          <Button
                            onClick={() => handleUpdate(designation.id)}
                            disabled={updateMutation.isPending}
                          >
                            Save
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setEditingId(null);
                              setEditName("");
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          {canWrite ? (
                            <>
                              <Button
                                variant="secondary"
                                onClick={() => {
                                  setEditingId(designation.id);
                                  setEditName(designation.name || "");
                                  setFormError("");
                                }}
                              >
                                <Pencil size={14} /> Edit
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => deleteMutation.mutate(designation.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 size={14} /> Delete
                              </Button>
                            </>
                          ) : (
                            <span className="action-note">View only</span>
                          )}
                        </>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}

        <Pagination
          currentPage={pagination?.currentPage || page}
          totalPages={pagination?.totalPages || 0}
          disabled={designationsQuery.isFetching}
          onPageChange={setPage}
        />
      </SectionCard>
    </PageShell>
  );
};

export default Designations;
