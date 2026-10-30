// Cath, 2026-10-30 (answer 13): an unused "new household" link code left an empty household
// record behind. Putting the code away now removes that household too, but never a household
// someone joined, never an invite into an existing household, and never someone else's.
const mockCalls: string[] = [];
let mockCode: any;
let mockMembers = 1;
jest.mock('firebase/firestore', () => ({
  doc: (_db: any, col: string, id: string) => ({ path: `${col}/${id}` }),
  getDoc: async (ref: any) => ({ exists: () => !!mockCode, data: () => mockCode }),
  deleteDoc: async (ref: any) => { mockCalls.push('delete ' + ref.path); },
  setDoc: async () => {}, getDocFromServer: async () => ({}), onSnapshot: () => () => {}, serverTimestamp: () => 0,
}));
jest.mock('../src/firebase', () => ({ db: {} }));
jest.mock('../src/authFirebase', () => ({ getCurrentFirebaseUser: () => ({ uid: 'host' }) }));
jest.mock('../src/household', () => ({
  getHouseholdMemberCount: async () => mockMembers,
  deleteHousehold: async (id: string) => { mockCalls.push('delete households/' + id); },
}));

const { cancelLinkCode } = require('../src/linking');
beforeEach(() => { mockCalls.length = 0; mockMembers = 1; });

test('an unused new-household code: the code goes first, then its empty household', async () => {
  mockCode = { existingHouseholdId: 'h1', hostUid: 'host' };
  await cancelLinkCode('ABC123');
  expect(mockCalls).toEqual(['delete linkCodes/ABC123', 'delete households/h1']);
});

test('someone already joined (2 members): the household stays', async () => {
  mockCode = { existingHouseholdId: 'h1', hostUid: 'host' };
  mockMembers = 2;
  await cancelLinkCode('ABC123');
  expect(mockCalls).toEqual(['delete linkCodes/ABC123']);
});

test('an invite into an existing household, a finished code, or someone else\'s code: only the code goes', async () => {
  for (const c of [{ existingHouseholdId: 'h1', hostUid: 'host', isInvite: true }, { existingHouseholdId: 'h1', hostUid: 'host', finished: true }, { existingHouseholdId: 'h1', hostUid: 'other' }]) {
    mockCalls.length = 0;
    mockCode = c;
    await cancelLinkCode('ABC123');
    expect(mockCalls).toEqual(['delete linkCodes/ABC123']);
  }
});
