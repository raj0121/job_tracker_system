import { useCallback, useState } from "react";

const cloneTemplate = (template) => ({ ...template });

export default function useContacts(initialTemplate, initialContacts = null) {
  const [contacts, setContacts] = useState(
    initialContacts?.length ? initialContacts : [cloneTemplate(initialTemplate)]
  );

  const replaceContacts = useCallback((nextContacts) => {
    setContacts(nextContacts?.length ? nextContacts : [cloneTemplate(initialTemplate)]);
  }, [initialTemplate]);

  const updateContact = useCallback((index, field, value) => {
    setContacts((previous) => (
      previous.map((contact, contactIndex) => (
        contactIndex === index
          ? { ...contact, [field]: value }
          : contact
      ))
    ));
  }, []);

  const addContact = useCallback(() => {
    setContacts((previous) => [...previous, cloneTemplate(initialTemplate)]);
  }, [initialTemplate]);

  const removeContact = useCallback((index) => {
    setContacts((previous) => {
      const remaining = previous.filter((_, contactIndex) => contactIndex !== index);
      return remaining.length ? remaining : [cloneTemplate(initialTemplate)];
    });
  }, [initialTemplate]);

  const resetContacts = useCallback(() => {
    setContacts([cloneTemplate(initialTemplate)]);
  }, [initialTemplate]);

  const hasInvalidContact = useCallback(() => contacts.some((contact) => (
    !String(contact.name || "").trim()
    && (
      String(contact.mobile || "").trim()
      || String(contact.email || "").trim()
      || String(contact.designation || "").trim()
    )
  )), [contacts]);

  const getCleanContacts = useCallback(() => (
    contacts
      .map((contact) => ({
        name: String(contact.name || "").trim(),
        mobile: String(contact.mobile || "").trim(),
        email: String(contact.email || "").trim(),
        designation: String(contact.designation || "").trim()
      }))
      .filter((contact) => Object.values(contact).some(Boolean))
  ), [contacts]);

  return {
    contacts,
    setContacts,
    replaceContacts,
    updateContact,
    addContact,
    removeContact,
    resetContacts,
    hasInvalidContact,
    getCleanContacts
  };
}
