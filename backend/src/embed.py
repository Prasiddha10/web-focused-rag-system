import sys
import json
import os
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings

# Load embedding model once
model = SentenceTransformer("all-MiniLM-L6-v2")

from chromadb import PersistentClient

def init_chroma():
    client = PersistentClient(path="./chroma_db")  # Ensure this path exists or gets created
    collection = client.get_or_create_collection(name="my_collection")
    return collection, client

def embed_text(text):
    embedding = model.encode([text], normalize_embeddings=True)[0].tolist()
    return embedding

def load_json_from_file_or_exit(path):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        sys.exit(1)
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python embed.py <embed|add|query|list> <args>")
        sys.exit(1)

    action = sys.argv[1]

    if action == "embed":
        text = " ".join(sys.argv[2:])
        embedding = embed_text(text)
        print(json.dumps(embedding))

    elif action == "add":
        if len(sys.argv) != 5:
            print("Usage: python embed.py add <url> <content-json-file> <embedding-json-file>")
            sys.exit(1)

        url = sys.argv[2]
        content_file = sys.argv[3]
        embedding_file = sys.argv[4]

        content = load_json_from_file_or_exit(content_file)
        embedding = load_json_from_file_or_exit(embedding_file)

        if not isinstance(embedding, list):
            print("Embedding must be a list of floats.")
            sys.exit(1)

        if not isinstance(content, str):
            content = json.dumps(content, ensure_ascii=False)

        collection, _ = init_chroma()
        collection.add(
            documents=[content],
            embeddings=[embedding],
            ids=[url]
        )
        print(json.dumps({"status": "success"}))

    elif action == "query":
        if len(sys.argv) != 3:
            print("Usage: python embed.py query <embedding-json-file>")
            sys.exit(1)

        embedding_file = sys.argv[2]
        embedding = load_json_from_file_or_exit(embedding_file)

        if not isinstance(embedding, list):
            print("Embedding must be a list of floats.")
            sys.exit(1)

        collection, _ = init_chroma()
        results = collection.query(
            query_embeddings=[embedding],
            n_results=2,
            include=["distances", "documents"]
        )
        output = [
            {"id": id, "document": doc, "distance": dist}
            for id, doc, dist in zip(
                results["ids"][0],
                results["documents"][0],
                results["distances"][0]
            )
        ]
        print(json.dumps(output, ensure_ascii=False, indent=2))

    elif action == "list":
        collection, _ = init_chroma()
        all = collection.get()
        print(f"Total documents in collection: {len(all['documents'])}")
        for i, (id, doc) in enumerate(zip(all["ids"], all["documents"])):
            print(f"{i+1}. ID: {id}\n   Snippet: {doc[:100]}...\n")

    else:
        print(f"Unknown action: {action}")
