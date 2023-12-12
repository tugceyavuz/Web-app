import {app} from '/firebase/config';
import { signInWithEmailAndPassword, getAuth } from "firebase/auth";

const auth = getAuth(app);

export default async function signIn(email, password) {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return { result, error: null };
      } catch (error) {
        return { result: null, error };
      }
}   