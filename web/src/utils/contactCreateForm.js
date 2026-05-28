import { q } from './helpers.js';
import { mockContacts, mockCompanies } from './mockData.js';
import { setFormField } from './formFields.js';

const COMPANY_MIRROR_IDS = [
  'contactNewCompanyType',
  'contactNewCompanyTel',
  'contactNewCompanyIndustry',
  'contactNewCompanyScale',
  'contactNewCompanyPostal',
  'contactNewCompanyPref',
  'contactNewCompanyAddr',
  'contactNewCompanyCreatedAt',
  'contactNewCompanyCreatedBy',
  'contactNewCompanyUpdatedAt',
  'contactNewCompanyUpdatedBy',
];

const CONTACT_PREFILL_IDS = [
  'contactNewDept',
  'contactNewExt',
  'contactNewFax',
  'contactNewFollowDate',
];

/**
 * @param {{ companyId?: string | number; company?: string }} contact
 */
export function resolveCompanyFromContact(contact) {
  if (!contact) return null;
  const byId = mockCompanies.find((c) => String(c.id) === String(contact.companyId));
  if (byId) return byId;
  const name = (contact.company ?? '').trim();
  if (!name) return null;
  return mockCompanies.find((c) => c.name === name) ?? null;
}

/**
 * Latest contact for company (highest id) — 部署名 prefill source.
 * @param {string | number | undefined} companyId
 * @param {Array<{ id?: string | number; companyId?: string | number; dept?: string }>} [contacts]
 */
export function getLatestCompanyContactDept(companyId, contacts = mockContacts) {
  if (companyId == null || companyId === '') return '';
  const companyContacts = contacts.filter((m) => String(m.companyId) === String(companyId));
  if (companyContacts.length === 0) return '';

  const latest = companyContacts.reduce((best, cur) => {
    const curId = parseInt(String(cur.id), 10) || 0;
    const bestId = parseInt(String(best?.id), 10) || 0;
    return curId >= bestId ? cur : best;
  }, companyContacts[0]);

  return (latest?.dept ?? '').trim();
}

export function resetContactCreateForm() {
  const form = q('formContactDetail');
  form?.reset();
  setFormField('contactNewCompanyId', '');
  COMPANY_MIRROR_IDS.forEach((id) => setFormField(id, ''));
  CONTACT_PREFILL_IDS.forEach((id) => setFormField(id, ''));
}

/**
 * @param {Record<string, unknown>} company
 * @param {Array<{ id?: string | number; companyId?: string | number; dept?: string }>} [contacts]
 * @param {{ fillExt?: boolean; fillAudit?: boolean; dept?: string | null }} [opts]
 */
export function fillContactCreateFromCompany(company, contacts = mockContacts, opts = {}) {
  const { fillExt = false, fillAudit = false, dept = null } = opts;

  if (!company) {
    resetContactCreateForm();
    return;
  }

  setFormField('contactNewCompanyId', company.id);
  setFormField('contactNewCompanyName', company.name);
  setFormField('contactNewCompanyType', company.type);
  setFormField('contactNewCompanyTel', company.tel);
  setFormField('contactNewCompanyIndustry', company.industry);
  setFormField('contactNewCompanyScale', company.scale);
  setFormField('contactNewCompanyPostal', company.postal);
  setFormField('contactNewCompanyPref', company.pref);
  setFormField('contactNewCompanyAddr', company.addr);

  if (fillAudit) {
    setFormField('contactNewCompanyCreatedAt', company.createdAt);
    setFormField('contactNewCompanyCreatedBy', company.createdBy);
    setFormField('contactNewCompanyUpdatedAt', company.updatedAt);
    setFormField('contactNewCompanyUpdatedBy', company.updatedBy);
  } else {
    setFormField('contactNewCompanyCreatedAt', '');
    setFormField('contactNewCompanyCreatedBy', '');
    setFormField('contactNewCompanyUpdatedAt', '');
    setFormField('contactNewCompanyUpdatedBy', '');
  }

  const deptVal = (dept ?? '').trim() || getLatestCompanyContactDept(company.id, contacts);
  setFormField('contactNewDept', deptVal);

  setFormField('contactNewExt', fillExt ? (company.tel ?? '') : '');
  setFormField('contactNewFollowDate', '');
  setFormField('contactNewFax', '');
}

/**
 * @param {{
 *   company?: Record<string, unknown> | null;
 *   contacts?: Array<Record<string, unknown>>;
 *   fillExt?: boolean;
 *   fillAudit?: boolean;
 *   dept?: string | null;
 * }} [options]
 */
export function openContactCreateDialog(options = {}) {
  const {
    company = null,
    contacts = mockContacts,
    fillExt = false,
    fillAudit = false,
    dept = null,
  } = options;

  resetContactCreateForm();
  if (company) {
    fillContactCreateFromCompany(company, contacts, { fillExt, fillAudit, dept });
  }
  q('dlgContactDetailNew')?.showModal();
}

/**
 * @param {Record<string, unknown>} company
 * @param {Array<Record<string, unknown>>} [contacts]
 * @param {{ fillExt?: boolean; fillAudit?: boolean }} [opts]
 */
export function applyCompanyToContactCreateForm(company, contacts = mockContacts, opts = {}) {
  if (!company) return;
  fillContactCreateFromCompany(company, contacts, opts);
}
