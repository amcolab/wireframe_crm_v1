import { mockProjects, mockActivities } from '../../utils/mockData.js';

export function init(id) {
    console.log('Project Detail initialized for ID:', id);
    const project = mockProjects.find(p => p.id === id);
    if (!project) return;

    // Populate project fields
    document.getElementById('project-company').textContent = project.company;
    document.getElementById('project-topic-date').textContent = project.topicDate || '-';
    document.getElementById('project-followup-date').textContent = project.followupDate || '-';
    document.getElementById('project-status').textContent = project.status || '-';
    document.getElementById('project-motivation').textContent = project.motivation || '-';
    document.getElementById('project-salesrep').textContent = project.salesRep || '-';
    document.getElementById('project-name').textContent = project.name || '-';
    document.getElementById('project-initial-accuracy').textContent = project.initialAccuracy || '-';
    document.getElementById('project-revised-accuracy').textContent = project.revisedAccuracy || '-';
    document.getElementById('project-contact-name').textContent = project.contactName || '-';
    document.getElementById('project-competitor').textContent = project.competitor || '-';
    document.getElementById('project-sale-date').textContent = project.saleDate || '-';
    document.getElementById('project-lost-date').textContent = project.lostDate || '-';
    document.getElementById('project-inquiry-method').textContent = project.inquiryMethod || '-';
    
    document.getElementById('project-free1').textContent = project.free1 || '-';
    document.getElementById('project-free2').textContent = project.free2 || '-';
    document.getElementById('project-free3').textContent = project.free3 || '-';
    document.getElementById('project-free4').textContent = project.free4 || '-';
    document.getElementById('project-free5').textContent = project.free5 || '-';

    // Summary handling
    const summaryEl = document.getElementById('project-summary');
    if (summaryEl) {
        summaryEl.value = project.summary || '';
        summaryEl.addEventListener('input', (e) => {
            console.log('Summary updated:', e.target.value);
        });
    }

    // Related Activities
    const activitiesContainer = document.getElementById('project-activities-container');
    if (activitiesContainer) {
        const relatedActivities = mockActivities.filter(a => a.company === project.company);
        if (relatedActivities.length === 0) {
            activitiesContainer.innerHTML = '<div style="padding: 10px; color: #666;">関連する活動はありません。</div>';
        } else {
            activitiesContainer.innerHTML = relatedActivities.map(item => `
                <div class="activity-item" onclick="window.location.hash='activity-detail/${item.id}'">
                    <div class="activity-item-header" style="margin-bottom: 8px;">
                        <div class="activity-company" style="font-size: 15px; color: var(--text-primary); font-weight: 700;">${item.company}</div>
                        <div class="activity-date" style="font-size: 11px; color: var(--text-secondary);">${item.date}</div>
                    </div>
                    <div style="display: flex; gap: 10px; margin-bottom: 4px; font-size: 11px; color: var(--text-secondary);">
                        <div>担当 <span style="color: var(--text-primary);">${item.contact}</span></div>
                        <div>営業 <span style="color: var(--text-primary);">${item.salesRep}</span></div>
                        <div>タイプ <span style="color: var(--text-primary);">${item.type}</span></div>
                    </div>
                </div>
            `).join('');
        }
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }
}
