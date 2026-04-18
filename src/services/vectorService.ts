export interface VectorMatch {
  id: string;
  score: number;
  metadata: {
    text: string;
    [key: string]: any;
  };
}

export async function upsertToVectorDb(id: string, text: string, metadata: any = {}) {
  try {
    const response = await fetch('/api/vector/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, text, metadata }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upsert to vector database');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Vector Upsert Error:', error);
    throw error;
  }
}

export async function queryVectorDb(query: string, topK: number = 5, filter?: any): Promise<VectorMatch[]> {
  try {
    const response = await fetch('/api/vector/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, topK, filter }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to query vector database');
    }
    
    const data = await response.json();
    return data.matches || [];
  } catch (error) {
    console.error('Vector Query Error:', error);
    throw error;
  }
}
