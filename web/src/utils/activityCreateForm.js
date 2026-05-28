import { q } from './helpers.js';
import { mockContacts } from './mockData.js';
import { getLatestCompanyContactDept } from './contactCreateForm.js';
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
 * @param {{ company?: Record<string, unknown> | null; contacts?: Array<Record<string, unknown>> }} [options]
 */
export function openActivityCreateDialog(options = {}) {
  resetActivityCreateForm();
  if (options.company) {
    fillActivityCreateFromCompany(options.company, options.contacts ?? mockContacts);
  }
  q('dlgActivityDetail')?.showModal();
}

/** @param {Record<string, unknown>} company */
export function applyCompanyToActivityCreateForm(company, contacts = mockContacts) {
  if (!company) return;
  fillActivityCreateFromCompany(company, contacts);
}
