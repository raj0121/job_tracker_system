import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

const CreateRequirementPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canReadCompanies = hasPermission("companies:read:own");
  const {
    form,
    errors,
    submitError,
    mutation: createMutation,
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
    mode: "create",
    canReadCompanies,
    onSuccess: () => navigate("/app/requirements")
  });

  return (
    <PageShell>
      <HeroPanel
        title="Create Requirement"
        subtitle="Capture new role details and assign ownership."
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
            <div className="form-field">
              <label>Client Name</label>
              <input name="client_name" className="input-field" value={form.client_name} onChange={handleChange} />
              {errors.client_name && <span className="error">{errors.client_name}</span>}
            </div>
            <div className="form-field">
              <label>End Client Name</label>
              <input name="end_client_name" className="input-field" value={form.end_client_name} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Position</label>
              <input name="position" className="input-field" value={form.position} onChange={handleChange} />
              {errors.position && <span className="error">{errors.position}</span>}
            </div>
            <HybridSelect
              label="Industry / Domain"
              name="industry"
              masterType="industries"
              value={form.industry}
              onChange={handleChange}
              placeholder="Select or type"
            />
            <HybridSelect
              label="Department"
              name="department"
              masterType="departments"
              value={form.department}
              onChange={handleChange}
              placeholder="Select or type"
            />
          </FormSection>

          <FormSection title="Experience">
            <div className="form-field">
              <label>Min Exp (Year)</label>
              <input name="min_exp_year" type="number" className="input-field" value={form.min_exp_year} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Min Exp (Month)</label>
              <input name="min_exp_month" type="number" className="input-field" value={form.min_exp_month} onChange={handleChange} />
            </div>
            {/* <div className="form-grid">
              <div className="form-field">
                <label>Max Exp (Year)</label>
                <input name="max_exp_year" type="number" className="input-field" value={form.max_exp_year} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Max Exp (Month)</label>
                <input name="max_exp_month" type="number" className="input-field" value={form.max_exp_month} onChange={handleChange} />
              </div>
            </div> */}
          </FormSection>

          <FormSection title="Hiring Details">
            <div className="form-field">
              <label>Number of Positions</label>
              <input name="no_of_positions" type="number" className="input-field" value={form.no_of_positions} onChange={handleChange} />
              {errors.no_of_positions && <span className="error">{errors.no_of_positions}</span>}
            </div>
            <div className="form-field">
              <label>Assign Date</label>
              <input name="assign_date" type="date" className="input-field" value={form.assign_date} onChange={handleChange} />
            </div>
            {/* <div className="form-field">
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
            </div> */}
            <div className="form-field">
              <label>Email Subject</label>
              <input name="email_subject" className="input-field" value={form.email_subject} onChange={handleChange} />
            </div>
          </FormSection>

          <FormSection title="Location">
            <div className="form-field">
                <label htmlFor="client-country">Country</label>
                <select
                  id="client-country"
                  name="country"
                  className="input-field"
                  value={form.country}
                  onChange={handleChange}
                >
                  <option value="">Select country</option>
                  {countryOptions.map((country) => (
                    <option key={country.isoCode} value={country.isoCode}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="client-state">State</label>
                <select
                  id="client-state"
                  name="state"
                  className="input-field"
                  value={form.state}
                  onChange={handleChange}
                  disabled={!form.country}
                >
                  <option value="">Select state</option>
                  {stateOptions.map((state) => (
                    <option key={state.isoCode} value={state.isoCode}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="client-city">City</label>
                <select
                  id="client-city"
                  name="city"
                  className="input-field"
                  value={form.city}
                  onChange={handleChange}
                  disabled={!form.state}
                >
                  <option value="">Select city</option>
                  {cityOptions.map((city) => (
                    <option key={`${city.name}-${city.stateCode}`} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
            <div className="form-field">
              <label>Zip Code</label>
              <input name="zip_code" className="input-field" value={form.zip_code} onChange={handleChange} />
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
                </div>
                {form.education.length > 1 && (
                  <div className="repeat-actions">
                    <button type="button" className="btn-secondary" onClick={() => removeEducation(index)}>
                    Remove Entry
                    </button>
                  </div>
                )}
              </div>
            ))}
            </div>
            <div className="span-2">
              <button type="button" className="btn-secondary" onClick={addEducation}>
                + Add Education Entry
              </button>
            </div>
          </FormSection>

          <FormSection title="Job Attributes">
            <div className="form-field">
              <label>Job Type</label>
              <select name="job_type" className="input-field" value={form.job_type} onChange={handleChange}>
                <option value="">Select type</option>
                {jobTypeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Workplace Type</label>
              <select name="workplace_type" className="input-field" value={form.workplace_type} onChange={handleChange}>
                <option value="">Select workplace</option>
                {workplaceTypeOptions?.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Duration</label>
              <select name="duration_months" className="input-field" value={form.duration_months} onChange={handleChange}>
                <option value="">Select duration</option>
                {durationOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Priority</label>
              <select name="priority" className="input-field" value={form.priority} onChange={handleChange}>
                {priorityOptions.map((option) => (
                  <option key={option} value={option}>{formatOptionLabel(option)}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Status</label>
              <select name="status" className="input-field" value={form.status} onChange={handleChange}>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>{formatOptionLabel(option)}</option>
                ))}
              </select>
            </div>
          </FormSection>

          <FormSection title="Final Details">
            <HybridSelect
              label="Keywords"
              name="keywords"
              masterType="keywords"
              value={form.keywords}
              onChange={handleChange}
              isMulti={true}
              placeholder="Tag skills (press Enter)"
            />
            <div className="form-field">
              <label>Upload File / JD</label>
              <input type="file" name="file" onChange={handleChange} className="input-field" />
            </div>
            <div className="form-field span-2">
              <label>Job Description</label>
              <textarea name="description" className="input-field" value={form.description} onChange={handleChange} rows={5} />
            </div>
            <div className="form-field span-2">
              <label>Internal Remarks</label>
              <textarea name="remarks" className="input-field" value={form.remarks} onChange={handleChange} />
            </div>
          </FormSection>

          <div className="page-actions">
            <button className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : (
                <>
                  <Save size={16} /> Create Requirement
                </>
              )}
            </button>
          </div>
      </SectionCard>
    </PageShell>
  );
};

export default CreateRequirementPage;
