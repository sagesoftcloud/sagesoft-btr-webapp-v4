// AWS Configuration for BTR Treasury
const AWS_CONFIG = {
    region: 'us-east-1', // Update with your preferred region
    
    // Cognito Configuration
    cognito: {
        userPoolId: 'YOUR_USER_POOL_ID',
        clientId: 'YOUR_CLIENT_ID',
        identityPoolId: 'YOUR_IDENTITY_POOL_ID'
    },
    
    // S3 Configuration
    s3: {
        bucketName: 'btr-treasury-documents',
        region: 'us-east-1'
    },
    
    // Bedrock Configuration
    bedrock: {
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        region: 'us-east-1'
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AWS_CONFIG;
}
