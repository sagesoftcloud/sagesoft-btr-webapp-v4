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

---

## 📚 **REFERENCES & DOCUMENTATION**

### **AWS Official Documentation**

#### **Cognito Authentication**
- [AWS Cognito User Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
- [Cognito JavaScript SDK](https://docs.aws.amazon.com/cognito/latest/developerguide/using-amazon-cognito-user-identity-pools-javascript-examples.html)
- [Custom Attributes Setup](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html)
- [Cognito Identity Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/identity-pools.html)

#### **S3 Storage**
- [S3 JavaScript SDK v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
- [S3 CORS Configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
- [S3 Bucket Policies](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-policies.html)
- [S3 Upload from Browser](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/s3-example-photo-album.html)

#### **Bedrock AI**
- [Amazon Bedrock User Guide](https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html)
- [Bedrock Runtime API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html)
- [Claude 3.5 Sonnet Model](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages.html)
- [Bedrock JavaScript SDK](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-bedrock-runtime/)

#### **Lambda Functions**
- [Lambda Python Runtime](https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html)
- [Lambda Layers for Dependencies](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html)
- [S3 Event Triggers](https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html)

#### **DynamoDB**
- [DynamoDB JavaScript SDK](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/)
- [DynamoDB Scan Operations](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

#### **IAM Policies**
- [IAM Policy Generator](https://awspolicygen.s3.amazonaws.com/policygen.html)
- [IAM Policy Examples](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples.html)
- [Cognito Identity-Based Policies](https://docs.aws.amazon.com/cognito/latest/developerguide/iam-roles.html)

#### **CloudWatch Logging**
- [CloudWatch Logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html)
- [CloudWatch JavaScript SDK](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-cloudwatch-logs/)

### **AWS CLI Commands Reference**

#### **Installation & Setup**
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS CLI
aws configure
```

#### **Cognito CLI Commands**
```bash
# List User Pools
aws cognito-idp list-user-pools --max-results 10

# Describe User Pool
aws cognito-idp describe-user-pool --user-pool-id YOUR_USER_POOL_ID

# Create User
aws cognito-idp admin-create-user --user-pool-id YOUR_USER_POOL_ID --username user@example.com

# Set User Password
aws cognito-idp admin-set-user-password --user-pool-id YOUR_USER_POOL_ID --username user@example.com --password NewPassword123! --permanent
```

#### **S3 CLI Commands**
```bash
# Create Bucket
aws s3 mb s3://your-bucket-name

# List Bucket Contents
aws s3 ls s3://your-bucket-name --recursive

# Set Bucket Policy
aws s3api put-bucket-policy --bucket your-bucket-name --policy file://bucket-policy.json

# Configure CORS
aws s3api put-bucket-cors --bucket your-bucket-name --cors-configuration file://cors.json
```

### **JavaScript Libraries & Dependencies**

#### **Required CDN Links**
```html
<!-- AWS SDK v3 -->
<script src="https://sdk.amazonaws.com/js/aws-sdk-2.1.24.min.js"></script>

<!-- Cognito Identity SDK -->
<script src="https://amazon-cognito-identity-js.s3.amazonaws.com/amazon-cognito-identity.min.js"></script>

<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com"></script>
```

#### **NPM Packages (Alternative)**
```bash
npm install @aws-sdk/client-s3
npm install @aws-sdk/client-cognito-identity-provider
npm install @aws-sdk/client-bedrock-runtime
npm install @aws-sdk/client-dynamodb
npm install amazon-cognito-identity-js
```

### **Python Dependencies for Lambda**
```bash
pip install boto3
pip install PyPDF2
pip install python-multipart
```

### **Configuration Templates**

#### **S3 CORS Configuration (cors.json)**
```json
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
            "AllowedOrigins": ["*"],
            "ExposeHeaders": ["ETag", "x-amz-meta-custom-header"],
            "MaxAgeSeconds": 3000
        }
    ]
}
```

#### **S3 Bucket Policy Template (bucket-policy.json)**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "RegionalAccess",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::ACCOUNT-ID:role/Cognito_BTRTreasuryAuth_Role"
            },
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::btr-treasury-docs-367471965495/${cognito-identity.amazonaws.com:custom:region}/*"
        }
    ]
}
```

### **Troubleshooting Resources**

#### **Common Error Solutions**
- [CORS Errors](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors-troubleshooting.html)
- [Cognito Authentication Errors](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-using-import-tool-troubleshooting.html)
- [IAM Permission Errors](https://docs.aws.amazon.com/IAM/latest/UserGuide/troubleshoot_access-denied.html)
- [Bedrock Access Issues](https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting.html)

#### **AWS Support Resources**
- [AWS Support Center](https://console.aws.amazon.com/support/)
- [AWS Forums](https://forums.aws.amazon.com/)
- [AWS re:Post](https://repost.aws/)
- [Stack Overflow AWS Tags](https://stackoverflow.com/questions/tagged/amazon-web-services)

### **Testing Tools**

#### **Browser Developer Tools**
- Chrome DevTools Network Tab - Monitor API calls
- Firefox Developer Tools - Debug JavaScript
- Browser Console - View error messages and logs

#### **AWS Testing Tools**
- [AWS CLI](https://aws.amazon.com/cli/) - Command line testing
- [AWS Console](https://console.aws.amazon.com/) - Visual service management
- [Postman](https://www.postman.com/) - API testing
- [AWS CloudShell](https://aws.amazon.com/cloudshell/) - Browser-based CLI

### **Security Best Practices References**
- [AWS Security Best Practices](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html)
- [Cognito Security Best Practices](https://docs.aws.amazon.com/cognito/latest/developerguide/managing-security.html)
- [S3 Security Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

### **Cost Management Resources**
- [AWS Pricing Calculator](https://calculator.aws/)
- [AWS Cost Explorer](https://aws.amazon.com/aws-cost-management/aws-cost-explorer/)
- [AWS Budgets](https://aws.amazon.com/aws-cost-management/aws-budgets/)
- [AWS Free Tier](https://aws.amazon.com/free/)

### **Learning Resources**

#### **AWS Training**
- [AWS Skill Builder](https://skillbuilder.aws/) - Free AWS training
- [AWS Workshops](https://workshops.aws/) - Hands-on tutorials
- [AWS Whitepapers](https://aws.amazon.com/whitepapers/) - Technical guides

#### **Community Resources**
- [AWS Samples GitHub](https://github.com/aws-samples) - Code examples
- [AWS Architecture Center](https://aws.amazon.com/architecture/) - Reference architectures
- [AWS Blogs](https://aws.amazon.com/blogs/) - Latest updates and tutorials

---

## 🎯 **QUICK REFERENCE CHECKLIST**

### **Before You Start**
- [ ] AWS Account with admin permissions
- [ ] AWS CLI installed and configured
- [ ] Basic understanding of JavaScript
- [ ] Text editor or IDE ready
- [ ] Local web server for testing

### **Phase 1 Setup**
- [ ] Create Cognito User Pool
- [ ] Create S3 bucket with regional folders
- [ ] Request Bedrock model access
- [ ] Update config.js with real AWS IDs
- [ ] Test basic authentication

### **Phase 2 Integration**
- [ ] Implement real S3 upload
- [ ] Add Bedrock AI responses
- [ ] Configure regional access control
- [ ] Test cross-regional features
- [ ] Add audit logging

### **Phase 3 Production**
- [ ] Security hardening
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation updates
- [ ] Deployment to Amplify

---

**With these references, you have everything needed to successfully implement the BTR Treasury system!** 📚🚀
