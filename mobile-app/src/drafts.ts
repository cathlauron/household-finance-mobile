import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDraftStore } from './formDrafts';

// The app's one store of unfinished forms, kept on this phone (formDrafts.ts).
export const drafts = createDraftStore(AsyncStorage);
