// localStorage key for funnel progress (see storage.ts). Kept in its own file so
// the homepage can read it without bundling the enrollment schema.
import { LOCAL_STORAGE_KEYS } from "../browserStorage";

export const ENROLLMENT_STORAGE_KEY = LOCAL_STORAGE_KEYS.enrollment;
