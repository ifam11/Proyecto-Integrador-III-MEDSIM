pipeline {
  agent any
  //tools { nodejs 'Node20' }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install') {
      steps {
        dir('frontend') {
          bat 'npm install --loglevel verbose'
        }
      }
    }


    stage('Build') {
      steps {
        dir('frontend') {
          bat 'npm run build --verbose'
        }
      }
    }
  }
}
