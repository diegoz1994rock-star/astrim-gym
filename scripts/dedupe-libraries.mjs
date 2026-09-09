/**
 * Limpia los duplicados de las colecciones GLOBALES compartidas de Firestore
 * (`foodLibrary`, `exerciseLibrary`). Cada instalación del panel sembraba su
 * propia copia del catálogo con ids aleatorios distintos, así que quedaban
 * varios documentos con el mismo `name`. Este script deja UNO por nombre y
 * borra el resto.
 *
 * Se ejecuta como un DUEÑO DE GIMNASIO (role ADMIN) — las reglas dejan que
 * cualquier admin escriba en foodLibrary/exerciseLibrary (son compartidas).
 *
 * Uso:
 *   node scripts/dedupe-libraries.mjs <correo-dueño> <contraseña>          (dry-run: solo muestra)
 *   node scripts/dedupe-libraries.mjs <correo-dueño> <contraseña> --apply  (borra de verdad)
 *
 * El correo/contraseña son los de un dueño (ej. el que ves en la consola de
 * operador). No se guardan en ningún lado.
 */
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore, collection, getDocs, deleteDoc, doc, writeBatch,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCRJ55jGT4HxNwN7Xs4SE-NEHqAL1YA_qU",
  authDomain: "astrim-gym.firebaseapp.com",
  projectId: "astrim-gym",
  storageBucket: "astrim-gym.firebasestorage.app",
  messagingSenderId: "920110099557",
  appId: "1:920110099557:web:f9116b8179d4ad74352a8c",
};

const [email, password, ...flags] = process.argv.slice(2);
const APPLY = flags.includes("--apply");

if (!email || !password) {
  console.error("Falta: node scripts/dedupe-libraries.mjs <correo> <contraseña> [--apply]");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function dedupe(collName) {
  const snap = await getDocs(collection(db, collName));
  const byName = new Map(); // name -> [docId, ...]
  for (const d of snap.docs) {
    const name = d.data().name ?? "(sin nombre)";
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(d.id);
  }

  const toDelete = [];
  for (const [, ids] of byName) {
    if (ids.length > 1) toDelete.push(...ids.slice(1)); // conserva el primero
  }

  console.log(`\n=== ${collName} ===`);
  console.log(`  documentos: ${snap.size}`);
  console.log(`  nombres únicos: ${byName.size}`);
  console.log(`  duplicados a borrar: ${toDelete.length}`);

  if (!APPLY) {
    console.log("  (dry-run — nada borrado; pasá --apply para aplicar)");
    return { deleted: 0, remaining: snap.size };
  }

  const CHUNK = 400;
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const id of toDelete.slice(i, i + CHUNK)) {
      batch.delete(doc(db, collName, id));
    }
    await batch.commit();
    deleted += Math.min(CHUNK, toDelete.length - i);
    console.log(`  borrados ${deleted}/${toDelete.length}...`);
  }
  return { deleted, remaining: snap.size - deleted };
}

try {
  await signInWithEmailAndPassword(auth, email.trim(), password);
  console.log("Sesión OK:", auth.currentUser.email);

  const r1 = await dedupe("foodLibrary");
  const r2 = await dedupe("exerciseLibrary");

  console.log("\n--- resumen ---");
  console.log(`foodLibrary:     borrados ${r1.deleted}, quedan ${r1.remaining}`);
  console.log(`exerciseLibrary: borrados ${r2.deleted}, quedan ${r2.remaining}`);
  if (!APPLY) console.log("\nEsto fue un DRY-RUN. Volvé a correrlo con  --apply  al final para borrar.");
  process.exit(0);
} catch (err) {
  console.error("ERROR:", err?.code || "", err?.message || err);
  process.exit(1);
}
