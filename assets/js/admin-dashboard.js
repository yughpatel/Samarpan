$(document).ready(function() {
    var username = "Admin"; // Default fallback name
    var currentUrl = window.location.search; // Get query string ?user=...

    // Check if 'user=' exists in the URL
    if (currentUrl.indexOf("user=") > -1) {
        // Split the string to extract the name
        var parts = currentUrl.split("user=");
        if (parts.length > 1) {
            // Decode to handle spaces (e.g. Rajesh%20Patel -> Rajesh Patel)
            username = decodeURIComponent(parts[1]);
        }
    }

    // Update the HTML elements with the found username
    $("#userName").text(username);
    $("#userAvatar").text(username.charAt(0).toUpperCase());
    
    $(".nav-link").click(function(e) {
        e.preventDefault(); // Stop link from reloading page

        // Remove 'active' class from all links
        $(".nav-link").removeClass("active");
        
        // Add 'active' class to the clicked link
        $(this).addClass("active");

        // Get the target section ID (e.g., "members", "events")
        var targetId = $(this).attr("data-target");

        // Hide all content sections
        $(".section").hide();

        // Show only the selected section
        $("#" + targetId).show();

        // Update the Page Title Header
        var newTitle = $(this).text();
        $("#pageTitle").text(newTitle);
    });
 
    $("#logout-btn").click(function() {
        //
        var choice = confirm("Are you sure you want to logout?");
        if (choice) {
            window.location.href = "admin-login.html";
        }
    });

    $(".btn-edit").click(function() {
        alert("Edit functionality: Opening edit form...") ;
    });

    // Delete Button Handler
    $(".btn-delete").click(function() {
        var verify = confirm("Are you sure you want to delete this item?");
        if (verify) {
            // Remove the row from the table
            // parent() gets the <td>, parent().parent() gets the <tr>
            $(this).parent().parent().hide("slow", function(){
                 $(this).remove();
            });
        }
    });

    // Add Button Handler
    $(".btn-add").click(function() {
        alert("Add functionality: Opening creation form...");
    });

    // Form Submit Handler (Settings)
    $(".btn-submit").click(function() {
        alert("Settings Saved Successfully!");
    });

    // Sidebar Toggle Logic
    $("#sidebarToggle").click(function(e) {
        e.stopPropagation();
        $(".sidebar").toggleClass("active");
    });

    // Close sidebar when clicking outside on mobile
    $(document).click(function(e) {
        if ($(window).width() <= 1024) {
            if (!$(e.target).closest('.sidebar').length && !$(e.target).closest('#sidebarToggle').length) {
                $(".sidebar").removeClass("active");
            }
        }
    });

    // Close sidebar when clicking a nav link on mobile
    $(".nav-link").click(function() {
        if ($(window).width() <= 1024) {
            $(".sidebar").removeClass("active");
        }
    });

});