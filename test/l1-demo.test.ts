import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as L1Demo from '../lib/l1-demo-stack';

describe('L1DemoStack', () => {
    let app: cdk.App;
    let stack: L1Demo.L1DemoStack;
    let template: Template;

    beforeEach(() => {
        app = new cdk.App();
        stack = new L1Demo.L1DemoStack(app, 'MyTestStack');
        template = Template.fromStack(stack);
    });

    test('Lambda Function Created', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            Handler: 'index.handler',
            Runtime: 'nodejs18.x',
        });
    });

    test('Lambda Execution Role Created', () => {
        template.hasResourceProperties('AWS::IAM::Role', {
            AssumeRolePolicyDocument: {
                Version: "2012-10-17",
                Statement: [
                    {
                        Effect: "Allow",
                        Principal: {
                            Service: [
                                "lambda.amazonaws.com"
                            ]
                        },
                        Action: [
                            "sts:AssumeRole"
                        ]
                    }
                ]
            },
            ManagedPolicyArns: [
                'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
            ]
        });
    });

    test('API Gateway REST API Created', () => {
        template.hasResourceProperties('AWS::ApiGateway::RestApi', {
            Name: 'Hello Service'
        });
    });

    test('API Gateway Resource Created', () => {
        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            PathPart: 'hello'
        });
    });

    test('API Gateway Method Created', () => {
        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'GET',
            AuthorizationType: 'NONE',
            Integration: {
                Type: 'AWS_PROXY',
                IntegrationHttpMethod: 'POST'
            }
        });
    });

    test('Lambda Permission for API Gateway Created', () => {
        template.hasResourceProperties('AWS::Lambda::Permission', {
            Action: 'lambda:InvokeFunction',
            Principal: 'apigateway.amazonaws.com'
        });
    });

    test('API Gateway Deployment Created', () => {
        template.resourceCountIs('AWS::ApiGateway::Deployment', 1);
    });

    test('API Gateway Stage Created', () => {
        template.hasResourceProperties('AWS::ApiGateway::Stage', {
            StageName: 'prod'
        });
    });

    test('API URL Output Created', () => {
        template.hasOutput('ApiUrl', {
            Description: 'API URL'
        });
    });
});
