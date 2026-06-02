import { q } from './helpers.js';
import { mockContacts, mockCompanies } from './mockData.js';
import { getLatestCompanyContactDept, resolveCompanyFromContact } from './contactCreateForm.js';
import { setFormField } from './formFields.js';

const ACTIVITY_COMPANY_MIRROR_IDS = [
  'atDetailCompanyId',
  'atDetailCompanyName',
  'atDetailCompanyType',
  'atDetailCompanyTel',
  'atDetailCompanyIndustry',
  'atDetailCompanyScale',
  'atDetailCompanyDept',
  'atDetailCompanyPostal',
  'atDetailCompanyPref',
  'atDetailCompanyAddr',
];

export function resetActivityCreateForm() {
  const form = q('formActivityDetail');
  form?.reset();
  ACTIVITY_COMPANY_MIRROR_IDS.forEach((id) => setFormField(id, ''));
}

/**
 * @param {Record<string, unknown>} company
 * @param {Array<{ id?: string | number; companyId?: string | number; dept?: string }>} [contacts]
 */
export function fillActivityCreateFromCompany(company, contacts = mockContacts) {
  if (!company) return;

  setFormField('atDetailCompanyId', company.id);
  setFormField('atDetailCompanyName', company.name);
  setFormField('atDetailCompanyType', company.type);
  setFormField('atDetailCompanyTel', company.tel);
  setFormField('atDetailCompanyIndustry', company.industry);
  setFormField('atDetailCompanyScale', company.scale);
  setFormField('atDetailCompanyDept', getLatestCompanyContactDept(company.id, contacts));
  setFormField('atDetailCompanyPostal', company.postal);
  setFormField('atDetailCompanyPref', company.pref);
  setFormField('atDetailCompanyAddr', company.addr);
}

/**
 * @param {{ companyId?: string | number; company?: string; last?: string; dept?: string }} contact
 * @param {Array<Record<string, unknown>>} [contacts]
 */
export function fillActivityCreateFromContact(contact, contacts = mockContacts) {
  if (!contact) return;

  const company = resolveCompanyFromContact(contact);
  if (company) {
    fillActivityCreateFromCompany(company, contacts);
    const dept = (contact.dept ?? '').trim();
    if (dept) setFormField('atDetailCompanyDept', dept);
  }

  const contactName = (contact.last ?? '').trim();
  if (contactName) setFormField('atDetailContact', contactName);
}

/**
 * @param {{ contactId?: string | number; company?: string }} project
 */
export function resolveCompanyFromProject(project) {
  if (!project) return null;
  if (project.contactId != null && project.contactId !== '') {
    const contact = mockContacts.find((c) => String(c.id) === String(project.contactId));
    if (contact) return resolveCompanyFromContact(contact);
  }
  const name = (project.company ?? '').trim();
  if (!name) return null;
  return mockCompanies.find((c) => c.name === name) ?? null;
}

/**
 * @param {{ id?: string | number; contactId?: string | number; company?: string; contact?: string; name?: string; rep?: string }} project
 * @param {Array<Record<string, unknown>>} [contacts]
 */
export function fillActivityCreateFromProject(project, contacts = mockContacts) {
  if (!project) return;

  const company = resolveCompanyFromProject(project);
  if (company) {
    fillActivityCreateFromCompany(company, contacts);
    if (project.contactId != null && project.contactId !== '') {
      const contact = contacts.find((c) => String(c.id) === String(project.contactId));
      const dept = (contact?.dept ?? '').trim();
      if (dept) setFormField('atDetailCompanyDept', dept);
    }
  }

  const contactName = (project.contact ?? '').trim();
  if (contactName) setFormField('atDetailContact', contactName);

  if (project.id != null && project.id !== '') setFormField('atDetailProjectId', project.id);
  const projectName = (project.name ?? '').trim();
  if (projectName) setFormField('atDetailProjectName', projectName);

  const rep = (project.rep ?? '').trim();
  if (rep) setFormField('atDetailSalesRep', rep);
}

/**
 * @param {{
 *   company?: Record<string, unknown> | null;
 *   contact?: Record<string, unknown> | null;
 *   project?: Record<string, unknown> | null;
 *   contacts?: Array<Record<string, unknown>>;
 * }} [options]
 */
export function openActivityCreateDialog(options = {}) {
  resetActivityCreateForm();
  const contacts = options.contacts ?? mockContacts;
  if (options.project) {
    fillActivityCreateFromProject(options.project, contacts);
  } else if (options.contact) {
    fillActivityCreateFromContact(options.contact, contacts);
  } else if (options.company) {
    fillActivityCreateFromCompany(options.company, contacts);
  }
  q('dlgActivityDetail')?.showModal();
}

/** @param {Record<string, unknown>} company */
export function applyCompanyToActivityCreateForm(company, contacts = mockContacts) {
  if (!company) return;
  fillActivityCreateFromCompany(company, contacts);
}
