const firebaseConfig = {
  apiKey: "AIzaSyA9lfSVAyNFGqzmVpeyJeMRkemPQbQpoAM",
  authDomain: "seoul-firefighter-quiz.firebaseapp.com",
  projectId: "seoul-firefighter-quiz",
  storageBucket: "seoul-firefighter-quiz.firebasestorage.app",
  messagingSenderId: "162763570042",
  appId: "1:162763570042:web:c923436493ff97ef1474c3"
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
