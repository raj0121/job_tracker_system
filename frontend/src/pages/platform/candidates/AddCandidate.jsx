import { useAuth } from "../../../context/AuthContext";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { candidateStatusOptions } from "./candidateConfig";
import { useCandidateForm } from "../../../hooks/useCandidateForm";
import PageShell from "../../../components/layout/PageShell";
import HeroPanel from "../../../components/layout/HeroPanel";
import SectionCard from "../../../components/layout/SectionCard";
import FormSection from "../../../components/layout/FormSection";
import HybridSelect from "../../../components/common/HybridSelect";

const AddCandidatePage = () => {
  const navigate = useNavigate();
  useAuth();
  const {
    form,
    formKey,
    errors,
    submitError,
    createMutation,
    designationsQuery,
    designations,
    countryOptions,
    stateOptions,
    cityOptions,
    handleChange,
    handleSubmit,
    handleReset,
    updateEducation,
    addEducation,
    removeEducation,
    updateExperience,
    addExperience,
    removeExperience,
    setRelocate
  } = useCandidateForm({
    onSuccess: () => navigate("/app/candidates")
  });

  return (
    <PageShell>
      <HeroPanel
        title="Create Candidate"
        subtitle="Add a candidate profile using the same structured ATS form pattern used across the platform."
        actions={(
          <button className="btn-secondary" type="button" onClick={() => navigate("/app/candidates")}>
            <ArrowLeft size={16} /> Back to list
          </button>
        )}
      />

      <SectionCard>
        {submitError && (
          <p className="form-alert">
            {submitError}
          </p>
        )}

        <form key={formKey} onSubmit={handleSubmit}>
          <div className="form-sections">
            <FormSection title="Basic Information">
              <div className="form-field">
                <label htmlFor="candidate-name">Candidate name</label>
                <input
                  id="candidate-name"
                  name="name"
                  placeholder="Candidate name"
                  className="input-field"
                  value={form.name}
                  onChange={handleChange}
                />
                {errors.name ? <span className="inline-error">{errors.name}</span> : null}
              </div>
              <div className="form-field">
                <label htmlFor="candidate-position">Applied position</label>
                <input
                  id="candidate-position"
                  name="position"
                  placeholder="Applied position"
                  className="input-field"
                  value={form.position}
                  onChange={handleChange}
                />
              </div>
              <HybridSelect
                label="Department"
                name="department"
                masterType="departments"
                value={form.department}
                onChange={handleChange}
                placeholder="Select or type department"
              />
              <div className="form-field">
                <label htmlFor="candidate-designation">Designation</label>
                <select
                  id="candidate-designation"
                  name="designationId"
                  className="input-field"
                  value={form.designationId}
                  onChange={handleChange}
                  disabled={designationsQuery.isLoading}
                >
                  <option value="">{designationsQuery.isLoading ? "Loading designations..." : "Select designation"}</option>
                  {designations.map((designation) => (
                    <option key={designation.id} value={designation.id}>
                      {designation.name}
                    </option>
                  ))}
                </select>
                {designationsQuery.isError && (
                  <span className="inline-error">
                    Unable to load designations.
                  </span>
                )}
              </div>
              <div className="form-field">
                <label htmlFor="candidate-status">Status</label>
                <select
                  id="candidate-status"
                  name="status"
                  className="input-field"
                  value={form.status}
                  onChange={handleChange}
                >
                  {candidateStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </FormSection>

            <FormSection title="Compensation">
              <div className="form-field">
                <label htmlFor="candidate-comp">Compensation</label>
                <input
                  id="candidate-comp"
                  name="compensation"
                  placeholder="Compensation"
                  className="input-field"
                  value={form.compensation}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label htmlFor="candidate-current-salary">Current salary</label>
                <input
                  id="candidate-current-salary"
                  name="currentSalary"
                  placeholder="Current salary"
                  className="input-field"
                  value={form.currentSalary}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label htmlFor="candidate-expected-salary">Expected salary</label>
                <input
                  id="candidate-expected-salary"
                  name="expectedSalary"
                  placeholder="Expected salary"
                  className="input-field"
                  value={form.expectedSalary}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label htmlFor="candidate-tax">Tax terms</label>
                <select
                  id="candidate-tax"
                  name="taxTerms"
                  className="input-field"
                  value={form.taxTerms}
                  onChange={handleChange}
                >
                  <option value="">Select tax term</option>
                  <option value="full-time">Full Time</option>
                  <option value="part-time">Part Time</option>
                  <option value="remote">Remote</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="candidate-work-auth">Work authorization</label>
                <input
                  id="candidate-work-auth"
                  name="workAuthorization"
                  placeholder="Work authorization"
                  className="input-field"
                  value={form.workAuthorization}
                  onChange={handleChange}
                />
              </div>
            </FormSection>

            <FormSection title="Experience">
              <div className="span-2 repeat-stack">
                <div className="section-title-row section-title-row--end">
                  <button type="button" className="btn-secondary" onClick={addExperience}>
                    <Plus size={16} /> Add Experience
                  </button>
                </div>

                {form.experiences.map((experience, index) => (
                  <div key={`experience-${index}`} className="repeat-card">
                    <div className="section-title-row">
                      <strong>Experience </strong>
                      <button type="button" className="btn-secondary" onClick={() => removeExperience(index)}>
                        <Trash2 size={16} /> Remove
                      </button>
                    </div>

                    <div className="form-grid">
                      <div className="form-field">
                        <label htmlFor={`candidate-experience-company-${index}`}>Company Name</label>
                        <input
                          id={`candidate-experience-company-${index}`}
                          className="input-field"
                          value={experience.company}
                          onChange={(event) => updateExperience(index, "company", event.target.value)}
                          placeholder="Company name"
                        />
                      </div>
                      <div className="form-field">
                        <label htmlFor={`candidate-experience-role-${index}`}>Job Role / Title</label>
                        <input
                          id={`candidate-experience-role-${index}`}
                          className="input-field"
                          value={experience.role}
                          onChange={(event) => updateExperience(index, "role", event.target.value)}
                          placeholder="Job role or title"
                        />
                      </div>
                      <div className="form-field">
                        <label htmlFor={`candidate-experience-years-${index}`}>Years</label>
                        <select
                          id={`candidate-experience-years-${index}`}
                          className="input-field"
                          value={experience.years}
                          onChange={(event) => updateExperience(index, "years", event.target.value)}
                        >
                          <option value="">Years</option>
                          {[...Array(21).keys()].map((n) => (
                            <option key={n} value={n}>
                              {n === 20 ? "20+ Years" : `${n} Years`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-field">
                        <label htmlFor={`candidate-experience-months-${index}`}>Months</label>
                        <select
                          id={`candidate-experience-months-${index}`}
                          className="input-field"
                          value={experience.months}
                          onChange={(event) => updateExperience(index, "months", event.target.value)}
                        >
                          <option value="">Months</option>
                          {[...Array(12).keys()].map((n) => (
                            <option key={n} value={n}>{n} Months</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-field">
                      <label htmlFor={`candidate-experience-description-${index}`}>Description / Responsibilities</label>
                      <textarea
                        id={`candidate-experience-description-${index}`}
                        className="input-field"
                        value={experience.description}
                        onChange={(event) => updateExperience(index, "description", event.target.value)}
                        placeholder="Key responsibilities, achievements, tools, or domain work"
                        rows={4}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </FormSection>

            <FormSection title="Contact & Availability">
              <div className="form-field">
                <label htmlFor="candidate-phone">Contact number</label>
                <input
                  id="candidate-phone"
                  name="phone"
                  placeholder="Contact number"
                  className="input-field"
                  value={form.phone}
                  onChange={handleChange}
                />
                {errors.phone ? <span className="inline-error">{errors.phone}</span> : null}
              </div>
              <div className="form-field">
                <label htmlFor="candidate-email">Email address</label>
                <input
                  id="candidate-email"
                  name="email"
                  placeholder="Email address"
                  className="input-field"
                  value={form.email}
                  onChange={handleChange}
                />
                {errors.email ? <span className="inline-error">{errors.email}</span> : null}
              </div>
              <div className="form-field">
                <label htmlFor="candidate-availability">Availability to start (days)</label>
                <input
                  id="candidate-availability"
                  name="availabilityDays"
                  placeholder="Availability (days)"
                  className="input-field"
                  value={form.availabilityDays}
                  onChange={handleChange}
                />
                {errors.availabilityDays ? <span className="inline-error">{errors.availabilityDays}</span> : null}
              </div>
              <HybridSelect
                label="Source"
                name="source"
                masterType="candidate-sources"
                value={form.source}
                onChange={handleChange}
                placeholder="Select or type source"
              />
              <div className="form-field">
                <label htmlFor="candidate-relocate">Open to Relocate</label>
                <select
                  id="candidate-relocate"
                  name="relocate"
                  className="input-field"
                  value={form.relocate ? "yes" : "no"}
                  onChange={(event) =>
                    setRelocate(event.target.value === "yes")
                  }
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </FormSection>

            <FormSection title="Location">
              <div className="form-field">
                <label htmlFor="candidate-country">Country</label>
                <select
                  id="candidate-country"
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
                <label htmlFor="candidate-state">State</label>
                <select
                  id="candidate-state"
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
                <label htmlFor="candidate-city">City</label>
                <select
                  id="candidate-city"
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
                <label htmlFor="candidate-zip">Zip code</label>
                <input
                  id="candidate-zip"
                  name="zipCode"
                  placeholder="Zip code"
                  className="input-field"
                  value={form.zipCode}
                  onChange={handleChange}
                />
              </div>
            </FormSection>

            <FormSection title="Education">
              <div className="span-2 repeat-stack">
                <div className="section-title-row section-title-row--end">
                  <button type="button" className="btn-secondary" onClick={addEducation}>
                    <Plus size={16} /> Add Education
                  </button>
                </div>

                {form.educations.map((education, index) => (
                  <div key={`education-${index}`} className="repeat-card">
                    <div className="section-title-row">
                      <strong>Education</strong>
                      <button type="button" className="btn-secondary" onClick={() => removeEducation(index)}>
                        <Trash2 size={16} /> Remove
                      </button>
                    </div>

                    <div className="form-grid">
                      <HybridSelect
                        label="Education Group"
                        name={`education-group-${index}`}
                        masterType="education-groups"
                        value={education.educationGroup}
                        onChange={(event) => updateEducation(index, "educationGroup", event.target.value)}
                        placeholder="Select or type group"
                      />
                      <HybridSelect
                        label="Education Type"
                        name={`education-type-${index}`}
                        masterType="education-types"
                        value={education.educationType}
                        onChange={(event) => updateEducation(index, "educationType", event.target.value)}
                        placeholder="Select or type type"
                      />
                      <div className="form-field">
                        <label htmlFor={`candidate-university-${index}`}>University</label>
                        <input
                          id={`candidate-university-${index}`}
                          className="input-field"
                          value={education.university}
                          onChange={(event) => updateEducation(index, "university", event.target.value)}
                          placeholder="University"
                        />
                      </div>
                      <div className="form-field">
                        <label htmlFor={`candidate-cgpa-${index}`}>Percentage / CGPA</label>
                        <input
                          id={`candidate-cgpa-${index}`}
                          className="input-field"
                          value={education.cgpa}
                          onChange={(event) => updateEducation(index, "cgpa", event.target.value)}
                          placeholder="Percentage / CGPA"
                        />
                      </div>
                      <div className="form-field">
                        <label htmlFor={`candidate-year-${index}`}>Year</label>
                        <input
                          id={`candidate-year-${index}`}
                          className="input-field"
                          value={education.year}
                          onChange={(event) => updateEducation(index, "year", event.target.value)}
                          placeholder="Year"
                        />
                      </div>
                      <HybridSelect
                        label="Specialization"
                        name={`specialization-${index}`}
                        masterType="specializations"
                        value={education.specialization}
                        onChange={(event) => updateEducation(index, "specialization", event.target.value)}
                        placeholder="Select or type specialization"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </FormSection>

            <FormSection title="Documents">
              <div className="form-field">
                <label htmlFor="candidate-cv">Upload CV</label>
                <input
                  key={formKey}
                  id="candidate-cv"
                  type="file"
                  name="cv"
                  className="input-field"
                  onChange={handleChange}
                />
              </div>
              <p className="helper-text span-2">
                CV upload is not stored yet. Save the candidate first, then attach documents from the Documents section.
              </p>
            </FormSection>

            <div className="page-actions">
              <button className="btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : (
                  <>
                    <Plus size={16} /> Save & Return
                  </>
                )}
              </button>
              <button type="button" className="btn-secondary" onClick={handleReset}>
                Clear
              </button>
            </div>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
};

export default AddCandidatePage;
