pipeline {
    agent any

    environment {
        AWS_REGION   = 'us-east-1'          // your region
        ACCOUNT_ID   = '461319271536'        // your 12-digit account ID
        ECR_REGISTRY = "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        IMAGE_TAG    = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Login to ECR') {
            steps {
                sh '''
                aws ecr get-login-password --region $AWS_REGION | \
                docker login --username AWS --password-stdin $ECR_REGISTRY
                '''
            }
        }

        stage('Build images') {
            steps {
                sh '''
                docker build -t $ECR_REGISTRY/mern-frontend:$IMAGE_TAG -t $ECR_REGISTRY/mern-frontend:latest ./frontend
                docker build -t $ECR_REGISTRY/mern-backend:$IMAGE_TAG  -t $ECR_REGISTRY/mern-backend:latest  ./backend
                '''
            }
        }

        stage('Push to ECR') {
            steps {
                sh '''
                docker push $ECR_REGISTRY/mern-frontend:$IMAGE_TAG
                docker push $ECR_REGISTRY/mern-frontend:latest
                docker push $ECR_REGISTRY/mern-backend:$IMAGE_TAG
                docker push $ECR_REGISTRY/mern-backend:latest
                '''
            }
        }
    }

    post {
        always { sh 'docker image prune -f' }
    }
}
