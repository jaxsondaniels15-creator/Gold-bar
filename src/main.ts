import { 
    auth, db, googleProvider, signInWithPopup, onAuthStateChanged, signOut,
    collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp 
} from './firebase.ts';

// @ts-ignore
window.GoldBarAuth = { auth, db, googleProvider, signInWithPopup, onAuthStateChanged, signOut };
// @ts-ignore
window.GoldBarFirestore = { db, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp };

console.log("GoldBar Firebase Initialized");
