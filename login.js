function signIn() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    showLoading(true);
    hideError();

    // Demo credentials with roles and regions
    const validCredentials = [
        { 
            email: 'superadmin@btr.gov.ph', 
            password: 'SuperAdmin2025',
            role: 'super-admin',
            region: 'ALL',
            name: 'Sir Cons'
        },
        { 
            email: 'ncr@btr.gov.ph', 
            password: 'NCRAdmin2025',
            role: 'regional-admin',
            region: 'NCR',
            name: 'Maria Santos'
        },
        { 
            email: 'region1@btr.gov.ph', 
            password: 'Region1Admin2025',
            role: 'regional-admin',
            region: 'REGION-1',
            name: 'Juan Dela Cruz'
        },
        { 
            email: 'region2@btr.gov.ph', 
            password: 'Region2Admin2025',
            role: 'regional-admin',
            region: 'REGION-2',
            name: 'Ana Reyes'
        },
        { 
            email: 'demo@btr.gov.ph', 
            password: 'demo123',
            role: 'regional-admin',
            region: 'NCR',
            name: 'Demo User'
        }
    ];

    // Check credentials
    const user = validCredentials.find(cred => 
        cred.email === email && cred.password === password
    );

    setTimeout(() => {
        if (user) {
            // Store user session with role and region
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('userEmail', user.email);
            sessionStorage.setItem('userRole', user.role);
            sessionStorage.setItem('userRegion', user.region);
            sessionStorage.setItem('userName', user.name);
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            showError('Invalid credentials. Try: superadmin@btr.gov.ph / SuperAdmin2025');
            showLoading(false);
        }
    }, 1000);
}

function showLoading(show) {
    document.getElementById('loadingState').style.display = show ? 'block' : 'none';
    document.querySelector('button[type="submit"]').disabled = show;
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (isLoggedIn) {
        window.location.href = 'dashboard.html';
    }
});

// Login Form Handler
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    signIn();
});
