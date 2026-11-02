import { RegisteredPerson } from '../types';
import { hashPassword, verifyPassword } from './authService';

const STORAGE_KEY = 'facial_rec_registered_people_v2';

class DBService {
  private people: RegisteredPerson[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const seenIds = new Set<string>();
          this.people = parsed.map((p: any, idx: number) => {
            let id = p.id;
            if (!id || seenIds.has(id)) {
              id = `person_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
            }
            seenIds.add(id);
            return {
              ...p,
              id,
            };
          });
        } else {
          this.people = [];
        }
      } else {
        // Initialize with empty array
        this.people = [];
      }
    } catch (err) {
      console.error('Error loading registered people from storage:', err);
      this.people = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.people));
    } catch (err) {
      console.error('Error saving registered people to storage:', err);
    }
  }

  public getRegisteredPeople(): RegisteredPerson[] {
    return [...this.people];
  }

  public getPersonById(id: string): RegisteredPerson | undefined {
    return this.people.find((p) => p.id === id);
  }

  public getPersonByName(name: string): RegisteredPerson | undefined {
    return this.people.find((p) => p.name.toLowerCase().trim() === name.toLowerCase().trim());
  }

  /**
   * Find user by unique username (case-insensitive)
   */
  public getUserByUsername(username: string): RegisteredPerson | undefined {
    const cleanUsername = username.toLowerCase().trim();
    if (!cleanUsername) return undefined;
    return this.people.find((p) => p.username?.toLowerCase().trim() === cleanUsername);
  }

  /**
   * Check if a username is already taken by another user
   */
  public isUsernameTaken(username: string, excludeUserId?: string): boolean {
    const cleanUsername = username.toLowerCase().trim();
    if (!cleanUsername) return false;
    return this.people.some(
      (p) => p.username?.toLowerCase().trim() === cleanUsername && p.id !== excludeUserId
    );
  }

  /**
   * Calculates Euclidean distance between two 128D feature vectors.
   */
  public calculateEuclideanDistance(desc1: number[], desc2: number[]): number {
    if (!desc1 || !desc2 || desc1.length !== desc2.length) return 1.0;
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
      const diff = desc1[i] - desc2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Compare input descriptor against all registered faces.
   * Returns matching person, best distance, and confidence.
   * Threshold default ~0.55 (lower distance means higher match).
   */
  public findMatchingPerson(
    targetDescriptor: number[],
    threshold: number = 0.52
  ): { person: RegisteredPerson; distance: number; confidence: number } | null {
    if (!targetDescriptor || targetDescriptor.length === 0 || this.people.length === 0) {
      return null;
    }

    let bestMatch: RegisteredPerson | null = null;
    let minDistance = 999;

    for (const person of this.people) {
      if (!person.descriptors || person.descriptors.length === 0) continue;
      for (const registeredDesc of person.descriptors) {
        const distance = this.calculateEuclideanDistance(targetDescriptor, registeredDesc);
        if (distance < minDistance) {
          minDistance = distance;
          bestMatch = person;
        }
      }
    }

    if (bestMatch && minDistance <= threshold) {
      // Confidence score between 0 and 100%
      const confidence = Math.max(0, Math.min(100, Math.round((1 - minDistance / threshold) * 100)));
      return {
        person: bestMatch,
        distance: minDistance,
        confidence,
      };
    }

    return null;
  }

  /**
   * Registers a new person or adds descriptors to an existing person (Facial Registration)
   */
  public registerPerson(name: string, thumbnail: string, descriptors: number[][]): RegisteredPerson {
    const trimmedName = name.trim();
    const existing = this.getPersonByName(trimmedName);

    if (existing) {
      // Append descriptors and update sample count
      existing.descriptors = existing.descriptors || [];
      existing.descriptors.push(...descriptors);
      existing.sampleCount = existing.descriptors.length;
      if (thumbnail) existing.thumbnail = thumbnail;
      existing.updatedAt = new Date().toISOString();
      this.saveToStorage();
      return existing;
    }

    const newPerson: RegisteredPerson = {
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: trimmedName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sampleCount: descriptors.length,
      thumbnail: thumbnail || '',
      descriptors: descriptors,
    };

    this.people.push(newPerson);
    this.saveToStorage();
    return newPerson;
  }

  /**
   * Creates a new user account with Username + Password credentials
   */
  public async registerUserWithCredentials(params: {
    username: string;
    password: string;
    displayName?: string;
    thumbnail?: string;
    descriptors?: number[][];
  }): Promise<RegisteredPerson> {
    const cleanUsername = params.username.toLowerCase().trim();
    if (this.isUsernameTaken(cleanUsername)) {
      throw new Error('Username already exists.');
    }

    const { hash, salt } = await hashPassword(params.password);
    const displayName = params.displayName?.trim() || params.username.trim();
    const descriptors = params.descriptors || [];

    const newUser: RegisteredPerson = {
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: displayName,
      username: cleanUsername,
      passwordHash: hash,
      salt: salt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sampleCount: descriptors.length,
      thumbnail: params.thumbnail || '',
      descriptors: descriptors,
    };

    this.people.push(newUser);
    this.saveToStorage();
    return newUser;
  }

  /**
   * Adds or updates username + password credentials for an EXISTING user account
   * Preserves the exact same userId so all application data is maintained.
   */
  public async linkCredentialsToUser(
    userId: string,
    username: string,
    password: string
  ): Promise<RegisteredPerson> {
    const user = this.getPersonById(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    const cleanUsername = username.toLowerCase().trim();
    if (this.isUsernameTaken(cleanUsername, userId)) {
      throw new Error('Username already exists.');
    }

    const { hash, salt } = await hashPassword(password);
    user.username = cleanUsername;
    user.passwordHash = hash;
    user.salt = salt;
    user.updatedAt = new Date().toISOString();

    this.saveToStorage();
    return user;
  }

  /**
   * Links or updates face descriptors for an existing account
   */
  public linkFaceToUser(
    userId: string,
    thumbnail: string,
    descriptors: number[][]
  ): RegisteredPerson {
    const user = this.getPersonById(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    user.descriptors = user.descriptors || [];
    user.descriptors.push(...descriptors);
    user.sampleCount = user.descriptors.length;
    if (thumbnail) user.thumbnail = thumbnail;
    user.updatedAt = new Date().toISOString();

    this.saveToStorage();
    return user;
  }

  /**
   * Authenticates a user using Username + Password credentials
   */
  public async authenticateWithCredentials(
    username: string,
    password: string
  ): Promise<{ success: boolean; user?: RegisteredPerson; error?: string }> {
    const cleanUsername = (username || '').toLowerCase().trim();
    if (!cleanUsername || !password) {
      return { success: false, error: 'Invalid username or password.' };
    }

    const user = this.getUserByUsername(cleanUsername);
    if (!user || !user.passwordHash || !user.salt) {
      // Do not reveal whether username or password was wrong
      return { success: false, error: 'Invalid username or password.' };
    }

    const isValid = await verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      return { success: false, error: 'Invalid username or password.' };
    }

    return { success: true, user };
  }

  /**
   * Deletes a registered person and all their face samples/descriptors/credentials
   */
  public deletePerson(id: string): boolean {
    const initialLength = this.people.length;
    this.people = this.people.filter((p) => p.id !== id);
    if (this.people.length !== initialLength) {
      this.saveToStorage();
      return true;
    }
    return false;
  }

  public clearAll(): void {
    this.people = [];
    this.saveToStorage();
  }
}

export const dbService = new DBService();
