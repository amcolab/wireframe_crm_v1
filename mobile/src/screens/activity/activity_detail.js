import { mockActivities } from '../../utils/mockData.js';

export function init(id) {
    console.log('Activity Detail initialized for ID:', id);
    const activity = mockActivities.find(a => a.id === id);
    if (!activity) return;

    // Populate activity fields
    document.getElementById('activity-company').textContent = activity.company;
    document.getElementById('activity-date').textContent = activity.date || '-';
    document.getElementById('activity-type').textContent = activity.type || '-';
    document.getElementById('activity-contact').textContent = activity.contact || '-';
    document.getElementById('activity-salesrep').textContent = activity.salesRep || '-';
    document.getElementById('activity-motivation').textContent = activity.motivation || '-';
    document.getElementById('activity-project').textContent = activity.projectName || '-';
    document.getElementById('activity-start').textContent = activity.startTime || '-';
    document.getElementById('activity-end').textContent = activity.endTime || '-';
    document.getElementById('activity-duration').textContent = activity.duration || '-';
    document.getElementById('activity-attendees').textContent = activity.attendees || '-';
    
    document.getElementById('activity-free1').textContent = activity.free1 || '-';
    document.getElementById('activity-free2').textContent = activity.free2 || '-';
    document.getElementById('activity-free3').textContent = activity.free3 || '-';
    document.getElementById('activity-free4').textContent = activity.free4 || '-';
    document.getElementById('activity-free5').textContent = activity.free5 || '-';

    // Comment handling
    const commentEl = document.getElementById('activity-comment');
    if (commentEl) {
        const savedComment = localStorage.getItem(`comment_activity_${activity.id}`);
        commentEl.value = savedComment !== null ? savedComment : (activity.comment || '');
        
        commentEl.addEventListener('input', (e) => {
            localStorage.setItem(`comment_activity_${activity.id}`, e.target.value);
        });
    }
}
