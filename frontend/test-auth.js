import { Amplify } from 'aws-amplify'

const awsconfig = {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_fqab3yeYI',
      userPoolClientId: '40frognlq2q4abnre4ucvff4s0',
      identityPoolId: 'us-east-1:96e1df23-e527-42fd-b05f-5bcb5834bb73',
      region: 'us-east-1'
    }
  }
}

Amplify.configure(awsconfig)
console.log('✅ Amplify configured successfully')
console.log('User Pool ID:', awsconfig.Auth.Cognito.userPoolId)
console.log('Client ID:', awsconfig.Auth.Cognito.userPoolClientId)
console.log('Identity Pool ID:', awsconfig.Auth.Cognito.identityPoolId)
EOF < /dev/null