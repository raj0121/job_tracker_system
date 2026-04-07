import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Search, Trash2, UserPlus } from "lucide-react";
import api, { extractData } from "../../../services/api";
import useDebouncedValue from "../../../hooks/useDebouncedValue";
import PageShell from "../../../components/layout/PageShell";
import HeroPanel from "../../../components/layout/HeroPanel";
import SectionCard from "../../../components/layout/SectionCard";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Pagination from "../../../components/ui/Pagination";
import Table from "../../../components/ui/Table";
import Badge from "../../../components/ui/Badge";
import SectionHeader from "../../../components/ui/SectionHeader";
import EmptyState from "../../../components/ui/EmptyState";
import Modal from "../../../components/ui/Modal";
import notify from "../../../utils/notify";
import { useAuth } from "../../../context/AuthContext";

const PAGE_SIZE = 10;

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  role: "recruiter",
  department_id: "",
  designation_id: ""
};

const Employees = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const debouncedSearch = useDebouncedValue(search, 400);
  const canWrite = hasPermission("masters:write:any");

  const employeesQuery = useQuery({
    queryKey: ["employees", page, debouncedSearch],
    queryFn: () => api.get("/platform/employees", {
      params: {
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined
      }
    }).then(extractData),
    staleTime: 60 * 1000
  });

  const departmentsQuery = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get("/platform/departments").then(extractData),
    staleTime: 60 * 1000
  });

  const designationsQuery = useQuery({
    queryKey: ["designations"],
    queryFn: () => api.get("/platform/designations").then(extractData),
    staleTime: 60 * 1000
  });

  const employees = useMemo(() => {
    const payload = employeesQuery.data;
    return Array.isArray(payload) ? payload : (payload?.data || []);
  }, [employeesQuery.data]);
  const pagination = employeesQuery.data?.pagination || null;
  const departments = departmentsQuery.data || [];
  const designations = designationsQuery.data || [];
  const rolesQuery = useQuery({
    queryKey: ["platform", "roles", "employees"],
    queryFn: () => api.get("/platform/roles").then(extractData),
    staleTime: 60 * 1000
  });
  const roles = Array.isArray(rolesQuery.data) ? rolesQuery.data : (rolesQuery.data || []);

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editingId
        ? api.patch(`/platform/employees/${editingId}`, payload).then(extractData)
        : api.post("/platform/employees", payload).then(extractData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      closeModal();
      notify.success(editingId ? "Employee updated successfully." : "Employee created successfully.");
    },
    onError: (requestError) => {
      notify.error(requestError?.response?.data?.message || "Unable to save employee.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/platform/employees/${id}`).then(extractData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      notify.success("Employee deleted successfully.");
    },
    onError: (requestError) => {
      notify.error(requestError?.response?.data?.message || "Unable to delete employee.");
    }
  });

  const metrics = useMemo(() => {
    const total = employees.length;
    return { total };
  }, [employees]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openAdd = () => {
    setEditingId(null);
    setError("");
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (emp) => {
    setEditingId(emp.id);
    setError("");
    setForm({
      name: emp.name || "",
      email: emp.email || "",
      phone: emp.phone || "",
      password: "",
      confirmPassword: "",
      role: emp.role || "recruiter",
      department_id: emp.department_id || "",
      designation_id: emp.designation_id || ""
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }

    if (!editingId) {
      if (!form.password || !form.confirmPassword) {
        setError("Password is required.");
        return;
      }

      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      role: form.role,
      department_id: form.department_id || null,
      designation_id: form.designation_id || null
    };

    if (!editingId) {
      payload.password = form.password;
    }

    saveMutation.mutate(payload);
  };

  if (employeesQuery.isLoading) {
    return (
      <PageShell>
        <HeroPanel
          title="Employees"
          subtitle="Manage internal staff accounts, roles, and organization assignments."
        />
        <SectionCard>
          <SectionHeader
            title="Employee Overview"
            description="Loading employee records and ATS controls."
          />
          <div className="card-subtitle">Loading employees...</div>
        </SectionCard>
      </PageShell>
    );
  }

  const visibleEmployees = employees.filter((emp) => emp.role !== "superadmin");

  return (
    <PageShell>
      <HeroPanel
        // title="Employees"
        // subtitle="Manage internal staff accounts, roles, and organization assignments."
        // actions={(
        //   <Button onClick={openAdd} disabled={!canWrite}>
        //     <UserPlus size={16} /> Add Employee
        //   </Button>
        // )}
      />

      <SectionCard>
        <SectionHeader
          title="Employee Setup"
          // description="Open the standardized employee form to create a new record or update an existing one."
          // badge={<Badge>{pagination?.totalItems ?? metrics.total} total</Badge>}
          action={canWrite ? (
            <Button onClick={openAdd}>
              <UserPlus size={16} /> Add Employee
            </Button>
          ) : null}
        />
        {!canWrite ? <div className="card-subtitle">You have read-only access to employees.</div> : null}
      </SectionCard>

      <SectionCard>
        <SectionHeader
          title="Employee List"
          // description="Review and manage all employee records in the shared ATS table layout."
          action={(
            <div className="toolbar-search">
              <Search size={16} />
              <Input
                placeholder="Search employees"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          )}
        />

        {visibleEmployees.length === 0 ? (
          <EmptyState
            icon={<UserPlus size={28} color="#409eff" />}
            title="No employees found"
            // description="Create the first employee to start managing internal access and assignments."
            action={canWrite ? <Button onClick={openAdd}>Create Employee</Button> : null}
          />
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.HeadCell>Name</Table.HeadCell>
                <Table.HeadCell>Email</Table.HeadCell>
                <Table.HeadCell>Role</Table.HeadCell>
                <Table.HeadCell align="right">Actions</Table.HeadCell>
              </tr>
            </Table.Head>
            <Table.Body>
              {visibleEmployees.map((emp) => (
                <Table.Row key={emp.id}>
                  <Table.Cell>
                    <div className="table-title">{emp.name}</div>
                    <div className="table-subtext">{emp.phone || "No phone on file"}</div>
                  </Table.Cell>
                  <Table.Cell>{emp.email}</Table.Cell>
                  <Table.Cell>
                    <Badge tone="default">{emp.role}</Badge>
                  </Table.Cell>
                  <Table.Cell align="right">
                    <div className="table-actions">
                      {canWrite ? (
                        <>
                          <Button variant="secondary" onClick={() => openEdit(emp)}>
                            <Pencil size={14} /> Edit
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => deleteMutation.mutate(emp.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 size={14} /> Delete
                          </Button>
                        </>
                      ) : (
                        <span className="action-note">View only</span>
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
          disabled={employeesQuery.isFetching}
          onPageChange={setPage}
        />
      </SectionCard>

      <Modal
        open={showModal}
        title={editingId ? "Edit Employee" : "Add Employee"}
        description={
          editingId
            // ? "Update employee details and organizational assignment."
            // : "Create a new employee record with role and department."
        }
        onClose={closeModal}
        actions={(
          <>
            <Button
              type="submit"
              form="employee-form"
              disabled={saveMutation.isPending}
            >
              {editingId ? "Update Employee" : "Create Employee"}
            </Button>
            {/* <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button> */}
          </>
        )}
      >
        <form id="employee-form" onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="emp-name">Full name</label>
              <Input
                id="emp-name"
                name="name"
                placeholder="Jane Doe"
                value={form.name}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label htmlFor="emp-email">Email</label>
              <Input
                id="emp-email"
                name="email"
                placeholder="jane@company.com"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label htmlFor="emp-phone">Phone</label>
              <Input
                id="emp-phone"
                name="phone"
                placeholder="+1 555 0192"
                value={form.phone}
                onChange={handleChange}
              />
            </div>

            {!editingId ? (
              <>
                <div className="form-field">
                  <label htmlFor="emp-password">Password</label>
                  <Input
                    id="emp-password"
                    type="password"
                    name="password"
                    placeholder="Create a password"
                    value={form.password}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="emp-confirm">Confirm password</label>
                  <Input
                    id="emp-confirm"
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                  />
                </div>
              </>
            ) : null}

            <div className="form-field">
              <label htmlFor="emp-role">Role</label>
              <Input
                as="select"
                id="emp-role"
                name="role"
                value={form.role}
                onChange={handleChange}
                disabled={rolesQuery.isLoading}
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.key}>
                    {role.name}
                  </option>
                ))}
              </Input>
            </div>

            <div className="form-field">
              <label htmlFor="emp-dept">Department</label>
              <Input
                as="select"
                id="emp-dept"
                name="department_id"
                value={form.department_id}
                onChange={handleChange}
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Input>
            </div>

            <div className="form-field">
              <label htmlFor="emp-desig">Designation</label>
              <Input
                as="select"
                id="emp-desig"
                name="designation_id"
                value={form.designation_id}
                onChange={handleChange}
              >
                <option value="">Select designation</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Input>
            </div>
          </div>

          {error ? <p className="form-alert">{error}</p> : null}
          {saveMutation.isError ? (
            <p className="form-alert">
              {saveMutation.error?.response?.data?.message || "Unable to save employee."}
            </p>
          ) : null}
        </form>
      </Modal>
    </PageShell>
  );
};

export default Employees;
