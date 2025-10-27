// Mock Firestore service that simulates Firestore operations locally
class MockFirestoreService {
  private data: { [path: string]: any } = {};
  
  // Mock db reference
  db = {};

  collection(path: string) {
    return {
      path,
      doc: (id?: string) => this.doc(this, `${path}/${id || this.generateId()}`)
    };
  }

  doc(collectionRef: any, id?: string) {
    const path = typeof collectionRef === 'string' ? collectionRef : `${collectionRef.path}/${id}`;
    return {
      path,
      set: (data: any) => this.setDoc({ path }, data),
      get: () => this.getDoc({ path }),
      update: (data: any) => this.updateDoc({ path }, data),
      delete: () => this.deleteDoc({ path })
    };
  }

  async setDoc(docRef: any, data: any) {
    const path = docRef.path || docRef;
    this.data[path] = { ...data };
  }

  async getDoc(docRef: any) {
    const path = docRef.path || docRef;
    const data = this.data[path];
    return {
      exists: () => !!data,
      data: () => data,
      id: path.split('/').pop()
    };
  }

  async updateDoc(docRef: any, updates: any) {
    const path = docRef.path || docRef;
    if (this.data[path]) {
      this.data[path] = { ...this.data[path], ...updates };
    }
  }

  async deleteDoc(docRef: any) {
    const path = docRef.path || docRef;
    delete this.data[path];
  }

  async addDoc(collectionRef: any, data: any) {
    const id = this.generateId();
    const path = `${collectionRef.path}/${id}`;
    this.data[path] = { ...data };
    return { id, path };
  }

  query(collection: any, ...conditions: any[]) {
    const collectionPath = typeof collection === 'string' ? collection : collection.path;
    return {
      collectionPath,
      conditions,
      get: () => this.getDocs(collectionPath, conditions)
    };
  }

  where(field: string, operator: string, value: any) {
    return { field, operator, value };
  }

  arrayUnion(...elements: any[]) {
    return { _type: 'arrayUnion', elements };
  }

  arrayRemove(...elements: any[]) {
    return { _type: 'arrayRemove', elements };
  }

  async getDocs(queryOrPath: any, conditions: any[] = []) {
    let collectionPath: string;
    let queryConditions: any[];

    // Handle query object or direct collection path
    if (typeof queryOrPath === 'object' && queryOrPath.collectionPath) {
      collectionPath = queryOrPath.collectionPath;
      queryConditions = queryOrPath.conditions || [];
    } else {
      collectionPath = queryOrPath;
      queryConditions = conditions;
    }

    const docs = Object.keys(this.data)
      .filter(path => path.startsWith(collectionPath + '/'))
      .map(path => ({
        id: path.split('/').pop(),
        data: () => this.data[path]
      }))
      .filter(doc => {
        return queryConditions.every(condition => {
          if (!condition.field) return true;
          const value = doc.data()[condition.field];
          switch (condition.operator) {
            case '==': return value === condition.value;
            case '!=': return value !== condition.value;
            case '>': return value > condition.value;
            case '<': return value < condition.value;
            case '>=': return value >= condition.value;
            case '<=': return value <= condition.value;
            case 'array-contains': return Array.isArray(value) && value.includes(condition.value);
            default: return true;
          }
        });
      });

    return { 
      docs,
      forEach: (callback: (doc: any) => void) => docs.forEach(callback)
    };
  }

  async runTransaction(updateFunction: (transaction: any) => Promise<any>) {
    const transaction = {
      get: (docRef: any) => this.getDoc(docRef),
      set: (docRef: any, data: any) => this.setDoc(docRef, data),
      update: (docRef: any, data: any) => this.updateDoc(docRef, data),
      delete: (docRef: any) => this.deleteDoc(docRef)
    };
    return await updateFunction(transaction);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Helper method to clear data between tests
  clearData() {
    this.data = {};
  }

  // Helper method to seed data for tests
  seedData(path: string, data: any) {
    this.data[path] = data;
  }
}

export const firestoreService = new MockFirestoreService();
