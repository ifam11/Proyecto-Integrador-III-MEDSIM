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
          // AQUÍ va el código que te puse
          bat 'npm ci --loglevel verbose'
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
