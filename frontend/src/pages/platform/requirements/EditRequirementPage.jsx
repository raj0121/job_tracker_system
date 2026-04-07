import { ArrowLeft, Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import { useRequirementForm } from "../../../hooks/useRequirementForm";
import {
  jobTypeOptions,
  workplaceTypeOptions,
  priorityOptions,
  statusOptions,
  durationOptions,
  formatOptionLabel
} from "./requirementsConfig";
import { useAuth } from "../../../context/AuthContext";
import PageShell from "../../../components/layout/PageShell";
import HeroPanel from "../../../components/layout/HeroPanel";
import SectionCard from "../../../components/layout/SectionCard";
import FormSection from "../../../components/layout/FormSection";
import HybridSelect from "../../../components/common/HybridSelect";

const EditRequirementPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, hasPermission } = useAuth();
  const canReadCompanies = hasPermission("companies:read:own");
  const {
    form,
    errors,
    submitError,
    existingFile,
    mutation: updateMutation,
    requirementQuery,
    usersQuery,
    assignableUsers,
    companiesQuery,
    companies,
    countryOptions,
    stateOptions,
    cityOptions,
    handleChange,
    handleSubmit,
    handleEducationChange,
    addEducation,
    removeEducation
  } = useRequirementForm({
    id,
    mode: "edit",
    canReadCompanies,
    isAuthenticated,
    authLoading,
    onSuccess: () => navigate("/app/requirements")
  });

  const Input = ({ label, name, type = "text", readOnly = false, placeholder }) => (
    <div className="form-field">
      <label>{label}</label>
      <input
        type={type}
        name={name}
        value={form[name] ?? ""}
        onChange={handleChange}
        className="input-field"
        readOnly={readOnly}
        placeholder={placeholder}
      />
      {errors[name] && <span className="error">{errors[name]}</span>}
    </div>
  );

  if (requirementQuery.isLoading) {
    return <p>Loading requirement...</p>;
  }

  if (requirementQuery.isError) {
    return <p>Unable to load requirement.</p>;
  }

  return (
    <PageShell>
      <HeroPanel
        badge="Requirement Update"
        title="Edit Requirement"
        subtitle="Keep role information current for precise matching and reporting."
        actions={(
          <button className="btn-secondary" type="button" onClick={() => navigate("/app/requirements")}>
            <ArrowLeft size={16} /> Back
          </button>
        )}
      />
        <SectionCard as="form" onSubmit={handleSubmit}>
          {submitError && (
            <p className="form-alert">{submitError}</p>
          )}

          <FormSection title="Basic Information">
            <div className="form-field">
              <label htmlFor="company-id">Company</label>
              <select
                id="company-id"
                name="company_id"
                className="input-field"
                value={form.company_id}
                onChange={handleChange}
                disabled={companiesQuery.isLoading}
              >
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
              {errors.company_id && <span className="error">{errors.company_id}</span>}
            </div>
            <Input label="Client Name" name="client_name" />
            <Input label="End Client Name" name="end_client_name" />
            <Input label="Position" name="position" />
            <HybridSelect
              label="Industry / Domain"
              name="industry"
              masterType="industries"
              value={form.industry}
              onChange={handleChange}
              placeholder="Select or type a new industry"
            />
            <HybridSelect
              label="Department"
              name="department"
              masterType="departments"
              value={form.department}
              onChange={handleChange}
              placeholder="Select or type a new department"
            />
            <Input
              label="Client Job ID"
              name="client_job_id"
              readOnly
              placeholder="Auto-generated"
            />
          </FormSection>

          <FormSection title="Experience">
            <Input label="Min Exp (Year)" name="min_exp_year" type="number" />
            <Input label="Min Exp (Month)" name="min_exp_month" type="number" />
            <Input label="Max Exp (Year)" name="max_exp_year" type="number" />
            <Input label="Max Exp (Month)" name="max_exp_month" type="number" />
          </FormSection>

          <FormSection title="Hiring Details">
            <Input label="Number of Positions" name="no_of_positions" type="number" />
            <Input label="Assign Date" name="assign_date" type="date" />
            <div className="form-field">
              <label htmlFor="assigned-to">Assign to</label>
              <select
                id="assigned-to"
                name="assigned_to"
                className="input-field"
                value={form.assigned_to}
                onChange={handleChange}
                disabled={usersQuery.isLoading}
              >
                <option value="">Select user</option>
                {assignableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
              {usersQuery.isError && (
                <span className="error">Unable to load users.</span>
              )}
            </div>
            <Input label="Email Subject" name="email_subject" />
          </FormSection>

          <FormSection title="Location">
            <div className="form-field">
              <label>Country</label>
              <select
                name="country"
                className="input-field"
                value={form.country}
                onChange={handleChange}
              >
                <option value="">Select country</option>
                {countryOptions.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>State</label>
              <select
                name="state"
                className="input-field"
                value={form.state}
                onChange={handleChange}
                disabled={!form.country}
              >
                <option value="">Select state</option>
                {stateOptions.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>City</label>
              <select
                name="city"
                className="input-field"
                value={form.city}
                onChange={handleChange}
                disabled={!form.state}
              >
                <option value="">Select city</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <Input label="Zip Code" name="zip_code" />
          </FormSection>

          <FormSection title="Job Details">
            <div className="form-field">
              <label>Job Type</label>
              <select
                name="job_type"
                className="input-field"
                value={form.job_type}
                onChange={handleChange}
              >
                <option value="">Select job type</option>
                {jobTypeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Workplace Type</label>
              <select
                name="workplace_type"
                className="input-field"
                value={form.workplace_type}
                onChange={handleChange}
              >
                <option value="">Select workplace type</option>
                {workplaceTypeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Duration</label>
              <select
                name="duration_months"
                className="input-field"
                value={form.duration_months}
                onChange={handleChange}
              >
                <option value="">Select duration</option>
                {durationOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Priority</label>
              <select
                name="priority"
                className="input-field"
                value={form.priority}
                onChange={handleChange}
              >
                {priorityOptions.map((option) => (
                  <option key={option} value={option}>{formatOptionLabel(option)}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Status</label>
              <select
                name="status"
                className="input-field"
                value={form.status}
                onChange={handleChange}
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>{formatOptionLabel(option)}</option>
                ))}
              </select>
            </div>
          </FormSection>

          <FormSection title="Education">
            <div className="repeat-stack span-2">
            {form.education.map((edu, index) => (
              <div key={index} className="repeat-card">
                <div className="form-grid">
                <HybridSelect
                  label="Education Group"
                  name="education_group"
                  masterType="education-groups"
                  value={edu.education_group}
                  onChange={(e) => handleEducationChange(index, "education_group", e.target.value)}
                  placeholder="Select or type"
                />
                <HybridSelect
                  label="Education Type"
                  name="education_type"
                  masterType="education-types"
                  value={edu.education_type}
                  onChange={(e) => handleEducationChange(index, "education_type", e.target.value)}
                  placeholder="Select or type"
                />
                <HybridSelect
                  label="Specialization"
                  name="specialization"
                  masterType="specializations"
                  value={edu.specialization}
                  onChange={(e) => handleEducationChange(index, "specialization", e.target.value)}
                  placeholder="Select or type"
                />

                {form.education.length > 1 && (
                  <div className="repeat-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => removeEducation(index)}
                    >
                      Remove
                    </button>
                  </div>
                )}
                </div>
              </div>
            ))}
            </div>
            <div className="span-2">
              <button type="button" className="btn-primary" onClick={addEducation}>
                + Add Education
              </button>
            </div>
          </FormSection>

          <FormSection title="Additional Details">
            <HybridSelect
              label="Keywords"
              name="keywords"
              masterType="keywords"
              value={form.keywords}
              onChange={handleChange}
              isMulti={true}
              placeholder="Type and press Enter to add keywords"
            />

            <div className="form-field span-2">
              <label>Remarks</label>
              <textarea
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            {existingFile?.name && (
              <div className="form-field span-2">
                <label>Current File</label>
                <div className="input-field header-inline">
                  <span>{existingFile.name}</span>
                  <a href={api.defaults.baseURL + existingFile.url} target="_blank" rel="noreferrer" className="btn-secondary">
                    View
                  </a>
                </div>
              </div>
            )}

            <div className="form-field span-2">
              <label>Upload File</label>
              <input type="file" name="file" onChange={handleChange} className="input-field" />
            </div>

            <div className="form-field span-2">
              <label>Job Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="input-field"
              />
            </div>
          </FormSection>

          <div className="page-actions">
            <button type="submit" className="btn-primary" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : (
                <>
                  <Save size={16} /> Save Changes
                </>
              )}
            </button>
          </div>
        </SectionCard>

    </PageShell>
  );
};

export default EditRequirementPage;
