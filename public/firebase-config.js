const firebaseConfig = {
  apiKey: "AIzaSyD_GRYKH0Sfw-DqIp0fw665S6DHSxTcxbE",
  authDomain: "fire-cbt-sample.firebaseapp.com",
  projectId: "fire-cbt-sample",
  storageBucket: "fire-cbt-sample.firebasestorage.app",
  messagingSenderId: "911770311332",
  appId: "1:911770311332:web:ee86353929b726dfd56431"
};

// Firebase 초기화
let app, auth, db;

try {
  // Firebase 앱 초기화
  app = firebase.initializeApp(firebaseConfig);

  // Authentication 초기화
  auth = firebase.auth();

  // Firestore 초기화
  db = firebase.firestore();

  console.log("Firebase 초기화 완료");
} catch (error) {
  console.error("Firebase 초기화 실패:", error);
}
