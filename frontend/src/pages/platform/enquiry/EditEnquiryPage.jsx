import { ArrowLeft, Paperclip, Plus, Save, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { ENQUIRY_STATUS_OPTIONS } from "../../../config/status.config";
import { useEnquiryForm } from "../../../hooks/useEnquiryForm";
import PageShell from "../../../components/layout/PageShell";
import HeroPanel from "../../../components/layout/HeroPanel";
import SectionCard from "../../../components/layout/SectionCard";
import FormSection from "../../../components/layout/FormSection";
import HybridSelect from "../../../components/common/HybridSelect";
import {
  clientTypeOptions
} from "./enquiryConfig";

const EditEnquiryPage = () => {
  const { id } = useParams();
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
    mutation: updateMutation,
    enquiryQuery,
    companies,
    handleChange,
    handleFiles,
    removeAttachment,
    handleSubmit
  } = useEnquiryForm({
    id,
    mode: "edit",
    canReadCompanies,
    onSuccess: () => navigate("/app/enquiry")
  });

  if (enquiryQuery.isLoading) {
    return <p>Loading enquiry...</p>;
  }

  if (enquiryQuery.isError) {
    return <p>Unable to load enquiry.</p>;
  }

  return (
    <PageShell>
      <HeroPanel
        badge="Enquiry Update"
        title="Edit Enquiry"
        subtitle="Update enquiry details and keep the pipeline accurate."
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
                <input
                  id="client-country"
                  name="country"
                  className="input-field"
                  value={form.country}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label htmlFor="client-state">State</label>
                <input
                  id="client-state"
                  name="state"
                  className="input-field"
                  value={form.state}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label htmlFor="client-city">City</label>
                <input
                  id="client-city"
                  name="city"
                  className="input-field"
                  value={form.city}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label htmlFor="client-zip">Zip code</label>
                <input
                  id="client-zip"
                  name="zip_code"
                  className="input-field"
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
                <label htmlFor="resource-profile">Resource profile link</label>
                <input
                  id="resource-profile"
                  name="resource_profile_link"
                  className="input-field"
                  value={form.resource_profile_link}
                  onChange={handleChange}
                />
              </div>
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
              <div className="form-field span-2">
                <label htmlFor="remarks">Remarks</label>
                <textarea
                  id="remarks"
                  name="remarks"
                  className="input-field"
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
                  Upload new documents if needed.
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
                  <p className="field-hint">Update contact persons attached to this enquiry.</p>
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
                          value={contact.name}
                          onChange={(event) => updateContact(index, "name", event.target.value)}
                        />
                      </div>
                      <div className="form-field">
                        <label>Mobile number</label>
                        <input
                          className="input-field"
                          value={contact.mobile}
                          onChange={(event) => updateContact(index, "mobile", event.target.value)}
                        />
                      </div>
                      <div className="form-field">
                        <label>Email ID</label>
                        <input
                          className="input-field"
                          value={contact.email}
                          onChange={(event) => updateContact(index, "email", event.target.value)}
                        />
                      </div>
                      <div className="form-field">
                        <label>Designation</label>
                        <input
                          className="input-field"
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
              <button type="submit" className="btn-primary" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : (
                  <>
                    <Save size={16} /> Save Changes
                  </>
                )}
              </button>
              {formError && (
                <span className="inline-error">{formError}</span>
              )}
              {updateMutation.isError && (
                <span className="inline-error">
                  {updateMutation.error?.response?.data?.message || "Unable to update enquiry."}
                </span>
              )}
            </div>
          </div>
        </form>
      </SectionCard>

  </PageShell>
  );
};

export default EditEnquiryPage;
