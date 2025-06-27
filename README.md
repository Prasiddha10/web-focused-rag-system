# Web-Focused RAG System

A production-ready Retrieval-Augmented Generation (RAG) system that uses Google AI Studio's Gemini API and Chroma DB to extract content from websites and answer questions intelligently.

## Features

- Crawl and extract content from any website.
- Store and manage crawled data using Chroma DB.
- Ask questions based on the crawled content, powered by Gemini AI.
- Visualize crawl statistics and maintain question history.
- Modern frontend (Webpack, Chart.js) and backend (Express, Puppeteer, Python embedding).

## Prerequisites

- Node.js (v16+)
- Python (v3.8+)
- Google AI Studio API key
- Git, Vercel CLI, AWS CLI (for deployment)

## Setup

### Backend

1. Navigate to the backend directory:
    ```sh
    cd backend
    ```
2. Install Node.js dependencies:
    ```sh
    npm install
    ```
3. Install Python dependencies:
    ```sh
    pip3 install chromadb sentence-transformers
    ```
4. Create a `.env` file with your Gemini API key:
    ```
    GEMINI_API_KEY=your_api_key_here
    ```
5. Start the backend server:
    ```sh
    npm start
    ```
   The backend runs on [http://localhost:3000](http://localhost:3000).

### Frontend

1. Navigate to the frontend directory:
    ```sh
    cd frontend
    ```
2. Install dependencies:
    ```sh
    npm install
    ```
3. Build the frontend:
    ```sh
    npm run build
    ```
4. Start the development server:
    ```sh
    npm run start
    ```
   Open [http://localhost:8080](http://localhost:8080) in your browser.

## Deployment

### Frontend

Deploy to Vercel:
```sh
vercel frontend/
```

### Backend

Deploy to AWS EC2:

1. Launch an EC2 instance (Ubuntu, t2.micro).
2. SSH into your instance:
    ```sh
    ssh -i key.pem ubuntu@<instance-ip>
    ```
3. Install Node.js and Python:
    ```sh
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs python3 python3-pip
    ```
4. Copy the `backend/` directory to EC2.
5. Install dependencies:
    ```sh
    npm install
    pip3 install chromadb sentence-transformers
    ```
6. Start the server (optionally with pm2 for production):
    ```sh
    pm2 start src/index.js
    ```
7. Configure your security group to allow traffic on port 3000.

## Usage

- Add URLs (e.g., https://example.com), crawl, and ask questions.
- View Gemini API responses and Chroma DB retrievals.
- Manage question history and visualize crawl statistics.

## License

MIT

---

**Project Structure:**

- [`backend/`](backend/) - Express server, Puppeteer crawler, Chroma DB, Gemini API integration.
- [`frontend/`](frontend/) - Webpack-based frontend, Chart.js, DOMPurify, UI logic.