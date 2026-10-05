const firebaseConfig = {
  apiKey: "AIzaSyA5E4jEzU1YVS-4kWjgI4Dk0Ani-POvvyY",
  authDomain: "seoul-dc4d7.firebaseapp.com",
  projectId: "seoul-dc4d7",
  storageBucket: "seoul-dc4d7.firebasestorage.app",
  messagingSenderId: "1078404132418",
  appId: "1:1078404132418:web:e0632ee8164591093447db"
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
