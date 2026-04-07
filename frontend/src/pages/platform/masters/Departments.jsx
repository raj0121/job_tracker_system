import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

const Departments = () => {
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

  const departmentsQuery = useQuery({
    queryKey: ["masters", "departments", page, debouncedSearch],
    queryFn: () => api.get("/platform/departments", {
      params: {
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined
      }
    }).then(extractData),
    staleTime: 60 * 1000
  });
  const departmentsPayload = departmentsQuery.data;
  const departments = Array.isArray(departmentsPayload)
    ? departmentsPayload
    : (departmentsPayload?.data || []);
  const pagination = departmentsPayload?.pagination || null;

  const addMutation = useMutation({
    mutationFn: (payload) => api.post("/platform/departments", payload).then(extractData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", "departments"] });
      setName("");
      setFormError("");
      notify.success("Department created successfully.");
    },
    onError: (requestError) => {
      notify.error(requestError?.response?.data?.message || "Unable to add department.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name: departmentName }) =>
      api.patch(`/platform/departments/${id}`, { name: departmentName }).then(extractData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", "departments"] });
      setEditingId(null);
      setEditName("");
      setFormError("");
      notify.success("Department updated successfully.");
    },
    onError: (requestError) => {
      notify.error(requestError?.response?.data?.message || "Unable to update department.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/platform/departments/${id}`).then(extractData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", "departments"] });
      notify.success("Department deleted successfully.");
    },
    onError: (requestError) => {
      notify.error(requestError?.response?.data?.message || "Unable to delete department.");
    }
  });

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("Department name is required.");
      return;
    }
    addMutation.mutate({ name: trimmed });
  };

  const handleUpdate = (departmentId) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setFormError("Department name is required.");
      return;
    }
    updateMutation.mutate({ id: departmentId, name: trimmed });
  };

  if (departmentsQuery.isLoading) {
    return (
      <PageShell>
        <HeroPanel
          title="Departments"
          subtitle="Define the teams used for access control, reporting, and hiring workflows."
        />
        <SectionCard>
          <SectionHeader
            title="Department Setup"
            description="Loading the department form and current records."
          />
          <div className="card-subtitle">Loading departments...</div>
        </SectionCard>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <HeroPanel
        // title="Departments"
        // subtitle="Define the teams used for access control, reporting, and hiring workflows."
        // actions={<Badge>{departments.length} total</Badge>}
      />

      <SectionCard>
        <SectionHeader
          title="Department Setup"
          // description="Create a department or update an existing one using the standardized ATS form layout."
          badge={<Badge>{pagination?.totalItems ?? departments.length} total</Badge>}
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
                  <label htmlFor="department-name">Department Name</label>
                  <Input
                    id="department-name"
                    placeholder="Enter department name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            </FormSection>

            <div className="page-actions">
              <Button type="submit" disabled={addMutation.isPending}>
                <Plus size={16} /> {addMutation.isPending ? "Adding..." : "Add Department"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="card-subtitle">You have read-only access to departments.</div>
        )}

        {formError ? <div className="card-subtitle text-danger mt-12">{formError}</div> : null}
        {addMutation.isError ? (
          <div className="card-subtitle text-danger mt-12">
            {addMutation.error?.response?.data?.message || "Unable to add department."}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard>
        <SectionHeader
          title="Department List"
          // description="Review and maintain all configured departments in a consistent ATS table layout."
          action={(
            <div className="toolbar-search">
              <Search size={16} />
              <Input
                placeholder="Search departments"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          )}
        />

        {departments.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck size={28} color="#409eff" />}
            title="No departments found"
            description="Start by creating the first department to organize internal records."
            action={canWrite ? <Button onClick={handleAdd}>Create Department</Button> : null}
          />
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.HeadCell>ID</Table.HeadCell>
                <Table.HeadCell>Department</Table.HeadCell>
                <Table.HeadCell align="right">Actions</Table.HeadCell>
              </tr>
            </Table.Head>
            <Table.Body>
              {departments.map((dept) => (
                <Table.Row key={dept.id}>
                  <Table.Cell>{dept.id}</Table.Cell>
                  <Table.Cell>
                    {editingId === dept.id ? (
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    ) : (
                      <div className="table-title">{dept.name}</div>
                    )}
                  </Table.Cell>
                  <Table.Cell align="right">
                    <div className="table-actions">
                      {editingId === dept.id ? (
                        <>
                          <Button onClick={() => handleUpdate(dept.id)} disabled={updateMutation.isPending}>
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
                                  setEditingId(dept.id);
                                  setEditName(dept.name);
                                  setFormError("");
                                }}
                              >
                                <Pencil size={14} /> Edit
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => deleteMutation.mutate(dept.id)}
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
          disabled={departmentsQuery.isFetching}
          onPageChange={setPage}
        />
      </SectionCard>
    </PageShell>
  );
};

export default Departments;
