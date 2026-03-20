import { 
    auth, db, googleProvider, signInWithPopup, onAuthStateChanged, signOut,
    collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp 
} from './firebase.ts';
import { GoogleGenAI } from "@google/genai";

// @ts-ignore
window.GoldBarAuth = { auth, db, googleProvider, signInWithPopup, onAuthStateChanged, signOut };
// @ts-ignore
window.GoldBarFirestore = { db, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp };

// @ts-ignore
window.GoldBarAI = {
    async generateResponse(prompt: string) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                systemInstruction: "You are GOLDBAR_AI, a helpful and tech-savvy assistant for the GOLDBAR Arcade. You answer questions concisely and with a slightly futuristic, hacker-like tone. Use uppercase for emphasis occasionally. You can help with game recommendations, technical problems, or general questions."
            }
        });
        return response.text;
    }
};

console.log("GoldBar Firebase & AI Initialized");
