const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const fs = require('fs');

describe('Firestore Security Rules', () => {
  let testEnv;
  
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'ewar-fa1db',
      firestore: {
        rules: fs.readFileSync('firestore.rules', 'utf8'),
      },
    });
  });
  
  afterAll(async () => {
    await testEnv.cleanup();
  });
  
  test('anyone can read tournaments', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const doc = db.collection('artifacts/ewar-app/public/data/tournaments').doc('test-id');
    await assertSucceeds(doc.get());
  });
  
  test('unauthenticated cannot create tournaments', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const doc = db.collection('artifacts/ewar-app/public/data/tournaments').doc('test-id');
    await assertFails(doc.set({
      id: 'test-id',
      name: 'Test Tournament',
      createdBy: 'user-1'
    }));
  });
  
  test('authenticated can create tournaments', async () => {
    const db = testEnv.authenticatedContext('user-1').firestore();
    const doc = db.collection('artifacts/ewar-app/public/data/tournaments').doc('test-id');
    await assertSucceeds(doc.set({
      id: 'test-id',
      name: 'Test Tournament',
      format: 'Pure Knockout',
      stage: 'Group Stage',
      createdBy: 'user-1',
      teams: {},
      matches: [],
      followers: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));
  });
  
  test('followers can update tournaments', async () => {
    const db1 = testEnv.authenticatedContext('user-2').firestore();
    const docRef = db1.collection('artifacts/ewar-app/public/data/tournaments').doc('test-id');
    
    await docRef.set({
      id: 'test-id',
      name: 'Test Tournament',
      createdBy: 'user-2',
      followers: [],
      updatedAt: Date.now()
    });
    
    const followerRef = docRef.collection('followers').doc('user-1');
    await followerRef.set({ userId: 'user-1', followedAt: Date.now() });
    
    const db2 = testEnv.authenticatedContext('user-1').firestore();
    await assertSucceeds(db2.collection('artifacts/ewar-app/public/data/tournaments').doc('test-id').update({ name: 'Updated Tournament' }));
  });
  
  test('non-followers cannot update tournaments', async () => {
    const db = testEnv.authenticatedContext('user-3').firestore();
    const doc = db.collection('artifacts/ewar-app/public/data/tournaments').doc('test-id');
    await assertFails(doc.update({ name: 'Hacked Tournament' }));
  });
  
  test('invalid scores are rejected', async () => {
    const db = testEnv.authenticatedContext('user-1').firestore();
    const matchDoc = db.collection('artifacts/ewar-app/public/data/tournaments').doc('test-id')
      .collection('matches').doc('match-1');
    
    await assertFails(matchDoc.set({
      id: 'match-1',
      t1: 'Team A',
      t2: 'Team B',
      s1: 'abc',
      s2: '5',
      stage: 'Group Stage',
      status: 'Scheduled'
    }));
    
    await assertSucceeds(matchDoc.set({
      id: 'match-1',
      t1: 'Team A',
      t2: 'Team B',
      s1: '3',
      s2: '2',
      stage: 'Group Stage',
      status: 'Finished'
    }));
  });
});
