# BTR Treasury Integration Guide 🚀

This guide shows how to integrate AWS services with the current GUI to fully align with BTR_User_Stories.md requirements.

## 📋 Current Status vs Requirements

### ✅ **Already Implemented (GUI Ready)**
- Philippine flag color scheme and government branding
- Role-based UI (Super Admin vs Regional Admin)
- Regional access control interface
- AI chat interface with context awareness
- Document upload/search interface
- Responsive design for all devices

### 🔧 **Needs AWS Integration**
- Real Cognito authentication
- Actual S3 document storage with regional folders
- Live Bedrock AI responses
- PDF content analysis and search
- Audit logging and monitoring

---

## 🔐 **STEP 1: AWS Cognito Integration**

### **1.1 Create Cognito User Pool**

```bash
# Create User Pool with custom attributes
aws cognito-idp create-user-pool \
    --pool-name "BTR-Treasury-Users" \
    --policies "PasswordPolicy={MinimumLength=12,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=true}" \
    --schema '[
        {
            "Name": "email",
            "AttributeDataType": "String",
            "Required": true,
            "Mutable": true
        },
        {
            "Name": "custom:region",
            "AttributeDataType": "String",
            "Required": false,
            "Mutable": true
        },
        {
            "Name": "custom:role",
            "AttributeDataType": "String",
            "Required": false,
            "Mutable": true
        }
    ]'
```

### **1.2 Create User Pool Client**

```bash
# Create app client
aws cognito-idp create-user-pool-client \
    --user-pool-id "YOUR_USER_POOL_ID" \
    --client-name "BTR-Treasury-Web" \
    --generate-secret false \
    --explicit-auth-flows "ADMIN_NO_SRP_AUTH" "ALLOW_USER_PASSWORD_AUTH" "ALLOW_REFRESH_TOKEN_AUTH"
```

### **1.3 Create Users with Regional Access**

```bash
# Create Super Admin
aws cognito-idp admin-create-user \
    --user-pool-id "YOUR_USER_POOL_ID" \
    --username "superadmin@btr.gov.ph" \
    --user-attributes Name=email,Value=superadmin@btr.gov.ph Name=custom:role,Value=super-admin Name=custom:region,Value=ALL \
    --temporary-password "TempPass123!" \
    --message-action SUPPRESS

# Create Regional Admin - NCR
aws cognito-idp admin-create-user \
    --user-pool-id "YOUR_USER_POOL_ID" \
    --username "ncr@btr.gov.ph" \
    --user-attributes Name=email,Value=ncr@btr.gov.ph Name=custom:role,Value=regional-admin Name=custom:region,Value=NCR \
    --temporary-password "TempPass123!" \
    --message-action SUPPRESS
```

### **1.4 Update login.js for Real Cognito**

```javascript
// Replace demo authentication in login.js
function signIn() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    showLoading(true);
    hideError();

    const authenticationData = {
        Username: email,
        Password: password,
    };

    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
    
    const userData = {
        Username: email,
        Pool: userPool,
    };

    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            // Get user attributes for role and region
            cognitoUser.getUserAttributes(function(err, attributes) {
                if (err) {
                    console.error('Error getting user attributes:', err);
                    return;
                }
                
                let userRole = 'regional-admin';
                let userRegion = 'NCR';
                let userName = email.split('@')[0];
                
                attributes.forEach(attr => {
                    if (attr.getName() === 'custom:role') userRole = attr.getValue();
                    if (attr.getName() === 'custom:region') userRegion = attr.getValue();
                    if (attr.getName() === 'name') userName = attr.getValue();
                });
                
                // Store session with real user data
                sessionStorage.setItem('isLoggedIn', 'true');
                sessionStorage.setItem('userEmail', email);
                sessionStorage.setItem('userRole', userRole);
                sessionStorage.setItem('userRegion', userRegion);
                sessionStorage.setItem('userName', userName);
                
                window.location.href = 'dashboard.html';
            });
        },
        onFailure: function(err) {
            console.error('Authentication failed:', err);
            showError(err.message || 'Login failed. Please try again.');
            showLoading(false);
        }
    });
}
```

---

## 📁 **STEP 2: S3 Regional Document Storage**

### **2.1 Create S3 Bucket with Regional Structure**

```bash
# Create main bucket
aws s3 mb s3://btr-treasury-documents-2025

# Create regional folders
aws s3api put-object --bucket btr-treasury-documents-2025 --key NCR/
aws s3api put-object --bucket btr-treasury-documents-2025 --key REGION-1/
aws s3api put-object --bucket btr-treasury-documents-2025 --key REGION-2/
# ... continue for all 15 regions
```

### **2.2 Configure S3 CORS**

```json
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
            "AllowedOrigins": ["*"],
            "ExposeHeaders": ["ETag"]
        }
    ]
}
```

### **2.3 Create IAM Roles for Regional Access**

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::btr-treasury-documents-2025/${cognito-identity.amazonaws.com:custom:region}/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::btr-treasury-documents-2025",
            "Condition": {
                "StringLike": {
                    "s3:prefix": "${cognito-identity.amazonaws.com:custom:region}/*"
                }
            }
        }
    ]
}
```

### **2.4 Update dashboard.js for Real S3 Upload**

```javascript
function uploadFile(fileName, region) {
    const file = Array.from(document.getElementById('fileInput').files).find(f => f.name === fileName);
    
    // Configure AWS credentials from Cognito
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: 'YOUR_IDENTITY_POOL_ID',
        Logins: {
            [`cognito-idp.${AWS.config.region}.amazonaws.com/${poolData.UserPoolId}`]: 
                sessionStorage.getItem('idToken')
        }
    });
    
    const s3 = new AWS.S3();
    const params = {
        Bucket: 'btr-treasury-documents-2025',
        Key: `${region}/${fileName}`,
        Body: file,
        ContentType: file.type,
        Metadata: {
            'uploaded-by': currentUser.email,
            'upload-region': region,
            'upload-date': new Date().toISOString()
        }
    };

    s3.upload(params, function(err, data) {
        if (err) {
            console.error('Upload failed:', err);
            alert('Upload failed: ' + err.message);
        } else {
            console.log('Upload successful:', data);
            alert(`File "${fileName}" uploaded successfully to ${region}!`);
            updateStats();
            updateDocumentList();
        }
    });
}
```

---

## 🤖 **STEP 3: Bedrock AI Integration**

### **3.1 Enable Bedrock and Request Model Access**

```bash
# Enable Bedrock service
aws bedrock list-foundation-models --region us-east-1

# Request access to Claude 3.5 Sonnet (via AWS Console)
# Go to Bedrock Console > Model Access > Request Access
```

### **3.2 Create IAM Policy for Bedrock**

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel"
            ],
            "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
        }
    ]
}
```

### **3.3 Update dashboard.js for Real AI Responses**

```javascript
function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;

    addMessageToChat('user', message);
    input.value = '';

    // Configure Bedrock client
    const bedrock = new AWS.BedrockRuntime({
        region: 'us-east-1'
    });

    // Create context-aware prompt
    let systemPrompt = `You are an AI assistant for the Bureau of Treasury, Philippines. 
    User Role: ${currentUser.role}
    User Region: ${currentUser.region}
    Current View: ${currentViewRegion}
    
    Provide professional, government-appropriate responses focused on treasury operations.`;
    
    if (currentUser.role === 'super-admin') {
        systemPrompt += ` You have access to cross-regional data and can provide comparative analysis across all 15 regions.`;
    } else {
        systemPrompt += ` Focus responses on ${currentUser.region} regional context only.`;
    }

    const params = {
        modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 1000,
            system: systemPrompt,
            messages: [{
                role: "user",
                content: message
            }]
        })
    };

    bedrock.invokeModel(params, function(err, data) {
        if (err) {
            console.error('Bedrock error:', err);
            addMessageToChat('assistant', 'Sorry, I encountered an error processing your request.');
        } else {
            const response = JSON.parse(new TextDecoder().decode(data.body));
            addMessageToChat('assistant', response.content[0].text);
        }
    });
}
```

---

## 🔍 **STEP 4: PDF Content Search Integration**

### **4.1 Create Lambda Function for PDF Processing**

```python
import json
import boto3
import PyPDF2
from io import BytesIO

def lambda_handler(event, context):
    s3 = boto3.client('s3')
    
    bucket = event['bucket']
    key = event['key']
    
    # Download PDF from S3
    response = s3.get_object(Bucket=bucket, Key=key)
    pdf_content = response['Body'].read()
    
    # Extract text from PDF
    pdf_reader = PyPDF2.PdfReader(BytesIO(pdf_content))
    text_content = ""
    
    for page in pdf_reader.pages:
        text_content += page.extract_text()
    
    # Store extracted text in DynamoDB for searching
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('BTR-Document-Index')
    
    table.put_item(
        Item={
            'document_id': key,
            'content': text_content,
            'region': key.split('/')[0],
            'filename': key.split('/')[-1],
            'upload_date': event.get('upload_date', '')
        }
    )
    
    return {
        'statusCode': 200,
        'body': json.dumps('PDF processed successfully')
    }
```

### **4.2 Update Search Function for Content Search**

```javascript
function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;

    // Use DynamoDB to search document content
    const dynamodb = new AWS.DynamoDB.DocumentClient();
    
    let filterExpression = 'contains(content, :query)';
    let expressionAttributeValues = {
        ':query': query
    };
    
    // Add regional filtering
    if (currentUser.role !== 'super-admin') {
        filterExpression += ' AND #region = :region';
        expressionAttributeValues[':region'] = currentUser.region;
    } else if (currentViewRegion !== 'ALL') {
        filterExpression += ' AND #region = :region';
        expressionAttributeValues[':region'] = currentViewRegion;
    }

    const params = {
        TableName: 'BTR-Document-Index',
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: {
            '#region': 'region'
        }
    };

    dynamodb.scan(params, function(err, data) {
        if (err) {
            console.error('Search error:', err);
            displaySearchResults([], query);
        } else {
            const results = data.Items.map(item => ({
                name: item.filename,
                type: 'PDF',
                region: item.region,
                content_match: true
            }));
            displaySearchResults(results, query);
        }
    });
}
```

---

## 📊 **STEP 5: Monitoring and Audit Trail**

### **5.1 Create CloudWatch Log Groups**

```bash
# Create log groups for different components
aws logs create-log-group --log-group-name "/btr/treasury/auth"
aws logs create-log-group --log-group-name "/btr/treasury/documents"
aws logs create-log-group --log-group-name "/btr/treasury/ai-queries"
```

### **5.2 Add Logging to All Functions**

```javascript
// Add to all major functions
function logUserAction(action, details) {
    const logData = {
        timestamp: new Date().toISOString(),
        user: currentUser.email,
        role: currentUser.role,
        region: currentUser.region,
        action: action,
        details: details
    };
    
    // Send to CloudWatch (via API Gateway + Lambda)
    fetch('/api/log', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('idToken')}`
        },
        body: JSON.stringify(logData)
    });
}

// Example usage
function uploadFile(fileName, region) {
    logUserAction('DOCUMENT_UPLOAD', {
        filename: fileName,
        target_region: region,
        file_size: file.size
    });
    
    // ... rest of upload logic
}
```

---

## 🚀 **STEP 6: Deployment Configuration**

### **6.1 Update config.js with Real Values**

```javascript
const AWS_CONFIG = {
    region: 'us-east-1',
    
    cognito: {
        userPoolId: 'us-east-1_XXXXXXXXX',  // Your actual User Pool ID
        clientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX',  // Your actual Client ID
        identityPoolId: 'us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'  // Your actual Identity Pool ID
    },
    
    s3: {
        bucketName: 'btr-treasury-documents-2025',
        region: 'us-east-1'
    },
    
    bedrock: {
        modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        region: 'us-east-1'
    },
    
    dynamodb: {
        documentIndexTable: 'BTR-Document-Index',
        region: 'us-east-1'
    }
};
```

### **6.2 Amplify Deployment**

```bash
# Initialize Amplify project
amplify init

# Add authentication
amplify add auth
# Choose: Manual configuration
# Configure with regional attributes

# Add storage
amplify add storage
# Choose: Content (Images, audio, video, etc.)
# Configure with regional access policies

# Add API for logging
amplify add api
# Choose: REST
# Create Lambda functions for logging and PDF processing

# Deploy everything
amplify push
```

---

## ✅ **STEP 7: Testing Checklist**

### **7.1 Authentication Testing**
- [ ] Super admin can login and see all regions
- [ ] Regional admin can login and see only their region
- [ ] User attributes (role, region) are correctly retrieved
- [ ] Session management works properly

### **7.2 Document Management Testing**
- [ ] Files upload to correct regional folders
- [ ] Regional admins cannot access other regions' files
- [ ] Super admins can upload to any region
- [ ] File metadata is correctly stored

### **7.3 AI Assistant Testing**
- [ ] AI responses are contextually appropriate for user role
- [ ] Super admin gets cross-regional analysis capabilities
- [ ] Regional admin gets region-specific responses
- [ ] AI maintains professional government tone

### **7.4 Search Testing**
- [ ] Content-based search works across PDFs
- [ ] Search results respect regional access controls
- [ ] Super admin can search across all regions
- [ ] Regional admin search is limited to their region

### **7.5 Security Testing**
- [ ] Regional data isolation is enforced
- [ ] Users cannot access unauthorized regions
- [ ] All actions are properly logged
- [ ] Session security is maintained

---

## 📈 **Expected Outcomes**

After completing this integration:

✅ **100% BTR User Stories Alignment**
✅ **Production-Ready Regional Access Control**
✅ **Real AWS Service Integration**
✅ **Secure Document Management**
✅ **Intelligent AI Assistant**
✅ **Comprehensive Audit Trail**
✅ **Scalable Architecture**

## 💰 **Estimated AWS Costs**

- **Cognito**: ~$5/month (for 100 users)
- **S3**: ~$10/month (for 100GB storage)
- **Bedrock**: ~$20/month (for moderate AI usage)
- **DynamoDB**: ~$5/month (for document indexing)
- **Lambda**: ~$2/month (for PDF processing)
- **CloudWatch**: ~$3/month (for logging)

**Total: ~$45/month** for production deployment

---

## 🆘 **Support and Troubleshooting**

### **Common Issues:**
1. **CORS Errors**: Ensure S3 CORS is properly configured
2. **Authentication Failures**: Check Cognito User Pool settings
3. **Regional Access Issues**: Verify IAM policies and user attributes
4. **AI Response Errors**: Confirm Bedrock model access is granted
5. **Search Not Working**: Check DynamoDB table and Lambda function

### **Debug Commands:**
```bash
# Check Cognito users
aws cognito-idp list-users --user-pool-id YOUR_USER_POOL_ID

# Check S3 bucket contents
aws s3 ls s3://btr-treasury-documents-2025/ --recursive

# Check CloudWatch logs
aws logs describe-log-groups --log-group-name-prefix "/btr/treasury"
```

This integration guide provides a complete roadmap to transform your current GUI into a fully functional, production-ready BTR Treasury system! 🚀
