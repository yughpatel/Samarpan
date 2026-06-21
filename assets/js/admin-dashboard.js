$(document).ready(function() {
    var username = "Admin"; // Fallback username if URL query param is missing
    var currentUrl = window.location.search; // Grab query string from address bar (e.g. ?user=...)

    // Try to parse out the username to customize the header welcome text
    if (currentUrl.indexOf("user=") > -1) {
        var parts = currentUrl.split("user=");
        if (parts.length > 1) {
            username = decodeURIComponent(parts[1]);
        }
    }

    // Inject the username and its initial into the dashboard UI elements
    $("#userName").text(username);
    $("#userAvatar").text(username.charAt(0).toUpperCase());
    
    // Switch between dashboard panels (fixed the bug where links used data-target instead of data-section)
    $(".nav-link").click(function(e) {
        e.preventDefault();

        $(".nav-link").removeClass("active");
        $(this).addClass("active");

        // Show/hide section matching this link's data-section attribute
        var targetSection = $(this).attr("data-section");

        $(".section").hide();
        $("#" + targetSection).show();

        var newTitle = $(this).text();
        $("#pageTitle").text(newTitle);
    });
 
    $("#logout-btn").click(function() {
        var choice = confirm("Are you sure you want to logout?");
        if (choice) {
            $.ajax({
                url: '/api/admin/logout',
                type: 'POST',
                success: function(response) {
                    window.location.href = response.redirect || "admin-login.html";
                },
                error: function() {
                    window.location.href = "admin-login.html";
                }
            });
        }
    });

    $(".btn-edit").click(function() {
        alert("Edit functionality: Opening edit form...") ;
    });

    // Quick row deletion animation for local tables (e.g. event or settings lists)
    $(".btn-delete").click(function() {
        var verify = confirm("Are you sure you want to delete this item?");
        if (verify) {
            $(this).parent().parent().hide("slow", function(){
                 $(this).remove();
            });
        }
    });

    // Add item click handler (placeholder alert until full features are wired up)
    $(".btn-add").click(function() {
        alert("Add functionality: Opening creation form...");
    });

    // Simple settings saved feedback alert
    $(".btn-submit").click(function() {
        alert("Settings Saved Successfully!");
    });

    // Responsive sidebar toggle logic
    $("#sidebarToggle").click(function(e) {
        e.stopPropagation();
        $(".sidebar").toggleClass("active");
    });

    // Click outside mobile sidebar drawer to close it automatically
    $(document).click(function(e) {
        if ($(window).width() <= 1024) {
            if (!$(e.target).closest('.sidebar').length && !$(e.target).closest('#sidebarToggle').length) {
                $(".sidebar").removeClass("active");
            }
        }
    });

    // Dismiss the side drawer on mobile after clicking any menu link
    $(".nav-link").click(function() {
        if ($(window).width() <= 1024) {
            $(".sidebar").removeClass("active");
        }
    });

    // --------------------------------------------------
    // MEMBERSHIP APPLICATION REVIEW SYSTEM
    // --------------------------------------------------
    let activeApplications = [];
    let currentViewingAppId = null;

    // Grab applications waiting to be processed
    function loadApplications() {
        // Fetch from backend API, or fall back to browser localStorage if working offline
        fetch('/api/applications')
        .then(response => {
            if (response.ok) return response.json();
            throw new Error("Offline");
        })
        .then(data => {
            activeApplications = data;
            renderApplicationsTable();
        })
        .catch(() => {
            console.log("Loading applications from localStorage...");
            activeApplications = JSON.parse(localStorage.getItem('samarpan_applications') || '[]');
            renderApplicationsTable();
        });
    }

    // Loop through pending applications list and build out the table rows dynamically
    function renderApplicationsTable() {
        const listContainer = $('#applications-list');
        listContainer.empty();

        const pendingApps = activeApplications.filter(app => app.status === 'Pending');

        if (pendingApps.length === 0) {
            listContainer.append('<tr><td colspan="7" style="text-align:center; padding: 2rem; color: #888;">No pending applications found.</td></tr>');
            return;
        }

        pendingApps.forEach(app => {
            const row = `
                <tr id="app_row_${app.id}">
                    <td><strong>${app.id.substring(4, 10)}</strong></td>
                    <td>${app.main_member.name}</td>
                    <td>${app.emails.primary}</td>
                    <td><span class="status-badge status-active" style="background:#fff3e0; color:#e65100; border:1px solid #ffe0b2;">${app.membership_type.toUpperCase()}</span></td>
                    <td>${app.submission_date}</td>
                    <td><span class="status-badge status-inactive" style="background:#eceff1; color:#37474f;">${app.status}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-edit btn-review-app" data-id="${app.id}" style="background:#dc5424; color:white; border-color:#dc5424;">Review</button>
                            <button class="btn-add btn-approve-app" data-id="${app.id}" style="background:#2e7d32; color:white; border-color:#2e7d32; margin-left:5px;">Approve</button>
                            <button class="btn-delete btn-reject-app" data-id="${app.id}" style="margin-left:5px;">Reject</button>
                        </div>
                    </td>
                </tr>
            `;
            listContainer.append(row);
        });

        // Wire up event click handlers for review, approve, and reject buttons
        $('.btn-review-app').click(function() {
            const appId = $(this).attr('data-id');
            openReviewModal(appId);
        });

        $('.btn-approve-app').click(function() {
            const appId = $(this).attr('data-id');
            approveApplication(appId);
        });

        $('.btn-reject-app').click(function() {
            const appId = $(this).attr('data-id');
            rejectApplication(appId);
        });
    }

    // Populate details panel and open the review overlay modal
    window.openReviewModal = function(id) {
        currentViewingAppId = id;
        const app = activeApplications.find(a => a.id === id);
        if (!app) return;

        const isFamily = app.membership_type === 'family';

        const mainPhotoHtml = app.main_member.photo ? `<img src="${app.main_member.photo}" style="width:120px; height:140px; border:1px solid #ddd; object-fit:cover;">` : '<div style="width:120px; height:140px; border:2px dashed #ccc; display:flex; align-items:center; justify-content:center; color:#aaa;">No Photo</div>';
        
        let familyHtml = '';
        if (isFamily) {
            familyHtml = `
                <div style="margin-top:1.5rem; background:#fffbf7; border:1px solid #ffe8d1; padding:1.5rem;">
                    <h4 style="color:var(--primary-color); border-bottom:1px solid #ffd8b3; padding-bottom:0.3rem; margin-bottom:1rem;">Family Members & Photos</h4>
                    <div style="display:flex; gap:1.5rem; flex-wrap:wrap;">
                        <div style="text-align:center;">
                            <div style="width:90px; height:105px; border:1px solid #ddd; display:flex; align-items:center; justify-content:center; background:#eee; overflow:hidden;">
                                ${app.family.wife.photo ? `<img src="${app.family.wife.photo}" style="width:100%; height:100%; object-fit:cover;">` : '👤'}
                            </div>
                            <div style="font-size:0.8rem; margin-top:5px;"><strong>Wife:</strong> ${app.family.wife.name || 'N/A'} (Age: ${app.family.wife.age || 'N/A'})</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="width:90px; height:105px; border:1px solid #ddd; display:flex; align-items:center; justify-content:center; background:#eee; overflow:hidden;">
                                ${app.family.father.photo ? `<img src="${app.family.father.photo}" style="width:100%; height:100%; object-fit:cover;">` : '👤'}
                            </div>
                            <div style="font-size:0.8rem; margin-top:5px;"><strong>Father:</strong> ${app.family.father.name || 'N/A'} (Age: ${app.family.father.age || 'N/A'})</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="width:90px; height:105px; border:1px solid #ddd; display:flex; align-items:center; justify-content:center; background:#eee; overflow:hidden;">
                                ${app.family.mother.photo ? `<img src="${app.family.mother.photo}" style="width:100%; height:100%; object-fit:cover;">` : '👤'}
                            </div>
                            <div style="font-size:0.8rem; margin-top:5px;"><strong>Mother:</strong> ${app.family.mother.name || 'N/A'} (Age: ${app.family.mother.age || 'N/A'})</div>
                        </div>
                    </div>

                    <h5 style="margin-top:1.2rem; color:var(--primary-color);">Children (Under 21)</h5>
                    <table style="width:100%; border-collapse:collapse; margin-top:5px; font-size:0.85rem;">
                        <thead>
                            <tr style="background:#f9f9f9; text-align:left; border-bottom:1px solid #ddd;">
                                <th style="padding:6px;">Name</th>
                                <th style="padding:6px;">Relation</th>
                                <th style="padding:6px;">Age/DOB</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${app.family.children.length === 0 ? '<tr><td colspan="3" style="color:#999; padding:6px;">No children registered.</td></tr>' : ''}
                            ${app.family.children.map(child => `
                                <tr style="border-bottom:1px solid #eee;">
                                    <td style="padding:6px;">${child.name}</td>
                                    <td style="padding:6px;">${child.relation}</td>
                                    <td style="padding:6px;">${child.dob}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        const detailsHtml = `
            <div style="display:flex; gap:2rem; flex-wrap:wrap; margin-bottom:1.5rem;">
                <div>
                    ${mainPhotoHtml}
                </div>
                <div style="flex-grow:1; min-width:280px;">
                    <table style="width:100%; border-collapse:collapse; font-size:0.95rem;">
                        <tr style="border-bottom:1px solid #eee; height:35px;"><td style="font-weight:bold; width:35%;">Applicant Name:</td><td>${app.main_member.name}</td></tr>
                        <tr style="border-bottom:1px solid #eee; height:35px;"><td style="font-weight:bold;">Age:</td><td>${app.main_member.age}</td></tr>
                        <tr style="border-bottom:1px solid #eee; height:35px;"><td style="font-weight:bold;">Type:</td><td><strong style="color:var(--primary-color);">${app.membership_type.toUpperCase()}</strong></td></tr>
                        <tr style="border-bottom:1px solid #eee; height:35px;"><td style="font-weight:bold;">Submitted Date:</td><td>${app.submission_date}</td></tr>
                    </table>
                </div>
            </div>

            ${familyHtml}

            <div style="margin-top:1.5rem; background:#fbfbfb; border:1px solid #ddd; padding:1.2rem;">
                <h4 style="color:var(--primary-color); margin-bottom:0.8rem; font-size:1rem; border-bottom:1px solid #eee; padding-bottom:0.3rem;">Contact Info & Address</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.8rem; font-size:0.9rem;">
                    <div><strong>India Address:</strong> ${app.address_india.address}</div>
                    <div><strong>India Phone:</strong> ${app.address_india.phone}</div>
                    <div><strong>Kuwait Mobile:</strong> ${app.contact_kuwait.mobile}</div>
                    <div><strong>Kuwait Home / Office:</strong> ${app.contact_kuwait.home} / ${app.contact_kuwait.office}</div>
                    <div><strong>Emails:</strong> ${app.emails.primary} | ${app.emails.secondary}</div>
                </div>
            </div>

            <div style="margin-top:1.5rem; background:#f4f9f4; border:1px solid #d0e7d0; padding:1.2rem; font-size:0.9rem;">
                <h4 style="color:#2e7d32; margin-bottom:0.5rem; font-size:1rem;">Declarations & Recommendations</h4>
                <div><strong>Years Resided in Gujarat:</strong> ${app.declaration.years_in_gujarat} Years</div>
                <div style="margin-top:5px;"><strong>Gujarati Origin Confirmed:</strong> Yes (અમો જન્મ જાત ગુજરાતી છીએ)</div>
                <div style="margin-top:5px;"><strong>Constitution Confirmed:</strong> Yes (બંધારણ સ્વીકાર્ય છે)</div>
                <div style="margin-top:8px; border-top:1px dashed #c0dcc0; padding-top:8px;">
                    <strong>Recommenders:</strong>
                    <ul style="padding-left:1.5rem; margin-top:3px; list-style:circle;">
                        <li>${app.recommenders.rec1_name} (ID: ${app.recommenders.rec1_id})</li>
                        <li>${app.recommenders.rec2_name} (ID: ${app.recommenders.rec2_id})</li>
                    </ul>
                </div>
            </div>
        `;

        $('#modal-details-content').html(detailsHtml);
        $('#reviewModal').css('display', 'flex');
    };

    // Hide details review modal
    window.closeReviewModal = function() {
        $('#reviewModal').hide();
        currentViewingAppId = null;
    };

    // Approve handler: updates application state to 'Approved'
    window.approveApplication = function(id) {
        const verify = confirm("Are you sure you want to approve this membership application?");
        if (!verify) return;

        const app = activeApplications.find(a => a.id === id);
        if (!app) return;

        // POST approval to Flask backend. Falls back to localStorage mock logic on error.
        fetch(`/api/applications/${id}/approve`, {
            method: 'POST'
        })
        .then(res => {
            if (res.ok) return res.json();
            throw new Error("Offline");
        })
        .then(() => {
            completeApprovalFlow(app);
        })
        .catch(() => {
            // Local fallback if server is down: update local status
            activeApplications = activeApplications.map(a => {
                if (a.id === id) {
                    a.status = 'Approved';
                }
                return a;
            });
            localStorage.setItem('samarpan_applications', JSON.stringify(activeApplications));
            completeApprovalFlow(app);
        });
    };

    function completeApprovalFlow(app) {
        alert("Application approved successfully! Member is now registered.");
        
        // Append the newly approved member directly to our active members table
        const dateToday = new Date().toISOString().substring(0, 10);
        const newMemberRow = `
            <tr>
                <td>${app.main_member.name}</td>
                <td>${app.emails.primary}</td>
                <td>${dateToday}</td>
                <td><span class="status-badge status-active">Active</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit">Edit</button>
                        <button class="btn-delete" onclick="$(this).closest('tr').hide('slow', function(){$(this).remove();});">Delete</button>
                    </div>
                </td>
            </tr>
        `;
        // Inject into target table body
        $('#members table tbody').prepend(newMemberRow);

        closeReviewModal();
        loadApplications(); // Reload applications list
        loadDashboardStats(); // Reload metrics
    }

    // Reject handler: marks application as Rejected
    window.rejectApplication = function(id) {
        const verify = confirm("Are you sure you want to reject this membership application?");
        if (!verify) return;

        fetch(`/api/applications/${id}/reject`, {
            method: 'POST'
        })
        .then(res => {
            if (res.ok) return res.json();
            throw new Error("Offline");
        })
        .then(() => {
            completeRejectionFlow(id);
        })
        .catch(() => {
            // Offline fallback: delete from local storage array
            activeApplications = activeApplications.filter(a => a.id !== id);
            localStorage.setItem('samarpan_applications', JSON.stringify(activeApplications));
            completeRejectionFlow(id);
        });
    };

    function completeRejectionFlow(id) {
        alert("Application rejected successfully.");
        $(`#app_row_${id}`).remove();
        closeReviewModal();
        loadApplications();
        loadDashboardStats(); // Reload metrics
    }

    // Modal actions: button handlers inside the review details panel
    $('#modalApproveBtn').click(function() {
        if (currentViewingAppId) approveApplication(currentViewingAppId);
    });

    $('#modalRejectBtn').click(function() {
        if (currentViewingAppId) rejectApplication(currentViewingAppId);
    });

    // Pull stats from stats endpoint to keep cards updated in real time
    function loadDashboardStats() {
        $.ajax({
            url: '/api/admin/stats',
            type: 'GET',
            success: function(data) {
                $('#stat-total-members').text(data.total_members.toLocaleString());
                $('#stat-pending-apps').text(data.pending_applications.toLocaleString());
                $('#stat-upcoming-events').text(data.upcoming_events.toLocaleString());
                $('#stat-gallery-images').text(data.total_posts ? data.total_posts.toLocaleString() : "856");
            },
            error: function() {
                // Fallback stats count from localStorage data
                const apps = JSON.parse(localStorage.getItem('samarpan_applications') || '[]');
                const pendingCount = apps.filter(a => a.status === 'Pending').length;
                const approvedCount = apps.filter(a => a.status === 'Approved').length;
                
                $('#stat-total-members').text((2547 + approvedCount).toLocaleString());
                $('#stat-pending-apps').text(pendingCount.toLocaleString());
                $('#stat-upcoming-events').text("3");
                $('#stat-gallery-images').text("856");
            }
        });
    }

    // Run initial loaders on startup
    loadApplications();
    loadDashboardStats();
});