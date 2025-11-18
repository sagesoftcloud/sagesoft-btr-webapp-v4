# BTR Treasury Cloud Platform

A modern web application built with Tailwind CSS and AWS services for the Bureau of the Treasury (BTR) Philippines with full regional access control.

## Features

- **Philippine Flag Color Scheme**: Blue (#0038A8), Red (#CE1126), Yellow (#FCD116)
- **Role-Based Access Control**: Super Admin vs Regional Admin permissions
- **Regional Data Isolation**: 15 regions (NCR, REGION-1 through REGION-13, REGION-4A, REGION-4B)
- **Cross-Regional Management**: Super admins can access all regions
- **Secure Login Flow**: Dedicated login page with role detection
- **AWS Cognito Authentication**: Secure user login/logout
- **S3 Document Management**: Regional file upload and storage
- **Bedrock AI Assistant**: Context-aware AI with regional intelligence
- **Advanced Search**: Content-based document search with regional filtering
- **Document Preview/Download**: View and download capabilities
- **Responsive Design**: Mobile-friendly interface

## Demo Login Credentials

**Super Administrator (Cross-Regional Access):**
- **Email**: `superadmin@btr.gov.ph`
- **Password**: `SuperAdmin2025`
- **Access**: All 15 regions, cross-regional analysis

**Regional Administrators:**
- **NCR**: `ncr@btr.gov.ph` / `NCRAdmin2025`
- **Region 1**: `region1@btr.gov.ph` / `Region1Admin2025`  
- **Region 2**: `region2@btr.gov.ph` / `Region2Admin2025`

**Demo Account:**
- **Email**: `demo@btr.gov.ph`
- **Password**: `demo123`
- **Access**: NCR region only

## User Roles & Permissions

### Super Administrator (👑 Super Admin)
- Access to all 15 regions
- Region filter dropdown (ALL, NCR, REGION-1, etc.)
- Can upload documents to any region
- Cross-regional AI analysis
- System-wide statistics and insights

### Regional Administrator (📍 Region Name)
- Access to assigned region only
- Cannot view other regions' documents
- Upload restricted to own region
- AI responses tailored to regional context
- Regional statistics only

## Quick Start

1. Open `index.html` in a web browser (redirects to login)
2. Use super admin credentials: `superadmin@btr.gov.ph` / `SuperAdmin2025`
3. Test region filtering and cross-regional features
4. Try regional admin: `ncr@btr.gov.ph` / `NCRAdmin2025`

## Application Flow

1. **Entry Point**: `index.html` → redirects to `login.html`
2. **Authentication**: Role and region detection during login
3. **Dashboard**: UI adapts based on user role (super admin vs regional admin)
4. **Regional Access**: Data filtering and permissions enforced
5. **AI Context**: Assistant knows user role and regional access

## File Structure

```
btr-website/
├── index.html          # Entry point (redirects to login)
├── login.html          # Login page with role detection
├── login.js           # Authentication with regional access control
├── dashboard.html     # Role-adaptive dashboard
├── dashboard.js       # Regional access control logic
├── app.js            # Original AWS integration code
├── config.js         # AWS configuration
├── COST_BREAKDOWN.md # Cost analysis for sales/management
└── README.md         # This file
```

## Regional Access Control Features

### For Super Administrators
- **Region Filter**: Switch between ALL, NCR, REGION-1 through REGION-13, REGION-4A, REGION-4B
- **Cross-Regional Upload**: Choose target region for document uploads
- **Unified Dashboard**: View statistics across all regions
- **AI Cross-Analysis**: Ask questions about multiple regions

### For Regional Administrators
- **Region Lock**: Interface locked to assigned region
- **Regional Upload**: Documents automatically go to user's region
- **Regional Search**: Search results limited to accessible documents
- **Regional AI**: AI responses focused on user's regional context

## Local Development

1. Serve with a local server:
   ```bash
   python -m http.server 8000
   # or
   npx serve .
   ```
2. Open http://localhost:8000
3. Test different user roles and regional access

## AWS Services Configuration (Optional)

### Cognito Setup
1. Create a Cognito User Pool with custom attributes for region/role
2. Create a Cognito Identity Pool with role-based policies
3. Update `config.js` with your pool IDs
4. Replace demo authentication in `login.js`

### S3 Setup
1. Create S3 bucket with regional folder structure
2. Configure IAM policies for regional access control
3. Set up CORS for web access
4. Update bucket name in `config.js`

### Bedrock Setup
1. Enable Bedrock in your AWS region
2. Request access to Claude 3 Sonnet model
3. Configure regional context in prompts
4. Update model ID in `config.js`

## Deployment

Deploy to AWS Amplify with regional access control:
```bash
amplify init
amplify add auth  # Configure Cognito with regional attributes
amplify add storage  # Configure S3 with regional folders
amplify add hosting
amplify publish
```

## Security Features

- **Regional Data Isolation**: Users cannot access other regions' data
- **Role-Based Permissions**: Different capabilities for super admin vs regional admin
- **Session Management**: Secure login/logout with role persistence
- **Access Control**: UI elements hidden/shown based on permissions
- **Audit Trail**: All actions logged with user and regional context

## Color Palette

- **Philippine Blue**: #0038A8
- **Philippine Red**: #CE1126  
- **Philippine Yellow**: #FCD116
- **White**: #FFFFFF

## Alignment with BTR User Stories

✅ **Fully Implemented:**
- Cross-regional dashboard access for super admins
- Regional data isolation for regional admins
- Role-based document upload permissions
- Context-aware AI assistant
- Professional Philippine government branding
- Responsive design for all devices
- Secure authentication with role detection
- Advanced search with regional filtering

## Security Notes

- Demo credentials are for testing only
- Regional access control enforced at UI and data level
- Never commit AWS credentials to version control
- Use environment variables for sensitive configuration
- Enable MFA for production Cognito users
- Configure proper S3 bucket policies with regional restrictions
# sagesoft-btr-webapp-v4
