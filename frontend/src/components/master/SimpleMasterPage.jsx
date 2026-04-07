import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import api, { extractData } from "../../services/api";
import { getStatusTone } from "../../config/ui.config";
import { useAuth } from "../../context/AuthContext";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import notify from "../../utils/notify";
import PageShell from "../layout/PageShell";
import HeroPanel from "../layout/HeroPanel";
import SectionCard from "../layout/SectionCard";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Pagination from "../ui/Pagination";
import Table from "../ui/Table";
import Badge from "../ui/Badge";
import SectionHeader from "../ui/SectionHeader";
import EmptyState from "../ui/EmptyState";
import Skeleton from "../ui/Skeleton";

const PAGE_SIZE = 10;

const SimpleMasterPage = ({
  title,
  description,
  endpoint,
  queryKey
}) => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("masters:write:any");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    status: "active"
  });

  const debouncedSearch = useDebouncedValue(search, 400);
  const entityLabel = title.endsWith("s") ? title.slice(0, -1) : title;

  const itemsQuery = useQuery({
    queryKey: [...queryKey, page, debouncedSearch],
    queryFn: () => api.get(endpoint, {
      params: {
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined
      }
    }).then(extractData),
    placeholderData: (previousData) => previousData,
    staleTime: 60 * 1000
  });

  const items = useMemo(() => {
    const payload = itemsQuery.data;
    return Array.isArray(payload) ? payload : (payload?.data || []);
  }, [itemsQuery.data]);
  const pagination = itemsQuery.data?.pagination || null;
  const normalizedSearch = debouncedSearch.trim().toLowerCase();

  const resetEditState = () => {
    setEditingId(null);
    setEditForm({
      name: "",
      status: "active"
    });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => api.post(endpoint, payload).then(extractData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setName("");
      setFormError("");
      notify.success(`${entityLabel} created successfully.`);
    },
    onError: (requestError) => {
      const message = requestError?.response?.data?.message || "Unable to create record.";
      setFormError(message);
      notify.error(message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`${endpoint}/${id}`, payload).then(extractData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      resetEditState();
      notify.success(`${entityLabel} updated successfully.`);
    },
    onError: (requestError) => {
      notify.error(requestError?.response?.data?.message || "Unable to update record.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`${endpoint}/${id}`).then(extractData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      notify.success(`${entityLabel} deleted successfully.`);
    },
    onError: (requestError) => {
      notify.error(requestError?.response?.data?.message || "Unable to delete record.");
    }
  });
  const isTableBusy = itemsQuery.isFetching || updateMutation.isPending || deleteMutation.isPending;

  const handleCreate = (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const normalizedName = trimmedName.toLowerCase();

    if (!trimmedName) {
      setFormError(`${entityLabel} name is required.`);
      notify.error(`${entityLabel} name is required.`);
      return;
    }

    if (items.some((item) => String(item.name || "").trim().toLowerCase() === normalizedName)) {
      const message = `This ${entityLabel.toLowerCase()} already exists.`;
      setFormError(message);
      notify.error(message);
      return;
    }

    createMutation.mutate({
      name: trimmedName
    });
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setFormError("");
    setEditForm({
      name: item.name || "",
      status: String(item.status || "active").toLowerCase()
    });
  };

  const handleEditChange = (event) => {
    const { name: fieldName, value } = event.target;
    setEditForm((prev) => ({
      ...prev,
      [fieldName]: fieldName === "status" ? String(value).toLowerCase() : value
    }));
  };

  const handleUpdate = (id) => {
    const trimmedName = editForm.name.trim();
    const normalizedName = trimmedName.toLowerCase();
    if (!trimmedName) {
      notify.error(`${entityLabel} name is required.`);
      return;
    }

    if (items.some((item) => item.id !== id && String(item.name || "").trim().toLowerCase() === normalizedName)) {
      notify.error(`This ${entityLabel.toLowerCase()} already exists.`);
      return;
    }

    updateMutation.mutate({
      id,
      payload: {
        name: trimmedName,
        status: editForm.status
      }
    });
  };

  return (
    <PageShell>
      <HeroPanel
        title={title}
        subtitle={description}
        actions={<Badge>{pagination?.totalItems ?? items.length} total</Badge>}
      />

      <SectionCard>
        <SectionHeader
          title={`${entityLabel} Setup`}
          description={`Create ${title.toLowerCase()} quickly with a lightweight master data workflow.`}
        />

        {canWrite ? (
          <form onSubmit={handleCreate} className="toolbar">
            <Input
              placeholder={`Enter ${entityLabel.toLowerCase()} name`}
              value={name}
              autoFocus
              onChange={(event) => setName(event.target.value)}
            />
            <Button type="submit" disabled={createMutation.isPending || itemsQuery.isFetching}>
              <Plus size={16} /> {createMutation.isPending ? "Adding..." : `Add ${entityLabel}`}
            </Button>
          </form>
        ) : (
          <div className="card-subtitle">You have read-only access to {title.toLowerCase()}.</div>
        )}

        {formError ? <div className="card-subtitle text-danger mt-12">{formError}</div> : null}
      </SectionCard>

      <SectionCard>
        <SectionHeader
          title={`${title} List`}
          description={`Review and manage all configured ${title.toLowerCase()} in one lightweight table.`}
          action={(
            <div className="toolbar-search">
              <Search size={16} />
              <Input
                placeholder={`Search ${title.toLowerCase()}...`}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          )}
        />

        {itemsQuery.isLoading ? (
          <Table>
            <Table.Head>
              <tr>
                <Table.HeadCell>ID</Table.HeadCell>
                <Table.HeadCell>Name</Table.HeadCell>
                <Table.HeadCell>Status</Table.HeadCell>
                <Table.HeadCell align="right">Actions</Table.HeadCell>
              </tr>
            </Table.Head>
            <Table.Body>
              {Array.from({ length: 3 }).map((_, index) => (
                <Table.Row key={`initial-loading-${index}`}>
                  <Table.Cell><Skeleton className="h-5 w-12" /></Table.Cell>
                  <Table.Cell><Skeleton className="h-5 w-40" /></Table.Cell>
                  <Table.Cell><Skeleton className="h-5 w-24" /></Table.Cell>
                  <Table.Cell align="right"><Skeleton className="h-5 w-28" /></Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck size={28} color="#409eff" />}
            title={normalizedSearch ? "No results found" : `No ${title.toLowerCase()} found`}
            description={normalizedSearch
              ? `No ${title.toLowerCase()} matched "${debouncedSearch}".`
              : `Create the first ${entityLabel.toLowerCase()} to start using this master module.`}
            action={canWrite ? <Button>{`Create ${entityLabel}`}</Button> : null}
          />
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.HeadCell>ID</Table.HeadCell>
                <Table.HeadCell>Name</Table.HeadCell>
                <Table.HeadCell>Status</Table.HeadCell>
                <Table.HeadCell align="right">Actions</Table.HeadCell>
              </tr>
            </Table.Head>
            <Table.Body>
              {itemsQuery.isFetching ? (
                Array.from({ length: Math.min(items.length || 3, 3) }).map((_, index) => (
                  <Table.Row key={`loading-${index}`}>
                    <Table.Cell><Skeleton className="h-5 w-12" /></Table.Cell>
                    <Table.Cell><Skeleton className="h-5 w-40" /></Table.Cell>
                    <Table.Cell><Skeleton className="h-5 w-24" /></Table.Cell>
                    <Table.Cell align="right"><Skeleton className="h-5 w-28" /></Table.Cell>
                  </Table.Row>
                ))
              ) : null}
              {items.map((item) => (
                <Table.Row key={item.id} className={editingId === item.id ? "is-editing" : ""}>
                  <Table.Cell>#{item.id}</Table.Cell>
                  <Table.Cell>
                    {editingId === item.id ? (
                      <Input
                        name="name"
                        value={editForm.name}
                        autoFocus
                        onChange={handleEditChange}
                        disabled={updateMutation.isPending}
                      />
                    ) : (
                      <div className="table-title">{item.name || "-"}</div>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {editingId === item.id ? (
                      <Input
                        as="select"
                        name="status"
                        value={editForm.status}
                        onChange={handleEditChange}
                        disabled={updateMutation.isPending}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </Input>
                    ) : (
                      <span className={getStatusTone(item.status)}>{item.status || "-"}</span>
                    )}
                  </Table.Cell>
                  <Table.Cell align="right">
                    <div className="table-actions">
                      {editingId === item.id ? (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => handleUpdate(item.id)}
                            disabled={updateMutation.isPending || itemsQuery.isFetching}
                          >
                            <Pencil size={14} /> {updateMutation.isPending ? "Saving..." : "Save"}
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={resetEditState}
                            disabled={updateMutation.isPending}
                          >
                            <X size={14} /> Cancel
                          </Button>
                        </>
                      ) : canWrite ? (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => openEdit(item)}
                            disabled={isTableBusy}
                          >
                            <Pencil size={14} /> Edit
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={isTableBusy}
                            onClick={() => window.confirm(`Are you sure you want to delete this ${entityLabel.toLowerCase()}${item.name ? `: ${item.name}` : ""}?`) && deleteMutation.mutate(item.id)}
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
    </PageShell>
  );
};

export default SimpleMasterPage;
