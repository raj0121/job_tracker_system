import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, UserCheck, UserMinus, Users } from "lucide-react";
import api, { extractData } from "../../../services/api";
import ExportExcelButton from "../../../components/common/ExportExcelButton";
import { collectPaginatedData } from "../../../utils/exportToExcel";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Badge from "../../../components/ui/Badge";
import SectionHeader from "../../../components/ui/SectionHeader";
import EmptyState from "../../../components/ui/EmptyState";

const emptyForm = {
  name: "",
  email: "",
  role: "recruiter",
  password: ""
};

const SuperAdminUsers = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingUser, setEditingUser] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["platform", "users"],
    queryFn: () => api.get("/platform/users").then(extractData),
    staleTime: 60 * 1000
  });

  const users = usersQuery.data || [];
  const rolesQuery = useQuery({
    queryKey: ["platform", "roles", "select"],
    queryFn: () => api.get("/platform/roles").then(extractData),
    staleTime: 60 * 1000
  });
  const roleRows = Array.isArray(rolesQuery.data) ? rolesQuery.data : (rolesQuery.data || []);

  const saveMutation = useMutation({
    mutationFn: (payload) => {
      if (editingUser) {
        return api.patch(`/platform/users/${editingUser.id}`, payload).then(extractData);
      }
      return api.post("/platform/users", payload).then(extractData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "users"] });
      setShowForm(false);
      setEditingUser(null);
      setForm(emptyForm);
    }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/platform/users/${id}`, { isActive }).then(extractData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform", "users"] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/platform/users/${id}`).then(extractData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform", "users"] })
  });

  const exportUsers = useCallback(() => (
    collectPaginatedData({
      fetchPage: (page) => api.get("/platform/users", {
        params: {
          page,
          limit: 200
        }
      }).then(extractData),
      getItems: (payload) => payload?.data || [],
      getNextPageParam: (payload, page) => (
        payload?.pagination?.hasNextPage ? page + 1 : null
      )
    })
  ), []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "recruiter",
      password: ""
    });
    setShowForm(true);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    saveMutation.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      password: form.password || undefined
    });
  };

  if (usersQuery.isLoading) {
    return (
      <div className="page">
        <div className="container">
          <Card>Loading users...</Card>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container content-stack">
        <Card className="section">
          <SectionHeader
            title="All Users"
            description="Create, update, or suspend platform users."
            badge={<Badge>{users.length} total</Badge>}
            action={(
              <div className="toolbar">
                <ExportExcelButton
                  filename="platform-users"
                  label="Export Excel"
                  className="btn-secondary"
                  getData={exportUsers}
                />
                <Button onClick={openCreate}>
                  <Plus size={16} /> New User
                </Button>
              </div>
            )}
          />

          {showForm ? (
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <Input
                  name="name"
                  placeholder="Full name"
                  value={form.name}
                  onChange={handleChange}
                />
                <Input
                  name="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={handleChange}
                />
                <Input as="select" name="role" value={form.role} onChange={handleChange}>
                  {roleRows.map((role) => (
                    <option key={role.id} value={role.key}>
                      {role.name}
                    </option>
                  ))}
                </Input>
                {!editingUser ? (
                  <Input
                    name="password"
                    placeholder="Temporary password"
                    value={form.password}
                    onChange={handleChange}
                  />
                ) : null}
              </div>

              <div className="page-actions mt-12">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {editingUser ? "Update User" : "Create User"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingUser(null);
                    setForm(emptyForm);
                  }}
                >
                  Cancel
                </Button>
                {saveMutation.isError ? (
                  <span className="card-subtitle text-danger">
                    {saveMutation.error?.response?.data?.message || "Unable to save user."}
                  </span>
                ) : null}
              </div>
            </form>
          ) : null}
        </Card>

        <Card className="section">
          {users.length === 0 ? (
            <EmptyState
              icon={<Users size={28} color="#409eff" />}
              title="No users found"
              description="Create the first user account to begin platform administration."
              action={<Button onClick={openCreate}>Create User</Button>}
            />
          ) : (
            <div className="content-stack">
              {users.map((user) => (
                <div key={user.id} className="card">
                  <div className="page-header">
                    <div>
                      <div className="card-title">{user.name}</div>
                      <div className="card-subtitle">{user.email}</div>
                    </div>
                    <div className="toolbar">
                      <div className="card-subtitle">{user.role}</div>
                      <Badge tone={user.isActive ? "success" : "danger"}>
                        {user.isActive ? "Active" : "Suspended"}
                      </Badge>
                      <Button variant="secondary" onClick={() => openEdit(user)}>
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => toggleMutation.mutate({ id: user.id, isActive: !user.isActive })}
                      >
                        {user.isActive ? <UserMinus size={14} /> : <UserCheck size={14} />}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          if (window.confirm(`Delete ${user.name}?`)) {
                            deleteMutation.mutate(user.id);
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminUsers;
