import { q } from './helpers.js';
import { mockContacts } from './mockData.js';
import { setFormField } from './formFields.js';

const COMPANY_MIRROR_IDS = [
  'contactNewCompanyType',
  'contactNewCompanyTel',
  'contactNewCompanyIndustry',
  'contactNewCompanyScale',
  'contactNewCompanyPostal',
  'contactNewCompanyPref',
  'contactNewCompanyAddr',
];

/**
 * Latest contact for company (highest id) — 部署名 prefill source.
 * @param {string | number | undefined} companyId
 * @param {Array<{ id?: string | number; companyId?: string | number; dept?: string }>} [contacts]
 */
export function getLatestCompanyContactDept(companyId, contacts = mockContacts) {
  if (companyId == null || companyId === '') return '';
  const companyContacts = contacts.filter(m => String(m.companyId) === String(companyId));
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
}

/**
 * Prefill contact create modal with company context (CP01 → 新規担当).
 * @param {Record<string, unknown> | null | undefined} company
 * @param {Array<{ id?: string | number; companyId?: string | number; dept?: string }>} [contacts]
 */
export function fillContactCreateFromCompany(company, contacts = mockContacts) {
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

  // 部署名 — latest contact in company list (部署名 column); empty if none.
  setFormField('contactNewDept', getLatestCompanyContactDept(company.id, contacts));
  // 内線 — company 代表TEL.
  setFormField('contactNewExt', company.tel ?? '');
  setFormField('contactNewFollowDate', '');
  setFormField('contactNewFax', company.fax ?? '');
}

/**
 * @param {{ company?: Record<string, unknown> | null; contacts?: Array<Record<string, unknown>> }} [options]
 */
export function openContactCreateDialog(options = {}) {
  resetContactCreateForm();
  if (options.company) {
    fillContactCreateFromCompany(options.company, options.contacts ?? mockContacts);
  }
  q('dlgContactDetailNew')?.showModal();
}

/**
 * Apply company lookup selection to contact create form.
 * @param {Record<string, unknown>} company
 * @param {Array<Record<string, unknown>>} [contacts]
 */
export function applyCompanyToContactCreateForm(company, contacts = mockContacts) {
  if (!company) return;
  fillContactCreateFromCompany(company, contacts);
}
