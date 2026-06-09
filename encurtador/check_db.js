import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBOjfbAVL5CrCyXaMTrZmhi1IbmTE_fiqc",
  authDomain: "encurtador-link-3fd8e.firebaseapp.com",
  projectId: "encurtador-link-3fd8e",
  storageBucket: "encurtador-link-3fd8e.firebasestorage.app",
  messagingSenderId: "483688283987",
  appId: "1:483688283987:web:67205ce5811cb96e5eeba6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  console.log("Consultando a coleção 'links' no Firestore...");
  try {
    const querySnapshot = await getDocs(collection(db, "links"));
    if (querySnapshot.empty) {
      console.log("Nenhum link cadastrado ainda no banco de dados.");
    } else {
      console.log(`Sucesso! Encontrado(s) ${querySnapshot.size} link(s) no Firestore:`);
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`\n[Link Encurtado: ${doc.id}]`);
        console.log(`- URL Original: ${data.originalUrl}`);
        console.log(`- Código Curto: ${data.shortCode || data.code}`);
        console.log(`- Cliques: ${data.clicks}`);
        console.log(`- Criador (User ID): ${data.userId}`);
        console.log(`- Criado em: ${data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString() : 'Sem data'}`);
      });
    }
  } catch (error) {
    console.error("Erro ao acessar a coleção 'links':", error);
  }
}

check();
