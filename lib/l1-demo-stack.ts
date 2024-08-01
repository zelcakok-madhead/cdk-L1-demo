import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';

export class L1DemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an IAM role for the Lambda function
    const lambdaRole = new iam.CfnRole(this, 'LambdaExecutionRole', {
      assumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: ['lambda.amazonaws.com']
            },
            Action: ['sts:AssumeRole']
          }
        ]
      },
      managedPolicyArns: [
        'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
      ]
    });

    // Create the Lambda function
    const helloLambda = new lambda.CfnFunction(this, 'HelloLambda', {
      runtime: lambda.Runtime.NODEJS_18_X.name,
      code: {
        zipFile: `
          exports.handler = async (event) => {
            const name = event.pathParameters.name;
            return {
              statusCode: 200,
              body: JSON.stringify({ message: \`Hello World: \${name}\`, version: ${Date.now()} }),
              headers: { "Content-Type": "application/json" }
            };
          };
        `
      },
      handler: 'index.handler',
      functionName: 'HelloWorldFunction',
      role: lambdaRole.attrArn,
    });

    // Create the API Gateway
    const api = new apigateway.CfnRestApi(this, 'hello-api', {
      name: 'Hello Service',
      description: 'This service serves hello world.',
    });

    // Create a resource for the API
    const helloResource = new apigateway.CfnResource(this, 'HelloResource', {
      restApiId: api.ref,
      parentId: api.attrRootResourceId,
      pathPart: 'hello',
    });

    const nameResource = new apigateway.CfnResource(this, 'NameResource', {
      restApiId: api.ref,
      parentId: helloResource.ref,
      pathPart: '{name}',
    });

    // Create a GET method for the resource
    const getMethod = new apigateway.CfnMethod(this, 'GetHelloMethod', {
      httpMethod: 'GET',
      resourceId: nameResource.ref,
      restApiId: api.ref,
      authorizationType: 'NONE', // This allows unauthenticated access
      apiKeyRequired: false, // This ensures no API key is required
      integration: {
        type: 'AWS_PROXY',
        integrationHttpMethod: 'POST',
        uri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${helloLambda.attrArn}/invocations`,
      },
    });

    // Grant the API Gateway permission to invoke the Lambda function
    new lambda.CfnPermission(this, 'ApiGatewayLambdaPermission', {
      action: 'lambda:InvokeFunction',
      functionName: helloLambda.ref,
      principal: 'apigateway.amazonaws.com',
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${api.ref}/*/*`,
    });

    // Create a deployment for the API
    const deployment = new apigateway.CfnDeployment(this, 'ApiDeployment', {
      restApiId: api.ref,
    });

    // Add explicit dependency
    deployment.addDependency(getMethod);    

    // Create a stage for the deployment
    new apigateway.CfnStage(this, 'ApiStage', {
      stageName: 'prod',
      restApiId: api.ref,
      deploymentId: deployment.ref,
    });

    // Output the API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `https://${api.ref}.execute-api.${this.region}.amazonaws.com/prod/hello/{name}`,
      description: 'API URL',
    });
  }
}