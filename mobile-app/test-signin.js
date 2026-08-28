const admin = require('firebase-admin');
const serviceAccount = require('./household-finance-mobile-firebase-adminsdk-fbsvc-212b613544.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function run() {
  const email = 'wuvameow10@gmail.com';
  const user = await admin.auth().getUserByEmail(email);
  console.log('UID:', user.uid);
  console.log('Email:', user.email);
  console.log('Disabled:', user.disabled);
  console.log('Last sign-in:', user.metadata.lastSignInTime);
  console.log('Account created:', user.metadata.creationTime);
  console.log('Provider data:', JSON.stringify(user.providerData, null, 2));
}

run().catch(console.error);