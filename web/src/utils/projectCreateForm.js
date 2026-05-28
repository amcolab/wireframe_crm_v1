import { q } from './helpers.js';
import { mockContacts } from './mockData.js';
import { getLatestCompanyContactDept } from './contactCreateForm.js';
import { setFormField } from './formFields.js';

const PROJECT_COMPANY_MIRROR_IDS = [
  'prDetailCompanyId',
  'prDetailCompanyName',
  'prDetailCompanyType',
  'prDetailCompanyTel',
  'prDetailCompanyIndustry',
  'prDetailCompanyScale',
  'prDetailCompanyDept',
  'prDetailCompanyPostal',
  'prDetailCompanyPref',
  'prDetailCompanyAddr',
];

export function resetProjectCreateForm() {
  const form = q('formProjectDetail');
  form?.reset();
  PROJECT_COMPANY_MIRROR_IDS.forEach((id) => setFormField(id, ''));
}

/**
 * @param {Record<string, unknown>} company
 * @param {Array<{ id?: string | number; companyId?: string | number; dept?: string }>} [contacts]
 */
export function fillProjectCreateFromCompany(company, contacts = mockContacts) {
  if (!company) return;

  setFormField('prDetailCompanyId', company.id);
  setFormField('prDetailCompanyName', company.name);
  setFormField('prDetailCompanyType', company.type);
  setFormField('prDetailCompanyTel', company.tel);
  setFormField('prDetailCompanyIndustry', company.industry);
  setFormField('prDetailCompanyScale', company.scale);
  setFormField('prDetailCompanyDept', getLatestCompanyContactDept(company.id, contacts));
  setFormField('prDetailCompanyPostal', company.postal);
  setFormField('prDetailCompanyPref', company.pref);
  setFormField('prDetailCompanyAddr', company.addr);
}

/**
 * @param {{ company?: Record<string, unknown> | null; contacts?: Array<Record<string, unknown>> }} [options]
 */
export function openProjectCreateDialog(options = {}) {
  resetProjectCreateForm();
  if (options.company) {
    fillProjectCreateFromCompany(options.company, options.contacts ?? mockContacts);
  }
  q('dlgProjectDetail')?.showModal();
}

/** @param {Record<string, unknown>} company */
export function applyCompanyToProjectCreateForm(company, contacts = mockContacts) {
  if (!company) return;
  fillProjectCreateFromCompany(company, contacts);
}
