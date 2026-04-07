import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Pencil, Plus, Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import api, { extractData } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import PageShell from "../../components/layout/PageShell";
import HeroPanel from "../../components/layout/HeroPanel";
import SectionCard from "../../components/layout/SectionCard";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import SectionHeader from "../../components/ui/SectionHeader";
import EmptyState from "../../components/ui/EmptyState";

const emptyForm = {
  name: "",
  industry: "",
  website: "",
  location: ""
};

const normalizeWebsite = (website) => {
  const value = String(website || "").trim();
  if (!value) {
    return "";
  }

  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

const Companies = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canReadCompanies = hasPermission("companies:read:own");
  const canManageCompanies = hasPermission("companies:write:own");
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
  }, [searchParams]);

  const companiesQuery = useQuery({
    queryKey: ["companies", "list"],
    queryFn: () => api.get("/companies").then(extractData),
    staleTime: 60 * 1000,
    enabled: canReadCompanies
  });

  const companies = useMemo(() => {
    const payload = companiesQuery.data;
    const items = Array.isArray(payload) ? payload : (payload?.data || []);
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return items;
    }

    return items.filter((company) => (
      [company.name, company.industry, company.location, company.website]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(normalizedSearch))
    ));
  }, [companiesQuery.data, search]);

  const saveMutation = useMutation({
    mutationFn: (payload) => (
      editingId
        ? api.put(`/companies/${editingId}`, payload).then(extractData)
        : api.post("/companies", payload).then(extractData)
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setEditingId(null);
      setForm(emptyForm);
      setError("");
    },
    onError: (requestError) => {
      setError(requestError?.response?.data?.message || "Unable to save company.");
    }
  });

  const startEdit = (company) => {
    setEditingId(company.id);
    setError("");
    setForm({
      name: company.name || "",
      industry: company.industry || "",
      website: company.website || "",
      location: company.location || ""
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    const payload = {
      name: String(form.name || "").trim(),
      industry: String(form.industry || "").trim(),
      website: normalizeWebsite(form.website),
      location: String(form.location || "").trim()
    };

    if (!payload.name) {
      setError("Company name is required.");
      return;
    }

    saveMutation.mutate(payload);
  };

  if (!canReadCompanies) {
    return <p>Unauthorized to view companies.</p>;
  }

  if (companiesQuery.isLoading) {
    return <p>Loading companies...</p>;
  }

  if (companiesQuery.isError) {
    return <p>Unable to load companies.</p>;
  }

  return (
    <PageShell>
      <HeroPanel
        title="Companies"
        subtitle="Maintain a lean company directory used by ATS workflows and dashboard insights."
        actions={<Badge>{companies.length} visible</Badge>}
      />

      <SectionCard>
        <SectionHeader
          title={editingId ? "Edit Company" : "New Company"}
          description="Keep company records focused on the core fields used across the ATS."
          badge={editingId ? <Badge>Editing</Badge> : null}
        />

        {canManageCompanies ? (
          <form onSubmit={handleSubmit} className="form-sections">
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="company-name">Company Name</label>
                <Input id="company-name" name="name" value={form.name} onChange={handleChange} placeholder="Enter company name" />
              </div>
              <div className="form-field">
                <label htmlFor="company-industry">Industry</label>
                <Input id="company-industry" name="industry" value={form.industry} onChange={handleChange} placeholder="Enter industry" />
              </div>
              <div className="form-field">
                <label htmlFor="company-website">Website</label>
                <Input id="company-website" name="website" value={form.website} onChange={handleChange} placeholder="example.com" />
              </div>
              <div className="form-field">
                <label htmlFor="company-location">Location</label>
                <Input id="company-location" name="location" value={form.location} onChange={handleChange} placeholder="Enter location" />
              </div>
            </div>

            {error ? <div className="card-subtitle text-danger">{error}</div> : null}

            <div className="page-actions">
              <Button type="submit" disabled={saveMutation.isPending}>
                <Plus size={14} /> {editingId ? "Save Changes" : "Create Company"}
              </Button>
              {editingId ? (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        ) : (
          <div className="card-subtitle">You have read-only access to companies.</div>
        )}
      </SectionCard>

      <SectionCard>
        <SectionHeader
          title="Company Directory"
          description="Browse the companies referenced by the ATS without CRM-style overhead."
          action={(
            <div className="toolbar-search">
              <Search size={16} />
              <Input
                placeholder="Search companies..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          )}
        />

        {companies.length === 0 ? (
          <EmptyState
            icon={<Building2 size={28} color="#409eff" />}
            title="No companies found"
            description="Create the first company to support requirements and dashboard insights."
          />
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.HeadCell>Name</Table.HeadCell>
                <Table.HeadCell>Industry</Table.HeadCell>
                <Table.HeadCell>Website</Table.HeadCell>
                <Table.HeadCell>Location</Table.HeadCell>
                <Table.HeadCell align="right">Actions</Table.HeadCell>
              </tr>
            </Table.Head>
            <Table.Body>
              {companies.map((company) => (
                <Table.Row key={company.id}>
                  <Table.Cell><div className="table-title">{company.name || "-"}</div></Table.Cell>
                  <Table.Cell>{company.industry || "-"}</Table.Cell>
                  <Table.Cell>{company.website || "-"}</Table.Cell>
                  <Table.Cell>{company.location || "-"}</Table.Cell>
                  <Table.Cell align="right">
                    <div className="table-actions">
                      {canManageCompanies ? (
                        <Button variant="secondary" type="button" onClick={() => startEdit(company)}>
                          <Pencil size={14} /> Edit
                        </Button>
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
      </SectionCard>
    </PageShell>
  );
};

export default Companies;
