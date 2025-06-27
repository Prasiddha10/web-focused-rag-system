const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const execPromise = util.promisify(exec);

class ChromaClient {
    constructor() {
        this.collectionName = 'rag_collection';
    }

    async _writeTempFile(prefix, data) {
        const filename = path.join(__dirname, `tmp_${prefix}_${crypto.randomUUID()}.json`);
        await fs.writeFile(filename, JSON.stringify(data));
        return filename;
    }

    async addDocument(url, content) {
        try {
            const embedding = await this.generateEmbedding(content);

            // Save content and embedding to temp files
            const contentFile = await this._writeTempFile('content', content);
            const embeddingFile = await this._writeTempFile('embed', embedding);

            // Pass file paths directly to Python script
            const command = `python src/embed.py add "${url}" "${contentFile}" "${embeddingFile}"`;
            await execPromise(command);

            console.log(`✅ Added document for ${url}`);

            // Clean up temp files
            await fs.unlink(contentFile);
            await fs.unlink(embeddingFile);

        } catch (error) {
            console.error(`❌ Failed to add document for ${url}:`, error.message);
            throw error;
        }
    }

    async search(question) {
        try {
            const embedding = await this.generateEmbedding(question);

            const embeddingFile = await this._writeTempFile('query_embed', embedding);
            const command = `python src/embed.py query "${embeddingFile}"`;
            const { stdout } = await execPromise(command);

            await fs.unlink(embeddingFile);

            const results = JSON.parse(stdout);
            return results.map(result => ({
                url: result.id,
                content: result.document,
                score: result.distance
            }));
        } catch (error) {
            console.error('❌ Search error:', error.message);
            return [];
        }
    }

    async generateEmbedding(text) {
        const contentFile = await this._writeTempFile('gen_embed', text);
        const command = `python src/embed.py embed "${contentFile}"`;
        const { stdout } = await execPromise(command);

        await fs.unlink(contentFile);
        return JSON.parse(stdout);
    }
}

module.exports = new ChromaClient();
