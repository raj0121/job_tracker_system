import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Search, ShieldCheck, Trash2 } from "lucide-react";
import { Navigate, useParams } from "react-router-dom";
import api, { extractData } from "../../../services/api";
import { getStatusTone } from "../../../config/ui.config";
import { useAuth } from "../../../context/AuthContext";
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
import Skeleton from "../../../components/ui/Skeleton";
import notify from "../../../utils/notify";

const PAGE_SIZE = 10;

const MASTER_CONFIG = {
  roles: {
    title: "Roles",
    // description: "Manage database-backed platform roles and their permission bundles.",
    queryKey: ["platform", "roles"],
    endpoint: "/platform/roles",
    columns: ["name", "key", "status"],
    isRoleType: true
  },
  permissions: {
    title: "Permissions",
    // description: "Manage permission keys used by both backend authorization and frontend visibility.",
    queryKey: ["platform", "permissions"],
    endpoint: "/platform/permissions",
    columns: ["key", "module", "status"],
    isPermissionType: true
  }
};

const emptyForm = {
  name: "",
  key: "",
  status: "active",
  permission_ids: []
};

const LoadingState = ({ title, description, isRoleType }) => (
  <PageShell>
    <HeroPanel title={title} subtitle={description} />
    <SectionCard>
      <SectionHeader
        title={`${title.slice(0, -1)} Setup`}
        // description="Preparing the form and ATS controls."
      />
      <div className="content-stack">
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
        <Skeleton className="h-24" />
        <Skeleton className="h-10 w-40" />
      </div>
    </SectionCard>
    <SectionCard>
      {/* <SectionHeader title={`${title} List`} description="Loading existing records." /> */}
      <Skeleton className="h-60" />
    </SectionCard>
    {isRoleType ? (
      <SectionCard>
        {/* <SectionHeader title="Access Control Matrix" description="Loading role permissions." /> */}
        <Skeleton className="h-60" />
      </SectionCard>
    ) : null}
  </PageShell>
);

const MasterManagement = ({ forcedType = null }) => {
  const { type: routeType } = useParams();
  const type = forcedType || routeType;
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const config = MASTER_CONFIG[type] || MASTER_CONFIG.roles;
  const isSupportedType = Boolean(MASTER_CONFIG[type]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const canWrite = hasPermission("masters:write:any");

  const itemsQuery = useQuery({
    queryKey: [...config.queryKey, page, debouncedSearch],
    queryFn: () => api.get(config.endpoint, {
      params: {
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined
      }
    }).then(extractData),
    staleTime: 60 * 1000
  });

  const permissionsQuery = useQuery({
    queryKey: ["platform", "permissions", "for-roles"],
    queryFn: () => api.get("/platform/permissions").then(extractData),
    enabled: config.isRoleType,
    staleTime: 60 * 1000
  });

  const rows = useMemo(() => {
    const payload = itemsQuery.data;
    return Array.isArray(payload) ? payload : (payload?.data || []);
  }, [itemsQuery.data]);
  const pagination = itemsQuery.data?.pagination || null;
  const permissionRows = useMemo(() => {
    const payload = permissionsQuery.data;
    return Array.isArray(payload) ? payload : (payload?.data || []);
  }, [permissionsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (payload) => (
      editingId
        ? api.patch(`${config.endpoint}/${editingId}`, payload).then(extractData)
        : api.post(config.endpoint, payload).then(extractData)
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: config.queryKey });
      if (config.isRoleType) {
        queryClient.invalidateQueries({ queryKey: ["platform", "permissions", "for-roles"] });
      }
      setEditingId(null);
      setForm(emptyForm);
      setError("");
      notify.success(editingId ? `${config.title.slice(0, -1)} updated successfully.` : `${config.title.slice(0, -1)} created successfully.`);
    },
    onError: (requestError) => {
      setError(requestError?.response?.data?.message || "Unable to save record.");
      notify.error(requestError?.response?.data?.message || "Unable to save record.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`${config.endpoint}/${id}`).then(extractData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: config.queryKey });
      notify.success(`${config.title.slice(0, -1)} deleted successfully.`);
    },
    onError: (requestError) => {
      notify.error(requestError?.response?.data?.message || "Unable to delete record.");
    }
  });

  const groupedPermissions = useMemo(() => (
    permissionRows.reduce((acc, permission) => {
      const groupKey = permission.module || "other";
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(permission);
      return acc;
    }, {})
  ), [permissionRows]);

  const permissionActions = useMemo(() => (
    Array.from(new Set(permissionRows.map((p) => p.action || p.key?.split(":")[1]).filter(Boolean)))
  ), [permissionRows]);

  const permissionModules = useMemo(() => Object.keys(groupedPermissions), [groupedPermissions]);

  const permissionLookup = useMemo(() => (
    permissionRows.reduce((acc, p) => {
      const moduleName = p.module || "other";
      const actionName = p.action || p.key?.split(":")[1];
      if (actionName) acc[`${moduleName}:${actionName}`] = p;
      return acc;
    }, {})
  ), [permissionRows]);

  const editingItem = useMemo(() => rows.find((r) => r.id === editingId) || null, [rows, editingId]);

  const isFormInvalid = useMemo(() => {
    if (config.isPermissionType) return !form.key.trim();
    if (config.isRoleType) return !form.name.trim() || !form.key.trim();
    return !form.name.trim();
  }, [config.isPermissionType, config.isRoleType, form.key, form.name]);

  const hasEditChanges = useMemo(() => {
    if (!editingItem) return true;
    const currentPermissionIds = [...form.permission_ids].sort((a, b) => a - b);
    const originalPermissionIds = (editingItem.Permissions || []).map((p) => p.id).sort((a, b) => a - b);
    return (
      (form.name || "") !== (editingItem.name || "") ||
      (form.key || "") !== (editingItem.key || "") ||
      (form.status || "active") !== (editingItem.status || "active") ||
      JSON.stringify(currentPermissionIds) !== JSON.stringify(originalPermissionIds)
    );
  }, [editingItem, form]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setError("");
    setForm({
      name: item.name || "",
      key: item.key || "",
      status: item.status || "active",
      permission_ids: (item.Permissions || []).map((p) => p.id)
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const togglePermission = (id) => {
    setForm((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(id)
        ? prev.permission_ids.filter((pId) => pId !== id)
        : [...prev.permission_ids, id]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    const payload = config.isPermissionType
      ? { key: form.key.trim(), status: form.status }
      : config.isRoleType
      ? { name: form.name.trim(), key: form.key.trim(), status: form.status, permission_ids: form.permission_ids }
      : { name: form.name.trim(), status: form.status };
    saveMutation.mutate(payload);
  };

  if (itemsQuery.isLoading) {
    return (
      <LoadingState
        title={config.title}
        description={config.description}
        isRoleType={config.isRoleType}
      />
    );
  }

  if (!isSupportedType) {
    return <Navigate to="/app/admin/masters/roles" replace />;
  }

  return (
    <PageShell>
      <HeroPanel
        // title={config.title}
        subtitle={config.description}
        // actions={<Badge>{pagination?.totalItems ?? rows.length} total</Badge>}
      />

      <SectionCard>
        <SectionHeader
          title={editingId ? `Edit ${config.title.slice(0, -1)}` : `New ${config.title.slice(0, -1)}`}
          description={editingId ? "Update existing record parameters." : "Configure and create a new master record."}
          badge={editingId ? <Badge>Editing</Badge> : null}
        />

        {canWrite ? (
          <form onSubmit={handleSubmit} className="form-sections">
            <FormSection title={`${config.title.slice(0, -1)} Details`} grid={false}>
              <div className="form-grid">
                {!config.isPermissionType ? (
                  <div className="form-field">
                    <label htmlFor={`${type}-name`}>Name</label>
                    <Input id={`${type}-name`} name="name" value={form.name} onChange={handleChange} placeholder="Enter record name" />
                  </div>
                ) : null}

                {config.isRoleType || config.isPermissionType ? (
                  <div className="form-field">
                    <label htmlFor={`${type}-key`}>{config.isPermissionType ? "Permission Key" : "Role Key"}</label>
                    <Input id={`${type}-key`} name="key" value={form.key} onChange={handleChange} disabled={!!editingId} placeholder="unique_key_identifier" />
                  </div>
                ) : null}

                <div className="form-field">
                  <label htmlFor={`${type}-status`}>Status</label>
                  <Input as="select" id={`${type}-status`} name="status" value={form.status} onChange={handleChange}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Input>
                </div>
              </div>
            </FormSection>

            {error ? <div className="card-subtitle text-danger">{error}</div> : null}

            <div className="page-actions">
              <Button type="submit" disabled={saveMutation.isPending || isFormInvalid || (!!editingId && !hasEditChanges)}>
                {editingId ? "Update Record" : `Create ${config.title.slice(0, -1)}`}
              </Button>
              {editingId ? (
                <Button variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        ) : (
          <div className="card-subtitle">You have read-only access to {config.title.toLowerCase()}.</div>
        )}
      </SectionCard>

      <SectionCard>
        <SectionHeader
          title={`${config.title} List`}
          description="Browse and manage all master system records."
          action={(
            <div className="toolbar-search">
              <Search size={16} />
              <Input
                placeholder={`Search ${config.title.toLowerCase()}...`}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          )}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck size={28} color="#409eff" />}
            title={`No ${config.title.toLowerCase()} found`}
            description="Create the first record to start using this master module."
            action={canWrite ? <Button>{`Create ${config.title.slice(0, -1)}`}</Button> : null}
          />
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.HeadCell>ID</Table.HeadCell>
                {config.columns.map((col) => (
                  <Table.HeadCell key={col}>{col.replace("_", " ")}</Table.HeadCell>
                ))}
                {config.isRoleType ? <Table.HeadCell>Permissions</Table.HeadCell> : null}
                <Table.HeadCell align="right">Actions</Table.HeadCell>
              </tr>
            </Table.Head>
            <Table.Body>
              {rows.map((row) => (
                <Table.Row key={row.id}>
                  <Table.Cell>#{row.id}</Table.Cell>
                  {config.columns.map((col) => (
                    <Table.Cell key={col}>
                      {col === "status" ? (
                        <span className={getStatusTone(row[col])}>{row[col] || "-"}</span>
                      ) : (
                        <div className="table-title">{row[col] || "-"}</div>
                      )}
                    </Table.Cell>
                  ))}
                  {config.isRoleType ? (
                    <Table.Cell>
                      <div className="inline-badge-list">
                        {(row.Permissions || []).slice(0, 3).map((p) => (
                          <Badge key={p.id}>{p.key?.split(":")[0]}</Badge>
                        ))}
                      </div>
                    </Table.Cell>
                  ) : null}
                  <Table.Cell align="right">
                    <div className="table-actions">
                      {canWrite ? (
                        <>
                          <Button variant="secondary" onClick={() => openEdit(row)}>
                            <Pencil size={14} /> Edit
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={deleteMutation.isPending}
                            onClick={() => window.confirm("Delete record?") && deleteMutation.mutate(row.id)}
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
          disabled={itemsQuery.isFetching}
          onPageChange={setPage}
        />
      </SectionCard>

      {config.isRoleType ? (
        <SectionCard>
          <SectionHeader
            title="Access Control Matrix"
            description="Define permissions for the selected role."
            // badge={<Badge>{form.permission_ids.length} active</Badge>}
          />

          <Table>
            <Table.Head>
              <tr>
                <Table.HeadCell>Module Group</Table.HeadCell>
                {permissionActions.map((action) => (
                  <Table.HeadCell key={action} align="center">{action}</Table.HeadCell>
                ))}
              </tr>
            </Table.Head>
            <Table.Body>
              {permissionModules.map((moduleName) => (
                <Table.Row key={moduleName}>
                  <Table.Cell>{moduleName}</Table.Cell>
                  {permissionActions.map((action) => {
                    const p = permissionLookup[`${moduleName}:${action}`];
                    return (
                      <Table.Cell key={action} align="center">
                        {p ? (
                          <Input
                            type="checkbox"
                            checked={form.permission_ids.includes(p.id)}
                            onChange={() => togglePermission(p.id)}
                            disabled={!canWrite}
                            className="permission-checkbox"
                          />
                        ) : (
                          "-"
                        )}
                      </Table.Cell>
                    );
                  })}
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </SectionCard>
      ) : null}
    </PageShell>
  );
};

export default MasterManagement;
