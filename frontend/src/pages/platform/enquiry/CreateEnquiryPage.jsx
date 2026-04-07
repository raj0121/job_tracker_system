import { ArrowLeft, Paperclip, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ENQUIRY_STATUS_OPTIONS } from "../../../config/status.config";
import { useAuth } from "../../../context/AuthContext";
import { useEnquiryForm } from "../../../hooks/useEnquiryForm";
import PageShell from "../../../components/layout/PageShell";
import HeroPanel from "../../../components/layout/HeroPanel";
import SectionCard from "../../../components/layout/SectionCard";
import FormSection from "../../../components/layout/FormSection";
import HybridSelect from "../../../components/common/HybridSelect";
import {
  clientTypeOptions
} from "./enquiryConfig";

const CreateEnquiryPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canReadCompanies = hasPermission("companies:read:own");
  const {
    form,
    errors,
    attachments,
    formError,
    contacts,
    addContact,
    removeContact,
    updateContact,
    mutation: createMutation,
    companies,
    countryOptions,
    stateOptions,
    cityOptions,
    handleChange,
    handleFiles,
    removeAttachment,
    handleSubmit,
    handleReset
  } = useEnquiryForm({
    mode: "create",
    canReadCompanies,
    onSuccess: () => navigate("/app/enquiry")
  });

  return (
    <PageShell>
      <HeroPanel
        title="Create Enquiry"
        subtitle="Capture enquiry details in the same structured layout used across ATS create and edit workflows."
        actions={
          <button className="btn-secondary" type="button" onClick={() => navigate("/app/enquiry")}>
            <ArrowLeft size={16} /> Back to list
          </button>
        }
      />

      <SectionCard>
        <form onSubmit={handleSubmit}>
          <div className="form-sections">
            <FormSection title="Client Details">
              <div className="form-field">
                <label htmlFor="client-name">Client name</label>
                <input
                  id="client-name"
                  name="client_name"
                  className="input-field"
                  placeholder="Asha Verma"
                  value={form.client_name}
                  onChange={handleChange}
                  required
                />
                {errors.client_name ? <span className="inline-error">{errors.client_name}</span> : null}
              </div>
              <div className="form-field">
                <label htmlFor="client-contact">Contact number</label>
                <input
                  id="client-contact"
                  name="contact_number"
                  className="input-field"
                  placeholder="+1 555 0198"
                  value={form.contact_number}
                  onChange={handleChange}
                />
                {errors.contact_number ? <span className="inline-error">{errors.contact_number}</span> : null}
              </div>
              <div className="form-field">
                <label htmlFor="client-email">Email address</label>
                <input
                  id="client-email"
                  name="email"
                  className="input-field"
                  placeholder="asha@domain.com"
                  value={form.email}
                  onChange={handleChange}
                />
                {errors.email ? <span className="inline-error">{errors.email}</span> : null}
              </div>
              <div className="form-field">
                <label htmlFor="client-type">Client type</label>
                <select
                  id="client-type"
                  name="client_type"
                  className="input-field"
                  value={form.client_type}
                  onChange={handleChange}
                >
                  {clientTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </FormSection>

            <FormSection title="Location Details">
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
                <label htmlFor="client-zip">Zip code</label>
                <input
                  id="client-zip"
                  name="zip_code"
                  className="input-field"
                  placeholder="94107"
                  value={form.zip_code}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field span-2">
                <label htmlFor="client-address">Full address</label>
                <textarea
                  id="client-address"
                  name="address"
                  className="input-field"
                  placeholder="Street address and landmarks"
                  value={form.address}
                  onChange={handleChange}
                />
              </div>
            </FormSection>

            <FormSection title="Company Details">
              <div className="form-field">
                <label htmlFor="company-id">Company name</label>
                <select
                  id="company-id"
                  name="company_id"
                  className="input-field"
                  value={form.company_id}
                  onChange={handleChange}
                >
                  <option value="">Select company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                  <option value="other">Other</option>
                </select>
              </div>
              {form.company_id === "other" && (
                <div className="form-field">
                  <label htmlFor="company-name">Company name (manual)</label>
                  <input
                    id="company-name"
                    name="company_name"
                    className="input-field"
                    placeholder="Other"
                  value={form.company_name}
                  onChange={handleChange}
                />
                  {errors.company_name ? <span className="inline-error">{errors.company_name}</span> : null}
                </div>
              )}
              <HybridSelect
                label="Industry / Domain"
                name="industry"
                masterType="industries"
                value={form.industry}
                onChange={handleChange}
                placeholder="Select or type industry"
              />
            </FormSection>

            <FormSection title="Business Context">
              <HybridSelect
                label="Reference Source"
                name="reference_source"
                masterType="reference-sources"
                value={form.reference_source}
                onChange={handleChange}
                placeholder="Select or type reference source"
              />
              <div className="form-field">
                <label htmlFor="enquiry-date">Enquiry date</label>
                <input
                  id="enquiry-date"
                  name="enquiry_date"
                  type="date"
                  className="input-field"
                  value={form.enquiry_date}
                  onChange={handleChange}
                />
              </div>
              <HybridSelect
                label="Source of Enquiry"
                name="enquiry_source"
                masterType="enquiry-sources"
                value={form.enquiry_source}
                onChange={handleChange}
                placeholder="Select or type source"
              />
              <div className="form-field">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  name="status"
                  className="input-field"
                  value={form.status}
                  onChange={handleChange}
                >
                  {ENQUIRY_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="resource-profile">Resource profile link</label>
                <input
                  id="resource-profile"
                  name="resource_profile_link"
                  className="input-field"
                  placeholder="https://"
                  value={form.resource_profile_link}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field span-2">
                <label htmlFor="remarks">Remarks</label>
                <textarea
                  id="remarks"
                  name="remarks"
                  className="input-field"
                  placeholder="Additional notes or instructions"
                  value={form.remarks}
                  onChange={handleChange}
                />
              </div>
            </FormSection>

            <FormSection title="Attachments">
              <div className="file-upload-row span-2">
                <input
                  type="file"
                  className="input-field"
                  multiple
                  onChange={handleFiles}
                />
                <span className="helper-text">
                  Upload requirement docs, CVs, or reference files.
                </span>
              </div>
              {attachments.length > 0 && (
                <div className="file-list span-2">
                  {attachments.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="file-pill">
                      <Paperclip size={14} /> {file.name}
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => removeAttachment(index)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </FormSection>

            <FormSection title="Contact Persons">
              <div className="section-title-row span-2">
                <div>
                  <p className="field-hint">Add multiple contact persons for the same enquiry.</p>
                </div>
                <button type="button" className="btn-secondary" onClick={addContact}>
                  <Plus size={14} /> Add Contact
                </button>
              </div>

              <div className="repeat-stack span-2">
                {contacts.map((contact, index) => (
                  <div key={`contact-${index}`} className="repeat-card">
                    <div className="form-grid">
                      <div className="form-field">
                        <label>Person name</label>
                        <input
                          className="input-field"
                          placeholder="Rahul Mehta"
                          value={contact.name}
                          onChange={(event) => updateContact(index, "name", event.target.value)}
                        />
                      </div>
                      <div className="form-field">
                        <label>Mobile number</label>
                        <input
                          className="input-field"
                          placeholder="+1 555 0123"
                          value={contact.mobile}
                          onChange={(event) => updateContact(index, "mobile", event.target.value)}
                        />
                      </div>
                      <div className="form-field">
                        <label>Email ID</label>
                        <input
                          className="input-field"
                          placeholder="rahul@domain.com"
                          value={contact.email}
                          onChange={(event) => updateContact(index, "email", event.target.value)}
                        />
                      </div>
                      <div className="form-field">
                        <label>Designation</label>
                        <input
                          className="input-field"
                          placeholder="HR Manager"
                          value={contact.designation}
                          onChange={(event) => updateContact(index, "designation", event.target.value)}
                        />
                      </div>
                    </div>
                    {contacts.length > 1 && (
                      <div className="repeat-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => removeContact(index)}
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </FormSection>

            <div className="page-actions">
              <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Save & Return"}
              </button>
              <button type="button" className="btn-secondary" onClick={handleReset}>
                Clear
              </button>
              {formError && (
                <span className="inline-error">{formError}</span>
              )}
              {createMutation.isError && (
                <span className="inline-error">
                  {createMutation.error?.response?.data?.message || "Unable to save enquiry."}
                </span>
              )}
            </div>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
};

export default CreateEnquiryPage;
