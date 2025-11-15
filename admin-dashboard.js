// Display username
const username = localStorage.getItem('adminUsername') || 'Admin';
document.getElementById('userName').textContent = username;
document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();

// Navigation functionality
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.section');
const pageTitle = document.getElementById('pageTitle');

navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();                
        const targetSection = this.getAttribute('data-section');
                
        // Update active nav link
        navLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        sections.forEach(s => s.classList.remove('active'));
        document.getElementById(targetSection).classList.add('active');
        const titles = {
            'dashboard': 'Dashboard',
            'members': 'Members Management',
            'events': 'Events Management',
            'gallery': 'Gallery Management',
            'news': 'News & Blog',
            'settings': 'Settings'
        };
        pageTitle.textContent = titles[targetSection] || 'Dashboard';
    });
});

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = 'admin-login.html';
    }
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-edit')) {
        alert('Edit functionality - This would open an edit form');
    }
    if (e.target.classList.contains('btn-delete')) {
        if (confirm('Are you sure you want to delete this item?')) {
            alert('Delete functionality - Item would be deleted');
        }
    }
    if (e.target.classList.contains('btn-add')) {
        alert('Add functionality - This would open an add form');
    }
});