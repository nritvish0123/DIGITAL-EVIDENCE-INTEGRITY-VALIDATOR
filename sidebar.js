function initSidebar() {
    const isAdmin = window.location.pathname.includes('admin') || 
                  sessionStorage.getItem('adminAuth') === 'true' ||
                  ['registered-users.html', 'login-approval.html', 'users-activity.html'].some(p => window.location.pathname.includes(p));

    window.getDashboardURL = function() {
        return isAdmin ? 'admin.html' : 'dashboard.html';
    };

    const sidebarHTML = `
        <div class="menu-toggle" id="menuToggle">
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
        </div>
        <div class="overlay" id="sidebarOverlay"></div>
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <h3>🛡️ Validator</h3>
                <p style="font-size: 0.8rem; margin: 0;">${isAdmin ? 'Admin Portal' : 'User Portal'}</p>
            </div>
            <nav class="sidebar-menu">
                <a href="${isAdmin ? 'admin.html' : 'dashboard.html'}" class="menu-item" id="nav-dashboard">
                    <span class="menu-icon">🏠</span> Dashboard
                </a>
                
                <div style="margin: 1rem 0; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem;">
                    <p style="text-align: left; font-size: 0.7rem; color: #64748b; text-transform: uppercase; margin-bottom: 0.5rem; padding-left: 1rem;">Evidence Tools</p>
                    <a href="upload-evidence.html" class="menu-item" id="nav-upload">
                        <span class="menu-icon">📤</span> Upload Evidence
                    </a>
                    <a href="validate-evidence.html" class="menu-item" id="nav-validate">
                        <span class="menu-icon">🔍</span> Validate Evidence
                    </a>
                    <a href="evidence-list.html" class="menu-item" id="nav-inventory">
                        <span class="menu-icon">📋</span> Inventory
                    </a>
                   
                </div>

                ${isAdmin ? `
                <div style="margin: 1rem 0; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem;">
                    <p style="text-align: left; font-size: 0.7rem; color: #64748b; text-transform: uppercase; margin-bottom: 0.5rem; padding-left: 1rem;">Administration</p>
                    <a href="registered-users.html" class="menu-item" id="nav-users">
                        <span class="menu-icon">👥</span> Registered Users
                    </a>
                    <a href="login-approval.html" class="menu-item" id="nav-logins">
                        <span class="menu-icon">🔑</span> Login Approvals
                    </a>
                    <a href="users-activity.html" class="menu-item" id="nav-activity">
                        <span class="menu-icon">📜</span> User Activity
                    </a>
                </div>
                ` : ''}

                <div style="margin: 1rem 0; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem;">
                    <a href="account-settings.html" class="menu-item" id="nav-settings">
                        <span class="menu-icon">👤</span> Account
                    </a>
                    <a href="change-password.html" class="menu-item" id="nav-password">
                        <span class="menu-icon">🔑</span> Change Password
                    </a>
                    <a href="about-us.html" class="menu-item" id="nav-about">
                        <span class="menu-icon">ℹ️</span> About Project
                    </a>
                    <a href="#" onclick="logout('${isAdmin ? 'Admin' : 'User'} Logout')" class="menu-item" style="color: #ef4444;">
                        <span class="menu-icon">🚪</span> Logout
                    </a>
                </div>
            </nav>
        </aside>
    `;

    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);

    const toggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    const openSidebar = () => {
        toggle.classList.add('open');
        sidebar.classList.add('open');
        // Overlay is optional for hover, but keep it for visual emphasis if desired
        // overlay.classList.add('show'); 
    };

    const closeSidebar = () => {
        toggle.classList.remove('open');
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    };

    // Hover triggers
    toggle.addEventListener('mouseenter', openSidebar);
    sidebar.addEventListener('mouseleave', closeSidebar);

    // Maintain click for mobile/fallback
    toggle.addEventListener('click', (e) => {
        if (sidebar.classList.contains('open')) {
            closeSidebar();
        } else {
            openSidebar();
            overlay.classList.add('show');
        }
    });

    overlay.addEventListener('click', closeSidebar);

    // Mark active link
    const currentPath = window.location.pathname.split('/').pop();
    const navMap = {
        'admin.html': 'nav-dashboard',
        'dashboard.html': 'nav-dashboard',
        'upload-evidence.html': 'nav-upload',
        'validate-evidence.html': 'nav-validate',
        'evidence-list.html': 'nav-inventory',
        'registered-users.html': 'nav-users',
        'login-approval.html': 'nav-logins',

        'users-activity.html': 'nav-activity',
        'account-settings.html': 'nav-settings',

        'change-password.html': 'nav-password',
        'about-us.html': 'nav-about'
    };

    if (navMap[currentPath]) {
        const activeItem = document.getElementById(navMap[currentPath]);
        if (activeItem) activeItem.classList.add('active');
    }

    // Update dynamic dashboard links
    document.querySelectorAll('.dynamic-dashboard-link').forEach(link => {
        link.href = window.getDashboardURL();
    });
}

document.addEventListener('DOMContentLoaded', initSidebar);
