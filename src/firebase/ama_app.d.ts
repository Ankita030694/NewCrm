declare module '@/firebase/ama_app' {
    import { FirebaseApp } from "firebase/app";
    import { Analytics } from "firebase/analytics";
    import { Firestore } from "firebase/firestore";
    
    export const app: FirebaseApp;
    export const analytics: Analytics | null;
    export const db: Firestore;
}










