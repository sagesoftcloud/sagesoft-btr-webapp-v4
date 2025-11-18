// AWS Configuration
AWS.config.region = 'us-east-1'; // Update with your region

// Cognito Configuration
const poolData = {
    UserPoolId: 'YOUR_USER_POOL_ID',
    ClientId: 'YOUR_CLIENT_ID'
};

let userPool, cognitoUser;
let s3, bedrock;

// Initialize AWS services
function initializeAWS() {
    userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    s3 = new AWS.S3();
    bedrock = new AWS.BedrockRuntime();
}

// Authentication Functions
function signIn() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const authenticationData = {
        Username: email,
        Password: password,
    };

    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
    
    const userData = {
        Username: email,
        Pool: userPool,
    };

    cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            console.log('Authentication successful');
            updateUI(true);
            
            // Configure AWS credentials
            AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                IdentityPoolId: 'YOUR_IDENTITY_POOL_ID',
                Logins: {
                    [`cognito-idp.${AWS.config.region}.amazonaws.com/${poolData.UserPoolId}`]: result.getIdToken().getJwtToken()
                }
            });
        },
        onFailure: function(err) {
            console.error('Authentication failed:', err);
            alert('Login failed: ' + err.message);
        }
    });
}

function signOut() {
    if (cognitoUser) {
        cognitoUser.signOut();
        updateUI(false);
    }
}

function updateUI(isLoggedIn) {
    document.getElementById('loginBtn').style.display = isLoggedIn ? 'none' : 'block';
    document.getElementById('logoutBtn').style.display = isLoggedIn ? 'block' : 'none';
    document.getElementById('loginForm').style.display = isLoggedIn ? 'none' : 'block';
    document.getElementById('userInfo').style.display = isLoggedIn ? 'block' : 'none';
}

// S3 File Upload
document.getElementById('fileInput').addEventListener('change', function(event) {
    const files = event.target.files;
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    Array.from(files).forEach(file => {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'flex justify-between items-center p-3 bg-gray-100 rounded';
        fileDiv.innerHTML = `
            <span>${file.name}</span>
            <button onclick="uploadFile('${file.name}')" class="bg-blue-500 text-white px-3 py-1 rounded text-sm">Upload</button>
        `;
        fileList.appendChild(fileDiv);
    });
});

function uploadFile(fileName) {
    const file = Array.from(document.getElementById('fileInput').files).find(f => f.name === fileName);
    
    const params = {
        Bucket: 'YOUR_S3_BUCKET_NAME',
        Key: fileName,
        Body: file,
        ContentType: file.type
    };

    s3.upload(params, function(err, data) {
        if (err) {
            console.error('Upload failed:', err);
            alert('Upload failed: ' + err.message);
        } else {
            console.log('Upload successful:', data);
            alert('File uploaded successfully!');
            updateStats();
        }
    });
}

// Bedrock AI Chat
function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;

    addMessageToChat('user', message);
    input.value = '';

    // Call Bedrock
    const params = {
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 1000,
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

function addMessageToChat(role, message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `mb-3 ${role === 'user' ? 'text-right' : 'text-left'}`;
    
    const bgColor = role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800';
    messageDiv.innerHTML = `
        <div class="inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${bgColor}">
            ${message}
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateStats() {
    // Update dashboard stats
    document.getElementById('docCount').textContent = Math.floor(Math.random() * 100);
    document.getElementById('storageUsed').textContent = Math.floor(Math.random() * 1000) + ' MB';
    document.getElementById('aiQueries').textContent = Math.floor(Math.random() * 50);
}

// Event Listeners
document.getElementById('loginBtn').addEventListener('click', signIn);
document.getElementById('logoutBtn').addEventListener('click', signOut);
document.getElementById('chatInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeAWS();
    updateStats();
});
