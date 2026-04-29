document.addEventListener('DOMContentLoaded', () => {
    const COMPANY_HTML_FALLBACK = "";
    const accessCodeScreen = document.getElementById('access-code-screen');
    const loginScreen = document.getElementById('login-screen');
    const btnSubmitCode = document.getElementById('btn-submit-code');
    const btnLogin = document.getElementById('btn-login');
    const accessCodeInput = document.getElementById('access-code');
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const sections = document.querySelectorAll('.section');

    // Handle Access Code submission
    btnSubmitCode.addEventListener('click', () => {
        const code = accessCodeInput.value;

        // Simple visual feedback before transition
        btnSubmitCode.textContent = 'Verifying...';
        btnSubmitCode.style.opacity = '0.7';
        btnSubmitCode.style.pointerEvents = 'none';

        setTimeout(() => {
            transitionToLogin();
        }, 800);
    });

    function handleRouting() {
        const hash = window.location.hash.substring(1);
        const dashboard = document.getElementById('dashboard-container');
        const validSections = ['company', 'contact', 'activity', 'project'];

        if (!hash) {
            // No hash: show initial screen (unless we want to force login, but for wireframe let's default to access code)
            if (!dashboard.classList.contains('active')) {
                accessCodeScreen.classList.add('active');
                loginScreen.classList.remove('active');
            }
            return;
        }

        if (validSections.includes(hash)) {
            // If hash is a section, skip login/access (treating hash presence as "logged in" for wireframe demo)
            accessCodeScreen.classList.remove('active');
            loginScreen.classList.remove('active');
            dashboard.classList.add('active');

            // Sync UI state
            syncSidebarAndSections(hash);

            if (hash === 'company') {
                initCompanySection();
            } else if (hash === 'contact') {
                initContactSection();
            } else if (hash === 'activity') {
                initActivitySection();
            } else if (hash === 'project') {
                initProjectSection();
            }
        }
    }

    function syncSidebarAndSections(sectionId) {
        // Update sidebar active state
        sidebarItems.forEach(i => {
            if (i.getAttribute('data-section') === sectionId) {
                i.classList.add('active');
            } else {
                i.classList.remove('active');
            }
        });

        // Update sections active state
        sections.forEach(s => {
            if (s.id === sectionId) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        });
    }

    window.addEventListener('hashchange', handleRouting);
    handleRouting();

    // Handle Enter key on access code input
    accessCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnSubmitCode.click();
        }
    });

    function transitionToLogin() {
        // Fade out current screen
        accessCodeScreen.classList.remove('active');

        setTimeout(() => {
            // After fade out, remove from flow if needed or just hide
            // Show new screen
            loginScreen.classList.add('active');

            // Focus first input of login screen
            document.getElementById('username').focus();
        }, 600);
    }

    // Handle Login submission
    btnLogin.addEventListener('click', () => {
        const username = document.getElementById('username').value;
        if (username) {
            btnLogin.textContent = 'Logging in...';
            btnLogin.style.opacity = '0.7';

            setTimeout(() => {
                transitionToDashboard();
            }, 800);
        } else {
            // Simple shake effect on error
            const card = loginScreen.querySelector('.window-card');
            card.animate([
                { transform: 'translateX(0)' },
                { transform: 'translateX(-10px)' },
                { transform: 'translateX(10px)' },
                { transform: 'translateX(-10px)' },
                { transform: 'translateX(10px)' },
                { transform: 'translateX(0)' }
            ], {
                duration: 400,
                easing: 'ease-in-out'
            });
        }
    });

    function transitionToDashboard() {
        loginScreen.classList.remove('active');
        const dashboard = document.getElementById('dashboard-container');

        setTimeout(() => {
            dashboard.classList.add('active');
            // Ensure first section is visible
            switchSection('company');
            initCompanySection();
        }, 400);
    }

    // Sidebar Navigation logic
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.getAttribute('data-section');
            switchSection(sectionId);
        });
    });

    function switchSection(sectionId) {
        window.location.hash = sectionId;
        syncSidebarAndSections(sectionId);
    }

    function initCompanySection() {
        const root = document.getElementById('company-root');
        if (!root) return;

        let state;
        if (root.dataset.ready === '1') {
            state = root._state;
        } else {
            root.dataset.ready = '1';
            state = createCompanyState();
            root._state = state;
            bindCompanyUi(state);
        }

        // Check for pending jump from other sections
        if (window._pendingCompanyJump) {
            state.selectedId = window._pendingCompanyJump;
            window._pendingCompanyJump = null;
        }

        renderCompany(state);
    }

    function createCompanyState() {
        const companies = [
            {
                id: '1141',
                name: '旭川エレクトロニクスサービス株式会社',
                tel: '077-589-2569',
                fax: '089-5996-4084',
                postal: '7059306',
                pref: '北海道',
                area: '関東',
                addr: '北海道旭川市東区4丁目18-30',
                industry: '製造業',
                biz: '金属製品',
                scale: '1～30人',
                type: 'その他',
                corpNo: '0209176547839',
                employees: '1909',
                closingMonth: '9',
                revenue: '11',
                capital: '10,000',
                noDoc: false,
                noTel: false,
                remark: '',
                free1: 'サンプル値1',
                free2: '12345',
                free3: 'ABC',
                free4: '',
                free5: '',
                free6: '',
                free7: '',
                createdAt: '2026/04/01 10:00',
                createdBy: 'admin',
                updatedAt: '2026/04/20 15:30',
                updatedBy: 'admin'
            },
            {
                id: '1068',
                name: '旭川システム株式会社',
                tel: '097-9539-3068',
                fax: '018-834-4967',
                postal: '2982635',
                pref: '滋賀県',
                area: '関西',
                addr: '滋賀県市東区1丁目18-20',
                industry: '製造業',
                biz: '化学・素材',
                scale: '1～30人',
                type: 'メーカー',
                corpNo: '',
                employees: '',
                closingMonth: '',
                revenue: '',
                capital: '',
                noDoc: false,
                noTel: false,
                remark: '',
                free1: '',
                free2: '',
                free3: '',
                free4: '',
                free5: '',
                free6: '',
                free7: '',
                createdAt: '2026/03/12 09:20',
                createdBy: 'user01',
                updatedAt: '2026/03/12 09:20',
                updatedBy: 'user01'
            },
            {
                id: '1219',
                name: '旭川電気エレクトロニクス株式会社',
                tel: '057-8441-7148',
                fax: '094-4145-1012',
                postal: '3208708',
                pref: '東京都',
                area: '関東',
                addr: '東京都新宿区西2丁目3-14',
                industry: '卸売業',
                biz: '木工・家具',
                scale: '31～100人',
                type: 'メーカー',
                corpNo: '',
                employees: '',
                closingMonth: '',
                revenue: '',
                capital: '',
                noDoc: false,
                noTel: false,
                remark: '',
                free1: '',
                free2: '',
                free3: '',
                free4: '',
                free5: '',
                free6: '',
                free7: '',
                createdAt: '2026/02/02 13:00',
                createdBy: 'user02',
                updatedAt: '2026/04/02 09:10',
                updatedBy: 'user02'
            }
        ];

        return {
            companies,
            filtered: companies.slice(),
            selectedId: companies[0]?.id ?? null,
            page: 1,
            pageSize: 100,
            advanced: null
        };
    }

    function bindCompanyUi(state) {
        const q = (id) => document.getElementById(id);

        const inputName = q('companySearchName');
        const btnSearch = q('btnCompanySearch');
        const btnClear = q('btnCompanyClear');
        const btnAdv = q('btnCompanyAdvancedSearch');
        const btnCreate = q('btnCompanyCreate');
        const tbody = q('companyTableBody');
        const meta = q('companyResultMeta');
        const pageSelect = q('companyPageSelect');
        const pageTotal = q('companyPageTotal');
        const btnPrev = q('btnCompanyPrevPage');
        const btnNext = q('btnCompanyNextPage');
        const btnFirst = q('btnCompanyFirstPage');
        const btnLast = q('btnCompanyLastPage');
        const pageSize = q('companyPageSize');

        const dlgAdv = q('dlgCompanyAdvancedSearch');
        const formAdv = q('formCompanyAdvancedSearch');
        const btnAdvClear = q('btnAdvancedClear');
        const btnAdvApply = q('btnAdvancedApply');
        const btnAdvHistory = q('btnAdvancedHistory');

        const dlgCreate = q('dlgCompanyCreate');
        const formCreate = q('formCompanyCreate');

        const tabs = document.querySelectorAll('[data-company-tab]');
        const panels = document.querySelectorAll('[data-company-panel]');

        function applyBasicSearch() {
            const name = (inputName?.value ?? '').trim();
            state.advanced = state.advanced || null;
            state.filtered = filterCompanies(state.companies, { ...state.advanced, name });
            state.page = 1;
            if (!state.filtered.some(c => c.id === state.selectedId)) {
                state.selectedId = state.filtered[0]?.id ?? null;
            }
            renderCompany(state);
        }

        btnSearch?.addEventListener('click', applyBasicSearch);
        inputName?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') applyBasicSearch();
        });

        btnClear?.addEventListener('click', () => {
            if (inputName) inputName.value = '';
            state.advanced = null;
            state.filtered = state.companies.slice();
            state.page = 1;
            state.selectedId = state.filtered[0]?.id ?? null;
            if (formAdv) formAdv.reset();
            renderCompany(state);
        });

        btnAdv?.addEventListener('click', () => {
            if (dlgAdv?.showModal) dlgAdv.showModal();
        });

        btnAdvClear?.addEventListener('click', () => {
            formAdv?.reset();
        });

        btnAdvApply?.addEventListener('click', () => {
            const adv = readAdvancedSearch(formAdv);
            state.advanced = adv;
            const name = (inputName?.value ?? '').trim();
            state.filtered = filterCompanies(state.companies, { ...adv, name });
            state.page = 1;
            state.selectedId = state.filtered[0]?.id ?? null;
            dlgAdv?.close();
            renderCompany(state);
        });

        btnAdvHistory?.addEventListener('click', () => {
            renderSearchHistory();
            if (dlgHistory?.showModal) dlgHistory.showModal();
        });

        btnCreate?.addEventListener('click', () => {
            const selected = state.companies.find(c => c.id === state.selectedId) || null;
            if (formCreate) formCreate.reset();
            fillCreateDialog(formCreate, selected);
            if (dlgCreate?.showModal) dlgCreate.showModal();
        });

        formCreate?.addEventListener('submit', (e) => {
            e.preventDefault();
        });

        q('btnCreateCompanyOk')?.addEventListener('click', () => {
            const fd = new FormData(formCreate);
            const next = {
                name: String(fd.get('name') || ''),
                tel: String(fd.get('tel') || ''),
                fax: String(fd.get('fax') || ''),
                area: String(fd.get('area') || ''),
                postal: String(fd.get('postal') || ''),
                pref: String(fd.get('pref') || ''),
                addr: String(fd.get('addr') || ''),
                industry: String(fd.get('industry') || ''),
                biz: String(fd.get('biz') || ''),
                scale: String(fd.get('scale') || ''),
                type: String(fd.get('type') || ''),
                corpNo: String(fd.get('corpNo') || ''),
                employees: String(fd.get('employees') || ''),
                closingMonth: String(fd.get('closingMonth') || ''),
                revenue: String(fd.get('revenue') || ''),
                capital: String(fd.get('capital') || ''),
                remark: String(fd.get('remark') || ''),
                free1: String(fd.get('free1') || ''),
                free2: String(fd.get('free2') || ''),
                free3: String(fd.get('free3') || ''),
                free4: String(fd.get('free4') || ''),
                free5: String(fd.get('free5') || ''),
                free6: String(fd.get('free6') || ''),
                free7: String(fd.get('free7') || ''),
                noDoc: !!formCreate.querySelector('[name="noDoc"]')?.checked,
                noTel: !!formCreate.querySelector('[name="noTel"]')?.checked
            };

            const maxId = state.companies.reduce((max, c) => Math.max(max, parseInt(c.id) || 0), 1000);
            const newId = String(maxId + 1);

            const now = new Date().toISOString().replace('T', ' ').substring(0, 16).replace(/-/g, '/');
            const newComp = {
                ...next,
                id: newId,
                createdAt: now,
                createdBy: 'admin',
                updatedAt: now,
                updatedBy: 'admin'
            };

            state.companies.push(newComp);
            state.filtered.push(newComp);
            state.selectedId = newId;

            dlgCreate?.close();
            renderCompany(state);
        });

        const lookupAddress = (zip, targetPref, targetAddr) => {
            if (zip === '7059306') {
                if (q(targetPref)) q(targetPref).value = '北海道';
                if (q(targetAddr)) q(targetAddr).value = '北海道旭川市東区4丁目18-30';
            } else if (zip === '2982635') {
                if (q(targetPref)) q(targetPref).value = '滋賀県';
                if (q(targetAddr)) q(targetAddr).value = '滋賀県市東区1丁目18-20';
            } else if (zip === '3208708') {
                if (q(targetPref)) q(targetPref).value = '東京都';
                if (q(targetAddr)) q(targetAddr).value = '東京都新宿区西2丁目3-14';
            }
        };

        q('companyDetailPostal')?.addEventListener('input', (e) => {
            lookupAddress(e.target.value, 'companyDetailPref', 'companyDetailAddr');
        });

        formCreate?.querySelector('[name="postal"]')?.addEventListener('input', (e) => {
            const form = formCreate;
            const zip = e.target.value;
            if (zip === '7059306') {
                form.querySelector('[name="pref"]').value = '北海道';
                form.querySelector('[name="addr"]').value = '北海道旭川市東区4丁目18-30';
            } else if (zip === '2982635') {
                form.querySelector('[name="pref"]').value = '滋賀県';
                form.querySelector('[name="addr"]').value = '滋賀県市東区1丁目18-20';
            } else if (zip === '3208708') {
                form.querySelector('[name="pref"]').value = '東京都';
                form.querySelector('[name="addr"]').value = '東京都新宿区西2丁目3-14';
            }
        });

        const dlgContact = q('dlgContactDetail');
        const formContact = q('formContactDetail');

        q('btnNewContact')?.addEventListener('click', () => {
            if (formContact) formContact.reset();
            const selected = state.companies.find(c => c.id === state.selectedId);
            if (selected) {
                if (q('contactDetailCompanyName')) q('contactDetailCompanyName').value = selected.name;
                if (q('contactDetailCompanyType')) q('contactDetailCompanyType').value = selected.type || '';
                if (q('contactDetailCompanyTel')) q('contactDetailCompanyTel').value = selected.tel || '';
                if (q('contactDetailCompanyIndustry')) q('contactDetailCompanyIndustry').value = selected.industry || '';
                if (q('contactDetailCompanyScale')) q('contactDetailCompanyScale').value = selected.scale || '';
                if (q('contactDetailCompanyPostal')) q('contactDetailCompanyPostal').value = selected.postal || '';
                if (q('contactDetailCompanyPref')) q('contactDetailCompanyPref').value = selected.pref || '';
                if (q('contactDetailCompanyAddr')) q('contactDetailCompanyAddr').value = selected.addr || '';
            }
            if (dlgContact?.showModal) dlgContact.showModal();
        });

        q('btnContactNewCompany')?.addEventListener('click', () => {
            const dlgCreate = q('dlgCompanyCreate');
            if (dlgCreate?.showModal) dlgCreate.showModal();
        });

        const toKana = (str) => {
            // Mock conversion for wireframe
            return str.split('').map(c => {
                const map = { '山': 'ヤマ', '田': 'ダ', '佐': 'サ', '藤': 'トウ', '渡': 'ワタ', '辺': 'ナベ', '高': 'タカ', '橋': 'ハシ', '松': 'マツ', '本': 'モト', '井': 'イ', '上': 'ノウエ' };
                return map[c] || c;
            }).join('');
        };

        q('contactDetailLastName')?.addEventListener('blur', (e) => {
            const val = e.target.value;
            if (val && !q('contactDetailLastNameKana').value) {
                q('contactDetailLastNameKana').value = toKana(val);
            }
        });
        q('contactDetailFirstName')?.addEventListener('blur', (e) => {
            const val = e.target.value;
            if (val && !q('contactDetailFirstNameKana').value) {
                q('contactDetailFirstNameKana').value = toKana(val);
            }
        });

        formContact?.addEventListener('submit', (e) => {
            e.preventDefault();
            const lastName = q('contactDetailLastName').value.trim();
            // if (!lastName) {
            //     alert('姓は必須です');
            //     return;
            // }
            // const companyName = q('contactDetailCompanyName').value.trim();
            // if (!companyName) {
            //     alert('会社名は必須です');
            //     return;
            // }
            // Mock save logic
            alert('担当者情報を保存しました（ワイヤーフレーム）');
            dlgContact?.close();
        });

        formContact?.querySelector('.btn-secondary')?.addEventListener('click', (e) => {
            e.preventDefault();
            const ok = confirm('表示中のデータを削除しますか？\n(案件や活動に紐づいている場合は削除できません。データは戻せません)');
            if (ok) {
                alert('データを削除しました（ワイヤーフレーム）');
                dlgContact?.close();
            }
        });

        // Company Lookup Logic
        const dlgLookup = q('dlgCompanyLookup');
        const lookupTbody = q('lookupTableBody');
        let tempLookupSelection = null;

        const renderLookupResults = (filters = {}) => {
            if (!lookupTbody) return;
            lookupTbody.innerHTML = '';

            // Filter state.companies based on filters
            const filtered = state.companies.filter(c => {
                if (filters.name && !c.name.includes(filters.name)) return false;
                if (filters.keyword) {
                    const kw = filters.keyword.toLowerCase();
                    return Object.values(c).some(val => String(val).toLowerCase().includes(kw));
                }
                return true;
            });

            filtered.forEach(c => {
                const tr = document.createElement('tr');
                tr.dataset.id = c.id;
                tr.innerHTML = `
                    <td>${c.id}</td>
                    <td>${c.name}</td>
                    <td>${c.tel || ''}</td>
                    <td>${c.addr || ''}</td>
                    <td>${c.industry || ''}</td>
                    <td>${c.biz || ''}</td>
                    <td>${c.scale || ''}</td>
                    <td>${c.type || ''}</td>
                `;
                tr.addEventListener('click', () => {
                    lookupTbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                    tr.classList.add('selected');
                    tempLookupSelection = c;
                });
                lookupTbody.appendChild(tr);
            });
        };

        q('btnContactCompanyLookup')?.addEventListener('click', () => {
            tempLookupSelection = null;
            renderLookupResults();
            if (dlgLookup?.showModal) dlgLookup.showModal();
        });

        q('btnLookupSearch')?.addEventListener('click', (e) => {
            e.preventDefault();
            const form = q('formCompanyLookup');
            const filters = {
                name: form.name.value,
                keyword: form.keyword.value
            };
            renderLookupResults(filters);
        });

        q('btnLookupClear')?.addEventListener('click', (e) => {
            const form = q('formCompanyLookup');
            if (form) form.reset();
            renderLookupResults();
        });

        q('btnLookupSelect')?.addEventListener('click', () => {
            if (!tempLookupSelection) {
                alert('会社を選択してください');
                return;
            }
            const c = tempLookupSelection;
            if (q('contactDetailCompanyName')) q('contactDetailCompanyName').value = c.name;
            if (q('mainContactCompanyName')) q('mainContactCompanyName').value = c.name;
            if (q('contactDetailCompanyType')) q('contactDetailCompanyType').value = c.type || '';
            if (q('contactDetailCompanyTel')) q('contactDetailCompanyTel').value = c.tel || '';
            if (q('contactDetailCompanyIndustry')) q('contactDetailCompanyIndustry').value = c.industry || '';
            if (q('contactDetailCompanyScale')) q('contactDetailCompanyScale').value = c.scale || '';
            if (q('contactDetailCompanyPostal')) q('contactDetailCompanyPostal').value = c.postal || '';
            if (q('contactDetailCompanyPref')) q('contactDetailCompanyPref').value = c.pref || '';
            if (q('contactDetailCompanyAddr')) q('contactDetailCompanyAddr').value = c.addr || '';

            dlgLookup?.close();
        });

        // Search History Logic
        const dlgHistory = q('dlgSearchHistory');
        const historyTableBody = q('searchHistoryBody');
        let savedConditions = [
            { id: 1, name: '(新しい条件)', filters: { keyword: '', name: '' } }
        ];
        let selectedHistoryIdx = -1;

        const renderSearchHistory = () => {
            if (!historyTableBody) return;
            historyTableBody.innerHTML = '';
            savedConditions.forEach((item, idx) => {
                const tr = document.createElement('tr');
                if (selectedHistoryIdx === idx) tr.classList.add('selected');
                tr.innerHTML = `
                    <td style="text-align:center;">${idx + 1}</td>
                    <td><input type="text" value="${item.name}" ${item.editing ? '' : 'readonly'} /></td>
                    <td style="text-align:center;"><button type="button" class="btn-edit-name">編集</button></td>
                `;
                tr.addEventListener('click', () => {
                    selectedHistoryIdx = idx;
                    renderSearchHistory();
                });
                tr.addEventListener('dblclick', () => {
                    applyHistory(item);
                    dlgHistory?.close();
                });
                tr.querySelector('.btn-edit-name').addEventListener('click', (e) => {
                    e.stopPropagation();
                    item.editing = !item.editing;
                    if (!item.editing) {
                        item.name = tr.querySelector('input').value;
                    }
                    renderSearchHistory();
                });
                historyTableBody.appendChild(tr);
            });
        };

        const applyHistory = (item) => {
            const form = q('formCompanyLookup');
            if (!form) return;
            form.reset();
            Object.keys(item.filters).forEach(key => {
                if (form[key]) form[key].value = item.filters[key];
            });
        };

        q('dlgCompanyLookup')?.querySelector('button[style*="background:#001f3f"]')?.addEventListener('click', (e) => {
            if (e.target.innerText === '検索条件リストを表示') {
                renderSearchHistory();
                if (dlgHistory?.showModal) dlgHistory.showModal();
            }
        });

        q('btnHistorySaveCurrent')?.addEventListener('click', () => {
            const form = q('formCompanyLookup');
            if (!form) return;
            const filters = {};
            new FormData(form).forEach((value, key) => {
                filters[key] = value;
            });
            savedConditions.push({
                id: Date.now(),
                name: '新規条件',
                filters: filters
            });
            renderSearchHistory();
        });

        q('btnHistorySelect')?.addEventListener('click', () => {
            if (selectedHistoryIdx === -1) {
                alert('条件を選択してください');
                return;
            }
            applyHistory(savedConditions[selectedHistoryIdx]);
            dlgHistory?.close();
        });

        q('btnHistoryDelete')?.addEventListener('click', () => {
            if (selectedHistoryIdx === -1) {
                alert('条件を選択してください');
                return;
            }
            savedConditions.splice(selectedHistoryIdx, 1);
            selectedHistoryIdx = -1;
            renderSearchHistory();
        });

        tbody?.addEventListener('click', (e) => {
            const tr = e.target.closest('tr[data-id]');
            if (!tr) return;
            state.selectedId = tr.getAttribute('data-id');
            renderCompany(state);
        });

        pageSize?.addEventListener('change', () => {
            state.pageSize = Number(pageSize.value) || 100;
            state.page = 1;
            renderCompany(state);
        });

        pageSelect?.addEventListener('change', () => {
            state.page = Number(pageSelect.value) || 1;
            renderCompany(state);
        });

        btnPrev?.addEventListener('click', () => {
            state.page = Math.max(1, state.page - 1);
            renderCompany(state);
        });

        btnNext?.addEventListener('click', () => {
            const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
            state.page = Math.min(totalPages, state.page + 1);
            renderCompany(state);
        });

        btnFirst?.addEventListener('click', () => {
            state.page = 1;
            renderCompany(state);
        });

        btnLast?.addEventListener('click', () => {
            const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
            state.page = totalPages;
            renderCompany(state);
        });

        tabs.forEach(t => {
            t.addEventListener('click', () => {
                const tab = t.getAttribute('data-company-tab');
                tabs.forEach(x => x.classList.toggle('active', x === t));
                tabs.forEach(x => x.setAttribute('aria-selected', x === t ? 'true' : 'false'));
                panels.forEach(p => p.classList.toggle('active', p.getAttribute('data-company-panel') === tab));

                // Toggle "New" buttons
                const btnNewContact = q('btnNewContact');
                const btnNewActivity = q('btnNewActivity');
                const btnNewProject = q('btnNewProject');

                if (btnNewContact) btnNewContact.style.display = tab === 'contacts' ? 'block' : 'none';
                if (btnNewActivity) btnNewActivity.style.display = tab === 'activities' ? 'block' : 'none';
                if (btnNewProject) btnNewProject.style.display = tab === 'projects' ? 'block' : 'none';
            });
        });

        q('btnNewActivity')?.addEventListener('click', () => {
            const dlg = q('dlgActivityDetail');
            if (dlg) {
                dlg.showModal();
                const form = q('formActivityDetail');
                if (form) form.reset();
            }
        });

        q('btnActivityContactLookup')?.addEventListener('click', () => {
            q('dlgContactLookup')?.showModal();
        });

        // Contact Lookup "Select" button logic (Placeholder)
        q('dlgContactLookup .dlg-actions button:last-child')?.addEventListener('click', () => {
            const contactInput = document.querySelector('#formActivityDetail [name="contactName"]');
            if (contactInput) {
                contactInput.value = '山田 太郎'; // Mock selection
            }
            q('dlgContactLookup')?.close();
        });

        q('btnActivityContactNew')?.addEventListener('click', () => {
            q('dlgContactDetailNew')?.showModal();
        });

        q('btnActivityProjectLookup')?.addEventListener('click', () => {
            q('dlgProjectLookup')?.showModal();
        });

        q('btnActivityProjectNew')?.addEventListener('click', () => {
            q('dlgProjectDetail')?.showModal();
        });

        // Project Lookup "Select" button logic (Placeholder)
        q('btnProjectSelect')?.addEventListener('click', () => {
            const projectInput = document.querySelector('#formActivityDetail [name="projectName"]');
            if (projectInput) {
                projectInput.value = 'サーバー導入案件'; // Mock selection
            }
            q('dlgProjectLookup')?.close();
        });
        q('btnNewProject')?.addEventListener('click', () => {
            q('dlgProjectDetail')?.showModal();
        });

        q('btnCompanySave')?.addEventListener('click', () => {
            const selected = state.companies.find(c => c.id === state.selectedId);
            if (!selected) return;
            const next = readDetailForm();
            if (!next.name.trim()) {
                alert('会社名は必須です');
                return;
            }
            Object.assign(selected, next, {
                updatedAt: new Date().toISOString().slice(0, 10).replaceAll('-', '/') + ' 12:00',
                updatedBy: 'admin'
            });
            // refresh current filter results
            const name = (inputName?.value ?? '').trim();
            state.filtered = filterCompanies(state.companies, { ...(state.advanced || null), name });
            renderCompany(state);
        });

        q('btnCompanyDelete')?.addEventListener('click', () => {
            const selected = state.companies.find(c => c.id === state.selectedId);
            if (!selected) return;
            const ok = confirm('削除しますか？（ワイヤーフレーム：関連チェックなし）');
            if (!ok) return;
            state.companies = state.companies.filter(c => c.id !== selected.id);
            state.filtered = state.filtered.filter(c => c.id !== selected.id);
            state.selectedId = state.filtered[0]?.id ?? null;
            renderCompany(state);
        });

        // initial meta bindings
        if (meta) meta.textContent = `全 ${state.filtered.length} 件`;
        if (pageTotal) pageTotal.textContent = '/ 1';
    }

    function renderCompany(state) {
        const q = (id) => document.getElementById(id);
        const tbody = q('companyTableBody');
        const meta = q('companyResultMeta');
        const pageSelect = q('companyPageSelect');
        const pageTotal = q('companyPageTotal');

        const total = state.filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
        state.page = Math.min(Math.max(1, state.page), totalPages);

        const pageNumbers = q('companyPageNumbers');
        const totalCount = q('companyTotalCount');
        const rangeStart = q('companyRangeStart');
        const rangeEnd = q('companyRangeEnd');

        if (meta) meta.textContent = `全 ${total} 件`;
        if (totalCount) totalCount.textContent = total;
        if (pageTotal) pageTotal.textContent = `/ ${totalPages}`;

        const startIdx = (state.page - 1) * state.pageSize;
        const actualEndIdx = Math.min(startIdx + state.pageSize, total);
        if (rangeStart) rangeStart.textContent = total > 0 ? startIdx + 1 : 0;
        if (rangeEnd) rangeEnd.textContent = actualEndIdx;

        if (pageNumbers) {
            pageNumbers.innerHTML = '';
            // Simple logic: show 1, 2, 3... or current +/- 2
            const start = Math.max(1, state.page - 2);
            const end = Math.min(totalPages, start + 4);
            const actualStart = Math.max(1, end - 4);

            for (let p = actualStart; p <= end; p++) {
                const btn = document.createElement('button');
                btn.className = `page-num-btn ${p === state.page ? 'active' : ''}`;
                btn.textContent = p;
                btn.onclick = () => {
                    state.page = p;
                    renderCompany(state);
                };
                pageNumbers.appendChild(btn);
            }
        }

        if (pageSelect) {
            pageSelect.innerHTML = '';
            for (let p = 1; p <= totalPages; p++) {
                const opt = document.createElement('option');
                opt.value = String(p);
                opt.textContent = String(p);
                if (p === state.page) opt.selected = true;
                pageSelect.appendChild(opt);
            }
        }

        const start = (state.page - 1) * state.pageSize;
        const end = start + state.pageSize;
        const rows = state.filtered.slice(start, end);

        if (tbody) {
            tbody.innerHTML = rows.map(c => `
              <tr data-id="${escapeHtml(c.id)}" class="${c.id === state.selectedId ? 'selected' : ''}">
                <td>${escapeHtml(c.id)}</td>
                <td>${escapeHtml(c.name)}</td>
                <td>${escapeHtml(c.tel || '')}</td>
                <td>${escapeHtml(c.fax || '')}</td>
                <td>${escapeHtml(c.area || '')}</td>
                <td>${escapeHtml(c.postal || '')}</td>
                <td>${escapeHtml(c.pref || '')}</td>
                <td>${escapeHtml(c.addr || '')}</td>
                <td>${escapeHtml(c.industry || '')}</td>
                <td>${escapeHtml(c.biz || '')}</td>
                <td>${escapeHtml(c.scale || '')}</td>
                <td>${escapeHtml(c.type || '')}</td>
                <td>${escapeHtml(c.corpNo || '')}</td>
                <td>${escapeHtml(c.capital || '')}</td>
                <td>${escapeHtml(c.employees || '')}</td>
                <td>${escapeHtml(c.closingMonth || '')}</td>
                <td>${escapeHtml(c.revenue || '')}</td>
                <td>${c.noDoc ? '禁止' : ''}</td>
                <td>${c.noTel ? '禁止' : ''}</td>
                <td>${escapeHtml(c.free1 || '')}</td>
                <td>${escapeHtml(c.free2 || '')}</td>
                <td>${escapeHtml(c.free3 || '')}</td>
                <td>${escapeHtml(c.remark || '')}</td>
              </tr>
            `).join('');
        }

        const selected = state.companies.find(c => c.id === state.selectedId) || state.filtered[0] || null;
        state.selectedId = selected?.id ?? null;
        fillDetailForm(selected);
        renderChildLists(selected);
    }

    function filterCompanies(companies, cond) {
        const c = cond || {};
        const name = (c.name || '').trim();
        const keyword = (c.keyword || '').trim();

        const set = (arr) => (Array.isArray(arr) && arr.length ? new Set(arr) : null);
        const industries = set(c.industry);
        const biz = set(c.biz);
        const scale = set(c.scale);
        const type = set(c.type);
        const area = set(c.area);
        const pref = set(c.pref);

        const closingFrom = toNum(c.closingMonthFrom);
        const closingTo = toNum(c.closingMonthTo);
        const capFrom = toNum(c.capitalFrom);
        const capTo = toNum(c.capitalTo);

        return companies.filter(x => {
            if (name && !includesPartial(x.name, name)) return false;
            if (keyword) {
                const all = [
                    x.id, x.name, x.tel, x.fax, x.postal, x.pref, x.area, x.addr,
                    x.industry, x.biz, x.scale, x.type, x.corpNo
                ].join(' ');
                if (!includesPartial(all, keyword)) return false;
            }
            if (industries && !industries.has(x.industry)) return false;
            if (biz && !biz.has(x.biz)) return false;
            if (scale && !scale.has(x.scale)) return false;
            if (type && !type.has(x.type)) return false;
            if (area && !area.has(x.area)) return false;
            if (pref && !pref.has(x.pref)) return false;
            if (c.postal && !includesPartial(x.postal || '', c.postal)) return false;
            if (c.addr && !includesPartial(x.addr || '', c.addr)) return false;
            if (c.tel && !includesPartial(x.tel || '', c.tel)) return false;
            if (c.fax && !includesPartial(x.fax || '', c.fax)) return false;

            if (closingFrom !== null || closingTo !== null) {
                const m = toNum(x.closingMonth);
                if (m === null) return false;
                if (closingFrom !== null && m < closingFrom) return false;
                if (closingTo !== null && m > closingTo) return false;
            }

            if (capFrom !== null || capTo !== null) {
                const cap = toNum(String(x.capital || '').replaceAll(',', ''));
                if (cap === null) return false;
                if (capFrom !== null && cap < capFrom) return false;
                if (capTo !== null && cap > capTo) return false;
            }

            return true;
        });
    }

    function readAdvancedSearch(form) {
        if (!form) return {};
        const fd = new FormData(form);
        const multi = (name) => {
            const el = form.querySelector(`[name="${name}"]`);
            if (!el || el.tagName !== 'SELECT' || !el.multiple) return [];
            return Array.from(el.selectedOptions).map(o => o.value);
        };
        return {
            keyword: String(fd.get('keyword') || ''),
            name: String(fd.get('name') || ''),
            industry: multi('industry'),
            biz: multi('biz'),
            scale: multi('scale'),
            type: multi('type'),
            area: multi('area'),
            pref: multi('pref'),
            postal: String(fd.get('postal') || ''),
            addr: String(fd.get('addr') || ''),
            closingMonthFrom: String(fd.get('closingMonthFrom') || ''),
            closingMonthTo: String(fd.get('closingMonthTo') || ''),
            capitalFrom: String(fd.get('capitalFrom') || ''),
            capitalTo: String(fd.get('capitalTo') || ''),
            tel: String(fd.get('tel') || ''),
            fax: String(fd.get('fax') || '')
        };
    }

    function fillCreateDialog(form, selected) {
        if (!form) return;
        const set = (name, val) => {
            const el = form.querySelector(`[name="${name}"]`);
            if (el) el.value = val ?? '';
        };
        set('id', '');
        set('name', selected?.name ?? '');
        set('tel', selected?.tel ?? '');
        set('fax', selected?.fax ?? '');
        set('area', selected?.area ?? '');
        set('postal', selected?.postal ?? '');
        set('pref', selected?.pref ?? '');
        set('addr', selected?.addr ?? '');
        set('industry', selected?.industry ?? '');
        set('biz', selected?.biz ?? '');
        set('scale', selected?.scale ?? '');
        set('type', selected?.type ?? '');
        set('corpNo', selected?.corpNo ?? '');
        set('employees', selected?.employees ?? '');
        set('closingMonth', selected?.closingMonth ?? '');
        set('revenue', selected?.revenue ?? '');
        set('capital', selected?.capital ?? '');
        set('remark', selected?.remark ?? '');
        set('free1', selected?.free1 ?? '');
        set('free2', selected?.free2 ?? '');
        set('free3', selected?.free3 ?? '');
        set('free4', selected?.free4 ?? '');
        set('free5', selected?.free5 ?? '');
        set('free6', selected?.free6 ?? '');
        set('free7', selected?.free7 ?? '');
        const chkDoc = form.querySelector('[name="noDoc"]');
        if (chkDoc) chkDoc.checked = !!selected?.noDoc;
        const chkTel = form.querySelector('[name="noTel"]');
        if (chkTel) chkTel.checked = !!selected?.noTel;
    }

    function fillDetailForm(c) {
        const q = (id) => document.getElementById(id);
        const setVal = (id, val) => {
            const el = q(id);
            if (el) el.value = val ?? '';
        };
        const setCheck = (id, val) => {
            const el = q(id);
            if (el) el.checked = !!val;
        };
        setVal('companyDetailId', c?.id ?? '');
        setVal('companyDetailName', c?.name ?? '');
        setVal('companyDetailTel', c?.tel ?? '');
        setVal('companyDetailFax', c?.fax ?? '');
        setVal('companyDetailArea', c?.area ?? '');
        setVal('companyDetailPostal', c?.postal ?? '');
        setVal('companyDetailPref', c?.pref ?? '');
        setVal('companyDetailAddr', c?.addr ?? '');
        setVal('companyDetailIndustry', c?.industry ?? '');
        setVal('companyDetailBiz', c?.biz ?? '');
        setVal('companyDetailScale', c?.scale ?? '');
        setVal('companyDetailType', c?.type ?? '');
        setVal('companyDetailCorpNo', c?.corpNo ?? '');
        setVal('companyDetailEmployees', c?.employees ?? '');
        setVal('companyDetailClosingMonth', c?.closingMonth ?? '');
        setVal('companyDetailRevenue', c?.revenue ?? '');
        setVal('companyDetailCapital', c?.capital ?? '');
        setCheck('companyDetailNoDoc', c?.noDoc ?? false);
        setCheck('companyDetailNoTel', c?.noTel ?? false);
        setVal('companyDetailRemark', c?.remark ?? '');
        setVal('companyDetailFree1', c?.free1 ?? '');
        setVal('companyDetailFree2', c?.free2 ?? '');
        setVal('companyDetailFree3', c?.free3 ?? '');
        setVal('companyDetailFree4', c?.free4 ?? '');
        setVal('companyDetailFree5', c?.free5 ?? '');
        setVal('companyDetailFree6', c?.free6 ?? '');
        setVal('companyDetailFree7', c?.free7 ?? '');
        setVal('companyDetailCreatedAt', c?.createdAt ?? '');
        setVal('companyDetailCreatedBy', c?.createdBy ?? '');
        setVal('companyDetailUpdatedAt', c?.updatedAt ?? '');
        setVal('companyDetailUpdatedBy', c?.updatedBy ?? '');
    }

    function readDetailForm() {
        const q = (id) => document.getElementById(id);
        return {
            name: q('companyDetailName')?.value ?? '',
            tel: q('companyDetailTel')?.value ?? '',
            fax: q('companyDetailFax')?.value ?? '',
            area: q('companyDetailArea')?.value ?? '',
            postal: q('companyDetailPostal')?.value ?? '',
            pref: q('companyDetailPref')?.value ?? '',
            addr: q('companyDetailAddr')?.value ?? '',
            industry: q('companyDetailIndustry')?.value ?? '',
            biz: q('companyDetailBiz')?.value ?? '',
            scale: q('companyDetailScale')?.value ?? '',
            type: q('companyDetailType')?.value ?? '',
            corpNo: q('companyDetailCorpNo')?.value ?? '',
            employees: q('companyDetailEmployees')?.value ?? '',
            closingMonth: q('companyDetailClosingMonth')?.value ?? '',
            revenue: q('companyDetailRevenue')?.value ?? '',
            capital: q('companyDetailCapital')?.value ?? '',
            noDoc: !!q('companyDetailNoDoc')?.checked,
            noTel: !!q('companyDetailNoTel')?.checked,
            remark: q('companyDetailRemark')?.value ?? '',
            free1: q('companyDetailFree1')?.value ?? '',
            free2: q('companyDetailFree2')?.value ?? '',
            free3: q('companyDetailFree3')?.value ?? '',
            free4: q('companyDetailFree4')?.value ?? '',
            free5: q('companyDetailFree5')?.value ?? '',
            free6: q('companyDetailFree6')?.value ?? '',
            free7: q('companyDetailFree7')?.value ?? ''
        };
    }

    function renderChildLists(c) {
        const set = (id, html) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = html;
        };
        if (!c) {
            set('companyContactsList', '会社が選択されていません');
            set('companyActivitiesList', '会社が選択されていません');
            set('companyProjectsList', '会社が選択されていません');
            return;
        }

        const mockContacts = [
            { last: '渡辺', first: '沙織', kana: 'ワタナベ サオリ', dept: 'ロジスティクス部', tel: '012-4294-2357', mobile: '070-7122-8116', email: 'watanabe.saori@c10250.co.jp', pos: 'ロジスティクス部次長', rank: '次長・部長代理', remark: '展示会での名刺交換による登録。新規プロジェクトの窓口。' },
            { last: '高橋', first: '翔太', kana: 'タカハシ ショウタ', dept: '設備エンジ部', tel: '012-4294-2441', mobile: '070-7358-3862', email: 'takahashi.shouta@c10250.co.jp', pos: '設備エンジ部員', rank: '係員', remark: 'オンラインセミナー参加者。マーケ部Lリード。' },
            { last: '松本', first: '彩', kana: 'マツモト アヤ', dept: '製造部', tel: '012-4294-2420', mobile: '090-2738-8654', email: 'matsumoto.aya@c10250.co.jp', pos: '製造部本部長', rank: '本部長・理事部長', remark: '訪問にて名刺交換。2021年入社、情報キーマン。第三工' },
            { last: '井上', first: '智也', kana: 'イノウエ トモヤ', dept: '生産管理部', tel: '012-4294-2441', mobile: '080-4521-6195', email: 'inoue.tomoya@c10250.co.jp', pos: '生産管理部主任', rank: '主任', remark: '若手社員で将来の幹部候補。詳細情報は営業チームまで' },
            { last: '井上', first: '淳', kana: 'イノウエ ジュン', dept: '研究開発部', tel: '012-4294-2363', mobile: '070-4602-3745', email: 'inoue.jun@c10250.co.jp', pos: '研究開発部長', rank: '課長', remark: '若手社員で将来の幹部候補。詳細情報は営業チームまで' },
            { last: '近藤', first: '恵', kana: 'コンドウ メグミ', dept: 'クオリティアシュアランス部', tel: '012-4294-2394', mobile: '080-2713-5599', email: 'kondou.megumi@c10250.co.jp', pos: 'クオリティアシュアランス部', rank: '一般社員', remark: 'CCOメールアドレスから登録。社内、プロジェクトへのプ' },
            { last: '吉田', first: '茜', kana: 'ヨシダ アカネ', dept: 'クオリティアシュアランス部', tel: '012-4294-2368', mobile: '080-2495-2298', email: 'yoshida.akane@c10250.co.jp', pos: 'クオリティアシュアランス部', rank: '本部長・理事部長', remark: '社内でのシステム導入プロジェクトに参画中。' },
            { last: '斉藤', first: '結衣', kana: 'サイトウ ユイ', dept: '製造部', tel: '012-4294-2428', mobile: '070-1481-7371', email: 'saitou.yui@c10250.co.jp', pos: '製造部係長', rank: '係長', remark: '同店にて名刺交換。オンラインセミナー参加者。マーケ部' },
            { last: '山本', first: '和也', kana: 'ヤマモト カズヤ', dept: '生産管理部', tel: '012-4294-2423', mobile: '080-4490-6679', email: 'yamamoto.kazuya@c10250.co.jp', pos: '生産管理部係長', rank: '係長', remark: '経営層に近く、商談への影響度大。CCOメールアドレスか' },
            { last: '井上', first: '大輔', kana: 'イノウエ ダイスケ', dept: 'プロダクトデザイン部', tel: '012-4294-2418', mobile: '090-7240-6650', email: 'inoue.daisuke@c10250.co.jp', pos: 'プロダクトデザイン部部長', rank: '本部長・理事部長', remark: '既存顧客の関連会社に在籍。意思決定プロセスに関与。' }
        ];

        let contactsHtml = `
            <table class="mini-grid-table">
                <thead>
                    <tr>
                        <th style="min-width: 80px;">担当(姓)</th>
                        <th style="min-width: 80px;">担当(名)</th>
                        <th style="min-width: 120px;">フリガナ</th>
                        <th style="min-width: 150px;">部署名</th>
                        <th style="min-width: 120px;">TEL</th>
                        <th style="min-width: 120px;">携帯電話</th>
                        <th style="min-width: 200px;">Email</th>
                        <th style="min-width: 150px;">役職名</th>
                        <th style="min-width: 120px;">職位</th>
                        <th style="min-width: 300px;">担当者備考</th>
                    </tr>
                </thead>
                <tbody>
        `;

        contactsHtml += mockContacts.map((m, idx) => `
            <tr>
                <td><a href="#contact?id=${10000 + idx}" class="contact-link">${escapeHtml(m.last)}</a></td>
                <td>${escapeHtml(m.first)}</td>
                <td>${escapeHtml(m.kana)}</td>
                <td>${escapeHtml(m.dept)}</td>
                <td>${escapeHtml(m.tel)}</td>
                <td>${escapeHtml(m.mobile)}</td>
                <td>${escapeHtml(m.email)}</td>
                <td>${escapeHtml(m.pos)}</td>
                <td>${escapeHtml(m.rank)}</td>
                <td title="${escapeHtml(m.remark)}">${escapeHtml(m.remark)}</td>
            </tr>
        `).join('');

        contactsHtml += `</tbody></table>`;

        set('companyContactsList', contactsHtml);
        const mockActivities = [
            { date: '26/02/24', rep: '中谷 太輔', contact: '佐藤', type: 'TEL', typeClass: 'type-tel', comment: '見積の件', purpose: '', project: '' },
            { date: '24/10/25', rep: '鈴木 一郎', contact: '佐藤', type: '訪問', typeClass: 'type-visit', comment: '顧客の中期経営計画に関連づけて、自社サービスの活用メリットを長期的な視点から解説。特に生産性向上と人材活用の両面で効果を強調した。議論を...', purpose: '売り後フォロー', project: '' },
            { date: '24/10/25', rep: '鈴木 一郎', contact: '佐藤', type: '訪問', typeClass: 'type-visit', comment: '顧客の中期経営計画に関連づけて、自社サービスの活用メリットを長期的な視点から解説。特に生産性向上と人材活用の両面で効果を強調した。議論を...', purpose: '売り後フォロー', project: '品質検査装置更新' },
            { date: '24/03/14', rep: '鈴木 一郎', contact: '佐藤', type: '訪問', typeClass: 'type-visit', comment: '次回の提案資料を期待。競合比較への関心が高い。意思決定者不在で宿題が残った。現場レベルで導入意欲を確認', purpose: 'クレーム対応', project: '品質検査装置更新' },
            { date: '23/11/08', rep: '鈴木 一郎', contact: '佐藤', type: 'メール', typeClass: 'type-email', comment: '現場担当者とのディスカッションを通じて、日々の業務で発生している細かな課題を具体的に洗い出した。それらを解決する手段として、導入後のプロセス改善...', purpose: '売り後フォロー', project: '品質検査装置更新' },
            { date: '23/09/14', rep: '鈴木 一郎', contact: '佐藤', type: 'メール', typeClass: 'type-email', comment: '顧客の中期経営計画に関連づけて、自社サービスの活用メリットを長期的な視点から解説。特に生産性向上と人材活用の両面で効果を強調した。議論を...', purpose: '売り前フォロー', project: '金型更新プロジェクト' },
            { date: '23/01/10', rep: '鈴木 一郎', contact: '佐藤', type: 'TEL', typeClass: 'type-tel', comment: '現場担当者とのディスカッションを通じて、日々の業務で発生している細かな課題を具体的に洗い出した。それらを解決する手段として、導入後のプロセス改善...', purpose: 'クレーム対応', project: '金型更新プロジェクト' }
        ];

        let activitiesHtml = `
            <table class="mini-grid-table">
                <thead>
                    <tr>
                        <th style="width: 80px;">活動日</th>
                        <th style="width: 100px;">営業担当</th>
                        <th style="width: 100px;">担当(姓)</th>
                        <th style="width: 80px;">タイプ</th>
                        <th>コメント</th>
                        <th style="width: 120px;">目的</th>
                        <th style="width: 150px;">案件名</th>
                    </tr>
                </thead>
                <tbody>
        `;

        activitiesHtml += mockActivities.map(a => `
            <tr>
                <td>${escapeHtml(a.date)}</td>
                <td>${escapeHtml(a.rep)}</td>
                <td><a class="blue-link">${escapeHtml(a.contact)}</a></td>
                <td><span class="${a.typeClass}">${escapeHtml(a.type)}</span></td>
                <td class="comment-cell" title="${escapeHtml(a.comment)}">${escapeHtml(a.comment)}</td>
                <td>${escapeHtml(a.purpose)}</td>
                <td><a class="blue-link">${escapeHtml(a.project)}</a></td>
            </tr>
        `).join('');

        activitiesHtml += `</tbody></table>`;

        set('companyActivitiesList', activitiesHtml);
        const mockProjects = [
            { date: '2024/04/01', saleDate: '2024/05/10', follow: '2024/06/01', status: '進行中', rep: '鈴木 一郎', name: 'サーバー導入案件', contact: '山田', summary: '新規サーバーの導入検討', initial: 'A', motivation: 'HP', method: '電話' },
            { date: '2024/03/15', saleDate: '-', follow: '2024/04/20', status: '保留', rep: '中谷 太輔', name: 'PC入替', contact: '佐藤', summary: '老朽化に伴う入替', initial: 'B', motivation: '紹介', method: '来社' }
        ];

        let projectsHtml = `
            <table class="mini-grid-table">
                <thead>
                    <tr>
                        <th style="width: 80px;">話題日</th>
                        <th style="width: 80px;">売上日</th>
                        <th style="width: 100px;">フォロー予定</th>
                        <th style="width: 100px;">案件ステータス</th>
                        <th style="width: 100px;">営業担当</th>
                        <th style="width: 150px;">案件名</th>
                        <th style="width: 80px;">担当(姓)</th>
                        <th>案件概要</th>
                        <th style="width: 80px;">当初確度</th>
                        <th style="width: 80px;">発生動機</th>
                        <th style="width: 80px;">引合手段</th>
                    </tr>
                </thead>
                <tbody>
        `;

        projectsHtml += mockProjects.map(p => `
            <tr>
                <td>${escapeHtml(p.date)}</td>
                <td>${escapeHtml(p.saleDate)}</td>
                <td>${escapeHtml(p.follow)}</td>
                <td>${escapeHtml(p.status)}</td>
                <td>${escapeHtml(p.rep)}</td>
                <td><a class="blue-link">${escapeHtml(p.name)}</a></td>
                <td>${escapeHtml(p.contact)}</td>
                <td title="${escapeHtml(p.summary)}">${escapeHtml(p.summary)}</td>
                <td>${escapeHtml(p.initial)}</td>
                <td>${escapeHtml(p.motivation)}</td>
                <td>${escapeHtml(p.method)}</td>
            </tr>
        `).join('');

        projectsHtml += `</tbody></table>`;

        set('companyProjectsList', projectsHtml);
    }

    function includesPartial(haystack, needle) {
        return String(haystack).toLowerCase().includes(String(needle).toLowerCase());
    }

    function escapeHtml(s) {
        return String(s)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function toNum(v) {
        const t = String(v ?? '').trim();
        if (!t) return null;
        const n = Number(t);
        return Number.isFinite(n) ? n : null;
    }

    function initActivitySection() {
        const root = document.getElementById('activity-root');
        if (!root || root.dataset.ready === '1') return;
        root.dataset.ready = '1';

        const mockData = [
            { id: '29193', date: '2026/04/29', time: '10:15', rep: '中谷 太輔', type: 'TEL', purpose: '売り後フォロー', company: '旭川エレクトロニクスサービス株式会社', contact: '佐藤', comment: 'wwww' },
            { id: '29192', date: '2026/04/29', time: '10:29', rep: '金谷 裕美子', type: 'TEL', purpose: '売り後フォロー', company: '旭川エレクトロニクスサービス株式会社', contact: '佐藤', comment: '' },
            { id: '29191', date: '2026/04/29', time: '16:12', rep: '中谷 太輔', type: 'TEL', purpose: '売り後フォロー', company: '旭川エレクトロニクスサービス株式会社', contact: '佐藤', comment: '' },
            { id: '29190', date: '2026/04/29', time: '16:12', rep: '中谷 太輔', type: 'TEL', purpose: '売り後フォロー', company: '旭川エレクトロニクスサービス株式会社', contact: '佐藤', comment: '' },
            { id: '29189', date: '2026/04/29', time: '16:12', rep: '中谷 太輔', type: 'TEL', purpose: '売り後フォロー', company: '旭川エレクトロニクスサービス株式会社', contact: '佐藤', comment: '' },
            { id: '29188', date: '2026/04/28', time: '17:01', rep: '中谷 太輔', type: 'TEL', purpose: '売り後フォロー', company: '丸紅食品株式会社', contact: '渡辺', comment: '' },
            { id: '29187', date: '2026/04/28', time: '17:01', rep: '中谷 太輔', type: 'TEL', purpose: '売り後フォロー', company: '丸紅食品株式会社', contact: '渡辺', comment: '' },
            { id: '29186', date: '2026/04/28', time: '17:01', rep: '中谷 太輔', type: 'TEL', purpose: '売り後フォロー', company: '丸紅食品株式会社', contact: '渡辺', comment: '' },
            { id: '29185', date: '2026/04/28', time: '17:02', rep: '中谷 太輔', type: 'TEL', purpose: '売り後フォロー', company: '丸紅食品株式会社', contact: '渡辺', comment: '' },
            { id: '29184', date: '2026/04/28', time: '17:02', rep: '中谷 太輔', type: 'TEL', purpose: '売り後フォロー', company: '丸紅食品株式会社', contact: '渡辺', comment: '' },
        ];

        function renderTable(data) {
            const tbody = document.getElementById('activityTableBody');
            if (!tbody) return;
            tbody.innerHTML = data.map(item => `
                <tr data-id="${item.id}">
                    <td>${item.date}</td>
                    <td>${item.time}</td>
                    <td>${item.rep}</td>
                    <td>${item.type}</td>
                    <td><a class="blue-link">${item.company}</a></td>
                    <td>${item.contact}</td>
                    <td class="comment-cell">${item.comment}</td>
                </tr>
            `).join('');

            tbody.querySelectorAll('tr').forEach(tr => {
                tr.addEventListener('click', () => {
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                    tr.classList.add('selected');
                    const id = tr.dataset.id;
                    const selected = mockData.find(d => d.id === id);
                    if (selected) {
                        fillDetail(selected);
                    }
                });
            });
        }

        function fillDetail(item) {
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val || '';
            };
            setVal('atDetailId', item.id);
            setVal('atDetailType', item.type);
            setVal('atDetailPurpose', item.purpose);
            setVal('atDetailSalesRep', item.rep + ' [企画部]');
            setVal('atDetailCompanyName', item.company);
            setVal('atDetailContact', item.contact + ' 瑞葵 [' + item.company + ']');
            setVal('atDetailDate', item.date.replaceAll('/', '-'));
            setVal('atDetailStartTime', item.time);
            setVal('atDetailComment', item.comment);
        }

        renderTable(mockData);

        // Selection of first row by default
        if (mockData.length > 0) {
            const firstRow = document.getElementById('activityTableBody')?.querySelector('tr');
            if (firstRow) firstRow.click();
        }

        document.getElementById('btnActivityAdvancedSearch')?.addEventListener('click', () => {
            document.getElementById('dlgActivityAdvancedSearch')?.showModal();
        });

        document.getElementById('btnActivityNewMain')?.addEventListener('click', () => {
            const dlg = document.getElementById('dlgActivityDetail');
            if (dlg) {
                dlg.showModal();
                const form = document.getElementById('formActivityDetail');
                if (form) form.reset();
            }
        });

        // CP07 Contact Lookup
        document.getElementById('btnAtDetailContactLookup')?.addEventListener('click', () => {
            document.getElementById('dlgContactLookup')?.showModal();
        });
        // CP08 Contact New
        document.getElementById('btnAtDetailContactNew')?.addEventListener('click', () => {
            document.getElementById('dlgContactDetailNew')?.showModal();
        });
        // CP09 Project Lookup
        document.getElementById('btnAtDetailProjectLookup')?.addEventListener('click', () => {
            document.getElementById('dlgProjectLookup')?.showModal();
        });
        // CP10 Project New
        document.getElementById('btnAtDetailProjectNew')?.addEventListener('click', () => {
            document.getElementById('dlgProjectDetail')?.showModal();
        });
    }

    function initProjectSection() {
        const root = document.getElementById('project-root');
        if (!root || root.dataset.ready) return;
        root.dataset.ready = '1';

        const mockProjects = [
            {
                id: '3042',
                issueDate: '2022/12/15',
                followDate: '2021/10/21',
                status: '失注',
                rep: '鈴木 一郎',
                company: '旭川エレクトロニクスサービス株式会社',
                contact: '佐藤',
                name: '金型更新プロジェクト',
                summary: '金型更新プロジェクトの導入是非を評価中。短納期対応と全体体制重視し、運用負荷の低減を狙う。現場ヒアリングを踏まえた要件定義を行い、段階的実装プランを提案。'
            }
        ];

        function renderTable(data) {
            const tbody = document.getElementById('projectTableBody');
            if (!tbody) return;
            tbody.innerHTML = data.map(item => `
                <tr data-id="${item.id}">
                    <td>${item.issueDate}</td>
                    <td>${item.followDate}</td>
                    <td>${item.status}</td>
                    <td>${item.rep}</td>
                    <td><a class="blue-link">${item.company}</a></td>
                    <td>${item.contact}</td>
                    <td>${item.name}</td>
                    <td class="comment-cell">${item.summary}</td>
                </tr>
            `).join('');

            tbody.querySelectorAll('tr').forEach(tr => {
                tr.addEventListener('click', () => {
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                    tr.classList.add('selected');
                    const id = tr.dataset.id;
                    const selected = mockProjects.find(d => d.id === id);
                    if (selected) fillDetail(selected);
                });
            });
        }

        function fillDetail(item) {
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val || '';
            };
            setVal('prDetailId', item.id);
            setVal('prDetailName', item.name);
            setVal('prDetailSummary', item.summary);
            setVal('prDetailStatus', item.status);
            setVal('prDetailSalesRep', item.rep + ' [営業部]');
            setVal('prDetailCompanyName', item.company);
            setVal('prDetailContact', item.contact + ' 瑞葵 [' + item.company + ']');
            setVal('prDetailIssueDate', item.issueDate.replaceAll('/', '-'));
            setVal('prDetailFollowUp', item.followDate.replaceAll('/', '-'));

            // Fill activities table
            const activitiesTbody = document.getElementById('projectActivitiesTableBody');
            if (activitiesTbody) {
                const mockActivities = [
                    { date: '2022/12/15', rep: '鈴木 一郎', type: '訪問', purpose: '定期', motive: '引合', contactName: '佐藤', comment: '金型更新プロジェクトの導入是非を評価中。' }
                ];
                activitiesTbody.innerHTML = mockActivities.map(act => `
                    <tr>
                        <td>${act.date}</td>
                        <td>${act.rep}</td>
                        <td>${act.type}</td>
                        <td>${act.purpose}</td>
                        <td>${act.motive}</td>
                        <td>${act.contactName}</td>
                        <td class="comment-cell">${act.comment}</td>
                    </tr>
                `).join('');
            }
        }

        // Tab Switching
        const tabs = root.querySelectorAll('[data-pr-tab]');
        const panels = root.querySelectorAll('[data-pr-panel]');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const target = tab.dataset.prTab;
                panels.forEach(p => {
                    p.style.display = p.dataset.prPanel === target ? 'block' : 'none';
                });
            });
        });

        renderTable(mockProjects);
        if (mockProjects.length > 0) {
            const firstRow = document.getElementById('projectTableBody')?.querySelector('tr');
            if (firstRow) firstRow.click();
        }

        // Hook up dialog buttons
        document.getElementById('btnProjectAdvancedSearch')?.addEventListener('click', () => {
            document.getElementById('dlgProjectAdvancedSearch')?.showModal();
        });
        document.getElementById('btnProjectNewMain')?.addEventListener('click', () => {
            document.getElementById('dlgProjectDetail')?.showModal();
        });
        document.getElementById('btnPrTabNewActivity')?.addEventListener('click', () => {
            document.getElementById('dlgActivityDetail')?.showModal();
        });
        document.getElementById('btnPrTabNewProject')?.addEventListener('click', () => {
            document.getElementById('dlgProjectDetail')?.showModal();
        });
    }

    function initContactSection() {
        const root = document.getElementById('contact-root');
        if (!root || root.dataset.ready === '1') return;
        
        root.dataset.ready = '1';

        const tabs = root.querySelectorAll('[data-contact-tab]');
        const panels = root.querySelectorAll('[data-contact-panel]');

        const btnNewActivity = document.getElementById('btnContactNewActivity');
        const btnNewProject = document.getElementById('btnContactNewProject');

        tabs.forEach(t => {
            t.addEventListener('click', () => {
                const tab = t.getAttribute('data-contact-tab');
                tabs.forEach(x => x.classList.toggle('active', x === t));
                tabs.forEach(x => x.setAttribute('aria-selected', x === t ? 'true' : 'false'));
                panels.forEach(p => p.classList.toggle('active', p.getAttribute('data-contact-panel') === tab));

                if (btnNewActivity) {
                    btnNewActivity.style.display = tab === 'activities' ? 'block' : 'none';
                }
                if (btnNewProject) {
                    btnNewProject.style.display = tab === 'projects' ? 'block' : 'none';
                }
                if (tab === 'activities') {
                    renderContactActivities();
                }
                if (tab === 'projects') {
                    renderContactProjects();
                }
            });
        });

        if (btnNewProject) {
            btnNewProject.addEventListener('click', () => {
                const dlg = document.getElementById('dlgProjectDetail');
                if (dlg) dlg.showModal();
            });
        }

        if (btnNewActivity) {
            btnNewActivity.addEventListener('click', () => {
                const body = document.getElementById('contactActivitiesBody');
                if (!body) return;
                
                const tr = document.createElement('tr');
                const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
                tr.innerHTML = `
                    <td>${today}</td>
                    <td>中谷 太輔</td>
                    <td class="type-tel">TEL</td>
                    <td></td>
                    <td></td>
                `;
                body.insertBefore(tr, body.firstChild);
            });
        }

        const tbody = document.getElementById('contactTableBody');
        if (tbody) {
            tbody.addEventListener('click', (e) => {
                // Handle jump to company link
                const jump = e.target.closest('[data-jump-company]');
                if (jump) {
                    window._pendingCompanyJump = jump.dataset.jumpCompany;
                    // Hash change will trigger handleRouting -> initCompanySection
                    window.location.hash = '#company';
                    return;
                }

                const tr = e.target.closest('tr');
                if (!tr || !tr.parentElement) return;
                
                // Remove selected class from all sibling rows
                Array.from(tr.parentElement.children).forEach(row => {
                    row.classList.remove('selected');
                });
                
                // Add selected class to clicked row
                tr.classList.add('selected');
            });
        }

        const btnAdv = document.getElementById('btnContactAdvancedSearch');
        const dlgAdv = document.getElementById('dlgContactAdvancedSearch');
        if (btnAdv && dlgAdv) {
            btnAdv.addEventListener('click', () => {
                dlgAdv.showModal();
            });
        }

        const btnCreateMain = document.getElementById('btnContactCreateMain');
        const dlgContact = document.getElementById('dlgContactDetail');
        if (btnCreateMain && dlgContact) {
            btnCreateMain.addEventListener('click', () => {
                const form = document.getElementById('formContactDetail');
                if (form) form.reset();
                dlgContact.showModal();
            });
        }

        const btnSave = document.getElementById('btnContactDetailSave');
        if (btnSave) {
            btnSave.addEventListener('click', (e) => {
                e.preventDefault();
                alert('担当者情報を保存しました (CP04)');
                dlgContact?.close();
            });
        }

        const btnMainLookup = document.getElementById('btnMainContactLookupCompany');
        const btnMainCreate = document.getElementById('btnMainContactCreateCompany');
        const dlgCompanyLookup = document.getElementById('dlgCompanyLookup');
        const dlgCompanyCreate = document.getElementById('dlgCompanyCreate');

        if (btnMainLookup && dlgCompanyLookup) {
            btnMainLookup.addEventListener('click', () => {
                dlgCompanyLookup.showModal();
            });
        }

        if (btnMainCreate && dlgCompanyCreate) {
            btnMainCreate.addEventListener('click', () => {
                dlgCompanyCreate.showModal();
            });
        }

        function renderContactActivities() {
            const body = document.getElementById('contactActivitiesBody');
            if (!body) return;

            const data = [
                { date: '2026/04/29', rep: '中谷 太輔', type: 'TEL', typeClass: 'type-tel', comment: 'wwww', purpose: '売り後フォロー' },
                { date: '2026/04/29', rep: '金谷 裕美子', type: 'TEL', typeClass: 'type-tel', comment: '', purpose: '売り後フォロー' },
                { date: '2026/04/29', rep: '中谷 太輔', type: 'TEL', typeClass: 'type-tel', comment: '', purpose: '' },
                { date: '2026/04/29', rep: '中谷 太輔', type: 'TEL', typeClass: 'type-tel', comment: '', purpose: '' },
                { date: '2026/02/24', rep: '中谷 太輔', type: 'TEL', typeClass: 'type-tel', comment: '見積の件', purpose: '' },
            ];

            body.innerHTML = data.map(item => `
                <tr>
                    <td>${item.date}</td>
                    <td>${item.rep}</td>
                    <td class="${item.typeClass}">${item.type}</td>
                    <td>${item.comment}</td>
                    <td>${item.purpose}</td>
                </tr>
            `).join('');
        }
        function renderContactProjects() {
            const body = document.getElementById('contactProjectsBody');
            if (!body) return;

            const data = [
                { topicDate: '12/15/2022', salesDate: '', status: '失注', rep: '鈴木 一郎', projectName: '金型更新プロジェクト', contactSurname: '佐藤', summary: '金型更新プロジェクトの導入是非を...', initialAccuracy: '', motivation: '引合', method: 'SNS' }
            ];

            body.innerHTML = data.map(item => `
                <tr>
                    <td>${item.topicDate}</td>
                    <td>${item.salesDate}</td>
                    <td>${item.status}</td>
                    <td>${item.rep}</td>
                    <td><a href="#" style="color: #2563eb; text-decoration: underline;">${item.projectName}</a></td>
                    <td>${item.contactSurname}</td>
                    <td title="${item.summary}">${item.summary}</td>
                    <td>${item.initialAccuracy}</td>
                    <td>${item.motivation}</td>
                    <td>${item.method}</td>
                </tr>
            `).join('');
        }
    }
});
