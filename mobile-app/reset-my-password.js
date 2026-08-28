const admin = require('firebase-admin');

const serviceAccount = require('./household-finance-mobile-firebase-adminsdk-fbsvc-212b613544.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function run() {
  const email = 'wuvameow10@gmail.com';
  const newPassword = '333333';

  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().updateUser(user.uid, { password: newPassword });
  console.log('Done — password updated for', email);
}

run().catch(console.error);